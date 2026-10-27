"use client";

import * as React from "react";

import { usePrefersReducedMotion } from "./hooks";
import { clamp, cn, mod } from "./utils";
import {
  flingTarget,
  easeOutCubic,
  glideDuration,
  nearestCopy,
  releaseVelocity,
  snapIndex,
  type DragSample,
} from "./wheel-math";

export type WheelOption = { value: number; label: string };

export type WheelProps = {
  options: WheelOption[];
  value: number;
  /**
   * `rows` is how far the wheel turned to get there, in rows (negative is
   * up), so a looped wheel can tell 11 → 12 from 1 → 12.
   */
  onChange: (value: number, rows: number) => void;
  /** Hours and minutes wrap around like the iOS clock wheels. */
  loop?: boolean;
  itemHeight?: number;
  visibleRows?: number;
  /** Where the labels sit in the column; iOS right-aligns hours and left-aligns minutes. */
  align?: "start" | "center" | "end";
  /** Space between the column's aligned edge and its labels, in px. */
  inset?: number;
  "aria-label": string;
  className?: string;
};

/** Degrees of drum per row: rows sit on a cylinder, as on the iOS picker. */
const ROW_DEGREES = 22;

/** The band behind the centre row is a little taller than a row, like iOS's. */
export const BAND_EXTRA = 2;

// Looped wheels render the options several times and rest in the middle
// copy, so a fling always has road in both directions: at least this many
// rows each way, which a hard fling does not use up.
const ROAD_ROWS = 60;
const TYPEAHEAD_MS = 700;

type Drag = {
  startY: number;
  startTop: number;
  samples: DragSample[];
  moved: boolean;
};

/**
 * One column of an iOS picker: native scrolling with snap points (so touch
 * and trackpad flings come from the platform), mouse drag with its own
 * deceleration, a click on any row, and the keyboard — arrows step, digits
 * jump. The centre row is the value; the parent draws the highlight bar.
 */
export function Wheel({
  options,
  value,
  onChange,
  loop = false,
  itemHeight = 32,
  visibleRows = 5,
  align = "center",
  inset = 0,
  "aria-label": ariaLabel,
  className,
}: WheelProps) {
  const scroller = React.useRef<HTMLDivElement>(null);
  const reduceMotion = usePrefersReducedMotion();
  const len = options.length;
  const copies = loop ? 2 * Math.ceil(ROAD_ROWS / len) + 1 : 1;
  const base = loop ? Math.floor(copies / 2) * len : 0;
  const maxIndex = len * copies - 1;
  const selected = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const pad = ((visibleRows - 1) / 2) * itemHeight;
  // The drum's radius, so that one row of arc is one row of scroll.
  const radius = itemHeight / ((ROW_DEGREES * Math.PI) / 180);

  // Physical row the wheel rests on; the value is `options[resting % len]`.
  const resting = React.useRef(base + selected);
  const drag = React.useRef<Drag | null>(null);
  // A finger is on the wheel: the browser scrolls it, and nothing settles
  // until the finger lifts.
  const touching = React.useRef(false);
  const fling = React.useRef(0);
  const settleTimer = React.useRef(0);
  const typeahead = React.useRef({ buffer: "", timer: 0 });
  // A mouse click is resolved on pointer-up (pointer capture would retarget
  // the click event); the click that follows is then ignored. WebKit labels a
  // touch-synthesised click "mouse" too, so the click itself cannot be trusted.
  const clickHandled = React.useRef(false);
  // Timers and animation frames call back after this render; give them the
  // latest handler rather than the one they closed over.
  const onChangeRef = React.useRef(onChange);
  const valueRef = React.useRef(value);
  React.useLayoutEffect(() => {
    onChangeRef.current = onChange;
    valueRef.current = value;
  });
  // A scroll the wheel started itself (a typed value, a set prop, a key).
  // Until the scroller gets there a settle means nothing: reporting the row
  // it is passing would hand back a stale value, and on a busy main thread
  // that report could land after the real one and win.
  const arriving = React.useRef<{ physical: number; lastTop: number; nudges: number } | null>(null);

  // Only a turn is a change: settling where the wheel already was (including
  // the first layout) must not write anything. A looped wheel turned a whole
  // round reports too, so an hour wheel can carry into AM/PM.
  const report = (physical: number, from: number) => {
    const option = optionAt(physical);
    if (option && (option.value !== valueRef.current || (loop && physical !== from)))
      onChangeRef.current(option.value, physical - from);
  };

  const optionAt = (physical: number) => options.at(mod(physical, len));

  // Depth: rows sit on a drum. Each row turns away from the centre and is
  // drawn where the turned drum puts it, so rows bunch up toward the edges.
  const paint = () => {
    const el = scroller.current;
    if (!el) return;
    const centre = el.scrollTop / itemHeight;
    const rows = el.firstElementChild?.children;
    if (!rows) return;
    const from = Math.max(0, Math.floor(centre) - visibleRows);
    const to = Math.min(rows.length - 1, Math.ceil(centre) + visibleRows);
    const nearest = snapIndex(el.scrollTop, itemHeight);
    for (let i = from; i <= to; i++) {
      const row = rows[i] as HTMLElement;
      // The label moves, not the row: rows are the snap targets, and WebKit
      // snaps to where a transformed row is drawn.
      const label = row.firstElementChild as HTMLElement | null;
      const offset = i - centre;
      const angle = clamp(offset * ROW_DEGREES, -90, 90);
      const rad = (angle * Math.PI) / 180;
      const shift = radius * Math.sin(rad) - offset * itemHeight;
      if (label) {
        label.style.transform = `translateY(${shift.toFixed(2)}px) perspective(600px) rotateX(${-angle}deg)`;
        label.style.opacity =
          Math.abs(angle) >= 90 ? "0" : String(clamp(Math.cos(rad) ** 0.75, 0.2, 1));
      }
      if (i === nearest) row.dataset.active = "";
      else delete row.dataset.active;
    }
  };

  const scrollToIndex = (physical: number, smooth: boolean) => {
    const el = scroller.current;
    if (!el) return;
    const target = clamp(physical, 0, maxIndex);
    arriving.current = { physical: target, lastTop: -1, nudges: 0 };
    el.scrollTo({
      top: target * itemHeight,
      behavior: smooth && !reduceMotion ? "smooth" : "auto",
    });
  };

  // Where the wheel stopped becomes the value; looped wheels quietly re-centre.
  const settle = () => {
    const el = scroller.current;
    if (!el || drag.current || fling.current || touching.current) return;
    const a = arriving.current;
    if (a && snapIndex(el.scrollTop, itemHeight) !== a.physical) {
      if (el.scrollTop !== a.lastTop) {
        // Still on its way; look again once it has had time to move.
        a.lastTop = el.scrollTop;
        window.clearTimeout(settleTimer.current);
        settleTimer.current = window.setTimeout(settle, 120);
        return;
      }
      if (a.nudges < 3) {
        // The same spot twice: the animation was cut short. Send it again.
        a.nudges += 1;
        el.scrollTo({ top: a.physical * itemHeight, behavior: reduceMotion ? "auto" : "smooth" });
        return;
      }
    }
    arriving.current = null;
    let idx = snapIndex(el.scrollTop, itemHeight);
    const from = resting.current;
    const turned = idx;
    if (loop) {
      const centred = base + mod(idx, len);
      if (idx !== centred) {
        idx = centred;
        el.scrollTop = idx * itemHeight;
        // Draw the drum at the new copy now, not a frame later.
        paint();
      }
    }
    resting.current = idx;
    report(turned, from);
  };

  /** `turn: false` is a jump (Home, End, type-ahead): it reports no rows turned. */
  const go = (physical: number, turn = true) => {
    const target = clamp(physical, 0, maxIndex);
    const from = resting.current;
    resting.current = target;
    report(target, turn ? from : target);
    scrollToIndex(target, true);
  };

  // Initial rest, without animation.
  const mounted = React.useRef(false);
  React.useLayoutEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    scroller.current?.scrollTo({ top: resting.current * itemHeight });
    paint();
  });

  // The value changed from outside (typed into the field, or set by the app).
  React.useEffect(() => {
    if (drag.current || fling.current) return;
    if (options.at(mod(resting.current, len))?.value === value) return;
    const physical = loop ? nearestCopy(selected, resting.current, len, copies) : selected;
    resting.current = physical;
    scrollToIndex(physical, true);
  });

  // Nothing the wheel scheduled may run once it is gone.
  React.useEffect(
    () => () => {
      cancelAnimationFrame(fling.current);
      window.clearTimeout(settleTimer.current);
      window.clearTimeout(typeahead.current.timer);
    },
    [],
  );

  const onScroll = () => {
    paint();
    // `scrollend` is the real signal; the timer covers engines without it.
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(settle, 120);
  };

  const onScrollEnd = () => {
    window.clearTimeout(settleTimer.current);
    settle();
  };

  // Touch is native scrolling: pointer events end in `pointercancel` as soon
  // as the browser takes the gesture, so the finger is tracked by touch events.
  const onTouchStart = () => {
    touching.current = true;
    arriving.current = null;
    window.clearTimeout(settleTimer.current);
  };
  const onTouchEnd = () => {
    touching.current = false;
    // The momentum that follows keeps pushing this back; a finger lifted
    // from a still wheel settles here.
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(settle, 120);
  };

  // Mouse drag: the browser gives touch a fling for free, the mouse needs one.
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // A finger or a pointer on the wheel takes over from any scroll in flight.
    arriving.current = null;
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const el = e.currentTarget;
    cancelAnimationFrame(fling.current);
    fling.current = 0;
    el.setPointerCapture(e.pointerId);
    el.style.scrollSnapType = "none";
    drag.current = {
      startY: e.clientY,
      startTop: el.scrollTop,
      samples: [{ t: e.timeStamp, top: el.scrollTop }],
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const el = e.currentTarget;
    const top = clamp(d.startTop - (e.clientY - d.startY), 0, maxIndex * itemHeight);
    d.samples.push({ t: e.timeStamp, top });
    // Keep only what the release speed reads.
    if (d.samples.length > 32) d.samples.splice(0, d.samples.length - 32);
    if (Math.abs(e.clientY - d.startY) > 3) d.moved = true;
    el.scrollTop = top;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    const el = e.currentTarget;
    el.releasePointerCapture(e.pointerId);
    if (!d.moved) {
      // A click: the row under the pointer becomes the value.
      el.style.scrollSnapType = "";
      // Undo the drum: how far from the middle the pointer is, as an angle,
      // is how many rows from the centre row it points at.
      const box = el.getBoundingClientRect();
      const fromMiddle = clamp((e.clientY - box.top - box.height / 2) / radius, -1, 1);
      const half = Math.floor(visibleRows / 2);
      const turn = clamp((Math.asin(fromMiddle) * 180) / Math.PI / ROW_DEGREES, -half, half);
      go(Math.round(el.scrollTop / itemHeight + turn));
      clickHandled.current = true;
      return;
    }
    clickHandled.current = true;
    // Glide on at the speed the hand let go and come to rest exactly on a row.
    const v = releaseVelocity(d.samples, e.timeStamp);
    const from = el.scrollTop;
    const distance = flingTarget(from, v, itemHeight, maxIndex) * itemHeight - from;
    const duration = reduceMotion ? 0 : glideDuration(distance, v);
    const start = performance.now();
    const step = (now: number) => {
      const t = duration === 0 ? 1 : Math.min(1, Math.max(0, now - start) / duration);
      el.scrollTop = from + distance * easeOutCubic(t);
      if (t === 1) {
        fling.current = 0;
        el.style.scrollSnapType = "";
        settle();
        return;
      }
      fling.current = requestAnimationFrame(step);
    };
    fling.current = requestAnimationFrame(step);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const r = resting.current;
    const first = loop ? base : 0;
    const last = loop ? base + len - 1 : len - 1;
    switch (e.key) {
      case "ArrowUp":
        go(r - 1);
        break;
      case "ArrowDown":
        go(r + 1);
        break;
      case "PageUp":
        go(r - 5);
        break;
      case "PageDown":
        go(r + 5);
        break;
      case "Home":
        go(first, false);
        break;
      case "End":
        go(last, false);
        break;
      default: {
        if (e.key.length !== 1 || e.metaKey || e.ctrlKey || e.altKey) return;
        const ta = typeahead.current;
        window.clearTimeout(ta.timer);
        ta.buffer += e.key.toLowerCase();
        ta.timer = window.setTimeout(() => (ta.buffer = ""), TYPEAHEAD_MS);
        const hit = options.findIndex(
          (o) => String(o.value) === ta.buffer || o.label.toLowerCase().startsWith(ta.buffer),
        );
        if (hit === -1) {
          ta.buffer = e.key.toLowerCase();
          const retry = options.findIndex(
            (o) => String(o.value) === ta.buffer || o.label.toLowerCase().startsWith(ta.buffer),
          );
          if (retry === -1) return;
          go(loop ? nearestCopy(retry, r, len, copies) : retry, false);
        } else {
          go(loop ? nearestCopy(hit, r, len, copies) : hit, false);
        }
        break;
      }
    }
    e.preventDefault();
  };

  // A click on a row (delegated, so the rows below stay the same elements
  // from render to render).
  const onRowClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (clickHandled.current) {
      clickHandled.current = false;
      return;
    }
    const row = (e.target as HTMLElement).closest<HTMLElement>("[data-index]");
    if (row) go(Number(row.dataset.index));
  };

  // Hundreds of rows on a looped wheel; rebuilt only when the options change,
  // so a new value re-renders the wheel and not every row in it.
  const rows = React.useMemo(
    () =>
      Array.from({ length: len * copies }, (_, i) => (
        <div
          key={i}
          role="presentation"
          data-index={i}
          className={cn(
            "flex snap-center items-center text-[23px] leading-none text-[var(--cdp-secondary)] tabular-nums data-active:text-[var(--cdp-label)]",
            align === "start"
              ? "justify-start"
              : align === "end"
                ? "justify-end"
                : "justify-center",
          )}
          style={{
            height: itemHeight,
            paddingInline:
              align === "end" ? `0 ${inset}px` : align === "start" ? `${inset}px 0` : undefined,
          }}
        >
          <span>{options.at(i % len)?.label}</span>
        </div>
      )),
    [options, len, copies, itemHeight, align, inset],
  );

  const current = options.at(selected);

  return (
    // The focus ring hugs the centre row, outside the scroller and in the
    // middle of the group's fade, so the fade never dims it.
    <div className={cn("relative", className)}>
      <div
        ref={scroller}
        role="spinbutton"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-valuenow={current?.value}
        aria-valuetext={current?.label}
        aria-valuemin={options.at(0)?.value}
        aria-valuemax={options.at(-1)?.value}
        data-slot="wheel"
        onScroll={onScroll}
        onScrollEnd={onScrollEnd}
        onWheel={() => (arriving.current = null)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onKeyDown={onKeyDown}
        className={cn(
          "cdp-wheel peer relative w-full snap-y snap-mandatory overflow-y-scroll overscroll-contain outline-none select-none",
        )}
        style={{ height: visibleRows * itemHeight, scrollbarWidth: "none", touchAction: "pan-y" }}
      >
        <div aria-hidden style={{ paddingBlock: pad }} onClick={onRowClick}>
          {rows}
        </div>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-full opacity-0 ring-2 ring-[var(--cdp-tint)] peer-focus-visible:opacity-100"
        style={{ height: itemHeight + BAND_EXTRA }}
      />
    </div>
  );
}

/** The translucent bar behind the centre row, shared by a group of wheels. */
export function WheelHighlight({
  itemHeight = 32,
  className,
}: {
  itemHeight?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-full bg-[var(--cdp-wheel-band)]",
        className,
      )}
      style={{ height: itemHeight + BAND_EXTRA }}
    />
  );
}

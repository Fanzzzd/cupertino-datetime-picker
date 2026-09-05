import * as React from "react";

import { usePrefersReducedMotion } from "./hooks";
import { clamp, mod } from "./utils";
import { cn } from "./utils";
import { easeOutCubic, flingTarget, nearestCopy, snapIndex } from "./wheel-math";

export type WheelOption = { value: number; label: string };

export type WheelProps = {
  options: WheelOption[];
  value: number;
  onChange: (value: number) => void;
  /** Hours and minutes wrap around like the iOS clock wheels. */
  loop?: boolean;
  itemHeight?: number;
  visibleRows?: number;
  "aria-label": string;
  className?: string;
};

// Looped wheels render the options this many times and rest in the middle
// copy, so a fling always has road in both directions.
const COPIES = 7;
const TYPEAHEAD_MS = 700;

type Drag = {
  startY: number;
  startTop: number;
  lastTop: number;
  lastT: number;
  v: number;
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
  "aria-label": ariaLabel,
  className,
}: WheelProps) {
  const scroller = React.useRef<HTMLDivElement>(null);
  const reduceMotion = usePrefersReducedMotion();
  const len = options.length;
  const copies = loop ? COPIES : 1;
  const base = loop ? Math.floor(COPIES / 2) * len : 0;
  const maxIndex = len * copies - 1;
  const selected = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const pad = ((visibleRows - 1) / 2) * itemHeight;

  // Physical row the wheel rests on; the value is `options[resting % len]`.
  const resting = React.useRef(base + selected);
  const drag = React.useRef<Drag | null>(null);
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
  React.useLayoutEffect(() => {
    onChangeRef.current = onChange;
  });

  const optionAt = (physical: number) => options[mod(physical, len)];

  // Depth: rows tilt away from the centre, like the drum of a real picker.
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
      const offset = i - centre;
      const angle = clamp(offset * 22, -85, 85);
      row.style.transform = `perspective(600px) rotateX(${-angle}deg)`;
      row.style.opacity = String(clamp(1 - Math.abs(offset) * 0.28, 0.12, 1));
      if (i === nearest) row.dataset.active = "";
      else delete row.dataset.active;
    }
  };

  const scrollToIndex = (physical: number, smooth: boolean) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({
      top: clamp(physical, 0, maxIndex) * itemHeight,
      behavior: smooth && !reduceMotion ? "smooth" : "auto",
    });
  };

  // Where the wheel stopped becomes the value; looped wheels quietly re-centre.
  const settle = () => {
    const el = scroller.current;
    if (!el || drag.current || fling.current) return;
    let idx = snapIndex(el.scrollTop, itemHeight);
    if (loop) {
      const centred = base + mod(idx, len);
      if (idx !== centred) {
        idx = centred;
        el.scrollTop = idx * itemHeight;
      }
    }
    resting.current = idx;
    const option = optionAt(idx);
    if (option) onChangeRef.current(option.value);
  };

  const go = (physical: number, smooth = true) => {
    const target = clamp(physical, 0, maxIndex);
    resting.current = target;
    const option = optionAt(target);
    if (option) onChangeRef.current(option.value);
    scrollToIndex(target, smooth);
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
    if (options[mod(resting.current, len)]?.value === value) return;
    const physical = loop ? nearestCopy(selected, resting.current, len, copies) : selected;
    resting.current = physical;
    scroller.current?.scrollTo({
      top: physical * itemHeight,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [value, options, len, loop, selected, copies, itemHeight, reduceMotion, resting, scroller]);

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

  // Mouse drag: the browser gives touch a fling for free, the mouse needs one.
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const el = e.currentTarget;
    cancelAnimationFrame(fling.current);
    fling.current = 0;
    el.setPointerCapture(e.pointerId);
    el.style.scrollSnapType = "none";
    drag.current = {
      startY: e.clientY,
      startTop: el.scrollTop,
      lastTop: el.scrollTop,
      lastT: e.timeStamp,
      v: 0,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const el = e.currentTarget;
    const top = clamp(d.startTop - (e.clientY - d.startY), 0, maxIndex * itemHeight);
    const dt = Math.max(1, e.timeStamp - d.lastT);
    d.v = d.v * 0.5 + ((top - d.lastTop) / dt) * 0.5;
    d.lastTop = top;
    d.lastT = e.timeStamp;
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
      const y = e.clientY - el.getBoundingClientRect().top;
      go(Math.floor((el.scrollTop + y - pad) / itemHeight));
      clickHandled.current = true;
      return;
    }
    clickHandled.current = true;
    const target = flingTarget(
      el.scrollTop,
      e.timeStamp - d.lastT > 80 ? 0 : d.v,
      itemHeight,
      maxIndex,
    );
    const from = el.scrollTop;
    const to = target * itemHeight;
    const duration = reduceMotion ? 0 : clamp(Math.abs(to - from) * 1.2, 180, 720);
    const start = e.timeStamp;
    const step = (now: number) => {
      const t = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      el.scrollTop = from + (to - from) * easeOutCubic(t);
      if (t < 1) {
        fling.current = requestAnimationFrame(step);
      } else {
        fling.current = 0;
        el.style.scrollSnapType = "";
        settle();
      }
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
        go(first);
        break;
      case "End":
        go(last);
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
          go(loop ? nearestCopy(retry, r, len, copies) : retry);
        } else {
          go(loop ? nearestCopy(hit, r, len, copies) : hit);
        }
        break;
      }
    }
    e.preventDefault();
  };

  const current = options[selected];

  return (
    <div
      ref={scroller}
      role="spinbutton"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuenow={current?.value}
      aria-valuetext={current?.label}
      aria-valuemin={options[0]?.value}
      aria-valuemax={options[len - 1]?.value}
      data-slot="wheel"
      onScroll={onScroll}
      onScrollEnd={onScrollEnd}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      className={cn(
        "cdp-wheel relative snap-y snap-mandatory overflow-y-scroll overscroll-contain rounded-lg outline-none select-none focus-visible:ring-2 focus-visible:ring-[var(--cdp-tint)]",
        className,
      )}
      style={{ height: visibleRows * itemHeight, scrollbarWidth: "none", touchAction: "pan-y" }}
    >
      <div aria-hidden style={{ paddingBlock: pad }}>
        {Array.from({ length: len * copies }, (_, i) => {
          const option = options[i % len];
          return (
            <div
              key={i}
              className="flex snap-center items-center justify-center text-[22px] leading-none text-[var(--cdp-secondary)] tabular-nums transition-colors data-active:text-[var(--cdp-label)]"
              style={{ height: itemHeight }}
              onClick={() => {
                if (clickHandled.current) {
                  clickHandled.current = false;
                  return;
                }
                go(i);
              }}
            >
              {option?.label}
            </div>
          );
        })}
      </div>
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
        "pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-lg bg-[var(--cdp-fill)]",
        className,
      )}
      style={{ height: itemHeight }}
    />
  );
}

"use client";

import * as React from "react";

import { usePrefersReducedMotion } from "./hooks";
import { clamp, cn, mod } from "./utils";
import { nearestRow } from "./wheel-math";
import { WheelMotion } from "./wheel-motion";

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

/** The band behind the centre row is a little taller than a row, like iOS's. */
export const BAND_EXTRA = 2;

const TYPEAHEAD_MS = 700;
/** How long after a report the wheel waits for the value to come back (ms). */
const AGREE_MS = 120;
/** A press that travels less than this (px) is a tap. */
const TAP_SLOP = 4;

// Where a row `offset` rows from the centre is drawn on a drum of `radius`,
// measured from the middle of the wheel.
function drum(offset: number, rowDegrees: number, radius: number) {
  const angle = clamp(offset * rowDegrees, -90, 90);
  const rad = (angle * Math.PI) / 180;
  return {
    transform: `translateY(${(radius * Math.sin(rad)).toFixed(2)}px) perspective(600px) rotateX(${-angle}deg)`,
    opacity: Math.abs(angle) >= 90 ? "0" : String(clamp(Math.cos(rad) ** 0.75, 0.2, 1)),
  };
}

/**
 * One column of an iOS picker. The browser scrolls nothing: the wheel takes
 * pointer, wheel and keyboard input itself, `WheelMotion` decides how it
 * moves, and each frame draws the labels on a drum at the position it gives.
 * Drag and fling with a finger or a mouse, spin with a wheel or trackpad,
 * tap a row, or use the keys: arrows step, digits jump. The centre row is the
 * value; the parent draws the highlight bar.
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
  const element = React.useRef<HTMLDivElement>(null);
  const pool = React.useRef<HTMLDivElement>(null);
  const reduceMotion = usePrefersReducedMotion();
  const len = options.length;
  const selected = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const pad = ((visibleRows - 1) / 2) * itemHeight;
  // Rows sit on a drum that fills the wheel: its edge, where rows turn away
  // to nothing, is the wheel's edge, so no band of the wheel stays empty.
  // One row of arc is one row of travel.
  const radius = (visibleRows * itemHeight) / 2 - 4;
  const rowDegrees = ((itemHeight / radius) * 180) / Math.PI;
  // Labels for the visible half of the drum, plus one each side.
  const poolSize = 2 * Math.ceil(90 / rowDegrees) + 3;
  const bounds = {
    itemHeight,
    first: loop ? -Infinity : 0,
    last: loop ? Infinity : len - 1,
    instant: reduceMotion,
  };

  // Row the wheel rests on; the value is `options[resting % len]`. A looped
  // wheel's rows run on without end in both directions.
  const resting = React.useRef(selected);
  const [motion] = React.useState(() => new WheelMotion(selected * itemHeight, bounds));
  const frame = React.useRef(0);
  // `scale` turns pointer px into the wheel's px under CSS zoom.
  const press = React.useRef<{ y: number; moved: boolean; stopped: boolean; scale: number } | null>(
    null,
  );
  const typeahead = React.useRef({ buffer: "", timer: 0 });
  // The row a jump already reported, so landing on it reports nothing more.
  const reported = React.useRef<number | null>(null);
  const agreeTimer = React.useRef(0);
  // Frames and listeners call back after this render; give them the latest
  // handlers rather than the ones they closed over.
  const onChangeRef = React.useRef(onChange);
  const valueRef = React.useRef(value);
  const latest = React.useRef({
    tick: (_now: number) => {},
    wheel: (_e: WheelEvent) => {},
    agree: () => {},
  });

  const optionAt = (row: number) => options.at(mod(row, len));

  // Only a turn is a change: settling where the wheel already was (including
  // the first layout) must not write anything. A looped wheel turned a whole
  // round reports too, so an hour wheel can carry into AM/PM.
  const report = (row: number, from: number) => {
    const option = optionAt(row);
    if (option && (option.value !== valueRef.current || (loop && row !== from)))
      onChangeRef.current(option.value, row - from);
  };

  // Depth: rows sit on a drum. Each row turns away from the centre and is
  // drawn where the turned drum puts it, so rows bunch up toward the edges.
  const paint = (relabel = false) => {
    const rows = pool.current?.children;
    if (!rows) return;
    const centre = motion.pos / itemHeight;
    const from = Math.round(centre) - Math.floor(poolSize / 2);
    const nearest = Math.round(centre);
    for (let i = from; i < from + poolSize; i++) {
      const row = rows[mod(i, poolSize)] as HTMLElement;
      const label = row.firstElementChild as HTMLElement;
      const real = loop || (i >= 0 && i < len);
      if (relabel || row.dataset.index !== String(i)) {
        row.dataset.index = String(i);
        label.textContent = real ? (optionAt(i)?.label ?? "") : "";
      }
      Object.assign(label.style, drum(i - centre, rowDegrees, radius));
      if (i === nearest && real) row.dataset.active = "";
      else delete row.dataset.active;
    }
    // Where the wheel is, in rows, for tests and tools.
    element.current?.setAttribute("data-position", centre.toFixed(2));
  };

  // Where the wheel stopped becomes the value.
  const settle = () => {
    const row = motion.row;
    const from = resting.current;
    resting.current = row;
    if (row !== reported.current) report(row, from);
    reported.current = null;
    // A parent that kept its value (it refused the change, or clamped it
    // back) gets the wheel back on that value.
    window.clearTimeout(agreeTimer.current);
    agreeTimer.current = window.setTimeout(() => latest.current.agree(), AGREE_MS);
  };

  const tick = (now: number) => {
    const moving = motion.step(now);
    paint();
    if (moving) {
      frame.current = requestAnimationFrame((t) => latest.current.tick(t));
    } else {
      frame.current = 0;
      settle();
    }
  };
  const run = () => {
    if (!frame.current) frame.current = requestAnimationFrame((t) => latest.current.tick(t));
  };

  // Wheel and trackpad: every delta is ours, and the page behind never
  // scrolls while the pointer is over the wheel.
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (motion.dragging) return;
    const unit = e.deltaMode === 1 ? itemHeight : e.deltaMode === 2 ? visibleRows * itemHeight : 1;
    motion.wheel(e.timeStamp, e.deltaY * unit);
    run();
  };

  const follow = (v: number) => {
    if (motion.dragging) return;
    if (optionAt(resting.current)?.value === v) return;
    const index = Math.max(
      0,
      options.findIndex((o) => o.value === v),
    );
    const row = loop ? nearestRow(index, resting.current, len) : index;
    resting.current = row;
    motion.goTo(row, performance.now());
    run();
  };
  React.useLayoutEffect(() => {
    onChangeRef.current = onChange;
    valueRef.current = value;
    latest.current = {
      tick,
      wheel: onWheel,
      agree: () => !motion.active && follow(valueRef.current),
    };
    motion.configure(bounds);
  });

  // React's wheel listener is passive; this one may cancel the page's scroll.
  React.useEffect(() => {
    const el = element.current;
    if (!el) return;
    const listener = (e: WheelEvent) => latest.current.wheel(e);
    el.addEventListener("wheel", listener, { passive: false });
    return () => el.removeEventListener("wheel", listener);
  }, []);

  /** `turn: false` is a jump (Home, End, type-ahead): it reports no rows turned. */
  const go = (row: number, turn = true) => {
    const target = loop ? row : clamp(row, 0, len - 1);
    const from = resting.current;
    resting.current = target;
    report(target, turn ? from : target);
    reported.current = target;
    motion.goTo(target, performance.now());
    run();
  };

  // The value changed from outside (typed into the field, or set by the app).
  // Only a wheel held in a person's hand finishes first; a gliding one,
  // flung or not, turns to the new value, so a time typed into the field
  // while a wheel coasts is the one that stays.
  React.useEffect(() => follow(value));

  // Nothing the wheel scheduled may run once it is gone.
  React.useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      window.clearTimeout(typeahead.current.timer);
      window.clearTimeout(agreeTimer.current);
    },
    [],
  );

  // Undo the drum: how far from the middle a point is, as an angle, is how
  // many rows from the centre row it points at.
  const rowAt = (el: HTMLElement, clientY: number) => {
    const box = el.getBoundingClientRect();
    const fromMiddle = clamp((clientY - box.top - box.height / 2) / radius, -1, 1);
    const half = Math.floor(visibleRows / 2);
    const turn = clamp((Math.asin(fromMiddle) * 180) / Math.PI / rowDegrees, -half, half);
    return Math.round(motion.pos / itemHeight + turn);
  };

  // A finger, pen or mouse: the press holds the wheel (and stops a spinning
  // one), a drag turns it, the release flings it on.
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const scale = e.currentTarget.getBoundingClientRect().height / (visibleRows * itemHeight) || 1;
    press.current = { y: e.clientY, moved: false, stopped: motion.active, scale };
    motion.grab(e.timeStamp, e.clientY / scale);
    run();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (!p) return;
    if (Math.abs(e.clientY - p.y) > TAP_SLOP) p.moved = true;
    motion.drag(e.timeStamp, e.clientY / p.scale);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (!p) return;
    press.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    // A tap picks the row under it; a tap that stopped a spin only stops it.
    if (!p.moved && !p.stopped && e.type === "pointerup") go(rowAt(e.currentTarget, e.clientY));
    else motion.release(e.timeStamp);
    run();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // A key on a moving wheel steps from where it is headed, not from where
    // it last rested.
    const r = motion.active ? motion.targetRow : resting.current;
    const first = loop ? r - mod(r, len) : 0;
    const last = first + len - 1;
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
          go(loop ? nearestRow(retry, r, len) : retry, false);
        } else {
          go(loop ? nearestRow(hit, r, len) : hit, false);
        }
        break;
      }
    }
    e.preventDefault();
  };

  // The labels, a pool rebuilt only when the options change, so a new value
  // re-renders the wheel and not its rows. It is first drawn around the
  // resting row; from then on `paint` turns the drum and sets the labels.
  const [firstRest] = React.useState(selected);
  const rows = React.useMemo(() => {
    const at = firstRest - Math.floor(poolSize / 2);
    return Array.from({ length: poolSize }, (_, k) => {
      const i = at + mod(k - at, poolSize);
      const real = loop || (i >= 0 && i < len);
      return (
        <div
          key={k}
          role="presentation"
          data-index={i}
          className={cn(
            "absolute inset-x-0 flex items-center text-[22px] leading-none text-[var(--cdp-secondary)] tabular-nums data-active:text-[var(--cdp-label)]",
            align === "start"
              ? "justify-start"
              : align === "end"
                ? "justify-end"
                : "justify-center",
          )}
          style={{
            top: pad,
            height: itemHeight,
            paddingInline:
              align === "end" ? `0 ${inset}px` : align === "start" ? `${inset}px 0` : undefined,
          }}
        >
          <span style={drum(i - firstRest, rowDegrees, radius)}>
            {real ? options.at(mod(i, len))?.label : ""}
          </span>
        </div>
      );
    });
  }, [options, len, loop, firstRest, poolSize, pad, itemHeight, rowDegrees, radius, align, inset]);

  // The first layout, and a new pool, are drawn before they are seen.
  const paintedRows = React.useRef<typeof rows | null>(null);
  React.useLayoutEffect(() => {
    if (paintedRows.current === rows) return;
    const fresh = paintedRows.current !== null;
    paintedRows.current = rows;
    // New options (a 24-hour clock turned 12-hour, say): rows mean other
    // values now, so the wheel is placed on the value again.
    if (fresh) {
      resting.current = selected;
      motion.place(selected * itemHeight);
    }
    // React wrote the new labels where the pool first stood; label them all
    // again where the wheel stands now.
    paint(true);
  });

  const current = options.at(selected);

  return (
    // The focus ring hugs the centre row, outside the wheel and in the
    // middle of the group's fade, so the fade never dims it.
    <div className={cn("relative", className)}>
      <div
        ref={element}
        role="spinbutton"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-valuenow={current?.value}
        aria-valuetext={current?.label}
        aria-valuemin={options.at(0)?.value}
        aria-valuemax={options.at(-1)?.value}
        data-slot="wheel"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className="cdp-wheel peer relative w-full overflow-hidden outline-none select-none"
        style={{ height: visibleRows * itemHeight, touchAction: "none" }}
      >
        <div ref={pool} aria-hidden className="pointer-events-none absolute inset-0">
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

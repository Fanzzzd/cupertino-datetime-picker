import { clamp } from "./utils";
import {
  FLING_MS,
  easeOutCubic,
  glideDuration,
  releaseVelocity,
  type DragSample,
} from "./wheel-math";

/** How quickly the wheel catches up with wheel and trackpad input (ms). */
export const CHASE_MS = 40;
/** A wheel stream that pauses this long has ended, trackpad momentum included (ms). */
export const WHEEL_IDLE_MS = 100;
/** Past the first or last row a drag moves the wheel this much per px. */
export const RUBBER = 0.35;

type Mode =
  | { kind: "idle" }
  | { kind: "drag"; startY: number; startPos: number; samples: DragSample[] }
  | { kind: "glide"; from: number; distance: number; start: number; duration: number }
  | { kind: "chase"; target: number; last: number; at: number };

export type MotionBounds = {
  itemHeight: number;
  /** First and last row; a looped wheel has neither. */
  first: number;
  last: number;
  /** Reduced motion: every move lands at once. */
  instant: boolean;
};

/**
 * How a wheel moves, with no browser scrolling underneath. Position is in px
 * (row × itemHeight); input comes in as calls, and `step(now)` advances it.
 *
 * - A drag follows the finger, with a rubber band past the ends.
 * - A release glides on at the speed it let go and lands on a row.
 * - Wheel and trackpad deltas move a target that the wheel chases; when the
 *   stream stops (trackpad momentum is part of it), it glides onto a row at
 *   the speed it was moving.
 * - `goTo` glides to a row.
 */
export class WheelMotion {
  pos: number;
  private mode: Mode = { kind: "idle" };
  private bounds: MotionBounds;

  constructor(pos: number, bounds: MotionBounds) {
    this.pos = pos;
    this.bounds = bounds;
  }

  configure(bounds: MotionBounds) {
    this.bounds = bounds;
  }

  /** The row nearest the centre. */
  get row() {
    return Math.round(this.pos / this.bounds.itemHeight);
  }

  /** The row the wheel is headed for: where a glide or a chase will land. */
  get targetRow() {
    const m = this.mode;
    const h = this.bounds.itemHeight;
    if (m.kind === "glide") return Math.round((m.from + m.distance) / h);
    if (m.kind === "chase") return Math.round(m.target / h);
    return this.row;
  }

  /** Moving, or held: a wheel that is active has not settled. */
  get active() {
    return this.mode.kind !== "idle";
  }

  get dragging() {
    return this.mode.kind === "drag";
  }

  grab(t: number, y: number) {
    this.mode = { kind: "drag", startY: y, startPos: this.pos, samples: [{ t, top: this.pos }] };
  }

  drag(t: number, y: number) {
    const m = this.mode;
    if (m.kind !== "drag") return;
    this.pos = this.rubber(m.startPos - (y - m.startY));
    m.samples.push({ t, top: this.pos });
    // Keep only what the release speed reads.
    if (m.samples.length > 32) m.samples.splice(0, m.samples.length - 32);
  }

  release(t: number) {
    const m = this.mode;
    if (m.kind !== "drag") return;
    const v = releaseVelocity(m.samples, t);
    this.glideTo(Math.round((this.pos + v * FLING_MS) / this.bounds.itemHeight), v, t);
  }

  wheel(t: number, delta: number) {
    const { itemHeight, first, last } = this.bounds;
    const chasing = this.mode.kind === "chase" ? this.mode : null;
    const target = clamp(
      (chasing?.target ?? this.pos) + delta,
      first * itemHeight,
      last * itemHeight,
    );
    this.mode = { kind: "chase", target, last: t, at: chasing?.at ?? t };
  }

  /** Stand at `pos` at once, with nothing in motion. */
  place(pos: number) {
    this.pos = pos;
    this.mode = { kind: "idle" };
  }

  goTo(row: number, t: number) {
    this.glideTo(row, 0, t);
  }

  /** Advance to `t`; true while the wheel is still moving or held. */
  step(t: number): boolean {
    const m = this.mode;
    switch (m.kind) {
      case "idle":
        return false;
      case "drag":
        return true;
      case "glide": {
        const k = m.duration === 0 ? 1 : clamp((t - m.start) / m.duration, 0, 1);
        this.pos = m.from + m.distance * easeOutCubic(k);
        if (k < 1) return true;
        this.mode = { kind: "idle" };
        return false;
      }
      case "chase": {
        if (t - m.last > WHEEL_IDLE_MS || this.bounds.instant) {
          // The stream ended: land on the row nearest the target, leaving at
          // the speed the chase was moving.
          const v = this.bounds.instant ? 0 : (m.target - this.pos) / CHASE_MS;
          this.glideTo(Math.round(m.target / this.bounds.itemHeight), v, t);
          return this.step(t);
        }
        const dt = Math.max(0, t - m.at);
        m.at = t;
        this.pos += (m.target - this.pos) * (1 - Math.exp(-dt / CHASE_MS));
        return true;
      }
    }
  }

  private glideTo(row: number, velocity: number, t: number) {
    const { itemHeight, first, last, instant } = this.bounds;
    const distance = clamp(row, first, last) * itemHeight - this.pos;
    const duration = instant || distance === 0 ? 0 : glideDuration(distance, velocity);
    this.mode = { kind: "glide", from: this.pos, distance, start: t, duration };
  }

  private rubber(raw: number) {
    const { itemHeight, first, last } = this.bounds;
    const lo = first * itemHeight;
    const hi = last * itemHeight;
    if (raw < lo) return lo - (lo - raw) * RUBBER;
    if (raw > hi) return hi + (raw - hi) * RUBBER;
    return raw;
  }
}

import { clamp } from "./utils";

/** The row a scroll offset rests on. */
export function snapIndex(scrollTop: number, itemHeight: number): number {
  return Math.round(scrollTop / itemHeight);
}

/**
 * Where a released drag comes to rest. `velocity` is d(scrollTop)/dt in
 * px/ms; the projection mirrors UIScrollView's normal deceleration, then
 * lands on a row.
 */
/** How far a released wheel glides per px/ms of release speed: `velocity × FLING_MS`. */
export const FLING_MS = 460;

export type DragSample = { t: number; top: number };

/**
 * The speed (px/ms) a drag was released at: the distance covered over its
 * last `window` ms. Pointer events often arrive several to a millisecond,
 * so a per-event speed can read many times the real one. A drag that rested
 * before the release has no speed.
 */
export function releaseVelocity(samples: DragSample[], releasedAt: number, window = 100): number {
  const last = samples.at(-1);
  if (!last || releasedAt - last.t > 80) return 0;
  const first = samples.find((s) => last.t - s.t <= window) ?? last;
  const span = last.t - first.t;
  return span < 8 ? 0 : (last.top - first.top) / span;
}

/**
 * How long (ms) the glide `top = from + distance·easeOutCubic(t / T)` runs.
 * Its starting speed is `3·distance / T`, so T = 3·distance / velocity
 * leaves at exactly the release speed, and the cubic comes to rest on the
 * row with no crawl. A release with no speed settles in 180 ms.
 */
export function glideDuration(distance: number, velocity: number): number {
  const moving = Math.abs(velocity) > 0.05 && Math.sign(velocity) === Math.sign(distance);
  return clamp(moving ? (3 * distance) / velocity : 180, 120, 2000);
}

export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

export function flingTarget(
  scrollTop: number,
  velocity: number,
  itemHeight: number,
  maxIndex: number,
): number {
  const projected = scrollTop + velocity * FLING_MS;
  return clamp(snapIndex(projected, itemHeight), 0, maxIndex);
}

/** Of the copies of `logical` in a looped wheel, the one nearest `from`. */
export function nearestCopy(logical: number, from: number, len: number, copies: number): number {
  let best = logical;
  for (let c = 0; c < copies; c++) {
    const candidate = c * len + logical;
    if (Math.abs(candidate - from) < Math.abs(best - from)) best = candidate;
  }
  return best;
}

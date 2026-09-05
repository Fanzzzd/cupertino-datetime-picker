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
export function flingTarget(
  scrollTop: number,
  velocity: number,
  itemHeight: number,
  maxIndex: number,
): number {
  const projected = scrollTop + velocity * 380;
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

export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

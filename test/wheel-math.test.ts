import { expect, test } from "vitest";

import { flingTarget, nearestCopy, snapIndex } from "../src/wheel-math";

test("snapIndex rounds to the nearest row", () => {
  expect(snapIndex(47, 32)).toBe(1);
  expect(snapIndex(49, 32)).toBe(2);
});

test("flingTarget projects the velocity and clamps", () => {
  expect(flingTarget(320, 0, 32, 100)).toBe(10);
  expect(flingTarget(320, 1, 32, 100)).toBe(22);
  expect(flingTarget(320, -5, 32, 100)).toBe(0);
  expect(flingTarget(320, 50, 32, 100)).toBe(100);
});

test("nearestCopy picks the copy that spins the short way", () => {
  // 12 options, 7 copies; resting at 11 in the middle copy, going to 0 should go forward.
  const base = 3 * 12;
  expect(nearestCopy(0, base + 11, 12, 7)).toBe(base + 12);
  expect(nearestCopy(10, base + 0, 12, 7)).toBe(base - 2);
});

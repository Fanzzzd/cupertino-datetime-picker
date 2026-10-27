import { expect, test } from "vitest";

import {
  flingTarget,
  glideDuration,
  nearestCopy,
  releaseVelocity,
  snapIndex,
} from "../src/wheel-math";

test("snapIndex rounds to the nearest row", () => {
  expect(snapIndex(47, 32)).toBe(1);
  expect(snapIndex(49, 32)).toBe(2);
});

test("flingTarget projects the velocity and clamps", () => {
  expect(flingTarget(320, 0, 32, 100)).toBe(10);
  expect(flingTarget(320, 1, 32, 100)).toBe(24);
  expect(flingTarget(320, -5, 32, 100)).toBe(0);
  expect(flingTarget(320, 50, 32, 100)).toBe(100);
});

test("nearestCopy picks the copy that spins the short way", () => {
  // 12 options, 7 copies; resting at 11 in the middle copy, going to 0 should go forward.
  const base = 3 * 12;
  expect(nearestCopy(0, base + 11, 12, 7)).toBe(base + 12);
  expect(nearestCopy(10, base + 0, 12, 7)).toBe(base - 2);
});

test("releaseVelocity reads the last 100 ms, not one bunched-up event", () => {
  // 0.4 px/ms, with two events landing in the same millisecond at the end.
  const samples = [0, 20, 40, 60, 80, 100, 120, 120].map((t, i) => ({
    t,
    top: t * 0.4 + (i === 7 ? 3 : 0),
  }));
  expect(releaseVelocity(samples, 121)).toBeCloseTo(0.43, 1);
  // Resting before the release: no glide.
  expect(releaseVelocity(samples, 300)).toBe(0);
  expect(releaseVelocity([{ t: 0, top: 0 }], 1)).toBe(0);
});

test("glideDuration leaves at the release speed", () => {
  // easeOutCubic starts at 3·distance/T.
  expect(glideDuration(300, 1)).toBe(900);
  expect(glideDuration(-200, -1.5)).toBe(400);
  // No speed, or a glide against it: a short settle.
  expect(glideDuration(12, 0)).toBe(180);
  expect(glideDuration(-12, 1)).toBe(180);
  expect(glideDuration(5000, 1)).toBe(2000);
});

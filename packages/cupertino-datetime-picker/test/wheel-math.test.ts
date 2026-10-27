import { expect, test } from "vitest";

import { glideDuration, nearestRow, releaseVelocity } from "../src/wheel-math";

test("nearestRow spins the short way round", () => {
  // 12 options; resting on 11, going to 0 goes forward one row.
  expect(nearestRow(0, 11, 12)).toBe(12);
  expect(nearestRow(10, 0, 12)).toBe(-2);
  expect(nearestRow(5, 29, 12)).toBe(29);
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

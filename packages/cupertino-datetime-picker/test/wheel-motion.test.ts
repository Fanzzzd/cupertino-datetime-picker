import { expect, test } from "vitest";

import { CHASE_MS, WHEEL_IDLE_MS, WheelMotion } from "../src/wheel-motion";

const H = 32;
const looped = { itemHeight: H, first: -Infinity, last: Infinity, instant: false };
const twelve = { itemHeight: H, first: 0, last: 11, instant: false };

/** Steps the motion at 60 fps until it rests; returns every position. */
function run(m: WheelMotion, from: number, limit = 5000) {
  const seen: number[] = [];
  for (let t = from; t < from + limit; t += 16) {
    const moving = m.step(t);
    seen.push(m.pos);
    if (!moving) return { seen, at: t };
  }
  throw new Error("never settled");
}

test("a drag follows the pointer, and a slow release lands on the nearest row", () => {
  const m = new WheelMotion(5 * H, twelve);
  m.grab(0, 100);
  m.drag(16, 60);
  expect(m.pos).toBe(5 * H + 40);
  m.drag(400, 50);
  m.release(500);
  run(m, 500);
  expect(m.row).toBe(7);
  expect(m.pos).toBe(7 * H);
});

test("a fling glides on from the release speed and lands on a row", () => {
  const m = new WheelMotion(0, looped);
  m.grab(0, 300);
  for (let t = 10; t <= 100; t += 10) m.drag(t, 300 - t * 2); // 2 px/ms upward
  m.release(101);
  const { seen } = run(m, 101);
  // Leaves at about the release speed: the first frame covers ~2 px/ms × 16 ms.
  expect(seen[1]! - seen[0]!).toBeGreaterThan(24);
  expect(seen[1]! - seen[0]!).toBeLessThan(40);
  // Never turns back, and rests on a row.
  for (let i = 1; i < seen.length; i++) expect(seen[i]!).toBeGreaterThanOrEqual(seen[i - 1]!);
  expect(m.pos % H).toBe(0);
  expect(m.row).toBeGreaterThan(20);
});

test("a drag past the ends stretches, and the release springs back", () => {
  const m = new WheelMotion(0, twelve);
  m.grab(0, 0);
  m.drag(16, 100);
  expect(m.pos).toBe(-35);
  m.release(400);
  run(m, 400);
  expect(m.pos).toBe(0);
});

test("wheel deltas are chased smoothly, then land on a row when the stream stops", () => {
  const m = new WheelMotion(0, looped);
  const seen: number[] = [];
  let t = 0;
  for (let i = 0; i < 30; i++, t += 16) {
    m.wheel(t, 20);
    m.step(t);
    seen.push(m.pos);
  }
  // The chase moves every frame, and never by more than a few rows.
  for (let i = 1; i < seen.length; i++) {
    expect(seen[i]! - seen[i - 1]!).toBeGreaterThan(0);
    expect(seen[i]! - seen[i - 1]!).toBeLessThan(2 * H);
  }
  const before = m.pos;
  const { seen: tail, at } = run(m, t);
  expect(at - t).toBeGreaterThan(WHEEL_IDLE_MS);
  // The landing carries on the way it was going, at no more than its speed.
  expect(tail[0]!).toBeGreaterThanOrEqual(before);
  expect(m.pos % H).toBe(0);
  expect(m.row).toBe(Math.round(600 / H));
});

test("wheel input stops at the ends of a wheel that does not loop", () => {
  const m = new WheelMotion(10 * H, twelve);
  for (let t = 0; t < 200; t += 16) {
    m.wheel(t, 200);
    m.step(t);
  }
  run(m, 200);
  expect(m.row).toBe(11);
});

test("a looped wheel turns without end", () => {
  const m = new WheelMotion(0, looped);
  m.goTo(-5000, 0);
  run(m, 0);
  expect(m.row).toBe(-5000);
});

test("goTo glides; reduced motion lands at once", () => {
  const m = new WheelMotion(0, twelve);
  m.goTo(3, 0);
  expect(m.step(16)).toBe(true);
  run(m, 16);
  expect(m.pos).toBe(3 * H);

  const still = new WheelMotion(0, { ...twelve, instant: true });
  still.goTo(4, 0);
  expect(still.step(0)).toBe(false);
  expect(still.pos).toBe(4 * H);
  // Small deltas add up, and land once the stream stops.
  for (let t = 0; t < 60; t += 4) {
    still.wheel(t, 8);
    still.step(t);
  }
  expect(still.pos).toBe(4 * H + 120);
  expect(still.step(500)).toBe(false);
  expect(still.row).toBe(8);
});

test("a held wheel stays held", () => {
  const m = new WheelMotion(0, looped);
  m.grab(0, 0);
  m.drag(10, -40);
  expect(m.step(10_000)).toBe(true);
  expect(m.pos).toBe(40);
  expect(CHASE_MS).toBeGreaterThan(0);
});

test("place stands still where it is put", () => {
  const m = new WheelMotion(0, looped);
  m.goTo(9, 0);
  m.place(3 * H);
  expect(m.active).toBe(false);
  expect(m.row).toBe(3);
});

test("targetRow is where a glide or a chase will land", () => {
  const m = new WheelMotion(0, looped);
  m.goTo(5, 0);
  m.step(50);
  expect(m.targetRow).toBe(5);
  m.wheel(60, 4 * H);
  expect(m.targetRow).toBe(Math.round((m.pos + 4 * H) / H));
});

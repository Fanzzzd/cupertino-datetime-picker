import { expect, test } from "vitest";

import { stepValue, typeDigit } from "../src/segments";

test("hour in 12-hour: 1 waits, 12 completes, 13 restarts as 3", () => {
  const one = typeDigit("", "1", 1, 12);
  expect(one).toEqual({ buffer: "1", value: 1, done: false });
  expect(typeDigit(one.buffer, "2", 1, 12)).toEqual({ buffer: "12", value: 12, done: true });
  expect(typeDigit(one.buffer, "3", 1, 12)).toEqual({ buffer: "3", value: 3, done: true });
});

test("a leading zero waits for the second digit", () => {
  const zero = typeDigit("", "0", 1, 12);
  expect(zero).toEqual({ buffer: "0", value: null, done: false });
  expect(typeDigit(zero.buffer, "9", 1, 12)).toEqual({ buffer: "09", value: 9, done: true });
});

test("minutes: 6 completes at once, 5 waits for 59", () => {
  expect(typeDigit("", "6", 0, 59)).toEqual({ buffer: "6", value: 6, done: true });
  const five = typeDigit("", "5", 0, 59);
  expect(five.done).toBe(false);
  expect(typeDigit(five.buffer, "9", 0, 59)).toEqual({ buffer: "59", value: 59, done: true });
});

test("24-hour: 2 waits, 24 restarts as 4", () => {
  expect(typeDigit("", "2", 0, 23).done).toBe(false);
  expect(typeDigit("2", "4", 0, 23)).toEqual({ buffer: "4", value: 4, done: true });
});

test("stepValue wraps at both ends", () => {
  expect(stepValue(12, 1, 1, 12)).toBe(1);
  expect(stepValue(1, -1, 1, 12)).toBe(12);
  expect(stepValue(59, 1, 0, 59)).toBe(0);
  expect(stepValue(0, -5, 0, 59)).toBe(55);
});

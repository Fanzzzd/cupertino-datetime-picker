import { describe, expect, test } from "vitest";

import {
  addMonths,
  clampDay,
  clampMonth,
  clampTime,
  isSameDay,
  monthGrid,
  shiftMonth,
  tabStop,
  weekStartFor,
  withDay,
  yearRange,
} from "../src/calendar";

describe("monthGrid", () => {
  test("only the rows a month needs, leading blanks for the first weekday", () => {
    // September 2026 starts on a Tuesday.
    const rows = monthGrid(2026, 8, 0);
    expect(rows).toHaveLength(5);
    expect(rows[0]!.map((c) => c.inMonth)).toEqual([false, false, true, true, true, true, true]);
    expect(rows[0]![2]!.date.getDate()).toBe(1);
    expect(rows[4]![3]!.date.getDate()).toBe(30);
  });

  test("a Monday week start moves the blanks", () => {
    const rows = monthGrid(2026, 8, 1);
    expect(rows[0]!.map((c) => c.inMonth)).toEqual([false, true, true, true, true, true, true]);
  });

  test("six rows when a long month starts late", () => {
    // August 2026 starts on a Saturday and has 31 days.
    expect(monthGrid(2026, 7, 0)).toHaveLength(6);
  });
});

test("shiftMonth wraps years", () => {
  expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
  expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
});

test("withDay keeps the clock and clamps the day into the month", () => {
  const base = new Date(2026, 0, 31, 18, 30);
  const feb = withDay(base, 2026, 1, 31);
  expect([feb.getMonth(), feb.getDate(), feb.getHours(), feb.getMinutes()]).toEqual([
    1, 28, 18, 30,
  ]);
  expect(addMonths(base, 1).getDate()).toBe(28);
});

test("isSameDay ignores the clock", () => {
  expect(isSameDay(new Date(2026, 8, 5, 1), new Date(2026, 8, 5, 23))).toBe(true);
  expect(isSameDay(new Date(2026, 8, 5), null)).toBe(false);
});

test("weekStartFor follows the locale", () => {
  expect(weekStartFor("en-US")).toBe(0);
  expect(weekStartFor("de-DE")).toBe(1);
  expect(weekStartFor("zh-CN")).toBe(1);
});

test("clampDay stops at the limits and keeps the clock", () => {
  const min = new Date(2026, 8, 1);
  const max = new Date(2026, 8, 20, 9);
  expect(clampDay(new Date(2026, 9, 5, 18, 30), min, max)).toEqual(new Date(2026, 8, 20, 18, 30));
  expect(clampDay(new Date(2026, 7, 5, 7), min, max)).toEqual(new Date(2026, 8, 1, 7));
  expect(clampDay(new Date(2026, 8, 20, 23), min, max)).toEqual(new Date(2026, 8, 20, 23));
});

test("clampMonth keeps the view inside min and max", () => {
  const min = new Date(2026, 8, 15);
  const max = new Date(2026, 10, 3);
  expect(clampMonth({ year: 2026, month: 0 }, min, max)).toEqual({ year: 2026, month: 8 });
  expect(clampMonth({ year: 2027, month: 0 }, min, max)).toEqual({ year: 2026, month: 10 });
  expect(clampMonth({ year: 2026, month: 9 }, min, max)).toEqual({ year: 2026, month: 9 });
});

test("tabStop picks a day the month shows", () => {
  const oct = { year: 2026, month: 9 };
  const focused = new Date(2026, 8, 5);
  const today = new Date(2026, 9, 12);
  expect(tabStop(oct, [focused, null, today])).toEqual(today);
  expect(tabStop(oct, [focused, null, null])).toEqual(new Date(2026, 9, 1));
  // The 1st is before min: the first day that can be picked.
  expect(tabStop(oct, [focused], new Date(2026, 9, 8))).toEqual(new Date(2026, 9, 8));
  expect(tabStop(oct, [new Date(2026, 9, 3)])).toEqual(new Date(2026, 9, 3));
});

test("yearRange reaches the value's year, or spans min to max", () => {
  expect(yearRange(2026, 2026, 100)).toEqual([1926, 2126]);
  expect(yearRange(2026, 1900, 100)).toEqual([1900, 2126]);
  expect(yearRange(2026, 2026, 100, new Date(2020, 0, 1), new Date(2030, 0, 1))).toEqual([
    2020, 2030,
  ]);
  // A min far ahead still leaves years to pick.
  // The panel passes the view's year, already clamped into range.
  expect(yearRange(2026, 2200, 100, new Date(2200, 0, 1))).toEqual([2200, 2300]);
  expect(yearRange(2026, 1800, 100, undefined, new Date(1800, 0, 1))).toEqual([1700, 1800]);
});

test("clampTime keeps instants inside min and max", () => {
  const min = new Date(2026, 8, 3, 10, 15);
  const max = new Date(2026, 8, 20, 17, 45);
  expect(clampTime(new Date(2026, 8, 20, 18, 30), min, max)).toEqual(max);
  expect(clampTime(new Date(2026, 8, 3, 1, 59), min, max)).toEqual(min);
  const inside = new Date(2026, 8, 10, 12);
  expect(clampTime(inside, min, max)).toBe(inside);
});

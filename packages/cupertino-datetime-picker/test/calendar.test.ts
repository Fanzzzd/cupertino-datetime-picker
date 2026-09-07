import { describe, expect, test } from "vitest";

import {
  addMonths,
  isSameDay,
  monthGrid,
  shiftMonth,
  weekStartFor,
  withDay,
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

import { expect, test } from "vitest";

import {
  dayPeriodLabels,
  formatClock,
  hourCycleFor,
  monthNames,
  to12,
  to24,
  weekdayNames,
} from "../src/time";

test("hour cycle follows the locale", () => {
  expect(hourCycleFor("en-US")).toBe("h12");
  expect(hourCycleFor("de-DE")).toBe("h23");
  expect(hourCycleFor("zh-CN")).toBe("h23");
});

test("12-hour conversion round-trips", () => {
  expect(to12(0)).toEqual({ hour: 12, pm: false });
  expect(to12(12)).toEqual({ hour: 12, pm: true });
  expect(to12(18)).toEqual({ hour: 6, pm: true });
  for (let h = 0; h < 24; h++) {
    const { hour, pm } = to12(h);
    expect(to24(hour, pm)).toBe(h);
  }
});

test("labels come from Intl", () => {
  expect(dayPeriodLabels("en-US")).toEqual({ am: "AM", pm: "PM" });
  expect(monthNames("en-US")[8]).toBe("September");
  expect(weekdayNames("en-US", 0)).toEqual(["S", "M", "T", "W", "T", "F", "S"]);
  expect(weekdayNames("de-DE", 1)[0]).toBe("M");
  expect(formatClock(new Date(2026, 8, 5, 18, 30), "en-US", "h12")).toBe("6:30 PM");
  expect(formatClock(new Date(2026, 8, 5, 18, 30), "en-US", "h23")).toBe("18:30");
});

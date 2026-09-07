/**
 * Calendar arithmetic on local `Date`s, with no library. A picker only ever
 * needs the month grid, day-level comparisons, and "same clock, other day".
 */
export type YearMonth = { year: number; month: number };

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isSameDay(a: Date | null | undefined, b: Date | null | undefined): boolean {
  return (
    !!a &&
    !!b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function yearMonthOf(date: Date): YearMonth {
  return { year: date.getFullYear(), month: date.getMonth() };
}

/** Months between `a` and `b`; negative when `b` is earlier. */
export function monthDiff(a: YearMonth, b: YearMonth): number {
  return (b.year - a.year) * 12 + (b.month - a.month);
}

export function shiftMonth(ym: YearMonth, by: number): YearMonth {
  const total = ym.month + by;
  return { year: ym.year + Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

/** The same clock on another calendar day; the day is clamped into the month. */
export function withDay(base: Date, year: number, month: number, day: number): Date {
  const next = new Date(base);
  next.setFullYear(year, month, Math.min(day, daysInMonth(year, month)));
  return next;
}

export function withTime(base: Date, hours: number, minutes: number): Date {
  const next = new Date(base);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(date: Date, months: number): Date {
  const ym = shiftMonth(yearMonthOf(date), months);
  return withDay(date, ym.year, ym.month, date.getDate());
}

/** Whether the whole day lies outside [min, max]. */
export function isDayDisabled(date: Date, min?: Date, max?: Date): boolean {
  const day = startOfDay(date).getTime();
  if (min && day < startOfDay(min).getTime()) return true;
  if (max && day > startOfDay(max).getTime()) return true;
  return false;
}

export type DayCell = { date: Date; inMonth: boolean };

/**
 * Rows of seven for one month, starting on `weekStart` (0 = Sunday). Only as
 * many rows as the month needs, like the iOS inline calendar.
 */
export function monthGrid(year: number, month: number, weekStart: number): DayCell[][] {
  const lead = (new Date(year, month, 1).getDay() - weekStart + 7) % 7;
  const rows = Math.ceil((lead + daysInMonth(year, month)) / 7);
  return Array.from({ length: rows }, (_row, r) =>
    Array.from({ length: 7 }, (_cell, c) => {
      const date = new Date(year, month, r * 7 + c - lead + 1);
      return { date, inMonth: date.getMonth() === month };
    }),
  );
}

/** First day of the week for a locale, 0 = Sunday … 6 = Saturday. */
export function weekStartFor(locale: string): number {
  const firstDay = readFirstDay(locale);
  if (firstDay !== undefined) return firstDay % 7;
  return /^(en-(US|CA|AU)|ja|ko|zh-(TW|HK)|he|pt-BR|es-(MX|US))\b/i.test(locale) ? 0 : 1;
}

/**
 * `Intl.Locale#getWeekInfo` (or the older `weekInfo` getter) where the engine
 * has it, read without assuming either exists in the type library.
 */
function readFirstDay(locale: string): number | undefined {
  let l: object;
  try {
    l = new Intl.Locale(locale);
  } catch {
    return undefined;
  }
  const info: unknown =
    "getWeekInfo" in l && typeof l.getWeekInfo === "function"
      ? l.getWeekInfo()
      : "weekInfo" in l
        ? l.weekInfo
        : undefined;
  return typeof info === "object" &&
    info !== null &&
    "firstDay" in info &&
    typeof info.firstDay === "number"
    ? info.firstDay
    : undefined;
}

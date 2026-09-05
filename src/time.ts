/**
 * Clock helpers on top of `Intl`, so 12/24-hour, day-period labels, and month
 * and weekday names all follow the locale instead of a hard-coded table.
 */
export type HourCycle = "h12" | "h23";

export function hourCycleFor(locale: string): HourCycle {
  const cycle = new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions().hourCycle;
  return cycle === "h11" || cycle === "h12" ? "h12" : "h23";
}

export function to12(hour24: number): { hour: number; pm: boolean } {
  return { hour: hour24 % 12 === 0 ? 12 : hour24 % 12, pm: hour24 >= 12 };
}

export function to24(hour12: number, pm: boolean): number {
  return (hour12 % 12) + (pm ? 12 : 0);
}

export function dayPeriodLabels(locale: string): { am: string; pm: string } {
  const f = new Intl.DateTimeFormat(locale, { hour: "numeric", hourCycle: "h12" });
  const label = (hour: number) =>
    f.formatToParts(new Date(2000, 0, 1, hour)).find((p) => p.type === "dayPeriod")?.value ??
    (hour < 12 ? "AM" : "PM");
  return { am: label(1), pm: label(13) };
}

export function monthNames(locale: string, style: "long" | "short" = "long"): string[] {
  const f = new Intl.DateTimeFormat(locale, { month: style });
  return Array.from({ length: 12 }, (_, m) => f.format(new Date(2000, m, 1)));
}

/** Seven names starting on `weekStart` (0 = Sunday). */
export function weekdayNames(
  locale: string,
  weekStart: number,
  style: "narrow" | "short" = "narrow",
): string[] {
  const f = new Intl.DateTimeFormat(locale, { weekday: style });
  // 2023-01-01 is a Sunday.
  return Array.from({ length: 7 }, (_, i) =>
    f.format(new Date(2023, 0, 1 + ((weekStart + i) % 7))),
  );
}

/** The locale's medium date, as the iOS pill shows it: "Sep 5, 2026", "05.09.2026", "2026年9月5日". */
export function formatDay(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}

/** "6:30 PM" on a 12-hour clock, "06:30" on a 24-hour one. */
export function formatClock(date: Date, locale: string, hourCycle: HourCycle): string {
  return new Intl.DateTimeFormat(locale, {
    hour: hourCycle === "h12" ? "numeric" : "2-digit",
    minute: "2-digit",
    hourCycle,
  }).format(date);
}

export function formatMonthYear(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(date);
}

export function formatFullDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

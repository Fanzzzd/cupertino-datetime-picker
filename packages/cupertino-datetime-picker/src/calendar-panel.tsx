"use client";

import * as React from "react";

import {
  addDays,
  addMonths,
  clampDay,
  clampMonth,
  isDayDisabled,
  isSameDay,
  monthDiff,
  monthGrid,
  shiftMonth,
  startOfDay,
  tabStop,
  weekStartFor,
  withDay,
  yearMonthOf,
  yearRange,
  type YearMonth,
} from "./calendar";
import { useBrowserLocale } from "./hooks";
import { formatFullDate, formatMonthYear, monthNames, weekdayNames } from "./time";
import { cn } from "./utils";
import { Wheel, WheelHighlight } from "./wheel";

export type CalendarPanelLabels = {
  previousMonth: string;
  nextMonth: string;
  month: string;
  year: string;
  /** Closes the month/year wheels. */
  done: string;
};

export const CALENDAR_LABELS: CalendarPanelLabels = {
  previousMonth: "Previous month",
  nextMonth: "Next month",
  month: "Month",
  year: "Year",
  done: "Done",
};

export type CalendarPanelProps = {
  value: Date | null;
  onChange: (date: Date) => void;
  locale?: string;
  min?: Date;
  max?: Date;
  /** Accessible names; visible text comes from `Intl`. */
  labels?: Partial<CalendarPanelLabels>;
  /** Injected for tests and stories. */
  today?: Date;
  className?: string;
};

const YEAR_SPAN = 100;
const SWIPE_PX = 40;

function Chevron({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={cn("size-5", className)} aria-hidden fill="none">
      <path
        d="M7.5 4.5 13 10l-5.5 5.5"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The iOS inline calendar: month title that opens month/year wheels, next
 * and previous month, a grid of circles. Months slide, the wheels cross-fade
 * in over the grid, a horizontal swipe changes month, and the keyboard walks
 * the grid (arrows, Home/End, PageUp/PageDown, Enter).
 */
export function CalendarPanel({
  value,
  onChange,
  locale: localeProp,
  min,
  max,
  labels: labelsProp,
  today: todayProp,
  className,
}: CalendarPanelProps) {
  const labels = { ...CALENDAR_LABELS, ...labelsProp };
  const browserLocale = useBrowserLocale();
  const locale = localeProp ?? browserLocale;
  const title = React.useRef<HTMLButtonElement>(null);
  const [thisDay] = React.useState(() => startOfDay(new Date()));
  const today = todayProp ?? thisDay;
  const weekStart = weekStartFor(locale);
  const [view, setView] = React.useState<YearMonth>(() =>
    clampMonth(yearMonthOf(value ?? today), min, max),
  );
  const [dir, setDir] = React.useState<-1 | 0 | 1>(0);
  const [picking, setPicking] = React.useState(false);
  // While the wheels are up the body keeps the height the day grid had, so
  // scrolling to a month that needs one more row does not grow the panel.
  const [pickingHeight, setPickingHeight] = React.useState<number>();
  const days = React.useRef<HTMLDivElement>(null);
  const [focusDate, setFocusDate] = React.useState<Date>(value ?? today);
  const wantFocus = React.useRef(false);
  const grid = React.useRef<HTMLDivElement>(null);
  const swipe = React.useRef<{ x: number; y: number } | null>(null);

  // A value set from outside moves the view to its month.
  const [seen, setSeen] = React.useState(value);
  if (value !== seen) {
    setSeen(value);
    if (value && monthDiff(view, yearMonthOf(value)) !== 0) {
      setDir(0);
      setView(clampMonth(yearMonthOf(value), min, max));
      setFocusDate(value);
    }
  }

  const togglePicking = () => {
    if (!picking) setPickingHeight(days.current?.offsetHeight);
    setPicking(!picking);
  };

  // The view never leaves the months of [min, max]; a wheel turned past
  // them comes back.
  const show = (next: YearMonth, direction: -1 | 0 | 1) => {
    setDir(direction);
    setView(clampMonth(next, min, max));
  };
  const shift = (by: number) => show(shiftMonth(view, by), by > 0 ? 1 : -1);
  // The month wheel wraps within the year, so September turned five rows
  // on reads February of the same year. Out of range, a turn stops at the
  // limit it was heading for, and a jump (End, type-ahead) at the nearest.
  const pickMonth = (month: number, rows: number) => {
    const plain = { year: view.year, month };
    const inRange = monthDiff(clampMonth(plain, min, max), plain) === 0;
    show(inRange || rows === 0 ? plain : shiftMonth(view, rows), 0);
  };

  const canShift = (by: number) => {
    const target = shiftMonth(view, by);
    if (by < 0 && min && monthDiff(yearMonthOf(min), target) < 0) return false;
    if (by > 0 && max && monthDiff(target, yearMonthOf(max)) < 0) return false;
    return true;
  };

  const pick = (date: Date) => {
    setFocusDate(date);
    onChange(withDay(value ?? today, date.getFullYear(), date.getMonth(), date.getDate()));
  };

  // A key that would leave [min, max] stops at the limit.
  const moveFocus = (to: Date) => {
    const next = clampDay(to, min, max);
    wantFocus.current = true;
    setFocusDate(next);
    const diff = monthDiff(view, yearMonthOf(next));
    if (diff !== 0) show(yearMonthOf(next), diff > 0 ? 1 : -1);
  };

  React.useEffect(() => {
    if (!wantFocus.current) return;
    wantFocus.current = false;
    grid.current
      ?.querySelector<HTMLButtonElement>(`[data-date="${startOfDay(focusDate).getTime()}"]`)
      ?.focus();
  }, [focusDate]);

  const onGridKeyDown = (e: React.KeyboardEvent) => {
    const f = focusDate;
    const jump = new Map<string, () => Date>([
      ["ArrowLeft", () => addDays(f, -1)],
      ["ArrowRight", () => addDays(f, 1)],
      ["ArrowUp", () => addDays(f, -7)],
      ["ArrowDown", () => addDays(f, 7)],
      ["Home", () => addDays(f, -((f.getDay() - weekStart + 7) % 7))],
      ["End", () => addDays(f, 6 - ((f.getDay() - weekStart + 7) % 7))],
      ["PageUp", () => addMonths(f, e.shiftKey ? -12 : -1)],
      ["PageDown", () => addMonths(f, e.shiftKey ? 12 : 1)],
    ]);
    const to = jump.get(e.key);
    if (!to) return;
    e.preventDefault();
    moveFocus(to());
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(e.clientY - s.y)) return;
    const by = dx < 0 ? 1 : -1;
    if (canShift(by)) shift(by);
  };

  const rows = monthGrid(view.year, view.month, weekStart);
  // One day in the shown month takes Tab, whichever month that is.
  const stop = tabStop(view, [focusDate, value, today], min, max);
  const viewDate = new Date(view.year, view.month, 1);
  // Stable between renders, so the wheels keep their rows.
  const months = React.useMemo(
    () => monthNames(locale).map((label, month) => ({ value: month, label })),
    [locale],
  );
  const [firstYear, lastYear] = yearRange(today.getFullYear(), view.year, YEAR_SPAN, min, max);
  const years = React.useMemo(
    () =>
      Array.from({ length: lastYear - firstYear + 1 }, (_, i) => {
        const year = firstYear + i;
        return { value: year, label: String(year) };
      }),
    [firstYear, lastYear],
  );

  return (
    <div
      className={cn("cdp flex w-[336px] max-w-[calc(100vw-16px)] flex-col select-none", className)}
      data-slot="calendar"
    >
      <div className="flex h-11 items-center justify-between pr-1 pl-2.5">
        <button
          ref={title}
          type="button"
          aria-expanded={picking}
          onClick={togglePicking}
          className="flex h-9 items-center gap-1 rounded-lg px-1.5 text-[17px] font-semibold tracking-[-0.01em] text-[var(--cdp-label)] transition-[opacity,color] outline-none active:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--cdp-tint)] aria-expanded:text-[var(--cdp-tint)]"
        >
          <span>{formatMonthYear(viewDate, locale)}</span>
          <Chevron
            className={cn(
              "size-4 text-[var(--cdp-tint)] transition-transform duration-200",
              picking && "rotate-90",
            )}
          />
        </button>
        <div className="grid">
          <button
            type="button"
            // Hidden layers are inert: nothing invisible takes focus or a key.
            inert={!picking}
            onClick={() => {
              // Done is about to go inert; focus goes back to the title,
              // the control that opened the wheels.
              title.current?.focus();
              togglePicking();
            }}
            className={cn(
              "col-start-1 row-start-1 h-9 self-center justify-self-end rounded-lg px-2 text-[17px] font-semibold text-[var(--cdp-tint)] transition-opacity duration-150 outline-none active:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--cdp-tint)]",
              !picking && "pointer-events-none opacity-0",
            )}
          >
            {labels.done}
          </button>
          <div
            className={cn(
              "col-start-1 row-start-1 flex items-center transition-opacity duration-150",
              picking && "pointer-events-none opacity-0",
            )}
            inert={picking}
          >
            <button
              type="button"
              aria-label={labels.previousMonth}
              disabled={!canShift(-1)}
              onClick={() => shift(-1)}
              className="flex size-11 items-center justify-center rounded-full text-[var(--cdp-tint)] transition-opacity outline-none active:opacity-40 disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-[var(--cdp-tint)]"
            >
              <Chevron className="rotate-180" />
            </button>
            <button
              type="button"
              aria-label={labels.nextMonth}
              disabled={!canShift(1)}
              onClick={() => shift(1)}
              className="flex size-11 items-center justify-center rounded-full text-[var(--cdp-tint)] transition-opacity outline-none active:opacity-40 disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-[var(--cdp-tint)]"
            >
              <Chevron />
            </button>
          </div>
        </div>
      </div>

      <div
        className={cn("relative grid px-1.5 pb-1.5", picking && "overflow-hidden")}
        style={{ gridTemplateRows: picking && pickingHeight ? `${pickingHeight}px` : undefined }}
      >
        {/* Day grid and the month/year wheels share the cell; one fades out as the other fades in. */}
        <div
          ref={days}
          className={cn(
            "col-start-1 row-start-1 transition-[opacity,transform] duration-200",
            picking && "pointer-events-none scale-95 opacity-0",
          )}
          inert={picking}
        >
          <div className="grid grid-cols-7" aria-hidden>
            {weekdayNames(locale, weekStart, "short").map((name, i) => (
              <div
                key={i}
                className="flex h-8 items-center justify-center text-[12px] font-semibold tracking-[0.04em] text-[var(--cdp-secondary)] uppercase"
              >
                {name}
              </div>
            ))}
          </div>
          <div
            ref={grid}
            role="grid"
            tabIndex={-1}
            aria-label={formatMonthYear(viewDate, locale)}
            key={`${view.year}-${view.month}`}
            data-dir={dir}
            onKeyDown={onGridKeyDown}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            className="grid grid-cols-7 gap-y-1.5 data-[dir=-1]:animate-[cdp-slide-from-left_240ms_cubic-bezier(0.2,0.9,0.3,1)] data-[dir=1]:animate-[cdp-slide-from-right_240ms_cubic-bezier(0.2,0.9,0.3,1)]"
            style={{ touchAction: "pan-y" }}
          >
            {rows.flat().map(({ date, inMonth }, i) => {
              if (!inMonth) return <div key={i} role="gridcell" aria-hidden />;
              const selected = isSameDay(date, value);
              const isToday = isSameDay(date, today);
              const disabled = isDayDisabled(date, min, max);
              return (
                <button
                  key={i}
                  type="button"
                  role="gridcell"
                  aria-selected={selected}
                  aria-label={formatFullDate(date, locale)}
                  aria-current={isToday ? "date" : undefined}
                  data-date={startOfDay(date).getTime()}
                  data-today={isToday || undefined}
                  data-selected={selected || undefined}
                  tabIndex={isSameDay(date, stop) ? 0 : -1}
                  disabled={disabled}
                  onClick={() => pick(date)}
                  onFocus={() => {
                    if (!isSameDay(date, focusDate)) setFocusDate(date);
                  }}
                  className={cn(
                    "mx-auto flex size-10 items-center justify-center rounded-full text-[20px] leading-none tabular-nums transition-transform duration-150 outline-none active:scale-90 focus-visible:ring-2 focus-visible:ring-[var(--cdp-tint)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cdp-bg)] disabled:opacity-30",
                    selected
                      ? isToday
                        ? "bg-[var(--cdp-tint)] font-semibold text-[var(--cdp-on-tint)]"
                        : "bg-[var(--cdp-tint-fill)] font-semibold text-[var(--cdp-tint)]"
                      : isToday
                        ? "text-[var(--cdp-tint)] hover:bg-[var(--cdp-fill)]"
                        : "text-[var(--cdp-label)] hover:bg-[var(--cdp-fill)]",
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        <div
          className={cn(
            "cdp-wheel-mask relative col-start-1 row-start-1 flex items-center justify-center gap-2 px-2 transition-[opacity,transform] duration-200",
            !picking && "pointer-events-none scale-95 opacity-0",
          )}
          inert={!picking}
          data-slot="month-year"
        >
          <WheelHighlight className="inset-x-2" />
          <Wheel
            aria-label={labels.month}
            options={months}
            value={view.month}
            loop
            visibleRows={7}
            align="start"
            inset={8}
            onChange={pickMonth}
            className="w-36"
          />
          <Wheel
            aria-label={labels.year}
            options={years}
            value={view.year}
            visibleRows={7}
            align="start"
            onChange={(year) => show({ year, month: view.month }, 0)}
            className="w-24"
          />
        </div>
      </div>
    </div>
  );
}

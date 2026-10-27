"use client";

import * as React from "react";

import { withTime } from "./calendar";
import { useBrowserLocale } from "./hooks";
import { SegmentedControl } from "./segmented-control";
import { stepValue, typeDigit } from "./segments";
import { crossesNoon, dayPeriodLabels, hourCycleFor, to12, to24, type HourCycle } from "./time";
import { cn, pad2 } from "./utils";
import { Wheel, WheelHighlight } from "./wheel";

export type TimePanelLabels = {
  time: string;
  hour: string;
  minute: string;
  dayPeriod: string;
};

export const TIME_LABELS: TimePanelLabels = {
  time: "Time",
  hour: "Hour",
  minute: "Minute",
  dayPeriod: "Day period",
};

export type TimePanelProps = {
  value: Date;
  onChange: (date: Date) => void;
  locale?: string;
  hourCycle?: HourCycle;
  /** Accessible names; visible text comes from `Intl`. */
  labels?: Partial<TimePanelLabels>;
  /** Minute wheel granularity, like `UIDatePicker.minuteInterval`. */
  minuteInterval?: number;
  /** Hide the wheels and keep only the typed field. */
  wheels?: boolean;
  className?: string;
};

type Segment = "hour" | "minute";

/**
 * Time entry the way iOS 14+ does it, both halves at once: a field of
 * segments that takes digits from a keyboard or keypad and steps with the
 * arrows, and the hour / minute / period wheels underneath. Either side
 * moves the other — type "930" and the wheels spin there; fling a wheel and
 * the digits follow.
 */
export function TimePanel({
  value,
  onChange,
  locale: localeProp,
  hourCycle: hourCycleProp,
  minuteInterval = 1,
  wheels = true,
  labels: labelsProp,
  className,
}: TimePanelProps) {
  const labels = { ...TIME_LABELS, ...labelsProp };
  const browserLocale = useBrowserLocale();
  const locale = localeProp ?? browserLocale;
  const hourCycle = hourCycleProp ?? hourCycleFor(locale);
  const twelve = hourCycle === "h12";
  const hours24 = value.getHours();
  const minutes = value.getMinutes();
  const { hour: hour12, pm } = to12(hours24);
  const hourShown = twelve ? hour12 : hours24;
  const hourMin = twelve ? 1 : 0;
  const hourMax = twelve ? 12 : 23;
  const periods = dayPeriodLabels(locale);

  const [typing, setTyping] = React.useState<{ segment: Segment; buffer: string } | null>(null);
  const hourRef = React.useRef<HTMLInputElement>(null);
  const minuteRef = React.useRef<HTMLInputElement>(null);

  // Only a different time is a change; the parent does not re-render for
  // a wheel that came back round to where it was.
  const emit = (next: Date) => {
    if (next.getTime() !== value.getTime()) onChange(next);
  };
  const setHour = (shown: number) =>
    emit(withTime(value, twelve ? to24(shown, pm) : shown, minutes));
  // Turning the hour wheel past 11 ↔ 12 carries into AM/PM, as on iOS.
  const turnHour = (shown: number, rows: number) =>
    twelve && crossesNoon(hour12, rows)
      ? emit(withTime(value, to24(shown, !pm), minutes))
      : setHour(shown);
  const setMinute = (m: number) => emit(withTime(value, hours24, m));
  const setPm = (next: boolean) => emit(withTime(value, to24(hour12, next), minutes));

  const focusSegment = (segment: Segment) => {
    const el = segment === "hour" ? hourRef.current : minuteRef.current;
    el?.focus();
    el?.select();
  };

  const typeInto = (segment: Segment, digit: string) => {
    const buffer = typing?.segment === segment ? typing.buffer : "";
    const step =
      segment === "hour"
        ? typeDigit(buffer, digit, hourMin, hourMax)
        : typeDigit(buffer, digit, 0, 59);
    if (step.value !== null) (segment === "hour" ? setHour : setMinute)(step.value);
    if (step.done) {
      setTyping(null);
      if (segment === "hour") focusSegment("minute");
    } else {
      setTyping({ segment, buffer: step.buffer });
    }
  };

  const onSegmentKeyDown = (segment: Segment) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    const key = e.key;
    if (/^\d$/.test(key)) {
      e.preventDefault();
      typeInto(segment, key);
      return;
    }
    const by = key === "ArrowUp" ? 1 : key === "ArrowDown" ? -1 : 0;
    if (by) {
      e.preventDefault();
      setTyping(null);
      if (segment === "hour") setHour(stepValue(hourShown, by, hourMin, hourMax));
      else setMinute(stepValue(minutes, by * minuteInterval, 0, 59));
      return;
    }
    if (key === "ArrowLeft" && segment === "minute") {
      e.preventDefault();
      focusSegment("hour");
    } else if (key === "ArrowRight" && segment === "hour") {
      e.preventDefault();
      focusSegment("minute");
    } else if (key === "Backspace" || key === "Delete") {
      e.preventDefault();
      setTyping({ segment, buffer: "" });
    } else if (twelve && (key === "a" || key === "A" || key === "p" || key === "P")) {
      e.preventDefault();
      setPm(key === "p" || key === "P");
    } else if (key === "Enter") {
      e.currentTarget.blur();
    } else if (key.length === 1 && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
    }
  };

  // Mobile keypads and IMEs insert text without a key name; `beforeinput`
  // carries the digit either way.
  const onBeforeInput = (segment: Segment) => (e: React.FormEvent<HTMLInputElement>) => {
    e.preventDefault();
    const data = (e.nativeEvent as InputEvent).data ?? "";
    for (const ch of data) if (/\d/.test(ch)) typeInto(segment, ch);
  };

  // An engine that skipped `beforeinput` still changes the input: whatever
  // was added to the shown text is what was typed.
  const onInput = (segment: Segment) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const prev = shownText(segment);
    const next = e.target.value;
    // The caret can sit anywhere, so "06" can become "016": what is new lies
    // between the unchanged start and the unchanged end.
    let start = 0;
    while (start < prev.length && prev[start] === next[start]) start++;
    let end = 0;
    while (end < prev.length - start && prev.at(-1 - end) === next.at(-1 - end)) end++;
    for (const ch of next.slice(start, next.length - end)) if (/\d/.test(ch)) typeInto(segment, ch);
  };

  const shownText = (segment: Segment) => {
    if (typing?.segment === segment) return typing.buffer;
    // Two digits on either clock, like the iOS field: 09:30, not 9:30.
    return pad2(segment === "hour" ? hourShown : minutes);
  };

  // Each segment is wider than its two digits plus the (hidden) caret, so
  // the input never scrolls its text by a pixel on focus or while typing.
  const segmentClass =
    "h-7 rounded-full bg-transparent text-center text-[22px] leading-none tabular-nums text-[var(--cdp-label)] caret-transparent outline-none transition-colors duration-100 selection:bg-transparent focus:bg-[var(--cdp-tint-fill)] focus:text-[var(--cdp-tint)]";
  const segmentWidth = "calc(2ch + 14px)";

  // Stable between renders, so the wheels keep their rows.
  const hourOptions = React.useMemo(
    () =>
      Array.from({ length: twelve ? 12 : 24 }, (_, i) => {
        const h = (twelve ? 1 : 0) + i;
        return { value: h, label: twelve ? String(h) : pad2(h) };
      }),
    [twelve],
  );
  const minuteOptions = React.useMemo(
    () =>
      Array.from({ length: Math.ceil(60 / minuteInterval) }, (_, i) => ({
        value: i * minuteInterval,
        label: pad2(i * minuteInterval),
      })),
    [minuteInterval],
  );
  const periodOptions = React.useMemo(
    () => [
      { value: 0, label: periods.am },
      { value: 1, label: periods.pm },
    ],
    [periods.am, periods.pm],
  );

  return (
    <div
      className={cn("cdp flex w-[280px] flex-col gap-2 p-3 select-none", className)}
      data-slot="time"
    >
      <div className="flex items-center justify-between gap-3">
        <div
          role="group"
          aria-label={labels.time}
          className="flex h-9 items-center rounded-full bg-[var(--cdp-fill)] px-1 transition-shadow duration-150 focus-within:ring-[3px] focus-within:ring-[var(--cdp-tint-ring)]"
          data-slot="time-field"
        >
          <input
            ref={hourRef}
            aria-label={labels.hour}
            inputMode="numeric"
            autoComplete="off"
            value={shownText("hour")}
            onChange={onInput("hour")}
            onBeforeInput={onBeforeInput("hour")}
            onKeyDown={onSegmentKeyDown("hour")}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={() => typing && setTyping(null)}
            className={segmentClass}
            style={{ width: segmentWidth }}
            data-segment="hour"
          />
          <span
            className="-mx-px -translate-y-px text-[22px] leading-none text-[var(--cdp-secondary)]"
            aria-hidden
          >
            :
          </span>
          <input
            ref={minuteRef}
            aria-label={labels.minute}
            inputMode="numeric"
            autoComplete="off"
            value={shownText("minute")}
            onChange={onInput("minute")}
            onBeforeInput={onBeforeInput("minute")}
            onKeyDown={onSegmentKeyDown("minute")}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={() => typing && setTyping(null)}
            className={segmentClass}
            style={{ width: segmentWidth }}
            data-segment="minute"
          />
        </div>
        {twelve && (
          <SegmentedControl
            aria-label={labels.dayPeriod}
            options={[
              { value: false, label: periods.am },
              { value: true, label: periods.pm },
            ]}
            value={pm}
            onChange={setPm}
          />
        )}
      </div>

      {wheels && (
        // Columns spaced like iOS: hours end against the minutes, minutes and
        // the period start after them, with the gaps the iOS wheel uses.
        <div className="cdp-wheel-mask relative flex justify-center" data-slot="time-wheels">
          <WheelHighlight />
          <Wheel
            aria-label={labels.hour}
            options={hourOptions}
            value={hourShown}
            loop
            visibleRows={5}
            align="end"
            inset={twelve ? 22 : 24}
            onChange={turnHour}
            className="w-20"
          />
          <Wheel
            aria-label={labels.minute}
            options={minuteOptions}
            value={minutes - (minutes % minuteInterval)}
            loop
            visibleRows={5}
            align="start"
            inset={twelve ? 23 : 25}
            onChange={setMinute}
            className={twelve ? "w-[74px]" : "w-20"}
          />
          {twelve && (
            <Wheel
              aria-label={labels.dayPeriod}
              options={periodOptions}
              value={pm ? 1 : 0}
              visibleRows={5}
              align="start"
              inset={9}
              onChange={(v) => setPm(v === 1)}
              className="w-[70px]"
            />
          )}
        </div>
      )}
    </div>
  );
}

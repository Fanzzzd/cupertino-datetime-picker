"use client";

import * as React from "react";

import { withTime } from "./calendar";
import { useBrowserLocale } from "./hooks";
import { SegmentedControl } from "./segmented-control";
import { dayPeriodLabels, hourCycleFor, to12, to24, type HourCycle } from "./time";
import {
  addedText,
  enterText,
  pressKey,
  segmentText,
  type FieldStep,
  type Segment,
  type Typing,
} from "./time-field";
import { cn, mod, pad2 } from "./utils";
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

// The selection a segment had just before an edit, so an edit that replaced
// it can be read back exactly. Read in the native `beforeinput`, which fires
// even where React's synthetic one does not.
const selections = new WeakMap<HTMLInputElement, [number, number]>();
function recordSelection(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.selectionStart === null || input.selectionEnd === null) selections.delete(input);
  else selections.set(input, [input.selectionStart, input.selectionEnd]);
}

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
  const periods = dayPeriodLabels(locale);

  // Digits typed into a segment that has not completed are held here, with
  // the time they would make, and written only when the segment completes,
  // on Enter, or when focus leaves the field: a half-typed "1" is not 1:30,
  // and min or max would clamp it and lose what was typed. They belong to
  // the time they were typed over; a time set from outside drops them.
  type Held = { typing: Typing; hours: number; minutes: number; at: number };
  const [held, setHeld] = React.useState<Held | null>(null);
  const live = held?.at === value.getTime() ? held : null;
  const typing = live?.typing ?? null;
  const hourRef = React.useRef<HTMLInputElement>(null);
  const minuteRef = React.useRef<HTMLInputElement>(null);
  const field = { hours: live?.hours ?? hours24, minutes: live?.minutes ?? minutes, typing };
  const clock = { twelve, minuteInterval };

  // Only a different time is a change; the parent does not re-render for
  // a wheel that came back round to where it was.
  const emit = (next: Date) => {
    if (next.getTime() !== value.getTime()) onChange(next);
  };
  // A wheel or the AM/PM control writes its own part of the time. Digits held
  // in the other segment stay held over the new time, still waiting for
  // their segment to complete; digits held in its own segment give way.
  const writePart = (next: Date, keep: (h: Held) => Held | null) => {
    setHeld(live ? keep({ ...live, at: next.getTime() }) : null);
    emit(next);
  };
  // Turning the hour wheel n rows is n hours on the clock, so passing 11 ↔ 12
  // carries into AM/PM, as on iOS. A jump (no rows) keeps the period.
  const turnHour = (shown: number, rows: number) => {
    const turned = mod(hours24 + rows, 24);
    const hours = twelve && to12(turned).hour === shown ? turned : twelve ? to24(shown, pm) : shown;
    writePart(withTime(value, hours, minutes), (h) =>
      h.typing?.segment === "minute" ? { ...h, hours } : null,
    );
  };
  const setMinute = (m: number) =>
    writePart(withTime(value, hours24, m), (h) =>
      h.typing?.segment === "hour" ? { ...h, minutes: m } : null,
    );
  const setPm = (next: boolean) =>
    writePart(withTime(value, to24(hour12, next), minutes), (h) => ({
      ...h,
      hours: to24(to12(h.hours).hour, next),
    }));

  const focusSegment = (segment: Segment) => {
    const el = segment === "hour" ? hourRef.current : minuteRef.current;
    el?.focus();
    el?.select();
  };

  // Write a time the field arrived at. One that only moved focus or the
  // buffer leaves the value alone, to the second and across a repeated DST
  // hour.
  const write = (hours: number, mins: number) => {
    if (hours !== hours24 || mins !== minutes) emit(withTime(value, hours, mins));
  };

  // The field model decided: hold what is half typed, write what completed,
  // and move focus if a segment completed.
  const apply = (step: FieldStep, from: Segment) => {
    if (step.typing) {
      setHeld({
        typing: step.typing,
        hours: step.hours,
        minutes: step.minutes,
        at: value.getTime(),
      });
    } else {
      setHeld(null);
      write(step.hours, step.minutes);
    }
    if (step.focus !== from) focusSegment(step.focus);
  };

  const commit = () => {
    if (!live) return;
    setHeld(null);
    write(live.hours, live.minutes);
  };

  const onSegmentKeyDown = (segment: Segment) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const step = pressKey(field, segment, e.key, clock);
    if (step) {
      e.preventDefault();
      apply(step, segment);
    } else if (e.key === "Escape") {
      // Escape closes the popover; what is typed is kept, as on leaving the
      // field. (Chromium blurs it while React commits the close, too late.)
      commit();
    } else if (e.key === "Enter") {
      // Commit what is typed; focus stays in the field.
      commit();
      e.currentTarget.select();
    } else if (e.key.length === 1) {
      // Nothing else types into a segment.
      e.preventDefault();
    }
  };

  // Mobile keypads, IMEs and pastes insert text without a key name;
  // `beforeinput` carries all of it at once.
  const onBeforeInput = (segment: Segment) => (e: React.FormEvent<HTMLInputElement>) => {
    e.preventDefault();
    const data = (e.nativeEvent as InputEvent).data ?? "";
    if (data) apply(enterText(field, segment, data, clock), segment);
  };

  // An engine that skipped `beforeinput` still changes the input: whatever
  // was added to the shown text is what was typed.
  const onInput = (segment: Segment) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const added = addedText(shownText(segment), e.target.value, selections.get(e.target));
    selections.delete(e.target);
    if (added) apply(enterText(field, segment, added, clock), segment);
  };

  const shownText = (segment: Segment) => segmentText(field, segment, twelve);
  React.useEffect(() => {
    const inputs = [hourRef.current, minuteRef.current];
    for (const input of inputs) input?.addEventListener("beforeinput", recordSelection);
    return () => {
      for (const input of inputs) input?.removeEventListener("beforeinput", recordSelection);
    };
  }, []);

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
          // Leaving the field commits what is typed; moving between its
          // segments does not.
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) commit();
          }}
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

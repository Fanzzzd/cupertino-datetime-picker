import { ClientOnly } from "@tanstack/react-router";
import {
  addDays,
  CalendarPanel,
  DateTimePicker,
  SegmentedControl,
  startOfDay,
  TimePanel,
  Wheel,
  WheelHighlight,
} from "cupertino-datetime-picker";
import * as React from "react";

/**
 * Demo frame. The picker reads today's date and the visitor's locale, so it
 * renders on the client only; a prerendered calendar would carry the build
 * date and a hydration mismatch.
 */
export function Preview({ children }: { children: React.ReactNode }) {
  return (
    <div className="not-prose my-6 flex min-h-32 flex-wrap items-center justify-center gap-6 rounded-xl border border-fd-border bg-fd-card p-6 sm:p-8">
      <ClientOnly fallback={<div className="h-[34px]" aria-hidden />}>{children}</ClientOnly>
    </div>
  );
}

function nineThirty(): Date {
  const date = new Date();
  date.setHours(9, 30, 0, 0);
  return date;
}

function useValue() {
  return React.useState<Date | null>(nineThirty);
}

function Readout({ value }: { value: Date | null }) {
  return (
    <p className="font-mono text-xs text-fd-muted-foreground">
      {value ? value.toString() : "null"}
    </p>
  );
}

const panelClass =
  "cdp overflow-hidden rounded-[13px] bg-[var(--cdp-bg)] shadow-[var(--cdp-shadow)]";

export function DateTimeDemo() {
  const [value, setValue] = useValue();
  return (
    <Preview>
      <div className="flex flex-col items-center gap-4">
        <DateTimePicker value={value} onChange={setValue} />
        <Readout value={value} />
      </div>
    </Preview>
  );
}

export function DateDemo() {
  return (
    <Preview>
      <DateTimePicker mode="date" defaultValue={nineThirty()} />
    </Preview>
  );
}

export function TimeDemo() {
  return (
    <Preview>
      <DateTimePicker mode="time" defaultValue={nineThirty()} />
    </Preview>
  );
}

export function EmptyDemo() {
  const [value, setValue] = React.useState<Date | null>(null);
  return (
    <Preview>
      <div className="flex flex-col items-center gap-4">
        <DateTimePicker value={value} onChange={setValue} />
        <Readout value={value} />
      </div>
    </Preview>
  );
}

export function InlineDemo() {
  return (
    <Preview>
      <DateTimePicker display="inline" defaultValue={nineThirty()} className={panelClass} />
    </Preview>
  );
}

const LOCALES = ["en-US", "en-GB", "de-DE", "fr-FR", "es-ES", "ja-JP", "zh-CN", "ko-KR"];

export function LocaleDemo() {
  const [locale, setLocale] = React.useState("de-DE");
  return (
    <Preview>
      <div className="flex flex-col items-center gap-4">
        <select
          aria-label="Locale"
          value={locale}
          onChange={(event) => setLocale(event.target.value)}
          className="h-9 rounded-md border border-fd-border bg-fd-background px-2 text-sm"
        >
          {LOCALES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <DateTimePicker locale={locale} defaultValue={nineThirty()} />
      </div>
    </Preview>
  );
}

export function HourCycleDemo() {
  return (
    <Preview>
      <DateTimePicker locale="en-US" hourCycle="h23" mode="time" defaultValue={nineThirty()} />
    </Preview>
  );
}

export function IntervalDemo() {
  return (
    <Preview>
      <DateTimePicker mode="time" minuteInterval={5} defaultValue={nineThirty()} />
    </Preview>
  );
}

export function RangeDemo() {
  const today = startOfDay(new Date());
  return (
    <Preview>
      <DateTimePicker
        mode="date"
        display="inline"
        min={addDays(today, -3)}
        max={addDays(today, 10)}
        defaultValue={today}
        className={panelClass}
      />
    </Preview>
  );
}

export function DisabledDemo() {
  return (
    <Preview>
      <DateTimePicker disabled defaultValue={nineThirty()} />
    </Preview>
  );
}

export function TintDemo() {
  return (
    <Preview>
      <div style={{ "--cdp-tint": "#ff375f" } as React.CSSProperties}>
        <DateTimePicker
          mode="date"
          display="inline"
          defaultValue={nineThirty()}
          className={panelClass}
        />
      </div>
    </Preview>
  );
}

export function PanelsDemo() {
  const [value, setValue] = useValue();
  return (
    <Preview>
      <div className={panelClass}>
        <CalendarPanel value={value} onChange={setValue} />
      </div>
      <div className={panelClass}>
        <TimePanel value={value ?? nineThirty()} onChange={setValue} />
      </div>
    </Preview>
  );
}

export function FieldOnlyDemo() {
  const [value, setValue] = React.useState(nineThirty);
  return (
    <Preview>
      <div className={panelClass}>
        <TimePanel value={value} onChange={setValue} wheels={false} />
      </div>
    </Preview>
  );
}

const MINUTES = Array.from({ length: 60 }, (_, minute) => ({
  value: minute,
  label: String(minute).padStart(2, "0"),
}));

export function WheelDemo() {
  const [value, setValue] = React.useState(30);
  return (
    <Preview>
      <div className="flex flex-col items-center gap-4">
        <div className={`${panelClass} cdp-wheel-mask relative flex justify-center px-4`}>
          <WheelHighlight />
          <Wheel
            options={MINUTES}
            value={value}
            onChange={setValue}
            loop
            aria-label="Minute"
            className="w-16"
          />
        </div>
        <Readout value={null} />
      </div>
    </Preview>
  );
}

export function SegmentedDemo() {
  const [value, setValue] = React.useState<"am" | "pm">("am");
  return (
    <Preview>
      <div className="cdp">
        <SegmentedControl
          options={[
            { value: "am", label: "AM" },
            { value: "pm", label: "PM" },
          ]}
          value={value}
          onChange={setValue}
          aria-label="Day period"
        />
      </div>
    </Preview>
  );
}

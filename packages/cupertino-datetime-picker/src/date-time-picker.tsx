"use client";

import { Popover } from "@base-ui/react/popover";

import { CalendarPanel } from "./calendar-panel";
import { useControlled } from "./hooks";
import { formatClock, formatDay, hourCycleFor, type HourCycle } from "./time";
import { TimePanel } from "./time-panel";
import { cn } from "./utils";

export type DateTimePickerProps = {
  value?: Date | null;
  defaultValue?: Date | null;
  onChange?: (date: Date | null) => void;
  /** Which parts are editable — `UIDatePicker.Mode`. */
  mode?: "date" | "time" | "dateTime";
  /** Pills that open popovers (`.compact`), or the panels laid out in place (`.inline`). */
  display?: "compact" | "inline";
  locale?: string;
  hourCycle?: HourCycle;
  minuteInterval?: number;
  min?: Date;
  max?: Date;
  disabled?: boolean;
  className?: string;
  /** Placeholder labels when there is no value. */
  labels?: { date?: string; time?: string };
};

/** The compact pill and its popover, for composing your own rows. */
export const pillClass =
  "inline-flex h-[34px] items-center rounded-lg bg-[var(--cdp-fill)] px-3 text-[17px] leading-none text-[var(--cdp-label)] transition-[background-color,color] outline-none hover:bg-[var(--cdp-fill-hover)] focus-visible:ring-2 focus-visible:ring-[var(--cdp-tint)] active:opacity-60 disabled:opacity-40 data-popup-open:text-[var(--cdp-tint)]";

export const popupClass =
  "cdp origin-(--transform-origin) rounded-[13px] bg-[var(--cdp-bg)] shadow-[var(--cdp-shadow)] outline-none data-open:animate-[cdp-pop-in_260ms_cubic-bezier(0.18,0.9,0.32,1.15)] data-closed:animate-[cdp-pop-out_140ms_ease-in]";

/**
 * The iOS 14+ date picker for the web. Compact display shows the date and
 * time as pills; each opens a popover — the calendar or the time panel —
 * anchored to it. Inline display lays the panels out in place.
 */
export function DateTimePicker({
  value: valueProp,
  defaultValue = null,
  onChange,
  mode = "dateTime",
  display = "compact",
  locale = navigator.language,
  hourCycle: hourCycleProp,
  minuteInterval = 1,
  min,
  max,
  disabled = false,
  className,
  labels,
}: DateTimePickerProps) {
  const [value, setValue] = useControlled(valueProp, defaultValue, onChange);
  const hourCycle = hourCycleProp ?? hourCycleFor(locale);
  const showDate = mode !== "time";
  const showTime = mode !== "date";
  // Panels always have something to edit; a picked day or time starts from now.
  const draft = value ?? new Date();

  const calendar = (
    <CalendarPanel value={value} onChange={setValue} locale={locale} min={min} max={max} />
  );
  const time = (
    <TimePanel
      value={draft}
      onChange={setValue}
      locale={locale}
      hourCycle={hourCycle}
      minuteInterval={minuteInterval}
    />
  );

  const timePopover = (
    <Popover.Root>
      <Popover.Trigger className={pillClass} disabled={disabled} data-slot="time-trigger">
        {value ? formatClock(value, locale, hourCycle) : (labels?.time ?? "Time")}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="center" className="isolate z-50">
          <Popover.Popup className={popupClass} data-slot="time-popup">
            {time}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );

  if (display === "inline") {
    return (
      <div
        className={cn(
          "cdp inline-flex flex-col items-stretch rounded-[13px] bg-[var(--cdp-bg)]",
          className,
        )}
        data-slot="date-time-picker"
        data-display="inline"
      >
        {showDate && calendar}
        {/* As on iOS: the time sits on a "Time" row under the calendar and opens the wheels. */}
        {showTime &&
          (showDate ? (
            <div className="mx-3 flex h-[52px] items-center justify-between border-t border-[var(--cdp-fill)]">
              <span className="text-[17px] text-[var(--cdp-label)]">{labels?.time ?? "Time"}</span>
              {timePopover}
            </div>
          ) : (
            time
          ))}
      </div>
    );
  }

  return (
    <div
      className={cn("cdp inline-flex items-center gap-2", className)}
      data-slot="date-time-picker"
      data-display="compact"
    >
      {showDate && (
        <Popover.Root>
          <Popover.Trigger className={pillClass} disabled={disabled} data-slot="date-trigger">
            {value ? formatDay(value, locale) : (labels?.date ?? "Date")}
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner sideOffset={8} align="center" className="isolate z-50">
              <Popover.Popup className={popupClass} data-slot="date-popup">
                {calendar}
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      )}
      {showTime && timePopover}
    </div>
  );
}

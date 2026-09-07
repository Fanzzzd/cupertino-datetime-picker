import * as React from "react";

import { cn } from "./utils";

export type SegmentedOption<T> = { value: T; label: string };

/**
 * The iOS segmented control: a translucent track with a white thumb that
 * slides to the chosen segment. Underneath it is a native radio group, so
 * arrow keys, focus and form semantics come from the browser.
 */
export function SegmentedControl<T extends string | number | boolean>({
  options,
  value,
  onChange,
  "aria-label": ariaLabel,
  className,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  "aria-label": string;
  className?: string;
}) {
  const name = React.useId();
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      data-slot="segmented-control"
      className={cn(
        "relative inline-grid h-8 auto-cols-fr grid-flow-col rounded-[9px] bg-[var(--cdp-fill)] p-0.5",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0.5 left-0.5 rounded-[7px] bg-[var(--cdp-thumb)] shadow-[0_3px_8px_rgba(0,0,0,0.12),0_3px_1px_rgba(0,0,0,0.04)] transition-transform duration-200 ease-[cubic-bezier(0.2,0,0,1)]"
        style={{
          width: `calc((100% - 4px) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <label
            key={String(option.value)}
            className={cn(
              "relative z-10 flex min-w-12 cursor-pointer items-center justify-center rounded-[7px] px-3 text-[13px] font-semibold transition-colors select-none has-focus-visible:ring-2 has-focus-visible:ring-[var(--cdp-tint)]",
              checked ? "text-[var(--cdp-label)]" : "text-[var(--cdp-label)]/80 active:opacity-60",
            )}
          >
            <input
              type="radio"
              name={name}
              checked={checked}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}

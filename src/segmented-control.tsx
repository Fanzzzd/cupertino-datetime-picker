import * as React from "react";

import { cn } from "./utils";

export type SegmentedOption<T> = { value: T; label: string };

/**
 * The iOS segmented control: a translucent track with a white thumb that
 * slides to the chosen segment. Arrow keys move it; it is a radio group.
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
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const onKeyDown = (e: React.KeyboardEvent) => {
    const by =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? -1
          : 0;
    if (!by) return;
    e.preventDefault();
    const next = options[(index + by + options.length) % options.length];
    if (next) onChange(next.value);
  };
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      data-slot="segmented-control"
      onKeyDown={onKeyDown}
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
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative z-10 min-w-12 rounded-[7px] px-3 text-[13px] font-semibold transition-colors outline-none",
              checked ? "text-[var(--cdp-label)]" : "text-[var(--cdp-label)]/80 active:opacity-60",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

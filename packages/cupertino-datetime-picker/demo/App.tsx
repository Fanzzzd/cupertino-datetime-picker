import * as React from "react";

import { DateTimePicker } from "../src";
import { formatClock, formatDay, hourCycleFor } from "../src/time";

const LOCALES = ["en-US", "en-GB", "zh-CN", "ja-JP", "de-DE", "fr-FR"];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-4 px-4 py-2 not-last:border-b not-last:border-black/8 dark:not-last:border-white/10">
      <span className="text-[17px] text-black dark:text-white">{label}</span>
      {children}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-4 text-[13px] font-normal tracking-[0.02em] text-[rgba(60,60,67,0.6)] uppercase dark:text-[rgba(235,235,245,0.6)]">
        {title}
      </h2>
      <div className="overflow-hidden rounded-[10px] bg-white dark:bg-[#1c1c1e]">{children}</div>
    </section>
  );
}

export function App() {
  const params = new URLSearchParams(location.search);
  const [locale, setLocale] = React.useState(params.get("locale") ?? "en-US");
  const [dark, setDark] = React.useState(params.get("dark") === "1");
  const [value, setValue] = React.useState<Date | null>(
    () => new Date(Number(params.get("at")) || new Date(2026, 8, 5, 18, 30).getTime()),
  );
  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <main className="mx-auto flex max-w-[520px] flex-col gap-7 px-4 py-10">
      <header className="flex flex-col gap-1 px-4">
        <h1 className="text-[34px] font-bold tracking-[-0.02em] text-black dark:text-white">
          cupertino-datetime-picker
        </h1>
        <p className="text-[15px] text-[rgba(60,60,67,0.6)] dark:text-[rgba(235,235,245,0.6)]">
          The iOS 14+ compact date &amp; time picker for the web. Calendar with month/year wheels;
          time wheels that also take typing.
        </p>
      </header>

      <Group title="Playground">
        <Row label="Locale">
          <select
            aria-label="Locale"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            className="h-[34px] rounded-lg bg-[rgba(120,120,128,0.12)] px-3 text-[17px] text-black dark:text-white"
          >
            {LOCALES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Dark">
          <button
            type="button"
            role="switch"
            aria-checked={dark}
            aria-label="Dark mode"
            onClick={() => setDark((d) => !d)}
            className="relative h-[31px] w-[51px] rounded-full bg-[#e9e9eb] transition-colors aria-checked:bg-[#34c759] dark:bg-[#39393d]"
          >
            <span
              className="absolute top-0.5 left-0.5 size-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_3px_1px_rgba(0,0,0,0.06)] transition-transform"
              style={{ transform: dark ? "translateX(20px)" : undefined }}
            />
          </button>
        </Row>
        <Row label="Value">
          <output
            data-testid="value"
            className="text-[15px] text-[rgba(60,60,67,0.6)] tabular-nums dark:text-[rgba(235,235,245,0.6)]"
          >
            {value
              ? `${formatDay(value, locale)} ${formatClock(value, locale, hourCycleFor(locale))}`
              : "—"}
          </output>
        </Row>
      </Group>

      <Group title="Compact">
        <Row label="Date & Time">
          <DateTimePicker value={value} onChange={setValue} locale={locale} />
        </Row>
        <Row label="Date">
          <DateTimePicker mode="date" value={value} onChange={setValue} locale={locale} />
        </Row>
        <Row label="Time">
          <DateTimePicker mode="time" value={value} onChange={setValue} locale={locale} />
        </Row>
        <Row label="Every 5 min">
          <DateTimePicker
            mode="time"
            defaultValue={new Date(2026, 8, 5, 9, 0)}
            locale={locale}
            minuteInterval={5}
          />
        </Row>
        <Row label="24-hour">
          <DateTimePicker
            mode="time"
            defaultValue={new Date(2026, 8, 5, 21, 15)}
            locale={locale}
            hourCycle="h23"
          />
        </Row>
        <Row label="Empty">
          <DateTimePicker defaultValue={null} locale={locale} />
        </Row>
      </Group>

      <Group title="Inline">
        <div className="flex justify-center py-3">
          <DateTimePicker display="inline" value={value} onChange={setValue} locale={locale} />
        </div>
      </Group>
    </main>
  );
}

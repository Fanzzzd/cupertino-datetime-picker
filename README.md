# cupertino-datetime-picker

The iOS 14+ compact date & time picker, for the web. A date pill and a time
pill; the date pill opens the inline calendar whose title turns into month and
year wheels, the time pill opens hour / minute / AM–PM wheels with a typed
field above them. Every part takes touch, mouse, trackpad and keyboard.

Built for [shadcn/ui](https://ui.shadcn.com) on
[Base UI](https://base-ui.com) popovers and Tailwind v4. No date library:
`Intl` supplies month names, weekday names, the 12/24-hour clock and the
first day of the week.

## Install

As a shadcn registry item (the source lands in your project, under
`components/ui/cupertino/`):

```sh
npx shadcn@latest add https://raw.githubusercontent.com/fanzzzd/cupertino-datetime-picker/main/public/r/cupertino-datetime-picker.json
```

Or from npm:

```sh
pnpm add cupertino-datetime-picker @base-ui/react
```

```css
/* your Tailwind entry */
@import "tailwindcss";
@import "cupertino-datetime-picker/styles.css";
@source "../node_modules/cupertino-datetime-picker/dist";
```

## Use

```tsx
import { DateTimePicker } from "cupertino-datetime-picker";

<DateTimePicker value={date} onChange={setDate} />
<DateTimePicker mode="date" />
<DateTimePicker mode="time" minuteInterval={5} />
<DateTimePicker display="inline" locale="de-DE" />
```

| Prop                                  | Default              |                                                        |
| ------------------------------------- | -------------------- | ------------------------------------------------------ |
| `value` / `defaultValue` / `onChange` |                      | `Date \| null`. Controlled when `value` is given.      |
| `mode`                                | `"dateTime"`         | `"date"`, `"time"`, or both — `UIDatePicker.Mode`.     |
| `display`                             | `"compact"`          | `"compact"` pills with popovers, or `"inline"` panels. |
| `locale`                              | `navigator.language` | Drives names, clock, week start and the pill formats.  |
| `hourCycle`                           | from locale          | `"h12"` or `"h23"`.                                    |
| `minuteInterval`                      | `1`                  | Minute wheel step, like `UIDatePicker.minuteInterval`. |
| `min` / `max`                         |                      | Days outside the range are disabled.                   |

The panels are exported on their own (`CalendarPanel`, `TimePanel`) as are
the primitives (`Wheel`, `WheelHighlight`, `SegmentedControl`).

Re-tint with `--cdp-tint` (and `--cdp-on-tint` for text on it); dark mode
follows a `.dark` (or `data-theme="dark"`) ancestor. Accessible names are
English by default; pass `labels` to `CalendarPanel` / `TimePanel` to
translate them — the visible text is already the locale's.

## What matches iOS

- Pills: 34pt, 8pt radius, tertiary fill, tint text while open.
- Calendar: "September 2026 ›" title, next/previous in tint, single-letter
  weekdays, 20pt days in 40pt circles. Selected day is a tinted circle; today
  is tint text; selected today is a filled tint circle. Only the rows the
  month needs. Months slide in; the title cross-fades the grid into month and
  year wheels. Horizontal swipe changes month.
- Wheels: native scroll with snap points, so touch and trackpad flings are
  the platform's own. Mouse drag has its own deceleration. Rows tilt away
  from the centre and fade at the edges; hour and minute wheels wrap.
- Time field: hour and minute segments. Digits auto-advance (`945` is 9:45,
  `12` waits for the second digit, `13` becomes 3), arrows step, `a`/`p` set
  the period, and the wheels spin to follow. Spin a wheel and the digits
  follow back. Mobile keypads insert through `beforeinput`, so IMEs work.
- Segmented control for AM/PM with the sliding thumb.
- Popover springs in from its pill.

## Keyboard

| Where         | Keys                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------- |
| Calendar grid | ← → ↑ ↓ move a day / week, Home/End week bounds, PageUp/PageDown month (Shift: year), Enter picks |
| Any wheel     | ↑ ↓ one row, PageUp/PageDown five, Home/End, type a value to jump                                 |
| Time field    | digits, ↑ ↓ step, ← → between segments, `a` / `p`, Backspace clears                               |
| Popover       | Escape closes                                                                                     |

All wheels are `spinbutton`s with `aria-valuenow` / `aria-valuetext`; the
grid is a `grid` of `gridcell`s with full-date names.

## Develop

```sh
pnpm install
pnpm dev          # demo at http://localhost:5173
pnpm test         # vitest: calendar math, clock, segment typing, fling math
pnpm e2e          # Playwright: desktop Chrome + iPhone 15 (touch flings via CDP)
pnpm check        # typecheck, lint, tests, build
pnpm registry:build
```

## Not yet

- RTL locales.
- `wheels` display for the date (day / month / year drums).
- Ranges.

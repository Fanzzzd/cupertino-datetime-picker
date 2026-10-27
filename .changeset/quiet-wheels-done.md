---
"cupertino-datetime-picker": patch
---

Closer to the iOS 26 picker. Wheels sit on a drum (rows bunch toward the edges), show seven rows, and share a capsule highlight band; hours are right-aligned and minutes and AM/PM left-aligned, with iOS's column gaps, and turning the hour wheel past 11 ↔ 12 flips AM/PM. Pills are capsules 36px tall with a 4px gap. The calendar is 360px wide with 44px day cells on a 52px row pitch, the iOS sizes, shows SUN–SAT weekday names, keeps its height while the month/year wheels are open, tints the title while they are, and has a Done button to close them; hidden layers no longer take focus. The typed time field is restyled like a shadcn input (hairline border, tint ring while editing) and no longer shifts by a pixel on focus or typing; it shows the hour with two digits. A mouse fling leaves at the speed the hand let go (read over the last 100 ms, not one bunched-up event) and eases onto a row without a lurch or a long crawl. Renders are cheaper: date formatters are reused and wheel rows are not re-rendered when the value changes.

`Wheel` gains `align` and `inset`, and its `onChange` receives how many rows the wheel turned as a second argument.

Wheels: a finger held on a wheel no longer gets it snapped or the value written until it lifts; looped wheels have 500 rows of road each way, so a hard fling or trackpad flick no longer runs into the end of the rows and bounces back, and the wheel never moves itself mid-flick, which cut flicks short; only a pool of label elements is drawn, under fixed snap stops; the selected row no longer flashes grey after a loop re-centres; flings glide longer, closer to iOS; type-ahead, Home and End jump without carrying into AM/PM, while a full turn of the hour wheel does carry. Done returns focus to the calendar title.

React: `DateTimePicker` is memoized, so a form re-rendering around it no longer re-renders the picker; `TimePanel` only calls `onChange` for a different time; the default locale is read with `useSyncExternalStore`, so a server render no longer throws on `navigator`; wheel timers and frames are cancelled on unmount.

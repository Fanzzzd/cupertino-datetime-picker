---
"cupertino-datetime-picker": patch
---

Closer to the iOS 26 picker. Wheels sit on a drum (rows bunch toward the edges), show seven rows, and share a capsule highlight band; hours are right-aligned and minutes and AM/PM left-aligned, with iOS's column gaps, and turning the hour wheel past 11 ↔ 12 flips AM/PM. Pills are capsules 36px tall with a 4px gap. The calendar shows SUN–SAT weekday names, keeps its height while the month/year wheels are open, tints the title while they are, and has a Done button to close them; hidden layers no longer take focus. The typed time field is restyled like a shadcn input (hairline border, tint ring while editing) and no longer shifts by a pixel on focus or typing; it shows the hour with two digits. A mouse fling leaves at the speed the hand let go (read over the last 100 ms, not one bunched-up event) and eases onto a row without a lurch or a long crawl. Renders are cheaper: date formatters are reused and wheel rows are not re-rendered when the value changes.

`Wheel` gains `align` and `inset`, and its `onChange` receives how many rows the wheel turned as a second argument.

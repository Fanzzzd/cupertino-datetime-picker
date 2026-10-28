---
"cupertino-datetime-picker": patch
---

An inline picker in a container narrower than 336px narrows to fit, and the page no longer scrolls sideways on a small phone. Day cells shrink below 40px when they have to, and the month title stays on one line. `CalendarPanel` and `TimePanel` on their own take `className="max-w-full"` for the same layout.

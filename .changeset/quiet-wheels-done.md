---
"cupertino-datetime-picker": patch
---

The calendar keeps its height while the month/year wheels are open, so scrolling to a month that needs six rows no longer grows the panel, and a Done button closes the wheels. The typed time field shows the hour with two digits on both clocks, 06:30 like iOS, so the colon and minutes stay put between 9 and 10. Renders are cheaper: date formatters are reused instead of rebuilt, and wheel rows are no longer re-rendered when the value changes.

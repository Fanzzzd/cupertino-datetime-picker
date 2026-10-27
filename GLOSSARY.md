# Glossary

**Wheel.** One column of the picker: hours, minutes, AM/PM, month or year. The browser scrolls nothing; the wheel takes input itself.

**Wheel motion.** How a wheel moves, with no DOM (`src/wheel-motion.ts`): a drag follows the pointer, a release glides on and lands on a row, wheel and trackpad deltas are chased and land when the stream stops.

**Row.** A place on a wheel. Looped wheels have rows without end in both directions; the option shown is `options[row mod len]`.

**Resting row.** The row a wheel last came to rest on. A turn is measured from it.

**Turn.** How many rows a wheel moved between two resting rows. Turning the 12-hour hour wheel n rows is n hours on the clock, so 11 → 12 carries into AM/PM.

**Jump.** A move to a row that is not a turn (Home, End, type-ahead); it reports no rows.

**Time field.** The typed hour and minute segments (`src/time-field.ts`, with no DOM). Text from keys, pastes, keypads and IMEs is folded in one character at a time.

**Segment.** The hour or the minute part of the time field.

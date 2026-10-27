import { stepValue, typeDigit } from "./segments";
import { to12, to24 } from "./time";
import { pad2 } from "./utils";

export type Segment = "hour" | "minute";

/** Digits typed so far into a segment that has not completed. */
export type Typing = { segment: Segment; buffer: string } | null;

/** The field: a time of day (`hours` 0–23) and what is being typed. */
export type FieldState = { hours: number; minutes: number; typing: Typing };

export type FieldClock = { twelve: boolean; minuteInterval: number };

/** The field after an edit, and the segment that holds focus now. */
export type FieldStep = FieldState & { focus: Segment };

/**
 * The typed time field, with no DOM. Text typed, pasted or inserted by a
 * keypad or IME goes through `enterText` one character at a time: digits fill
 * the segment and move on to the next when it completes, so "930" is 9:30;
 * `a` and `p` set the period on a 12-hour clock. `pressKey` takes the keys
 * the field answers to: digits, the arrows, Backspace and Delete, a and p.
 */
export function enterText(
  state: FieldState,
  segment: Segment,
  text: string,
  clock: FieldClock,
): FieldStep {
  let step: FieldStep = { ...state, focus: segment };
  for (const ch of text) {
    if (/\d/.test(ch)) step = typeInto(step, ch, clock);
    else if (clock.twelve && /^[ap]$/i.test(ch)) step = setPeriod(step, /p/i.test(ch));
  }
  return step;
}

/** A key pressed in `segment`; null when the field does not take that key. */
export function pressKey(
  state: FieldState,
  segment: Segment,
  key: string,
  clock: FieldClock,
): FieldStep | null {
  if (/^\d$/.test(key)) return enterText(state, segment, key, clock);
  const here: FieldStep = { ...state, focus: segment };
  const by = key === "ArrowUp" ? 1 : key === "ArrowDown" ? -1 : 0;
  if (by) {
    const typing = null;
    if (segment === "hour") {
      const { hour, pm } = to12(state.hours);
      const hours = clock.twelve
        ? to24(stepValue(hour, by, 1, 12), pm)
        : stepValue(state.hours, by, 0, 23);
      return { ...here, hours, typing };
    }
    // Minutes step through the values the wheel offers.
    const { minuteInterval: interval } = clock;
    const count = Math.ceil(60 / interval);
    const index = stepValue(Math.floor(state.minutes / interval), by, 0, count - 1);
    return { ...here, minutes: index * interval, typing };
  }
  if (key === "ArrowLeft" && segment === "minute") return { ...here, focus: "hour" };
  if (key === "ArrowRight" && segment === "hour") return { ...here, focus: "minute" };
  if (key === "Backspace" || key === "Delete") return { ...here, typing: { segment, buffer: "" } };
  if (clock.twelve && /^[ap]$/i.test(key)) return setPeriod(here, /p/i.test(key));
  return null;
}

/** What a segment shows: the digits being typed, or the value with two digits, like iOS. */
export function segmentText(state: FieldState, segment: Segment, twelve: boolean): string {
  if (state.typing?.segment === segment) return state.typing.buffer;
  if (segment === "minute") return pad2(state.minutes);
  return pad2(twelve ? to12(state.hours).hour : state.hours);
}

/**
 * What was added to a segment's text by an edit the field did not see as
 * input events. With the selection the edit replaced, that is exact: the new
 * text between the kept start and the kept end. Without it, the part between
 * the unchanged start and the unchanged end; the caret can sit anywhere, so
 * "06" can become "016".
 */
export function addedText(before: string, after: string, replaced?: [number, number]): string {
  if (replaced) {
    const [from, to] = replaced;
    return after.slice(from, after.length - (before.length - to));
  }
  let start = 0;
  while (start < before.length && before[start] === after[start]) start++;
  let end = 0;
  while (end < before.length - start && before.at(-1 - end) === after.at(-1 - end)) end++;
  return after.slice(start, after.length - end);
}

function typeInto(step: FieldStep, digit: string, clock: FieldClock): FieldStep {
  const segment = step.focus;
  const buffer = step.typing?.segment === segment ? step.typing.buffer : "";
  const [min, max] = segment === "hour" ? (clock.twelve ? [1, 12] : [0, 23]) : [0, 59];
  const typed = typeDigit(buffer, digit, min, max);
  const next: FieldStep = { ...step };
  if (typed.value !== null) {
    // Minutes land on the wheel's values: with an interval of 5, "07" is 05.
    if (segment === "minute") next.minutes = typed.value - (typed.value % clock.minuteInterval);
    else next.hours = clock.twelve ? to24(typed.value, to12(step.hours).pm) : typed.value;
  }
  if (!typed.done) return { ...next, typing: { segment, buffer: typed.buffer } };
  // A completed hour hands over to the minutes.
  return { ...next, typing: null, focus: segment === "hour" ? "minute" : segment };
}

function setPeriod(step: FieldStep, pm: boolean): FieldStep {
  return { ...step, hours: to24(to12(step.hours).hour, pm) };
}

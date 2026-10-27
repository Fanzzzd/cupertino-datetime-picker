import { expect, test } from "vitest";

import { addedText, enterText, pressKey, segmentText, type FieldState } from "../src/time-field";

const h12 = { twelve: true, minuteInterval: 1 };
const h24 = { twelve: false, minuteInterval: 1 };
// 6:30 PM
const start: FieldState = { hours: 18, minutes: 30, typing: null };

test("several digits in one insertion are typed in order", () => {
  expect(enterText(start, "hour", "12", h12)).toMatchObject({ hours: 12, focus: "minute" });
  expect(enterText(start, "minute", "45", h12)).toMatchObject({ minutes: 45, typing: null });
  // The hour completes and the rest goes on into the minutes.
  expect(enterText(start, "hour", "930", h12)).toMatchObject({
    hours: 21,
    minutes: 30,
    focus: "minute",
  });
  // Separators are skipped; a and p set the period.
  expect(enterText(start, "hour", "9:05a", h12)).toMatchObject({ hours: 9, minutes: 5 });
});

test("typing one key at a time gives the same as inserting the text", () => {
  let step = { ...start, focus: "hour" as const } as ReturnType<typeof enterText>;
  for (const key of "945") step = pressKey(step, step.focus, key, h12)!;
  expect(step).toMatchObject({ hours: 21, minutes: 45, typing: null, focus: "minute" });
});

test("a leading 1 waits for a second digit; 13 restarts as 3", () => {
  const one = enterText(start, "hour", "1", h12);
  expect(one).toMatchObject({ hours: 13, typing: { segment: "hour", buffer: "1" }, focus: "hour" });
  expect(segmentText(one, "hour", true)).toBe("1");
  expect(enterText(one, "hour", "3", h12)).toMatchObject({ hours: 15, focus: "minute" });
});

test("24-hour: 2 waits, 23 completes", () => {
  const two = enterText(start, "hour", "2", h24);
  expect(two.focus).toBe("hour");
  expect(enterText(two, "hour", "3", h24)).toMatchObject({ hours: 23, focus: "minute" });
});

test("arrows step and wrap; minutes step through the wheel's values", () => {
  expect(pressKey(start, "hour", "ArrowUp", h12)).toMatchObject({ hours: 19 });
  // 12 PM down to 11 AM stays in the period, as the field's own step.
  expect(pressKey({ ...start, hours: 0 }, "hour", "ArrowDown", h12)).toMatchObject({ hours: 11 });
  expect(pressKey({ ...start, minutes: 59 }, "minute", "ArrowUp", h12)).toMatchObject({
    minutes: 0,
  });
  const sevens = { twelve: true, minuteInterval: 7 };
  // 0, 7, … 56: up from 56 wraps to 0, not to 3.
  expect(pressKey({ ...start, minutes: 56 }, "minute", "ArrowUp", sevens)).toMatchObject({
    minutes: 0,
  });
  expect(pressKey({ ...start, minutes: 0 }, "minute", "ArrowDown", sevens)).toMatchObject({
    minutes: 56,
  });
});

test("left and right move between segments; Backspace clears; a and p set the period", () => {
  expect(pressKey(start, "minute", "ArrowLeft", h12)?.focus).toBe("hour");
  expect(pressKey(start, "hour", "ArrowRight", h12)?.focus).toBe("minute");
  const cleared = pressKey(start, "minute", "Backspace", h12)!;
  expect(segmentText(cleared, "minute", true)).toBe("");
  expect(pressKey(start, "hour", "a", h12)).toMatchObject({ hours: 6 });
  expect(pressKey(start, "hour", "a", h24)).toBeNull();
  expect(pressKey(start, "hour", "x", h12)).toBeNull();
});

test("segments show two digits on either clock", () => {
  expect(segmentText({ ...start, hours: 9 }, "hour", true)).toBe("09");
  expect(segmentText({ ...start, hours: 9, minutes: 5 }, "minute", false)).toBe("05");
  expect(segmentText({ ...start, hours: 0 }, "hour", true)).toBe("12");
});

test("addedText finds what an unseen edit inserted, wherever the caret was", () => {
  expect(addedText("06", "016")).toBe("1");
  expect(addedText("06", "061")).toBe("1");
  expect(addedText("", "12")).toBe("12");
  expect(addedText("30", "30")).toBe("");
  // Typing over a selection that shares a prefix with what was typed.
  expect(addedText("11", "12", [0, 2])).toBe("12");
  expect(addedText("06", "016", [1, 1])).toBe("1");
});

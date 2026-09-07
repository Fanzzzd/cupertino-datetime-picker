/**
 * Typing into a two-digit clock segment. The person types digits; the segment
 * shows what has been typed, commits as soon as the digits name a value, and
 * says when it is done so focus can move on (the second digit arrived, or no
 * further digit could still fit under `max`).
 */
export type DigitStep = { buffer: string; value: number | null; done: boolean };

export function typeDigit(buffer: string, digit: string, min: number, max: number): DigitStep {
  const next = buffer.length >= 2 ? digit : buffer + digit;
  const n = Number(next);
  if (n > max) {
    // The pair cannot be a value: start over with just this digit.
    const d = Number(digit);
    return d > max || d < min
      ? { buffer: "", value: null, done: false }
      : { buffer: digit, value: d, done: d * 10 > max };
  }
  return { buffer: next, value: n >= min ? n : null, done: next.length === 2 || n * 10 > max };
}

/** Step within [min, max], wrapping at both ends. */
export function stepValue(value: number, by: number, min: number, max: number): number {
  const span = max - min + 1;
  return min + ((((value - min + by) % span) + span) % span);
}

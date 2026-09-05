import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Wrap `n` into [0, len). */
export function mod(n: number, len: number) {
  return ((n % len) + len) % len;
}

export function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

"use client";

import * as React from "react";

/** Controlled when `value` is given, otherwise owned here. */
export function useControlled<T>(
  value: T | undefined,
  defaultValue: T,
  onChange: ((next: T) => void) | undefined,
): [T, (next: T) => void] {
  const [inner, setInner] = React.useState(defaultValue);
  const current = value === undefined ? inner : value;
  const set = (next: T) => {
    if (value === undefined) setInner(next);
    onChange?.(next);
  };
  return [current, set];
}

/**
 * The browser's language, read without touching `navigator` during a server
 * render (it does not exist there); the server and the first client render
 * agree on "en-US", then the real language takes over.
 */
export function useBrowserLocale(): string {
  return React.useSyncExternalStore(
    (notify) => {
      window.addEventListener("languagechange", notify);
      return () => window.removeEventListener("languagechange", notify);
    },
    () => navigator.language,
    () => "en-US",
  );
}

export function usePrefersReducedMotion(): boolean {
  return React.useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)");
      query.addEventListener("change", notify);
      return () => query.removeEventListener("change", notify);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

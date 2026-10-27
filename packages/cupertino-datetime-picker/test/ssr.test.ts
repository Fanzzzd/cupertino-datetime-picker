import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { expect, test } from "vitest";

import { DateTimePicker } from "../src";

test("renders on a server, where there is no navigator", () => {
  const real = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", { value: undefined, configurable: true });
  try {
    const at = new Date(2026, 8, 5, 18, 30);
    const compact = renderToString(createElement(DateTimePicker, { defaultValue: at }));
    const inline = renderToString(
      createElement(DateTimePicker, { display: "inline", defaultValue: at }),
    );
    expect(compact).toContain("Sep 5, 2026");
    expect(inline).toContain("September 2026");
  } finally {
    if (real) Object.defineProperty(globalThis, "navigator", real);
  }
});

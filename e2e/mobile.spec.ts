import { expect, test, type Page } from "@playwright/test";

import { datePopup, dateTrigger, open, timePopup, timeTrigger, value, wheel } from "./helpers";

const point = (p: { x: number; y: number }) => [{ x: p.x, y: p.y }];

async function swipe(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: point(from) });
  const steps = 6;
  for (let i = 1; i <= steps; i++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: point({
        x: from.x + ((to.x - from.x) * i) / steps,
        y: from.y + ((to.y - from.y) * i) / steps,
      }),
    });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

async function fling(page: Page, x: number, y: number, distance: number) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.synthesizeScrollGesture", {
    x,
    y,
    yDistance: distance,
    gestureSourceType: "touch",
    speed: 1200,
  });
}

test("the popover fits the phone and a tap picks a day", async ({ page }) => {
  await open(page);
  await dateTrigger(page).tap();
  const popup = datePopup(page);
  await expect(popup).toBeVisible();
  const box = (await popup.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  await popup.getByRole("gridcell", { name: /September 21, 2026/ }).tap();
  await expect(value(page)).toHaveText("Sep 21, 2026 6:30 PM");
});

test("a horizontal swipe on the grid changes the month", async ({ page, browserName }) => {
  test.skip(browserName === "webkit", "synthetic touch gestures need CDP");
  await open(page);
  await dateTrigger(page).tap();
  const grid = datePopup(page).getByRole("grid");
  const box = (await grid.boundingBox())!;
  const y = box.y + box.height / 2;
  await swipe(page, { x: box.x + box.width - 20, y }, { x: box.x + 20, y });
  await expect(grid).toHaveAccessibleName("October 2026");
  await swipe(page, { x: box.x + 20, y }, { x: box.x + box.width - 20, y });
  await expect(grid).toHaveAccessibleName("September 2026");
});

test("a touch fling spins the minute wheel and the field follows", async ({
  page,
  browserName,
}) => {
  test.skip(browserName === "webkit", "synthetic touch gestures need CDP");
  await open(page);
  await timeTrigger(page).tap();
  const minute = wheel(page, "Minute");
  const current = async () => Number(await minute.getAttribute("aria-valuenow"));
  // The popover is still springing in when the tap returns; a gesture aimed at
  // the scaled-down wheel misses it. Let the animations finish first, and try
  // again if a busy runner dropped the gesture anyway.
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  for (let attempt = 0; attempt < 4 && (await current()) === 30; attempt++) {
    const box = (await minute.boundingBox())!;
    await fling(page, box.x + box.width / 2, box.y + box.height / 2, -160);
    await page.waitForTimeout(600);
  }
  // Five rows of travel plus the platform's momentum, so the wheel is well
  // past where a plain scroll would have stopped.
  await expect.poll(current).toBeGreaterThan(33);
  const shown = await timePopup(page).getByRole("textbox", { name: "Minute" }).inputValue();
  expect(Number(shown)).toBe(Number(await minute.getAttribute("aria-valuenow")));
  await expect(value(page)).toContainText(`6:${shown} PM`);
});

test("tapping a row off centre selects it", async ({ page }) => {
  await open(page);
  await timeTrigger(page).tap();
  const hour = wheel(page, "Hour");
  const box = (await hour.boundingBox())!;
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2 + 32);
  await expect(hour).toHaveAttribute("aria-valuenow", "7");
  await expect(value(page)).toHaveText("Sep 5, 2026 7:30 PM");
});

test("the keypad path: inserted text without key events", async ({ page }) => {
  await open(page);
  await timeTrigger(page).tap();
  const hourField = timePopup(page).getByRole("textbox", { name: "Hour" });
  await hourField.tap();
  await page.keyboard.insertText("1");
  await page.keyboard.insertText("1");
  await expect(value(page)).toHaveText("Sep 5, 2026 11:30 PM");
  // Focus moved on to the minute segment.
  await page.keyboard.insertText("05");
  await expect(value(page)).toHaveText("Sep 5, 2026 11:05 PM");
});

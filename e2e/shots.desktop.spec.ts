import { test } from "@playwright/test";

import { dateTrigger, datePopup, open, timeTrigger, timePopup } from "./helpers";

test("screenshots", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 820 });
  await open(page);
  await page.screenshot({ path: "/tmp/cdp-0-page.png" });
  await dateTrigger(page).click();
  await datePopup(page).waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "/tmp/cdp-1-calendar.png" });
  await datePopup(page)
    .getByRole("button", { name: /September 2026/ })
    .click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "/tmp/cdp-2-month-year.png" });
  await page.keyboard.press("Escape");
  await timeTrigger(page).click();
  await timePopup(page).waitFor();
  await timePopup(page).getByRole("textbox", { name: "Hour" }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "/tmp/cdp-3-time.png" });
  await page.keyboard.press("Escape");

  await open(page, "&dark=1");
  await timeTrigger(page).click();
  await timePopup(page).waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "/tmp/cdp-4-time-dark.png" });
  await page.keyboard.press("Escape");
  await dateTrigger(page).click();
  await datePopup(page).waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "/tmp/cdp-5-calendar-dark.png" });
  await page.keyboard.press("Escape");

  await open(page);
  await page.locator('[data-display="inline"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "/tmp/cdp-8-inline.png" });

  await open(page, "&locale=zh-CN");
  await dateTrigger(page).click();
  await datePopup(page).waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "/tmp/cdp-6-zh-calendar.png" });
  await page.keyboard.press("Escape");
  await timeTrigger(page).click();
  await timePopup(page).waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "/tmp/cdp-7-zh-time.png" });
});

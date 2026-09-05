import { test } from "@playwright/test";

import { dateTrigger, datePopup, open, timeTrigger, timePopup } from "./helpers";

test("mobile screenshots", async ({ page }) => {
  await open(page);
  await dateTrigger(page).tap();
  await datePopup(page).waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "/tmp/cdp-m1-calendar.png" });
  await page.keyboard.press("Escape");
  await timeTrigger(page).tap();
  await timePopup(page).waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "/tmp/cdp-m2-time.png" });
});

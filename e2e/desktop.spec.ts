import { expect, test } from "@playwright/test";

import { datePopup, dateTrigger, open, timePopup, timeTrigger, value, wheel } from "./helpers";

test("the date pill opens the calendar and a tapped day becomes the value", async ({ page }) => {
  await open(page);
  await expect(dateTrigger(page)).toHaveText("Sep 5, 2026");
  await dateTrigger(page).click();
  await expect(datePopup(page)).toBeVisible();
  await expect(datePopup(page).getByRole("grid")).toHaveAccessibleName("September 2026");
  await datePopup(page)
    .getByRole("gridcell", { name: /September 15, 2026/ })
    .click();
  await expect(value(page)).toHaveText("Sep 15, 2026 6:30 PM");
  await expect(dateTrigger(page)).toHaveText("Sep 15, 2026");
  await page.keyboard.press("Escape");
  await expect(datePopup(page)).toHaveCount(0);
});

test("month navigation, and the title opens month/year wheels", async ({ page }) => {
  await open(page);
  await dateTrigger(page).click();
  const popup = datePopup(page);
  await popup.getByRole("button", { name: "Next month" }).click();
  await expect(popup.getByRole("grid")).toHaveAccessibleName("October 2026");
  await popup.getByRole("button", { name: "Previous month" }).click();
  await expect(popup.getByRole("grid")).toHaveAccessibleName("September 2026");
  await popup.getByRole("button", { name: "Previous month" }).click();
  await expect(popup.getByRole("grid")).toHaveAccessibleName("August 2026");

  const title = popup.getByRole("button", { name: /August 2026/ });
  await title.click();
  await expect(title).toHaveAttribute("aria-expanded", "true");
  const month = popup.getByRole("spinbutton", { name: "Month" });
  const year = popup.getByRole("spinbutton", { name: "Year" });
  await expect(month).toHaveAttribute("aria-valuetext", "August");
  await month.focus();
  await page.keyboard.press("ArrowDown");
  await expect(month).toHaveAttribute("aria-valuetext", "September");
  await year.focus();
  await page.keyboard.press("ArrowUp");
  await expect(year).toHaveAttribute("aria-valuenow", "2025");
  await expect(popup.getByRole("button", { name: /September 2025/ })).toBeVisible();
  // Type-ahead: digits jump the year wheel.
  await page.keyboard.type("2030");
  await expect(year).toHaveAttribute("aria-valuenow", "2030");
  await popup.getByRole("button", { name: /September 2030/ }).click();
  await expect(popup.getByRole("grid")).toHaveAccessibleName("September 2030");
});

test("the keyboard walks the grid across months", async ({ page }) => {
  await open(page);
  await dateTrigger(page).click();
  const popup = datePopup(page);
  await popup.getByRole("gridcell", { name: /September 5, 2026/ }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(":focus")).toHaveAccessibleName(/September 6, 2026/);
  await page.keyboard.press("ArrowDown");
  await expect(page.locator(":focus")).toHaveAccessibleName(/September 13, 2026/);
  await page.keyboard.press("End");
  await expect(page.locator(":focus")).toHaveAccessibleName(/September 19, 2026/);
  await page.keyboard.press("PageDown");
  await expect(page.locator(":focus")).toHaveAccessibleName(/October 19, 2026/);
  await expect(popup.getByRole("grid")).toHaveAccessibleName("October 2026");
  await page.keyboard.press("Enter");
  await expect(value(page)).toHaveText("Oct 19, 2026 6:30 PM");
});

test("typing into the time field sets the time and spins the wheels", async ({ page }) => {
  await open(page);
  await timeTrigger(page).click();
  const popup = timePopup(page);
  await expect(wheel(page, "Hour")).toHaveAttribute("aria-valuenow", "6");
  await expect(wheel(page, "Minute")).toHaveAttribute("aria-valuenow", "30");
  await popup.getByRole("textbox", { name: "Hour" }).click();
  await page.keyboard.type("945");
  await expect(value(page)).toHaveText("Sep 5, 2026 9:45 PM");
  await expect(wheel(page, "Hour")).toHaveAttribute("aria-valuenow", "9");
  await expect(wheel(page, "Minute")).toHaveAttribute("aria-valuenow", "45");
  await page.keyboard.press("a");
  await expect(value(page)).toHaveText("Sep 5, 2026 9:45 AM");
  await expect(wheel(page, "Day period")).toHaveAttribute("aria-valuetext", "AM");
  // Arrows step the focused segment (minute is focused after the hour completed).
  await page.keyboard.press("ArrowUp");
  await expect(value(page)).toHaveText("Sep 5, 2026 9:46 AM");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowDown");
  await expect(value(page)).toHaveText("Sep 5, 2026 8:46 AM");
  // A leading 1 waits for the second digit.
  await page.keyboard.type("12");
  await expect(value(page)).toHaveText("Sep 5, 2026 12:46 AM");
});

test("the wheels move the field: keyboard, mouse wheel, drag, click", async ({ page }) => {
  await open(page);
  await timeTrigger(page).click();
  const popup = timePopup(page);
  const minute = wheel(page, "Minute");
  await minute.focus();
  await page.keyboard.press("ArrowDown");
  await expect(popup.getByRole("textbox", { name: "Minute" })).toHaveValue("31");
  await page.keyboard.press("PageUp");
  await expect(popup.getByRole("textbox", { name: "Minute" })).toHaveValue("26");
  await page.keyboard.type("5");
  await expect(popup.getByRole("textbox", { name: "Minute" })).toHaveValue("05");

  const hour = wheel(page, "Hour");
  const box = (await hour.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  // How far one wheel notch scrolls is the engine's call; it must land on a
  // row and the field must agree.
  await page.mouse.wheel(0, 64);
  await expect
    .poll(async () => Number(await hour.getAttribute("aria-valuenow")))
    .toBeGreaterThan(6);
  const afterWheel = await hour.getAttribute("aria-valuenow");
  await expect(popup.getByRole("textbox", { name: "Hour" })).toHaveValue(String(afterWheel));

  // Click the row above the centre.
  const period = wheel(page, "Day period");
  const pbox = (await period.boundingBox())!;
  await expect(period).toHaveAttribute("aria-valuetext", "PM");
  await page.mouse.click(pbox.x + pbox.width / 2, pbox.y + pbox.height / 2 - 32);
  await expect(period).toHaveAttribute("aria-valuetext", "AM");
  await expect(value(page)).toContainText("AM");
});

test("a mouse drag flings a wheel past where it was released", async ({ page }) => {
  await open(page);
  await dateTrigger(page).click();
  const popup = datePopup(page);
  await popup.getByRole("button", { name: /September 2026/ }).click();
  const year = popup.getByRole("spinbutton", { name: "Year" });
  const box = (await year.boundingBox())!;
  // Drag 108px (about three rows) quickly and let go: the fling carries on.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 10);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height - 10 - i * 18, { steps: 2 });
  }
  await page.mouse.up();
  await expect
    .poll(async () => Number(await year.getAttribute("aria-valuenow")))
    .toBeGreaterThan(2026 + 3);
  // A slow drag that pauses before release lands where it was left.
  const rested = Number(await year.getAttribute("aria-valuenow"));
  await page.mouse.move(box.x + box.width / 2, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + 20 + 64, { steps: 8 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await expect(year).toHaveAttribute("aria-valuenow", String(rested - 2));
});

test("the segmented control and 24-hour locales", async ({ page }) => {
  await open(page);
  await timeTrigger(page).click();
  await timePopup(page).getByRole("radio", { name: "AM" }).click();
  await expect(value(page)).toHaveText("Sep 5, 2026 6:30 AM");
  await page.keyboard.press("Escape");

  await open(page, "&locale=de-DE");
  await expect(timeTrigger(page)).toHaveText("18:30");
  await timeTrigger(page).click();
  await expect(timePopup(page).getByRole("radiogroup")).toHaveCount(0);
  await expect(wheel(page, "Hour")).toHaveAttribute("aria-valuenow", "18");
  await timePopup(page).getByRole("textbox", { name: "Hour" }).click();
  await page.keyboard.type("07");
  await expect(timeTrigger(page)).toHaveText("07:30");
  await expect(dateTrigger(page)).toHaveText("05.09.2026");
  await expect(timePopup(page).getByRole("textbox", { name: "Hour" })).toHaveValue("07");
});

test("an empty picker starts from now and stays consistent", async ({ page }) => {
  await open(page);
  const empty = page.locator('[data-slot="date-time-picker"]').nth(5);
  await expect(empty.locator('[data-slot="date-trigger"]')).toHaveText("Date");
  await empty.locator('[data-slot="date-trigger"]').click();
  await datePopup(page)
    .getByRole("gridcell", { name: /, 2026|, 2027|, 2025/ })
    .first()
    .click();
  await expect(empty.locator('[data-slot="date-trigger"]')).not.toHaveText("Date");
  await expect(empty.locator('[data-slot="time-trigger"]')).not.toHaveText("Time");
});

test("inline display: the calendar in place, the time as a pill on its own row", async ({
  page,
}) => {
  await open(page);
  const inline = page.locator('[data-display="inline"]');
  await expect(inline.getByRole("grid")).toHaveAccessibleName("September 2026");
  await inline.getByRole("gridcell", { name: /September 9, 2026/ }).click();
  await expect(value(page)).toHaveText("Sep 9, 2026 6:30 PM");
  await inline.locator('[data-slot="time-trigger"]').click();
  await expect(timePopup(page)).toBeVisible();
  await timePopup(page).getByRole("radio", { name: "AM" }).click();
  await expect(value(page)).toHaveText("Sep 9, 2026 6:30 AM");
});

test("motion is wired: popover spring, month slide, month/year cross-fade, thumb slide", async ({
  page,
}) => {
  await open(page);
  await dateTrigger(page).click();
  const popup = datePopup(page);
  await expect
    .poll(() => popup.evaluate((el) => getComputedStyle(el).animationName))
    .toBe("cdp-pop-in");
  await popup.getByRole("button", { name: "Next month" }).click();
  const grid = popup.getByRole("grid");
  await expect(grid).toHaveAttribute("data-dir", "1");
  expect(await grid.evaluate((el) => getComputedStyle(el).animationName)).toBe(
    "cdp-slide-from-right",
  );
  const wheels = popup.locator('[data-slot="month-year"]');
  expect(await wheels.evaluate((el) => getComputedStyle(el).opacity)).toBe("0");
  await popup.getByRole("button", { name: /October 2026/ }).click();
  await expect.poll(() => wheels.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
  expect(await wheels.evaluate((el) => getComputedStyle(el).transitionDuration)).toContain("0.2s");
  await page.keyboard.press("Escape");

  await timeTrigger(page).click();
  const thumb = timePopup(page).locator('[data-slot="segmented-control"] > div').first();
  expect(await thumb.evaluate((el) => getComputedStyle(el).transitionProperty)).toContain(
    "transform",
  );
  const before = await thumb.evaluate((el) => getComputedStyle(el).transform);
  await timePopup(page).getByRole("radio", { name: "AM" }).click();
  await expect.poll(() => thumb.evaluate((el) => getComputedStyle(el).transform)).not.toBe(before);
});

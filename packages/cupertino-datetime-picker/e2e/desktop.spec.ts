import { type Locator, expect, test } from "@playwright/test";

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

test("the month/year wheels keep the panel's height and close with Done", async ({ page }) => {
  await open(page);
  await dateTrigger(page).click();
  const popup = datePopup(page);
  const calendar = popup.locator('[data-slot="calendar"]');
  // September 2026 needs five rows; August 2026 needs six.
  await popup.getByRole("button", { name: /September 2026/ }).click();
  const height = (await calendar.boundingBox())?.height;
  const month = popup.getByRole("spinbutton", { name: "Month" });
  await month.focus();
  await page.keyboard.press("ArrowUp");
  await expect(month).toHaveAttribute("aria-valuetext", "August");
  await expect(popup.getByRole("button", { name: /August 2026/ })).toBeVisible();
  expect((await calendar.boundingBox())?.height).toBe(height);

  await popup.getByRole("button", { name: "Done" }).click();
  await expect(popup.getByRole("button", { name: /August 2026/ })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(popup.getByRole("grid")).toHaveAccessibleName("August 2026");
});

test("only the showing layer takes focus, and the open title is tinted", async ({ page }) => {
  await open(page);
  await dateTrigger(page).click();
  const popup = datePopup(page);
  const title = popup.getByRole("button", { name: /September 2026/ });
  const focusable = (locator: Locator) =>
    locator.evaluate((el: HTMLElement) => {
      el.focus();
      return document.activeElement === el;
    });
  const month = popup.getByRole("spinbutton", { name: "Month" });
  const done = popup.getByRole("button", { name: "Done" });
  const previous = popup.getByRole("button", { name: "Previous month" });
  expect(await focusable(month)).toBe(false);
  expect(await focusable(done)).toBe(false);
  expect(await focusable(previous)).toBe(true);
  const rest = await title.evaluate((el) => getComputedStyle(el).color);

  await title.click();
  await expect(month).toBeVisible();
  expect(await focusable(previous)).toBe(false);
  expect(await focusable(popup.getByRole("gridcell", { name: /September 5, 2026/ }))).toBe(false);
  expect(await focusable(month)).toBe(true);
  expect(await focusable(done)).toBe(true);
  await expect.poll(() => title.evaluate((el) => getComputedStyle(el).color)).not.toBe(rest);
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
  await expect(popup.getByRole("textbox", { name: "Hour" })).toHaveValue(
    String(afterWheel).padStart(2, "0"),
  );

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
  const x = box.x + box.width / 2;
  const current = async () => Number(await year.getAttribute("aria-valuenow"));

  // Drag 108px (about three rows) quickly and let go: the fling carries on
  // past the three rows. Event pacing is the test runner's, so a busy
  // machine may space the moves too far apart to count as a fling; try again.
  let flung = false;
  for (let attempt = 0; attempt < 4 && !flung; attempt++) {
    const before = await current();
    await page.mouse.move(x, box.y + box.height - 10);
    await page.mouse.down();
    for (let i = 1; i <= 6; i++) {
      await page.mouse.move(x, box.y + box.height - 10 - i * 18);
    }
    await page.mouse.up();
    await expect.poll(current).toBeGreaterThanOrEqual(before + 3);
    await page.waitForTimeout(400);
    flung = (await current()) > before + 3;
  }
  expect(flung).toBe(true);

  // A slow drag that pauses before release lands where it was left.
  const rested = await current();
  await page.mouse.move(x, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(x, box.y + 20 + 64, { steps: 8 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await expect(year).toHaveAttribute("aria-valuenow", String(rested - 2));
});

test("the hour wheel carries into AM/PM between 11 and 12, as on iOS", async ({ page }) => {
  await open(page);
  await timeTrigger(page).click();
  const hour = wheel(page, "Hour");
  await hour.focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowDown");
  await expect(value(page)).toHaveText("Sep 5, 2026 11:30 PM");
  await page.keyboard.press("ArrowDown");
  await expect(value(page)).toHaveText("Sep 5, 2026 12:30 AM");
  await page.keyboard.press("ArrowDown");
  await expect(value(page)).toHaveText("Sep 5, 2026 1:30 AM");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  await expect(value(page)).toHaveText("Sep 5, 2026 11:30 PM");
});

test("wheel columns align like iOS: hours end where minutes begin", async ({ page }) => {
  await open(page);
  await timeTrigger(page).click();
  const centre = (name: string) =>
    wheel(page, name)
      .locator("[data-active] span")
      .evaluate((el) => {
        const b = el.getBoundingClientRect();
        return { left: b.left, right: b.right };
      });
  const hour = wheel(page, "Hour");
  await hour.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(hour).toHaveAttribute("aria-valuenow", "9");
  await page.waitForTimeout(400);
  const nine = await centre("Hour");
  const minute = await centre("Minute");
  await page.keyboard.press("ArrowDown");
  await expect(hour).toHaveAttribute("aria-valuenow", "10");
  await page.waitForTimeout(400);
  const ten = await centre("Hour");
  expect(Math.abs(ten.right - nine.right)).toBeLessThan(1);
  expect(ten.left).toBeLessThan(nine.left);
  expect(minute.left - nine.right).toBeGreaterThan(40);
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

test("the pills and the typed minutes keep their place as the value's text grows", async ({
  page,
}) => {
  await open(page);
  // Page coordinates: WebKit can scroll the page when a popover opens.
  const place = async (locator: Locator) => {
    const b = await locator.boundingBox();
    const scrollY = await page.evaluate(() => window.scrollY);
    return b && { ...b, y: b.y + scrollY };
  };
  const box = async () => ({
    date: await place(dateTrigger(page)),
    time: await place(timeTrigger(page)),
    popup: await place(timePopup(page)),
    minute: await place(timePopup(page).getByRole("textbox", { name: "Minute" })),
  });
  await timeTrigger(page).click();
  await timePopup(page).getByRole("radio", { name: "AM" }).click();
  await timePopup(page).getByRole("textbox", { name: "Hour" }).click();
  await page.keyboard.type("9");
  await expect(timeTrigger(page)).toHaveText("9:30 AM");
  await expect(timePopup(page).getByRole("textbox", { name: "Hour" })).toHaveValue("09");
  const before = await box();
  await timePopup(page).getByRole("textbox", { name: "Hour" }).click();
  await page.keyboard.type("10");
  await expect(timeTrigger(page)).toHaveText("10:30 AM");
  expect(await box()).toEqual(before);
  await page.keyboard.press("Escape");

  await dateTrigger(page).click();
  await datePopup(page)
    .getByRole("gridcell", { name: /September 25, 2026/ })
    .click();
  await expect(dateTrigger(page)).toHaveText("Sep 25, 2026");
  expect(await place(dateTrigger(page))).toEqual(before.date);
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

test("opening the clock writes nothing until something changes", async ({ page }) => {
  await open(page);
  let changes = 0;
  await page.exposeFunction("cdpCount", () => changes++);
  await page.evaluate(() => {
    const out = document.querySelector('[data-testid="value"]')!;
    new MutationObserver(() => (window as unknown as { cdpCount: () => void }).cdpCount()).observe(
      out,
      { childList: true, subtree: true, characterData: true },
    );
  });
  await timeTrigger(page).click();
  await expect(wheel(page, "Minute")).toHaveAttribute("aria-valuenow", "30");
  await page.waitForTimeout(500);
  expect(changes).toBe(0);
  await wheel(page, "Minute").focus();
  await page.keyboard.press("ArrowDown");
  await expect(value(page)).toHaveText("Sep 5, 2026 6:31 PM");
});

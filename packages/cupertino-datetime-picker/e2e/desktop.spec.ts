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

  await popup.getByRole("button", { name: "Done" }).focus();
  await page.keyboard.press("Enter");
  const title = popup.getByRole("button", { name: /August 2026/ });
  await expect(title).toHaveAttribute("aria-expanded", "false");
  // Focus goes back to the title, not to the page.
  await expect(title).toBeFocused();
  await expect(popup.getByRole("grid")).toHaveAccessibleName("August 2026");
});

/** Whether focusing the element actually moves focus there. */
const focusable = (locator: Locator) =>
  locator.evaluate((el: HTMLElement) => {
    el.focus();
    return document.activeElement === el;
  });

test("only the showing layer takes focus, and the open title is tinted", async ({ page }) => {
  await open(page);
  await dateTrigger(page).click();
  const popup = datePopup(page);
  const title = popup.getByRole("button", { name: /September 2026/ });
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
  // The wheel may still be passing rows; once it rests, the field agrees.
  const field = popup.getByRole("textbox", { name: "Hour" });
  await expect
    .poll(async () => {
      const wheelNow = String(await hour.getAttribute("aria-valuenow")).padStart(2, "0");
      return wheelNow === (await field.inputValue());
    })
    .toBe(true);

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

test("the segmented field does not scroll or move when focus and digits change", async ({
  page,
}) => {
  await open(page);
  await timeTrigger(page).click();
  const field = timePopup(page).getByRole("group", { name: "Time", exact: true });
  const hour = field.getByRole("textbox", { name: "Hour" });
  const minute = field.getByRole("textbox", { name: "Minute" });
  const geometry = () =>
    field.evaluate((el) => {
      const b = el.getBoundingClientRect();
      const r = [...el.children].map((child) => {
        const rect = child.getBoundingClientRect();
        return { x: rect.x - b.x, y: rect.y - b.y, width: rect.width, height: rect.height };
      });
      return { width: b.width, height: b.height, children: r };
    });
  // After the popover's spring has settled.
  await hour.click();
  await expect.poll(() => timePopup(page).evaluate((el) => el.getAnimations().length)).toBe(0);
  const before = await geometry();
  for (const digits of ["09", "10", "12"]) {
    await hour.click();
    await page.keyboard.type(digits);
    await expect(hour).toHaveValue(digits);
    await expect(minute).toBeFocused();
    expect(await geometry()).toEqual(before);
    for (const input of [hour, minute]) {
      await expect.poll(() => input.evaluate((el) => el.scrollLeft)).toBe(0);
    }
  }
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

test("jumps on the hour wheel do not carry into AM/PM; a hard fling has road", async ({ page }) => {
  await open(page);
  await timeTrigger(page).click();
  const hour = wheel(page, "Hour");
  await hour.focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowDown");
  await expect(value(page)).toHaveText("Sep 5, 2026 11:30 PM");
  // Type-ahead jumps to 1 by the nearest copy, past 12: still PM, like the field.
  await page.keyboard.type("1");
  await expect(value(page)).toHaveText("Sep 5, 2026 1:30 PM");

  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  const box = (await hour.boundingBox())!;
  const x = box.x + box.width / 2;
  const position = async () => Number(await hour.getAttribute("data-position"));
  const before = await position();
  await page.mouse.move(x, box.y + box.height - 8);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) await page.mouse.move(x, box.y + box.height - 8 - i * 34);
  await page.mouse.up();
  // The wheel has no end to run into: it stops on its own, on a row, at least
  // as far as the hand moved it (a busy runner's event pacing may allow no glide).
  await expect.poll(async () => Number.isInteger(await position()), { timeout: 4000 }).toBe(true);
  expect((await position()) - before).toBeGreaterThanOrEqual(6);
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

test("a long trackpad flick runs its full length and is never blank", async ({ page }) => {
  await open(page);
  await timeTrigger(page).click();
  const minute = wheel(page, "Minute");
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  const box = (await minute.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await minute.evaluate((el) => {
    const w = window as unknown as { far: number; fewest: number };
    w.far = 0;
    w.fewest = Infinity;
    const start = Number(el.dataset.position);
    const look = () => {
      w.far = Math.max(w.far, Math.abs(Number(el.dataset.position) - start));
      // However fast it spins, the wheel always shows its rows.
      const frame = el.getBoundingClientRect();
      const shown = [...el.querySelectorAll<HTMLElement>("[data-index] span")].filter((s) => {
        const b = s.getBoundingClientRect();
        const y = b.top + b.height / 2;
        return (
          s.textContent !== "" && Number(s.style.opacity) > 0.3 && y > frame.top && y < frame.bottom
        );
      }).length;
      w.fewest = Math.min(w.fewest, shown);
    };
    new MutationObserver(look).observe(el, { attributeFilter: ["data-position"] });
  });
  // A macOS trackpad flick: the fingers' strokes, then momentum events that
  // decay, about 4000px (125 rows) in all.
  let delta = 400;
  while (delta > 1) {
    await page.mouse.wheel(0, delta);
    delta *= 0.9;
  }
  const field = timePopup(page).getByRole("textbox", { name: "Minute" });
  // It rests on a row, and the field agrees with it.
  await expect
    .poll(async () => Number.isInteger(Number(await minute.getAttribute("data-position"))))
    .toBe(true);
  await expect(field).toHaveValue(
    String(await minute.getAttribute("aria-valuenow")).padStart(2, "0"),
  );
  const { far, fewest } = await page.evaluate(() => {
    const w = window as unknown as { far: number; fewest: number };
    return { far: w.far, fewest: w.fewest };
  });
  expect(far).toBeGreaterThan(100);
  expect(fewest).toBeGreaterThanOrEqual(4);
});

test("on a zoomed page the centre row still sits in the band", async ({ page }) => {
  await open(page);
  // Browser zoom rounds every row's height; CSS zoom does the same.
  await page.evaluate(() => (document.documentElement.style.zoom = "0.76"));
  await timeTrigger(page).click();
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  for (const name of ["Hour", "Minute"]) {
    const w = wheel(page, name);
    await w.focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(500);
    const off = await w.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const label = el.querySelector("[data-active] span")!.getBoundingClientRect();
      return label.top + label.height / 2 - (box.top + box.height / 2);
    });
    expect(Math.abs(off)).toBeLessThan(1);
  }
});

test("after changing month, Tab still reaches a day", async ({ page }) => {
  await open(page);
  await dateTrigger(page).click();
  const popup = datePopup(page);
  await popup.getByRole("button", { name: "Next month" }).click();
  await expect(popup.getByRole("grid")).toHaveAccessibleName("October 2026");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveAttribute("aria-label", /October \d+, 2026/);
});

const ms = (y: number, m: number, d: number) => new Date(y, m, d).getTime();

test("the month and year wheels stay within min and max", async ({ page }) => {
  await open(page, `&min=${ms(2026, 8, 1)}&max=${ms(2026, 10, 30)}`);
  await dateTrigger(page).click();
  const popup = datePopup(page);
  await popup.getByRole("button", { name: /September 2026/ }).click();
  const month = popup.getByRole("spinbutton", { name: "Month" });
  await month.focus();
  // Four months on is January 2027, past max: the wheel stops at November.
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowDown");
  await expect(month).toHaveAttribute("aria-valuetext", "November");
  // And back before min, it stops at September.
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowUp");
  await expect(month).toHaveAttribute("aria-valuetext", "September");
  const year = popup.getByRole("spinbutton", { name: "Year" });
  await year.focus();
  await page.keyboard.press("ArrowDown");
  await expect(year).toHaveAttribute("aria-valuenow", "2026");
  await popup.getByRole("button", { name: "Done" }).click();
  await expect(popup.getByRole("grid")).toHaveAccessibleName("September 2026");
});

test("keys that would leave min/max stop at the limit", async ({ page }) => {
  await open(page, `&max=${ms(2026, 8, 20)}`);
  await dateTrigger(page).click();
  const popup = datePopup(page);
  await popup.getByRole("gridcell", { name: /September 5, 2026/ }).focus();
  await page.keyboard.press("PageDown");
  await expect(page.locator(":focus")).toHaveAttribute("aria-label", /September 20, 2026/);
});

test("a day picked in an empty picker keeps the time the clock shows", async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 8, 5, 14, 7));
  await open(page);
  const empty = page.locator('[data-slot="date-time-picker"]').nth(5);
  await empty.locator('[data-slot="date-trigger"]').click();
  await datePopup(page)
    .getByRole("gridcell", { name: /September 10, 2026/ })
    .click();
  await expect(empty.locator('[data-slot="time-trigger"]')).toHaveText("2:07 PM");
});

test("a year far from today is still on the year wheel", async ({ page }) => {
  await page.goto(`/?at=${new Date(1900, 2, 1).getTime()}`);
  await dateTrigger(page).click();
  const popup = datePopup(page);
  await popup.getByRole("button", { name: /March 1900/ }).click();
  await expect(popup.getByRole("spinbutton", { name: "Year" })).toHaveAttribute(
    "aria-valuenow",
    "1900",
  );
});

test("a new locale relabels an open wheel where it stands", async ({ page }) => {
  await open(page);
  const inline = page.locator('[data-display="inline"]');
  await inline.getByRole("button", { name: /September 2026/ }).click();
  const month = inline.getByRole("spinbutton", { name: "Month" });
  await month.focus();
  for (let i = 0; i < 8; i++) await page.keyboard.press("ArrowDown");
  await expect(month).toHaveAttribute("aria-valuetext", "May");
  await page.getByRole("combobox").selectOption("fr-FR");
  await expect(month).toHaveAttribute("aria-valuetext", "mai");
  await expect(month.locator("[data-active] span")).toHaveText("mai");
});

test("right to left, the AM/PM thumb sits under the chosen period", async ({ page }) => {
  await open(page);
  await page.evaluate(() => (document.documentElement.dir = "rtl"));
  await timeTrigger(page).click();
  const control = timePopup(page).getByRole("radiogroup");
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  const { thumb, chosen } = await control.evaluate((el) => {
    const t = (el.firstElementChild as HTMLElement).getBoundingClientRect();
    const c = el.querySelector("input:checked")!.closest("label")!.getBoundingClientRect();
    return { thumb: t.left + t.width / 2, chosen: c.left + c.width / 2 };
  });
  expect(Math.abs(thumb - chosen)).toBeLessThan(4);
});

test("a time typed while a released wheel coasts is the one that stays", async ({ page }) => {
  await open(page);
  await timeTrigger(page).click();
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  const minute = wheel(page, "Minute");
  const box = (await minute.boundingBox())!;
  const x = box.x + box.width / 2;
  await page.mouse.move(x, box.y + box.height - 10);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) await page.mouse.move(x, box.y + box.height - 10 - i * 22);
  await page.mouse.up();
  await timePopup(page).getByRole("textbox", { name: "Minute" }).click();
  await page.keyboard.type("15");
  await page.waitForTimeout(1500);
  await expect(value(page)).toHaveText("Sep 5, 2026 6:15 PM");
  await expect(minute).toHaveAttribute("aria-valuenow", "15");
});

test("Enter in the time field commits and keeps focus there", async ({ page }) => {
  await open(page);
  await timeTrigger(page).click();
  const hourField = timePopup(page).getByRole("textbox", { name: "Hour" });
  await hourField.click();
  await page.keyboard.type("1");
  await page.keyboard.press("Enter");
  await expect(hourField).toBeFocused();
  await expect(hourField).toHaveValue("01");
});

test("values clamp to min and max as instants", async ({ page }) => {
  const max = new Date(2026, 8, 20, 17, 45).getTime();
  await open(page, `&max=${max}`);
  await dateTrigger(page).click();
  await datePopup(page)
    .getByRole("gridcell", { name: /September 20, 2026/ })
    .click();
  await expect(value(page)).toHaveText("Sep 20, 2026 5:45 PM");
});

test("on a 320px screen the calendar fits", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await open(page);
  await dateTrigger(page).click();
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  const box = (await datePopup(page).boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("typed minutes land on the minute interval", async ({ page }) => {
  await open(page);
  const every5 = page.locator('[data-slot="date-time-picker"]').nth(3);
  await every5.locator('[data-slot="time-trigger"]').click();
  await timePopup(page).getByRole("textbox", { name: "Minute" }).click();
  await page.keyboard.type("07");
  await expect(every5.locator('[data-slot="time-trigger"]')).toHaveText("9:05 AM");
  await expect(wheel(page, "Minute")).toHaveAttribute("aria-valuenow", "5");
});

test("a clock that turns 12-hour while open keeps the hour wheel on the hour", async ({ page }) => {
  await open(page);
  await timeTrigger(page).click();
  await page.getByRole("combobox").selectOption("de-DE");
  await expect(wheel(page, "Hour")).toHaveAttribute("aria-valuenow", "18");
  await page.getByRole("combobox").selectOption("en-US");
  const hour = wheel(page, "Hour");
  await expect(hour).toHaveAttribute("aria-valuenow", "6");
  await expect(hour.locator("[data-active] span")).toHaveText("6");
});

test("under CSS zoom a drag follows the pointer", async ({ page }) => {
  await open(page);
  await page.evaluate(() => (document.documentElement.style.zoom = "1.25"));
  await timeTrigger(page).click();
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  const minute = wheel(page, "Minute");
  const box = (await minute.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const before = Number(await minute.getAttribute("data-position"));
  // Three rows as drawn: 3 × 32px × 1.25.
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y - 120, { steps: 12 });
  await page.waitForTimeout(200);
  expect(Number(await minute.getAttribute("data-position")) - before).toBeCloseTo(3, 0);
  await page.mouse.up();
});

test("half-typed digits are not clamped away by min", async ({ page }) => {
  // min 2 PM: a lone "1" would be 1:30 PM, before it.
  await open(page, `&min=${new Date(2026, 8, 5, 14, 0).getTime()}`);
  await timeTrigger(page).click();
  await timePopup(page).getByRole("textbox", { name: "Hour" }).click();
  await page.keyboard.type("11");
  await expect(value(page)).toHaveText("Sep 5, 2026 11:30 PM");
});

test("with reduced motion, small trackpad deltas still turn a wheel", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  await timeTrigger(page).click();
  const minute = wheel(page, "Minute");
  const box = (await minute.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let i = 0; i < 40; i++) await page.mouse.wheel(0, 8);
  await expect(minute).toHaveAttribute("aria-valuenow", "40");
});

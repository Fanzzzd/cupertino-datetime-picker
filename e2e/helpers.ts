import type { Page } from "@playwright/test";

/** 2026-09-05 18:30 local, the demo's starting value. */
export const START = new Date(2026, 8, 5, 18, 30).getTime();

export async function open(page: Page, query = "") {
  await page.goto(`/?at=${START}${query}`);
  await page.locator('[data-slot="date-trigger"]').first().waitFor();
}

export const value = (page: Page) => page.getByTestId("value");
export const dateTrigger = (page: Page) => page.locator('[data-slot="date-trigger"]').first();
export const timeTrigger = (page: Page) => page.locator('[data-slot="time-trigger"]').first();
export const datePopup = (page: Page) => page.locator('[data-slot="date-popup"]');
export const timePopup = (page: Page) => page.locator('[data-slot="time-popup"]');
export const wheel = (page: Page, name: string) =>
  timePopup(page).getByRole("spinbutton", { name, exact: true });

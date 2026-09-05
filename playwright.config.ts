import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.CDP_E2E_PORT ?? 4173);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "line",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", testMatch: /desktop\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
    // Touch, small viewport, mobile UA: the wheels must fling and the popover must fit.
    {
      name: "mobile",
      testMatch: /mobile\.spec\.ts/,
      use: { ...devices["iPhone 15"], browserName: "chromium" },
    },
    // Apple's own engine: the touch gestures that need CDP are skipped here.
    {
      name: "mobile-safari",
      testMatch: /^(?!.*shots).*mobile\.spec\.ts/,
      use: { ...devices["iPhone 15"] },
    },
    {
      name: "desktop-safari",
      testMatch: /^(?!.*shots).*desktop\.spec\.ts/,
      use: { ...devices["Desktop Safari"] },
    },
  ],
  webServer: {
    command: `pnpm exec vite --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e-fullstack",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "playwright-report/fullstack", open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:19080",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "fullstack-chromium", use: { ...devices["Desktop Chrome"] } }],
});

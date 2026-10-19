import { defineConfig, devices } from "@playwright/test";
const staticMode = process.env.E2E_STATIC === "1";
const port = staticMode ? 3100 : 3000;
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  timeout: 30000,
  expect: { timeout: 7000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${port}${staticMode ? "/DemoDnA/" : "/"}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1050 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: staticMode ? "node scripts/serve-export.mjs" : "npm run dev",
    url: `http://localhost:${port}${staticMode ? "/DemoDnA/" : ""}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});

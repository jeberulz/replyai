import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./playwright",
  testMatch: /.*\.e2e\.ts/,
  fullyParallel: false,
  workers: 1,
  outputDir: "output/playwright/test-results",
  use: {
    ...devices["iPhone 13"],
    browserName: "chromium",
    baseURL: "http://localhost:3106",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: { width: 375, height: 812 },
    permissions: ["clipboard-read", "clipboard-write"],
  },
  webServer: {
    command: "npm run dev -- --port 3106",
    url: "http://localhost:3106",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

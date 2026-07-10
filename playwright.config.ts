import { defineConfig, devices } from "@playwright/test";

const VIEWPORTS = [
  { name: "critical-375", width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: "critical-768", width: 768, height: 1024, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  { name: "critical-1280", width: 1280, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  { name: "critical-1728", width: 1728, height: 1117, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
];

export default defineConfig({
  testDir: "./playwright",
  testMatch: /.*\.e2e\.ts/,
  fullyParallel: false,
  workers: 1,
  outputDir: "output/playwright/test-results",
  use: {
    browserName: "chromium",
    baseURL: "http://localhost:3106",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    permissions: ["clipboard-read", "clipboard-write"],
  },
  projects: VIEWPORTS.map((viewport) => ({
    name: viewport.name,
    use: {
      ...devices["Desktop Chrome"],
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.deviceScaleFactor,
      isMobile: viewport.isMobile,
      hasTouch: viewport.hasTouch,
    },
  })),
  webServer: {
    command: "npm run dev -- --port 3106",
    url: "http://localhost:3106",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

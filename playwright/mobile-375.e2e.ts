import { expect, test, type Page } from "@playwright/test";
import { DEMO_TWEETS } from "../shared/demoData";

const DEMO_TWEET = DEMO_TWEETS[0];
const DEMO_TWEET_URL = `https://x.com/${DEMO_TWEET.authorHandle}/status/${DEMO_TWEET.id}`;

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);

async function loginDemo(page: Page) {
  await page.goto("/api/auth/demo");

  if (page.url().includes("/onboarding")) {
    await page
      .getByRole("button", { name: /Skip setup/i })
      .click({ timeout: 15_000 });
    await page.waitForURL("**/dashboard", { timeout: 30_000 });
  }

  if (!page.url().includes("/dashboard")) {
    await page.goto("/dashboard");
  }

  await expect(page).toHaveURL(/\/dashboard/);
}

async function expectNoHorizontalScroll(page: Page, surface: string) {
  const layout = await page.evaluate(() => {
    const viewport = window.innerWidth;
    const pageWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth
    );

    const offenders = Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .filter((element) => {
        const style = window.getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden") {
          return false;
        }

        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.right - viewport > 1;
      })
      .slice(0, 5)
      .map((element) => element.tagName.toLowerCase());

    return { viewport, pageWidth, offenders };
  });

  expect(
    layout.pageWidth,
    `${surface} overflowed horizontally; offenders: ${layout.offenders.join(", ")}`
  ).toBeLessThanOrEqual(layout.viewport + 1);
}

async function waitForOptions(page: Page) {
  await expect(
    page.getByRole("button", { name: /Generate 3 more replies/i })
  ).toBeVisible({ timeout: 30_000 });
}

async function ensureFeedHasOpportunity(page: Page) {
  const rows = page.locator('[data-testid^="opportunity-row-"]');
  if ((await rows.count()) > 0) return true;

  await page.getByRole("button", { name: /Sources/i }).click();

  const searchSwitch = page.getByTestId("source-switch-search");
  if ((await searchSwitch.getAttribute("data-state")) !== "checked") {
    await searchSwitch.click();
  }

  await page.locator("#search-keywords").fill("ai");
  const searchSaveButton = page.getByRole("button", { name: "Save" }).nth(1);
  if (await searchSaveButton.isEnabled()) {
    await searchSaveButton.click();
  }
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: /Scan now/i }).click();
  try {
    await expect(rows.first()).toBeVisible({ timeout: 30_000 });
    return true;
  } catch {
    return false;
  }
}

function futureDatetimeLocal() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate()),
    ].join("-") + `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

test.beforeEach(async ({ page }) => {
  await loginDemo(page);
});

test("feed detail stacks cleanly at 375px", async ({ page }) => {
  await page.goto("/feed");

  await expect(page.getByRole("heading", { name: "Feed scanner" })).toBeVisible();
  const hasOpportunity = await ensureFeedHasOpportunity(page);
  await expectNoHorizontalScroll(page, "feed list");

  if (!hasOpportunity) {
    await expect(
      page.getByText(/Last scan found no tweets matching your keywords/i)
    ).toBeVisible();
    await page.getByRole("button", { name: /Sources/i }).click();
    await expect(
      page.getByRole("heading", { name: /Sources & settings/i })
    ).toBeVisible();
    await expectNoHorizontalScroll(page, "feed settings");
    return;
  }

  await page.locator('[data-testid^="opportunity-row-"]').first().click();

  await expect(page.getByRole("button", { name: "Opportunities" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Opportunity" })).toBeVisible();
  await expectNoHorizontalScroll(page, "feed detail");

  await page.getByRole("link", { name: /Analyze & reply/i }).click();
  await expect(page).toHaveURL(/\/dashboard\?url=/);
  await expectNoHorizontalScroll(page, "feed analyze handoff");
});

test("analysis flow keeps mobile controls inside the viewport", async ({ page }) => {
  await page.goto("/dashboard");

  await page
    .getByPlaceholder(/Paste a tweet or its URL to analyze/i)
    .fill(DEMO_TWEET_URL);
  await page.getByRole("button", { name: "Analyze" }).click();

  await page.waitForURL(/\/analysis\//, { timeout: 30_000 });
  await waitForOptions(page);
  await expect(
    page.getByText(new RegExp(`@${DEMO_TWEET.authorHandle}`)).first()
  ).toBeVisible();
  await expectNoHorizontalScroll(page, "analysis workbench");

  await page.getByRole("button", { name: /Copy/i }).first().click();
});

test("draft detail stack stays readable at 375px", async ({ page }) => {
  await page.goto("/dashboard");

  await page
    .getByPlaceholder(/Paste a tweet or its URL to analyze/i)
    .fill(DEMO_TWEET_URL);
  await page.getByRole("button", { name: "Analyze" }).click();

  await page.waitForURL(/\/analysis\//, { timeout: 30_000 });
  await waitForOptions(page);

  await page.getByRole("button", { name: /^Schedule$/ }).first().click();
  await page.locator('input[type="datetime-local"]').fill(futureDatetimeLocal());
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /^Schedule$/ })
    .click();

  await page.goto("/drafts");
  await expect(
    page.locator('[data-testid^="draft-row-"]').filter({ hasText: "Scheduled" }).first()
  ).toBeVisible({ timeout: 30_000 });
  await expectNoHorizontalScroll(page, "drafts list");

  await page
    .locator('[data-testid^="draft-row-"]')
    .filter({ hasText: "Scheduled" })
    .first()
    .click();

  await expect(page.getByRole("button", { name: "Drafts" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Draft detail" })).toBeVisible();
  await expectNoHorizontalScroll(page, "draft detail");
});

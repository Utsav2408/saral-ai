import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const sampleLease = path.join(
  process.cwd(),
  "fixtures/leases/sample-lease.txt",
);

async function assertNoSeriousA11y(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
}

test("home has no serious/critical axe violations", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /look at your lease/i }),
  ).toBeVisible();
  await assertNoSeriousA11y(page);
});

test("overview and chat have no serious/critical axe violations", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(sampleLease);
  await expect(page).toHaveURL(/\/overview/, { timeout: 30_000 });
  await assertNoSeriousA11y(page);

  await page.getByRole("link", { name: /Chat with it/i }).click();
  await expect(page).toHaveURL(/\/chat/);
  await expect(page.getByRole("heading", { name: "Chat" })).toBeVisible();
  await assertNoSeriousA11y(page);
});

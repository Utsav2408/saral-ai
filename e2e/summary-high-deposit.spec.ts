import path from "node:path";
import { expect, test } from "@playwright/test";

const highDepositLease = path.join(
  process.cwd(),
  "fixtures/leases/high-deposit-lease.txt",
);

test("high-deposit lease shows deposit flag on Summary", async ({ page }) => {
  await page.route("**/api/session/*/summary", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    const url = route.request().url();
    const tokenMatch = url.match(/\/api\/session\/([^/]+)\/summary/);
    const token = tokenMatch?.[1] ?? "test-token";

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        token,
        title: "High deposit lease",
        facts: {
          state: "Maharashtra",
          depositAmount: 500_000,
          monthlyRent: 40_000,
        },
        flags: [
          {
            id: "flag-deposit_high_vs_rent",
            ruleId: "deposit_high_vs_rent",
            severity: "warning",
            summaryKey: "conflict.deposit_high_vs_rent",
          },
        ],
        flagDescriptions: [
          {
            flagId: "flag-deposit_high_vs_rent",
            description:
              "The security deposit is high relative to monthly rent.",
          },
        ],
        checklist: [
          {
            id: "check-1",
            text: "Ask the landlord to justify the deposit amount.",
            priority: "high",
          },
        ],
        overview: "This lease has an unusually high deposit.",
        cached: false,
      }),
    });
  });

  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(highDepositLease);
  await expect(page).toHaveURL(/\/overview/, { timeout: 30_000 });
  await expect(page.getByText("₹5,00,000", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: /Summary & checklist/i }).click();
  await expect(page).toHaveURL(/\/summary/);
  await expect(page.getByText(/deposit high vs rent/i)).toBeVisible();
  await expect(
    page.getByText(/high relative to monthly rent/i),
  ).toBeVisible();
});

import path from "node:path";
import { expect, test } from "@playwright/test";

const sampleLease = path.join(
  process.cwd(),
  "fixtures/leases/sample-lease.txt",
);

test("upload → overview → summary with mocked API", async ({ page }) => {
  await page.route("**/api/session/*/summary", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    const url = route.request().url();
    const tokenMatch = url.match(/\/api\/session\/([^/]+)\/summary/);
    const token = tokenMatch?.[1] ?? "test-token";

    const sessionRes = await page.request.get(
      `/api/session/${encodeURIComponent(token)}`,
    );
    const session = await sessionRes.json();

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        token,
        title: session.title ?? "Sample lease",
        facts: session.facts,
        flags: [
          {
            id: "flag-missing_receipt",
            ruleId: "missing_receipt",
            severity: "info",
            summaryKey: "gap.missing_receipt",
          },
        ],
        flagDescriptions: [
          {
            flagId: "flag-missing_receipt",
            description: "The lease does not mention rent receipts.",
          },
        ],
        checklist: [
          {
            id: "check-1",
            flagId: "flag-missing_receipt",
            text: "Ask for written receipts.",
            priority: "medium",
          },
        ],
        overview: "Mocked summary overview of your residential lease.",
        cached: false,
      }),
    });
  });

  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(sampleLease);
  await expect(page).toHaveURL(/\/overview/, { timeout: 30_000 });

  await page.getByRole("link", { name: /Summary & checklist/i }).click();
  await expect(page).toHaveURL(/\/summary/);
  await expect(page.getByRole("heading", { name: "Summary" })).toBeVisible();
  await expect(
    page.getByText(/Mocked summary overview/),
  ).toBeVisible();
  await expect(page.getByText(/Ask for written receipts/)).toBeVisible();
});

test("summary without session redirects to home", async ({ page }) => {
  await page.goto("/summary");
  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
});

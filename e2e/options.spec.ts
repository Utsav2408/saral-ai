import path from "node:path";
import { expect, test } from "@playwright/test";

const sampleLease = path.join(
  process.cwd(),
  "fixtures/leases/sample-lease.txt",
);

const escalationLease = path.join(
  process.cwd(),
  "fixtures/leases/escalation-trigger-lease.txt",
);

test("upload → overview → options with mocked API", async ({ page }) => {
  await page.route("**/api/session/*/options", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    const url = route.request().url();
    const tokenMatch = url.match(/\/api\/session\/([^/]+)\/options/);
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
        escalation: false,
        reraChecks: [
          {
            disputeType: "residential_rent_dispute",
            applicable: false,
            explanation: "Ordinary rent disputes are outside RERA.",
          },
        ],
        steps: [
          {
            id: "step-1",
            title: "Document everything",
            body: "Keep copies of notices and payments.",
            citations: [],
          },
        ],
        regime: {
          state: "Maharashtra",
          category: "residential_rent",
          code: "rent_control",
          label: "Maharashtra Rent Control Act, 1999",
        },
        cached: false,
      }),
    });
  });

  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(sampleLease);
  await expect(page).toHaveURL(/\/overview/, { timeout: 30_000 });

  await page.getByRole("link", { name: /Your options/i }).click();
  await expect(page).toHaveURL(/\/options/);
  await expect(page.getByRole("heading", { name: "Your options" })).toBeVisible();
  await expect(page.getByText(/Document everything/)).toBeVisible();
  await expect(page.getByText(/Ordinary rent disputes/)).toBeVisible();
});

test("escalation banner fires on trigger lease", async ({ page }) => {
  await page.route("**/api/session/*/options", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    const url = route.request().url();
    const tokenMatch = url.match(/\/api\/session\/([^/]+)\/options/);
    const token = tokenMatch?.[1] ?? "test-token";

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        token,
        title: "Escalation lease",
        escalation: true,
        reraChecks: [
          {
            disputeType: "residential_rent_dispute",
            applicable: false,
            explanation: "Not RERA.",
          },
        ],
        steps: [
          {
            id: "step-1",
            title: "Seek qualified help",
            body: "Do not attempt DIY courtroom strategy.",
            citations: [],
          },
        ],
        regime: {
          state: "Maharashtra",
          category: "residential_rent",
          code: "rent_control",
          label: "MRCA",
        },
        cached: false,
      }),
    });
  });

  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(escalationLease);
  await expect(page).toHaveURL(/\/overview/, { timeout: 30_000 });

  await page.getByRole("link", { name: /Your options/i }).click();
  await expect(page).toHaveURL(/\/options/);
  await expect(
    page.getByRole("alert").filter({ hasText: /Seek qualified help/i }),
  ).toBeVisible();
});

test("options without session redirects to home", async ({ page }) => {
  await page.goto("/options");
  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
});

import path from "node:path";
import { expect, test } from "@playwright/test";

const sampleLease = path.join(
  process.cwd(),
  "fixtures/leases/sample-lease.txt",
);

test("upload → overview → simplify with mocked API", async ({ page }) => {
  await page.route("**/api/session/*/simplify", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    const url = route.request().url();
    const tokenMatch = url.match(/\/api\/session\/([^/]+)\/simplify/);
    const token = tokenMatch?.[1] ?? "test-token";

    // Fetch real session so clause ids match
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
        clauses: session.clauses,
        simplifiedClauses: (session.clauses as { id: string; text: string }[]).map(
          (c) => ({
            clauseId: c.id,
            simpleText: `Plain language: ${c.text.slice(0, 80)}`,
            entityCheckPassed: true,
          }),
        ),
        cached: false,
      }),
    });
  });

  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(sampleLease);
  await expect(page).toHaveURL(/\/overview/, { timeout: 30_000 });

  await page.getByRole("link", { name: /Simplify it/i }).click();
  await expect(page).toHaveURL(/\/simplify/);
  await expect(
    page.getByRole("heading", { name: "Simplified" }),
  ).toBeVisible();
  await expect(page.getByText(/Plain language:/).first()).toBeVisible();

  await page.getByRole("tab", { name: /Original text/i }).click();
  await expect(page.getByText(/security deposit/i).first()).toBeVisible();

  await page.getByRole("tab", { name: /Plain language/i }).click();
  await expect(page.getByText(/Plain language:/).first()).toBeVisible();
});

test("simplify without session redirects to home", async ({ page }) => {
  await page.goto("/simplify");
  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
});

import path from "node:path";
import { expect, test } from "@playwright/test";

const sampleLease = path.join(
  process.cwd(),
  "fixtures/leases/sample-lease.txt",
);

test("mocked 503 on simplify shows friendly alert and Retry", async ({
  page,
}) => {
  await page.route("**/api/session/*/simplify", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "AI_NOT_CONFIGURED",
          message: "AI is not configured. Set GROQ_API_KEY on the server.",
        },
      }),
    });
  });

  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(sampleLease);
  await expect(page).toHaveURL(/\/overview/, { timeout: 30_000 });
  await page.getByRole("link", { name: /Simplify it/i }).click();
  await expect(page).toHaveURL(/\/simplify/);

  const alert = page.getByRole("alert").filter({ hasText: /temporarily unavailable|try again/i });
  await expect(alert).toBeVisible();
  await expect(alert).not.toContainText(/GROQ_API_KEY|stack/i);
  await expect(page.getByRole("button", { name: /Retry/i })).toBeVisible();
});

test("mocked 429 on chat restores draft and shows Retry", async ({ page }) => {
  await page.route("**/api/session/*/chat", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: "RATE_LIMITED", message: "Too many requests." },
      }),
    });
  });

  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(sampleLease);
  await expect(page).toHaveURL(/\/overview/, { timeout: 30_000 });
  await page.getByRole("link", { name: /Chat with it/i }).click();
  await expect(page).toHaveURL(/\/chat/);

  await page.getByLabel(/Ask about your lease/i).fill("Is my deposit legal?");
  await page.getByRole("button", { name: /Send message/i }).click();

  const alert = page
    .getByRole("alert")
    .filter({ hasText: /Too many requests|Wait a few seconds/i });
  await expect(alert).toBeVisible();
  await expect(alert).not.toContainText(/stack|GROQ_API_KEY/i);
  await expect(page.getByLabel(/Ask about your lease/i)).toHaveValue(
    "Is my deposit legal?",
  );
  await expect(page.getByRole("button", { name: /Retry/i })).toBeVisible();
});

test("empty chat message keeps send disabled", async ({ page }) => {
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(sampleLease);
  await expect(page).toHaveURL(/\/overview/, { timeout: 30_000 });
  await page.getByRole("link", { name: /Chat with it/i }).click();
  await expect(page).toHaveURL(/\/chat/);
  await expect(page.getByRole("button", { name: /Send message/i })).toBeDisabled();
});

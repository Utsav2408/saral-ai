/**
 * Live Groq smoke — skipped unless LIVE_E2E=1 and GROQ_API_KEY are set.
 * Proves Escalation Guard fires without mocking the Options API.
 */

import path from "node:path";
import { expect, test } from "@playwright/test";

const escalationLease = path.join(
  process.cwd(),
  "fixtures/leases/escalation-trigger-lease.txt",
);

const live =
  process.env.LIVE_E2E === "1" && Boolean(process.env.GROQ_API_KEY?.trim());

test.describe("live smoke", () => {
  test.skip(!live, "Set LIVE_E2E=1 and GROQ_API_KEY to run");

  test("escalation banner fires without mocking Options", async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto("/");
    await page.locator('input[type="file"]').setInputFiles(escalationLease);
    await expect(page).toHaveURL(/\/overview/, { timeout: 30_000 });

    await page.getByRole("link", { name: /Your options/i }).click();
    await expect(page).toHaveURL(/\/options/);
    await expect(
      page.getByRole("alert").filter({ hasText: /Seek qualified help/i }),
    ).toBeVisible({ timeout: 90_000 });
  });
});

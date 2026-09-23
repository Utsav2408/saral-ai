import path from "node:path";
import { expect, test } from "@playwright/test";

const sampleLease = path.join(
  process.cwd(),
  "fixtures/leases/sample-lease.txt",
);

test("upload → overview → chat with mocked API", async ({ page }) => {
  await page.route("**/api/session/*/chat", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    const url = route.request().url();
    const tokenMatch = url.match(/\/api\/session\/([^/]+)\/chat/);
    const token = tokenMatch?.[1] ?? "test-token";
    const post = route.request().postDataJSON() as { message?: string };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        token,
        title: "1BHK Lease — Andheri West",
        reply: {
          role: "assistant",
          content:
            "Leaving early does not automatically let the landlord keep your full deposit. Check Clause 2 and the Maharashtra Rent Control Act.",
          citations: [
            {
              id: "mh-mrca-s15",
              label: "Maharashtra Rent Control Act",
              sourceUrl: "https://www.indiacode.nic.in/handle/123456789/15817",
            },
            { id: "lease:c-2", label: "Your lease · Clause 2" },
          ],
        },
        messages: [
          { role: "user", content: post.message ?? "question" },
          {
            role: "assistant",
            content:
              "Leaving early does not automatically let the landlord keep your full deposit. Check Clause 2 and the Maharashtra Rent Control Act.",
            citations: [
              {
                id: "mh-mrca-s15",
                label: "Maharashtra Rent Control Act",
                sourceUrl:
                  "https://www.indiacode.nic.in/handle/123456789/15817",
              },
              { id: "lease:c-2", label: "Your lease · Clause 2" },
            ],
          },
        ],
        regime: {
          state: "Maharashtra",
          category: "residential_rent",
          code: "rent_control",
          label: "Maharashtra Rent Control Act, 1999",
        },
      }),
    });
  });

  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(sampleLease);
  await expect(page).toHaveURL(/\/overview/, { timeout: 30_000 });

  await page.getByRole("link", { name: /Chat with it/i }).click();
  await expect(page).toHaveURL(/\/chat/);
  await expect(page.getByRole("heading", { name: "Chat" })).toBeVisible();

  await page.getByRole("button", { name: /Is this deposit legal\?/i }).click();
  await expect(
    page.getByText(/Maharashtra Rent Control Act/).first(),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Your lease · Clause 2/)).toBeVisible();
});

test("chat without session redirects to home", async ({ page }) => {
  await page.goto("/chat");
  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
});

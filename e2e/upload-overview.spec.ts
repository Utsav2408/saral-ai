import path from "node:path";
import { expect, test } from "@playwright/test";

const sampleLease = path.join(
  process.cwd(),
  "fixtures/leases/sample-lease.txt",
);

test("upload txt lease and see facts + clauses on Overview", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /look at your lease/i }),
  ).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles(sampleLease);
  await expect(page).toHaveURL(/\/overview/, { timeout: 30_000 });

  await expect(page.getByText("Deposit", { exact: true })).toBeVisible();
  await expect(page.getByText("₹1,50,000", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Clauses/ })).toBeVisible();
  await expect(page.getByText(/Clause 1/i).first()).toBeVisible();
});

test("unsupported file type shows an error", async ({ page }) => {
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles({
    name: "photo.png",
    mimeType: "image/png",
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  });
  await expect(page.locator('p[role="alert"]')).toContainText(
    /PDF|plain text|supported/i,
  );
});

test("overview without session redirects to home", async ({ page }) => {
  await page.goto("/overview");
  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
});

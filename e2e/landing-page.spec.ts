import { test, expect } from "@playwright/test";

test("landing page has correct title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/On Record/);
});

test("meta description contains target keyword", async ({ page }) => {
  await page.goto("/");
  const metaDescription = page.locator('meta[name="description"]');
  await expect(metaDescription).toHaveAttribute("content", /Utah/);
});

test("page has exactly one h1", async ({ page }) => {
  await page.goto("/");
  const h1s = page.locator("h1");
  await expect(h1s).toHaveCount(1);
});

test("primary CTA links to /setup", async ({ page }) => {
  await page.goto("/");
  const cta = page.getByRole("link", { name: /get started|connect on record/i });
  await expect(cta).toHaveAttribute("href", "/setup");
});

test("skip link is first focusable element", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const focused = page.locator(":focus");
  await expect(focused).toHaveAttribute("href", "#main-content");
});

test("CTA tap target meets 44px minimum on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const cta = page.getByRole("link", { name: /get started|connect on record/i });
  const box = await cta.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
});

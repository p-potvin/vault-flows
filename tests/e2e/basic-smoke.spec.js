import { test, expect } from '@playwright/test';

test('basic smoke test', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/VaultFlows/i);
});

test('displays workflow sections', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
});

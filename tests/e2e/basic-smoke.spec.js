import { test, expect } from '@playwright/test';

test('basic smoke test', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/VaultFlows/);
});

test('displays workflow sections', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Preset Library', { exact: true }).first()).toBeVisible();
});

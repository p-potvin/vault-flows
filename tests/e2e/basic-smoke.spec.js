import { test, expect } from '@playwright/test';

test.describe('VaultFlows Frontend Smoke Tests', () => {
  test('homepage loads and displays main UI', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/VaultFlows/i);
    await expect(page.locator('body')).toBeVisible();
  });
});

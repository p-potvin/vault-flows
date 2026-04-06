import { test, expect } from '@playwright/test';

test.describe('VaultFlows Frontend Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the workflows API so tests don't require a running backend
    await page.route('**/api/workflows', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, name: 'Test Workflow', category: 'ML', description: 'A test workflow' },
        ]),
      });
    });
  });

  test('homepage loads and displays main UI', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/VaultFlows/i);
    await expect(page.locator('body')).toBeVisible();
  });

  test('displays Workflow Manager header', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Workflow Manager')).toBeVisible();
  });

  test('displays category sidebar', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Categories')).toBeVisible();
    await expect(page.getByText('All')).toBeVisible();
  });

  test('displays Create Workflow button', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('+ Create Workflow')).toBeVisible();
  });

  test('displays workflow sections', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Photo Editing Tools')).toBeVisible();
    await expect(page.getByText('Image Captioning')).toBeVisible();
    await expect(page.getByText('LoRA Training Workflow')).toBeVisible();
  });
});

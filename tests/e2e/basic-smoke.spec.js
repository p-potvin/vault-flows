import { test, expect } from '@playwright/test';

test.describe('VaultFlows Frontend Smoke Tests', () => {
  test('homepage loads and displays main UI', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/VaultFlows/i);
    await expect(page.locator('body')).toBeVisible();
  });

  test('displays workflow sections', async ({ page }) => {
    await page.goto('/');

    const element1 = page.getByText('Blog Post Drafter').first();
    await element1.scrollIntoViewIfNeeded();
    await expect(element1).toBeVisible();

    const element2 = page.getByText('Lesson Plan Builder').first();
    await element2.scrollIntoViewIfNeeded();
    await expect(element2).toBeVisible();

    const element3 = page.getByText('Meeting Summary').first();
    await element3.scrollIntoViewIfNeeded();
    await expect(element3).toBeVisible();

    const element4 = page.getByText('Image Gen Basic').first();
    await element4.scrollIntoViewIfNeeded();
    await expect(element4).toBeVisible();

    const element5 = page.getByText('Skateboarding Trick Analysis & Slow-Mo Generation').first();
    await element5.scrollIntoViewIfNeeded();
    await expect(element5).toBeVisible();
  });

  test('basic smoke test', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/VaultFlows/);
  });

  test('displays Preset Library', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Preset Library', { exact: true }).first()).toBeVisible();
  });
});

// e2e_new_features.spec.js
// Placeholder for Playwright e2e tests for new features

import { test, expect } from "@playwright/test";

test.describe('Vault Flows New Features', () => {
  test.skip('API key required for protected endpoints', async ({ page }) => {
    const testApiKey = 'test-api-key-789';

    // Intercept /config calls to verify the X-Api-Key header
    await page.route('**/config', async (route) => {
      const headers = await route.request().allHeaders();
      const apiKey = headers['x-api-key'];

      if (apiKey === testApiKey) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ config: { apiKey: 'verified' } }),
        });
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Unauthorized' }),
        });
      }
    });

    await page.goto('/');

    // 1. Navigate to Config and set the API key
    await page.getByRole('button', { name: 'Config' }).click();
    const configEditor = page.locator('textarea');
    await expect(configEditor).toBeVisible();

    const config = JSON.parse(await configEditor.inputValue());
    config.apiKey = testApiKey;

    await configEditor.fill(JSON.stringify(config, null, 2));
    await page.getByRole('button', { name: 'Update Config' }).click();
    await expect(page.getByText(/Config updated|Config saved locally/)).toBeVisible();

    // 2. Verify that the API key is correctly sent in the request headers
    // We trigger an API call using the 'Reload' button and wait for the intercepted request.
    const requestPromise = page.waitForRequest(request => request.url().includes('/config'));
    await page.getByRole('button', { name: 'Reload', exact: true }).click();
    const request = await requestPromise;

    // Assert that the X-Api-Key header matches our configured key.
    expect(request.headers()['x-api-key']).toBe(testApiKey);

    // 3. Verify the key is persisted in localStorage
    const storedConfig = await page.evaluate(() => JSON.parse(localStorage.getItem('vault-flows.config')));
    expect(storedConfig.apiKey).toBe(testApiKey);
  });
  test('User registration and login', async () => {
    // TODO: Implement registration/login test
  });
  test('Mask widget renders and accepts input', async () => {
    // TODO: Implement mask widget UI test
  });
  test('Dataset manager UI basic render', async () => {
    // TODO: Implement dataset manager UI test
  });
  test('Advanced workflow creator UI basic render', async () => {
    // TODO: Implement workflow creator UI test
  });
  test('Captioning UI basic render', async () => {
    // TODO: Implement captioning UI test
  });
});

import { Buffer } from 'node:buffer';
import { test, expect } from '@playwright/test';

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sZ8xjUAAAAASUVORK5CYII=',
  'base64',
);
const fakeMp4 = Buffer.from('00000020667479706D703432000000006D70343269736F6D', 'hex');

test.describe('VaultFlows Frontend Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
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
    await expect(page.getByRole('button', { name: 'All', exact: true })).toBeVisible();
  });

  test('displays Create Workflow button', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('+ Create Workflow')).toBeVisible();
  });

  test('displays workflow sections', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Advanced Image Editor (Canvas)')).toBeVisible();
    await expect(page.getByText('Image Captioning & Tagging')).toBeVisible();
    await expect(page.getByText('LoRA Dataset & Training Planner')).toBeVisible();
    await expect(page.getByText('Image to Video Face Swap')).toBeVisible();
  });

  test('can create and edit a workflow in local fallback mode', async ({ page }) => {
    await page.goto('/');

    await page.getByText('+ Create Workflow').click();
    await page.getByLabel('Name:').fill('Smoke Test Workflow');
    await page.getByLabel('Category:').fill('ML');
    await page.getByRole('button', { name: 'Create', exact: true }).click();

    await expect(page.getByText('Smoke Test Workflow').first()).toBeVisible();

    await page.getByRole('button', { name: 'Edit' }).first().click();
    await page.getByLabel('Name:').fill('Edited Workflow');
    await page.getByLabel('Category:').fill('Reporting');
    await page.getByRole('button', { name: 'Save' }).click();

    const editedCard = page.locator('li').filter({ hasText: 'Edited Workflow' }).first();

    await expect(editedCard.getByText('Edited Workflow')).toBeVisible();
    await expect(editedCard.getByText('Reporting')).toBeVisible();
  });

  test('can save guided local runtime settings from config', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Config' }).click();

    await page.getByLabel('Runtime Provider').selectOption('local-bridge');
    await page.getByLabel('Model Directory').fill('D:\\comfyui\\resources\\comfyui\\models');
    await page.getByLabel('Local Bridge URL').fill('http://127.0.0.1:8484');
    await expect(page.getByLabel('Model Directory')).toHaveValue('D:\\comfyui\\resources\\comfyui\\models');
    await page.getByRole('button', { name: 'Save Runtime Settings' }).click();

    await expect(page.getByText('Runtime settings updated')).toBeVisible();
  });

  test('can prepare a face-swap job in manual mode', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Source face image').setInputFiles({
      name: 'source.png',
      mimeType: 'image/png',
      buffer: tinyPng,
    });

    await page.getByLabel('Target video').setInputFiles({
      name: 'target.mp4',
      mimeType: 'video/mp4',
      buffer: fakeMp4,
    });

    await page.getByRole('button', { name: 'Run Local Face Swap' }).click();

    await expect(
      page.locator('div').filter({ hasText: 'Execution result' }).first(),
    ).toBeVisible();
    await expect(page.getByText('"flowId": "videoFaceSwap"')).toBeVisible();
  });
});

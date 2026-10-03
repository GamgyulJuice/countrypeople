import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { completeOnboarding } from './onboarding-helper.mjs';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:5175';
const artifacts = fileURLToPath(new URL('../artifacts/', import.meta.url));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
const allowedHosts = ['127.0.0.1', 'localhost', 'fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'];
await context.route('**/*', route => allowedHosts.includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
const page = await context.newPage();
page.setDefaultNavigationTimeout(60000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const assertFits = async label => {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${label} should fit the viewport`).toBe(true);
};
const capture = async name => {
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
  await assertFits(name);
  await page.screenshot({ path: fileURLToPath(new URL(`../artifacts/theme-${name}.png`, import.meta.url)), fullPage: true, animations: 'disabled' });
};

try {
  await mkdir(artifacts, { recursive: true });
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: '먼저, 나의 이주 계획부터' })).toBeVisible({ timeout: 15000 });
  await capture('onboarding-desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  await capture('onboarding-mobile');
  console.log('THEME: onboarding desktop and mobile captured');

  await page.setViewportSize({ width: 1440, height: 1080 });
  await completeOnboarding(page);
  await capture('dashboard-desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  await capture('dashboard-mobile');
  console.log('THEME: dashboard desktop and mobile captured');

  const pages = [
    ['맞춤 정책 찾기', '나에게 맞는 정책 찾기'],
    ['나의 로드맵', '나의 정착 로드맵'],
    ['프로필 및 설정', '내 상황에 맞게, 나의 프로필'],
  ];
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
    for (const [label, heading] of pages) {
      if (width === 390) await page.getByRole('button', { name: '메뉴 열기', exact: true }).click();
      await page.getByRole('button', { name: label, exact: true }).click();
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      await assertFits(`${label} ${width}px`);
    }
  }
  console.log('THEME: fonts', await page.evaluate(() => ({
    body: getComputedStyle(document.body).fontFamily,
    heading: getComputedStyle(document.querySelector('h1')).fontFamily,
    loaded: [...new Set([...document.fonts].filter(font => font.status === 'loaded').map(font => font.family))],
  })));
  expect(errors).toEqual([]);
  console.log('PASS: theme onboarding/dashboard screenshots, desktop/mobile navigation, no horizontal overflow or browser errors.');
} catch (error) {
  console.error('THEME failure URL:', page.url());
  console.error('THEME browser errors:', errors);
  await page.screenshot({ path: fileURLToPath(new URL('../artifacts/theme-failure.png', import.meta.url)), fullPage: true, animations: 'disabled', timeout: 10000 }).catch(() => {});
  throw error;
} finally { await browser.close(); }

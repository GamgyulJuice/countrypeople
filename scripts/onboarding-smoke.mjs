import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { completeOnboarding } from './onboarding-helper.mjs';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
await context.route('**/*', route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto(baseURL);
  await expect(page.getByRole('heading', { name: '먼저, 나의 이주 계획부터' })).toBeVisible();
  await mkdir(resolve('artifacts'), { recursive: true });
  await page.screenshot({ path: resolve('artifacts/onboarding-desktop.png'), fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: resolve('artifacts/onboarding-mobile.png'), fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 1440, height: 1080 });
  await completeOnboarding(page);
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('countrypeople.demo.v1')));
  const first = await stored();
  expect(first.profile.target_district).toBe('담양군');
  expect(first.education).toHaveLength(1);
  expect(first.education[0].hours).toBe(40);
  expect(first.tasks.length).toBeGreaterThan(7);
  await page.reload();
  await expect(page.getByRole('heading', { name: /오늘도 한 걸음/ })).toBeVisible();

  // Re-entry preserves existing records and does not duplicate generated tasks or education.
  await page.getByRole('button', { name: '내 조건 다시 입력하기' }).click();
  await expect(page.getByLabel('이름 또는 별명')).toHaveValue('예비 귀농인');
  await page.getByRole('button', { name: '준비 조건 입력하기' }).click();
  await expect(page.getByText('기존 수료 40시간은 유지됩니다.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: '맞춤 계획 미리보기' }).click();
  await expect(page.locator('.onboarding-task')).toHaveCount(0);
  // A storage error keeps the entered conditions and preview available for retry.
  await page.evaluate(() => { window.originalSetItem = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new Error('저장 공간 부족 테스트'); }; });
  await page.getByRole('button', { name: '내 맞춤 계획 시작하기' }).click();
  await expect(page.getByRole('alert')).toContainText('입력 내용은 유지됩니다');
  await expect(page.getByRole('heading', { name: '나만의 계획이 준비됐어요' })).toBeVisible();
  await page.evaluate(() => { Storage.prototype.setItem = window.originalSetItem; });
  await page.getByRole('button', { name: '내 맞춤 계획 시작하기' }).click();
  await expect(page.getByRole('heading', { name: /오늘도 한 걸음/ })).toBeVisible();
  const repeated = await stored();
  expect(repeated.tasks.length).toBe(first.tasks.length);
  expect(repeated.education.length).toBe(first.education.length);

  // A fresh rural-living user can leave the move date undecided; farming fields are hidden.
  const ruralContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ruralContext.route('**/*', route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  const rural = await ruralContext.newPage();
  await rural.goto(baseURL);
  await rural.getByRole('radio', { name: /농업 외 생활 예정/ }).check();
  await rural.getByLabel('이름 또는 별명').fill('귀촌 준비인');
  await rural.getByLabel('생년월일').fill('1968-01-01');
  await rural.getByLabel('현재 거주 지역').selectOption('경기도');
  await rural.getByLabel('희망 시·도').selectOption('강원특별자치도');
  await rural.getByLabel('희망 시·군·구').selectOption('양양군');
  await rural.getByLabel('희망 활동·업종').fill('카페');
  await rural.getByRole('button', { name: '준비 조건 입력하기' }).click();
  await expect(rural.getByLabel('독립 영농 시작일')).toHaveCount(0);
  await rural.getByRole('button', { name: '맞춤 계획 미리보기' }).click();
  await expect(rural.getByText('전입일이 아직 없어', { exact: false })).toBeVisible();
  await rural.getByRole('button', { name: '내 맞춤 계획 시작하기' }).click();
  await expect(rural.getByRole('heading', { name: /귀촌 준비인 님/ })).toBeVisible();
  const ruralData = await rural.evaluate(() => JSON.parse(localStorage.getItem('countrypeople.demo.v1')));
  expect(ruralData.profile.move_date).toBeNull();
  expect(ruralData.tasks.some(t => t.title.includes('지역 일자리'))).toBe(true);
  expect(errors).toEqual([]);
  console.log('PASS: first visit form, required inputs, 3 steps, recommendation gap, auto schedules, education save, reload, non-destructive re-entry, error retry, rural branch, undecided date, mobile layout.');
} finally { await browser.close(); }

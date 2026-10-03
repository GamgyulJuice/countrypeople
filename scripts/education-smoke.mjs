import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
await context.route('**/*', route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
async function addCourse(title, hours) {
  await page.getByRole('button', { name: '교육 추가', exact: true }).click();
  const group = page.locator('.education-draft').last();
  await group.getByLabel('교육명', { exact: true }).fill(title);
  await group.getByLabel('교육기관', { exact: true }).fill('테스트 농업기술센터');
  await group.getByLabel('수료시간', { exact: true }).fill(String(hours));
  return group;
}
try {
  await page.goto('http://127.0.0.1:5173/');
  await page.getByRole('radio', { name: /농업을 할 예정/ }).check();
  await page.getByLabel('이름 또는 별명').fill('여러 교육 수료자');
  await page.getByLabel('생년월일').fill('1994-05-10');
  await page.getByLabel('현재 거주 지역').fill('서울특별시 마포구');
  await page.getByLabel('희망 시·도').selectOption('전라남도');
  await page.getByLabel('희망 시·군·구').fill('담양군');
  await page.getByRole('button', { name: '준비 조건 입력하기' }).click();
  await page.getByLabel('이주 전 연속 도시 거주기간 (개월)').fill('36');
  await addCourse('귀농 기초교육', 40);
  await addCourse('삭제할 중간 교육', 60);
  const third = await addCourse('현장실습 교육', 5);
  await third.getByRole('checkbox', { name: '수료증을 보유하고 있어요' }).check();
  await expect(page.locator('.education-draft-total')).toContainText('총 수료시간 105시간');
  await page.getByRole('button', { name: '2번째 교육 삭제' }).click();
  await expect(page.locator('.education-draft')).toHaveCount(2);
  await expect(page.locator('.education-draft').nth(1).getByLabel('교육명', { exact: true })).toHaveValue('현장실습 교육');
  await expect(page.locator('.education-draft').nth(1).getByRole('checkbox')).toBeChecked();
  await page.locator('.education-draft').nth(1).getByLabel('수료시간', { exact: true }).fill('60');
  await expect(page.locator('.education-draft-total')).toContainText('총 수료시간 100시간');

  // An empty added row cannot silently disappear when proceeding.
  await page.getByRole('button', { name: '교육 추가', exact: true }).click();
  await page.getByRole('button', { name: '맞춤 계획 미리보기' }).click();
  await expect(page.getByRole('heading', { name: '지금까지 얼마나 준비하셨나요?' })).toBeVisible();
  await page.getByRole('button', { name: '3번째 교육 삭제' }).click();
  // Back/forward navigation must preserve both records and their values.
  await page.getByRole('button', { name: '이전', exact: true }).click();
  await page.getByRole('button', { name: '준비 조건 입력하기' }).click();
  await expect(page.locator('.education-draft')).toHaveCount(2);
  await expect(page.locator('.education-draft-total')).toContainText('총 수료시간 100시간');
  await mkdir(resolve('artifacts'), { recursive: true });
  await page.screenshot({ path: resolve('artifacts/multiple-education-desktop.png'), fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: resolve('artifacts/multiple-education-mobile.png'), fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: '맞춤 계획 미리보기' }).click();
  await expect(page.locator('.education-preview-row')).toHaveCount(2);
  await expect(page.locator('.onboarding-summary')).toContainText('수료 100시간');
  await expect(page.locator('.onboarding-policy').filter({ hasText: '귀농 창업·주거 준비 지원' })).toContainText('조건상 추천');
  await expect(page.locator('.onboarding-task').filter({ hasText: '부족한 교육' })).toHaveCount(0);
  await page.getByRole('button', { name: '내 맞춤 계획 시작하기' }).click();
  await expect(page.getByRole('heading', { name: /여러 교육 수료자 님/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: /여러 교육 수료자 님/ })).toBeVisible();
  const data = await page.evaluate(() => JSON.parse(localStorage.getItem('countrypeople.demo.v1')));
  expect(data.education.map(e => e.title)).toEqual(['귀농 기초교육', '현장실습 교육']);
  expect(data.education.map(e => e.hours)).toEqual([40, 60]);
  expect(data.education[1].certificate).toBe(true);
  expect(new Set(data.education.map(e => e.id)).size).toBe(2);

  // Existing records are preserved when re-entering and new drafts may all be removed.
  await page.getByRole('button', { name: '내 조건 다시 입력하기' }).click();
  await page.getByRole('button', { name: '준비 조건 입력하기' }).click();
  await expect(page.locator('.education-draft')).toHaveCount(0);
  await expect(page.locator('.education-draft-total')).toContainText('총 수료시간 100시간');
  await page.getByRole('button', { name: '교육 추가', exact: true }).click();
  await page.getByRole('button', { name: '1번째 교육 삭제' }).click();
  await page.getByRole('button', { name: '맞춤 계획 미리보기' }).click();
  await page.getByRole('button', { name: '내 맞춤 계획 시작하기' }).click();
  await expect(page.getByRole('heading', { name: /여러 교육 수료자 님/ })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('countrypeople.demo.v1')).education.length)).toBe(2);
  expect(errors).toEqual([]);
  console.log('PASS: multiple courses, middle-row deletion, stable values, hours total, required validation, back/forward, preview/recommendation, save/reload, existing records, empty drafts, mobile.');
} finally { await browser.close(); }

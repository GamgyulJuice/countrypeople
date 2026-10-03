import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { completeOnboarding } from './onboarding-helper.mjs';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
await context.route('**/*', route => {
  const host = new URL(route.request().url()).hostname;
  return host === '127.0.0.1' || host === 'localhost' ? route.continue() : route.abort();
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('dialog', dialog => dialog.accept());
try {
  await page.clock.setFixedTime(new Date('2026-10-03T03:00:00Z'));
  await page.goto('http://127.0.0.1:5173/');
  await completeOnboarding(page);
  // Isolate manual CRUD from automatically generated roadmap stage boundaries.
  await page.evaluate(() => {
    const key = 'countrypeople.demo.v1', data = JSON.parse(localStorage.getItem(key));
    data.tasks = [];
    localStorage.setItem(key, JSON.stringify(data));
  });
  await page.reload();
  await page.getByRole('button', { name: '나의 로드맵', exact: true }).click();
  await expect(page.getByRole('button', { name: '목록 보기', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '캘린더 보기', exact: true }).click();
  await expect(page.getByRole('heading', { name: '2026년 10월', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '이전 달', exact: true }).click();
  await expect(page.getByRole('heading', { name: '2026년 9월', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '다음 달', exact: true }).click();
  await page.getByRole('button', { name: /^2026-10-26,/ }).click();
  await expect(page.locator('.calendar-agenda')).toContainText('등록된 할 일이 없어요');
  await page.getByRole('button', { name: '이 날짜에 할 일 추가', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '새로운 할 일' })).toBeVisible();
  await expect(page.getByLabel('시작일', { exact: true })).toHaveValue('2026-10-26');
  await expect(page.getByLabel('종료일', { exact: true })).toHaveValue('2026-10-26');
  await page.getByRole('textbox', { name: '할 일', exact: true }).fill('달력에서 추가한 지역 상담');
  await page.getByRole('button', { name: '할 일 저장', exact: true }).click();
  const day = page.getByRole('button', { name: /^2026-10-26,/ });
  const agenda = page.locator('.calendar-agenda');
  await expect(page.locator('.calendar-range').filter({ hasText: '달력에서 추가한 지역 상담' })).toHaveCount(1);
  await agenda.getByRole('checkbox', { name: '달력에서 추가한 지역 상담 완료' }).click();
  await expect(agenda.getByRole('checkbox', { name: '달력에서 추가한 지역 상담 완료' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: '진행 중', exact: true }).click();
  await expect(page.locator('.calendar-range').filter({ hasText: '달력에서 추가한 지역 상담' })).toHaveCount(0);
  await expect(agenda).toContainText('표시할 할 일이 없어요');
  await page.getByRole('button', { name: '완료', exact: true }).click();
  await expect(page.locator('.calendar-range').filter({ hasText: '달력에서 추가한 지역 상담' })).toHaveCount(1);
  await agenda.getByRole('button', { name: '달력에서 추가한 지역 상담 수정' }).click();
  await page.getByLabel('시작일', { exact: true }).fill('2026-10-27');
  await page.getByLabel('종료일', { exact: true }).fill('2026-10-27');
  await page.getByRole('button', { name: '할 일 저장', exact: true }).click();
  await expect(day).toHaveAttribute('aria-label', '2026-10-26, 할 일 0개');
  await page.getByRole('button', { name: /^2026-10-27,/ }).click();
  await expect(agenda).toContainText('달력에서 추가한 지역 상담');
  await page.getByRole('button', { name: '목록 보기', exact: true }).click();
  await expect(page.locator('.task-list')).toContainText('달력에서 추가한 지역 상담');
  await page.reload();
  await page.getByRole('button', { name: '나의 로드맵', exact: true }).click();
  await page.getByRole('button', { name: '캘린더 보기', exact: true }).click();
  await page.getByRole('button', { name: /^2026-10-27,/ }).click();
  await expect(agenda).toContainText('달력에서 추가한 지역 상담');

  // Several tasks on a date must stay reachable even when the cell is compact.
  for (let i = 1; i <= 3; i++) {
    await page.getByRole('button', { name: '이 날짜에 할 일 추가', exact: true }).click();
    await page.getByRole('textbox', { name: '할 일', exact: true }).fill('같은 날 일정 ' + i);
    await page.getByRole('button', { name: '할 일 저장', exact: true }).click();
  }
  await expect(page.getByRole('button', { name: /^2026-10-27,/ })).toHaveAttribute('aria-label', '2026-10-27, 할 일 4개');
  await expect(agenda.locator('.task-row')).toHaveCount(4);
  const artifacts = new URL('../artifacts/', import.meta.url);
  await mkdir(artifacts, { recursive: true });
  await expect(page.locator('.toast')).toHaveCount(0);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: fileURLToPath(new URL('calendar-desktop.png', artifacts)), fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.locator('.sidebar').evaluate(el => el.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: fileURLToPath(new URL('calendar-mobile.png', artifacts)), fullPage: true, animations: 'disabled' });
  await agenda.getByRole('button', { name: '달력에서 추가한 지역 상담 삭제' }).click();
  await expect(agenda).not.toContainText('달력에서 추가한 지역 상담');
  await page.getByRole('button', { name: '오늘', exact: true }).click();
  await expect(page.getByRole('button', { name: /^2026-10-03,/ })).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
  console.log('PASS: calendar navigation, date-prefilled CRUD, filters, completion, list sync, reload, multiple events, mobile layout, zero runtime errors.');
} finally {
  await browser.close();
}

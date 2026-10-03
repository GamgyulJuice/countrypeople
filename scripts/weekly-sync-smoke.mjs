import { chromium, expect } from '@playwright/test';
import { completeOnboarding } from './onboarding-helper.mjs';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
await context.route('**/*', route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('dialog', d => d.accept());
try {
  await page.clock.setFixedTime(new Date('2026-10-03T03:00:00Z'));
  await page.goto('http://127.0.0.1:5173/');
  await completeOnboarding(page);
  await page.evaluate(() => {
    const key = 'countrypeople.demo.v1', data = JSON.parse(localStorage.getItem(key));
    data.tasks = [
      ['old', '지난 주 단계', '2026-09-20', false],
      ['monday', '완료한 월요일 단계', '2026-09-28', true],
      ['tuesday', '화요일 준비', '2026-09-29', false],
      ['friday', '금요일 준비', '2026-10-02', false],
      ['sunday', '일요일 준비', '2026-10-04', false],
      ['next', '다음 주 단계', '2026-10-05', false],
    ].map(([id, title, due_date, completed]) => ({ id, title, due_date, completed, user_id: 'demo-user', category: '생활', policy_id: null }));
    localStorage.setItem(key, JSON.stringify(data));
  });
  await page.reload();
  const homeTasks = page.getByRole('region', { name: '이번 주 할 일' });
  await expect(homeTasks.locator('.task-row')).toHaveCount(4);
  await expect(homeTasks).toContainText('2026-09-28 ~ 2026-10-04');
  await expect(homeTasks).not.toContainText('지난 주 단계');
  await expect(homeTasks).not.toContainText('다음 주 단계');
  await expect(homeTasks.getByRole('checkbox', { name: '완료한 월요일 단계 완료', exact: true })).toHaveAttribute('aria-checked', 'true');
  // Completing on the dashboard must remain visible and update the roadmap.
  await homeTasks.getByRole('checkbox', { name: '화요일 준비 완료', exact: true }).click();
  await expect(homeTasks.getByRole('checkbox', { name: '화요일 준비 완료', exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('.stats').getByText('2개 완료 · 2개 남음', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '나의 로드맵', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: '화요일 준비 완료', exact: true })).toHaveAttribute('aria-checked', 'true');
  // Moving a roadmap stage out of the week must update the dashboard and briefing.
  await page.getByRole('button', { name: '금요일 준비 수정', exact: true }).click();
  await page.getByLabel('시작일', { exact: true }).fill('2026-10-06');
  await page.getByLabel('종료일', { exact: true }).fill('2026-10-06');
  await page.getByRole('button', { name: '할 일 저장', exact: true }).click();
  await page.getByRole('button', { name: '나의 대시보드', exact: true }).click();
  await expect(homeTasks.locator('.task-row')).toHaveCount(3);
  await expect(homeTasks).not.toContainText('금요일 준비');
  await expect(homeTasks).toContainText('2026-09-29 ~ 2026-10-03');
  await page.getByRole('button', { name: '이번 주 브리핑', exact: true }).click();
  await expect(page.getByRole('region', { name: '이번 주 할 일' }).locator('.task-row')).toHaveCount(3);
  await expect(page.locator('.briefing-hero')).toContainText('3개 중 2개');
  await page.getByRole('textbox', { name: '잘한 일, 어려웠던 점, 다음 주의 작은 목표' }).fill('로드맵과 연동 검증');
  await page.getByRole('button', { name: '이번 주 기록하기' }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('countrypeople.demo.v1')).checkins[0])).toMatchObject({ total_count: 3, completed_count: 2 });
  await page.getByRole('checkbox', { name: '일요일 준비 완료', exact: true }).click();
  await page.getByRole('button', { name: '나의 대시보드', exact: true }).click();
  await expect(page.locator('.stats').getByText('3개 완료 · 0개 남음', { exact: true })).toBeVisible();
  await expect(homeTasks.locator('.task-row')).toHaveCount(3);
  await homeTasks.getByRole('button', { name: '일요일 준비 삭제', exact: true }).click();
  await expect(homeTasks.locator('.task-row')).toHaveCount(2);
  await page.reload();
  await expect(homeTasks.locator('.task-row')).toHaveCount(2);
  await expect(homeTasks.getByRole('checkbox', { name: '화요일 준비 완료', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: '메뉴 열기', exact: true }).click();
  await page.getByRole('button', { name: '이번 주 브리핑', exact: true }).click();
  const note = page.getByRole('textbox', { name: '잘한 일, 어려웠던 점, 다음 주의 작은 목표' });
  await note.fill('이전 주 작성 중 메모');
  await page.clock.setFixedTime(new Date('2026-10-05T03:00:00Z'));
  // Trigger a data render after the week boundary without leaving Briefing.
  await page.getByRole('checkbox', { name: '화요일 준비 완료', exact: true }).click();
  await expect(page.locator('.page-heading')).toContainText('2026-10-05 ~ 2026-10-11');
  await expect(note).toHaveValue('');
  expect(errors).toEqual([]);
  console.log('PASS: shared Monday-Sunday tasks, no 3-item truncation, completion both ways, roadmap date edits, deletion, briefing/check-in counts, reload and mobile.');
} finally { await browser.close(); }

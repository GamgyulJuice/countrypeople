import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { completeOnboarding } from './onboarding-helper.mjs';

// Fresh browser context, demo only. All non-local requests are blocked.
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
  await page.goto('http://127.0.0.1:5173/');
  await completeOnboarding(page);
  await expect(page.getByText('데모 모드', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /오늘도 한 걸음/ })).toBeVisible();
  await mkdir(resolve('artifacts'), { recursive: true });
  await page.screenshot({ path: resolve('artifacts/dashboard-desktop.png'), fullPage: true, animations: 'disabled' });

  // Create, complete, edit and delete a task; confirm reload persistence.
  await page.getByRole('button', { name: '나의 로드맵', exact: true }).click();
  await page.getByRole('button', { name: '할 일 추가', exact: true }).click();
  await page.getByRole('textbox', { name: '할 일', exact: true }).fill('브라우저 검증 일정');
  await page.getByRole('button', { name: '할 일 저장', exact: true }).click();
  await expect(page.getByText('브라우저 검증 일정', { exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: '브라우저 검증 일정 완료' }).click();
  await expect(page.getByRole('checkbox', { name: '브라우저 검증 일정 완료' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: '브라우저 검증 일정 수정' }).click();
  await page.getByRole('textbox', { name: '할 일', exact: true }).fill('수정된 브라우저 검증 일정');
  await page.getByRole('button', { name: '할 일 저장', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: '나의 로드맵', exact: true }).click();
  await expect(page.getByText('수정된 브라우저 검증 일정', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '수정된 브라우저 검증 일정 삭제' }).click();
  await expect(page.getByText('수정된 브라우저 검증 일정', { exact: true })).toHaveCount(0);

  // Education CRUD recalculates completed hours.
  await page.getByRole('button', { name: '교육 이력', exact: true }).click();
  await page.getByRole('button', { name: '수료 기록 추가' }).click();
  await page.getByRole('textbox', { name: '교육명', exact: true }).fill('검증 교육');
  await page.getByRole('textbox', { name: '교육기관', exact: true }).fill('테스트 기관');
  await page.getByRole('spinbutton', { name: '수료시간' }).fill('60');
  await page.getByRole('button', { name: '수료 기록 저장' }).click();
  await expect(page.locator('.education-banner h2')).toContainText('100');
  await page.getByRole('button', { name: '검증 교육 수정' }).click();
  await page.getByRole('spinbutton', { name: '수료시간' }).fill('50');
  await page.getByRole('button', { name: '수료 기록 저장' }).click();
  await expect(page.locator('.education-banner h2')).toContainText('90');
  await page.getByRole('button', { name: '검증 교육 삭제' }).click();
  await expect(page.locator('.education-banner h2')).toContainText('40');

  // Search empty state, bookmarks, safe source and checklist.
  await page.getByRole('button', { name: '맞춤 정책 찾기', exact: true }).click();
  await page.getByRole('textbox', { name: '정책 검색' }).fill('없는정책123');
  await expect(page.getByText('조건에 맞는 정책이 없어요')).toBeVisible();
  await page.getByRole('textbox', { name: '정책 검색' }).fill('');
  await page.getByRole('button', { name: '귀농 창업·주거 준비 지원', exact: true }).click();
  await expect(page.getByRole('link', { name: '공식 정보 사이트 보기' })).toHaveAttribute('href', 'https://www.greendaero.go.kr/');
  await page.getByRole('checkbox', { name: '원문 공고 및 자격요건 확인' }).check();
  await expect(page.getByRole('checkbox', { name: '원문 공고 및 자격요건 확인' })).toBeChecked();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '귀농 창업·주거 준비 지원 저장', exact: true }).click();
  await page.getByRole('button', { name: '귀농 창업·주거 준비 지원 저장 해제' }).click();
  await expect(page.getByRole('button', { name: '귀농 창업·주거 준비 지원 저장', exact: true })).toHaveAttribute('aria-pressed', 'false');

  await page.getByRole('button', { name: '이번 주 브리핑', exact: true }).click();
  await page.getByRole('textbox', { name: '잘한 일, 어려웠던 점, 다음 주의 작은 목표' }).fill('이번 주 체크인 검증');
  await page.getByRole('button', { name: '이번 주 기록하기' }).click();
  await expect(page.getByText('이번 주 체크인 검증', { exact: true }).last()).toBeVisible();

  await page.getByRole('button', { name: '프로필 및 설정' }).click();
  await page.getByRole('textbox', { name: '이름 또는 별명' }).fill('테스트 이웃');
  await page.getByRole('button', { name: '프로필 저장' }).click();
  await page.getByRole('button', { name: '나의 대시보드', exact: true }).click();
  await expect(page.getByRole('heading', { name: /테스트 이웃 님/ })).toBeVisible();

  // Mobile navigation and no horizontal overflow.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: '메뉴 열기' })).toBeVisible();
  await expect(page.locator('.toast')).toHaveCount(0);
  await expect.poll(() => page.locator('.sidebar').evaluate(el => el.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
  await page.screenshot({ path: resolve('artifacts/dashboard-mobile.png'), fullPage: true, animations: 'disabled' });
  const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(noOverflow).toBe(true);
  await page.getByRole('button', { name: '메뉴 열기' }).click();
  await page.getByRole('button', { name: '나의 로드맵', exact: true }).click();
  await expect(page.getByRole('heading', { name: '나의 정착 로드맵' })).toBeVisible();
  expect(errors).toEqual([]);
  console.log('PASS: desktop/mobile, task CRUD and persistence, education CRUD, search/empty, source, checklist, bookmarks, check-in, profile, zero runtime errors.');
} finally { await browser.close(); }

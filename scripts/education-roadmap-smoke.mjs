import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Run against a local demo server only; never contact an external education provider.
const baseURL = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5173/';
if (!['127.0.0.1', 'localhost'].includes(new URL(baseURL).hostname)) throw new Error('A local demo server is required.');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, timezoneId: 'Asia/Seoul' });
await context.route('**/*', route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('dialog', dialog => dialog.accept());
const storageKey = 'countrypeople.demo.v1';
const courseTitle = '현장 영농 실습 과정';
const manualTitle = '기존 직접 입력 기초교육';
const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey);
const courseRow = () => page.locator('.task-row').filter({ has: page.getByText(courseTitle, { exact: true }) });
const courseEntry = () => page.locator('.task-entry').filter({ has: page.getByText(courseTitle, { exact: true }) });
const courseCheck = () => page.getByRole('checkbox', { name: `${courseTitle} 완료`, exact: true });
async function navigate(name) {
  if (await page.getByRole('button', { name: '메뉴 열기', exact: true }).isVisible()) {
    await page.getByRole('button', { name: '메뉴 열기', exact: true }).click();
  }
  await page.getByRole('button', { name, exact: true }).click();
}
async function verifyStored(courseId, completed, hours, manualRecord) {
  await expect.poll(async () => {
    const data = await saved();
    const task = data.tasks.find(item => item.id === courseId);
    const linked = data.education.filter(item => item.task_id === courseId);
    return {
      completed: task?.completed,
      taskHours: task?.education_hours,
      linkedCount: linked.length,
      linkedHours: linked[0]?.hours ?? null,
      total: data.education.reduce((sum, item) => sum + item.hours, 0),
      manual: data.education.find(item => item.id === manualRecord.id),
    };
  }).toEqual({ completed, taskHours: hours, linkedCount: completed ? 1 : 0, linkedHours: completed ? hours : null, total: 40 + (completed ? hours : 0), manual: manualRecord });
}
async function noOverflow() {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

try {
  await page.clock.setFixedTime(new Date('2026-10-03T03:00:00Z'));
  await page.addInitScript(({ storageKey }) => {
    if (localStorage.getItem(storageKey)) return;
    localStorage.setItem(storageKey, JSON.stringify({
      profile: {
        user_id: 'demo-user', display_name: '교육 연동 검증', birth_date: '1994-05-10', purpose: '귀농',
        current_region: '서울특별시 마포구', target_province: '전라남도', target_district: '담양군',
        move_date: '2027-04-01', moved: false, stage: '준비', interest: '딸기', occupation: '직장인',
        urban_months: 36, independent_since: null, household_head: null, entity_status: '', farmland_status: '',
        income_band: '', notifications_enabled: true,
      }, policies: [], tasks: [], education: [], bookmarks: [], documentChecks: [], checkins: [],
    }));
  }, { storageKey });
  await page.goto(baseURL);
  await expect(page.getByText('데모 모드', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /교육 연동 검증 님/ })).toBeVisible();

  // Preserve a genuine manual record while linked roadmap records are changed.
  await navigate('교육 이력');
  await page.getByRole('button', { name: '수료 기록 추가', exact: true }).click();
  await page.getByLabel('교육명', { exact: true }).fill(manualTitle);
  await page.getByLabel('교육기관', { exact: true }).fill('기존 수료 교육기관');
  await page.getByLabel('수료시간', { exact: true }).fill('40');
  await page.getByLabel('수료일', { exact: true }).fill('2026-09-20');
  await page.getByRole('button', { name: '수료 기록 저장', exact: true }).click();
  await expect(page.locator('.education-banner h2')).toHaveText(/40\s*시간/);
  const manualRecord = (await saved()).education.find(item => item.title === manualTitle);
  expect(manualRecord.task_id ?? null).toBeNull();

  // Planned courses do not count until the user confirms completion.
  await page.getByRole('button', { name: '교육 로드맵에 추가', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '새로운 할 일' })).toBeVisible();
  await page.getByLabel('할 일', { exact: true }).fill(courseTitle);
  await page.getByLabel('시작일', { exact: true }).fill('2026-10-01');
  await page.getByLabel('종료일', { exact: true }).fill('2026-10-10');
  await page.getByLabel('교육기관', { exact: true }).fill('담양 실습 교육기관');
  await page.getByLabel('교육시간', { exact: true }).fill('12.5');
  await page.getByRole('button', { name: '할 일 저장', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.planned-education')).toContainText(courseTitle);
  await expect(page.locator('.education-banner h2')).toHaveText(/40\s*시간/);
  const courseId = (await saved()).tasks.find(item => item.title === courseTitle).id;
  await verifyStored(courseId, false, 12.5, manualRecord);
  await navigate('나의 로드맵');
  await expect(page.locator('.roadmap-education-summary')).toContainText('총 수료시간 40시간');
  await expect(page.locator('.roadmap-education-summary')).toContainText('미완료 교육 12.5시간');

  await courseCheck().click();
  await expect(courseCheck()).toHaveAttribute('aria-checked', 'true');
  await verifyStored(courseId, true, 12.5, manualRecord);
  await expect(courseRow()).toContainText('수료 2026-10-03');
  await expect(page.locator('.roadmap-education-summary')).toContainText('총 수료시간 52.5시간');
  await navigate('교육 이력');
  await expect(page.locator('.education-row').filter({ hasText: courseTitle })).toHaveCount(1);
  await expect(page.locator('.education-banner')).toContainText('자동 기록 12.5시간 · 직접 입력 40시간');
  await page.reload();
  await navigate('나의 로드맵');
  await expect(courseCheck()).toHaveAttribute('aria-checked', 'true');
  await verifyStored(courseId, true, 12.5, manualRecord);

  // Editing the linked record updates the originating course, date, and total.
  await navigate('교육 이력');
  await page.getByRole('button', { name: `${courseTitle} 수정`, exact: true }).click();
  await page.getByLabel('수료시간', { exact: true }).fill('15');
  await page.getByLabel('수료일', { exact: true }).fill('2026-10-02');
  await page.getByRole('checkbox', { name: '수료증을 보유하고 있어요', exact: true }).check();
  await page.getByRole('button', { name: '수료 기록 저장', exact: true }).click();
  await verifyStored(courseId, true, 15, manualRecord);
  await navigate('나의 로드맵');
  await expect(courseRow()).toContainText('15시간');
  await expect(courseRow()).toContainText('수료 2026-10-02');
  await expect(page.locator('.roadmap-education-summary')).toContainText('총 수료시간 55시간');
  expect((await saved()).tasks.find(item => item.id === courseId).education_certificate).toBe(true);

  // Removing a linked record makes the course pending. Repeating completion stays unique.
  await navigate('교육 이력');
  await page.getByRole('button', { name: `${courseTitle} 삭제`, exact: true }).click();
  await verifyStored(courseId, false, 15, manualRecord);
  await expect(page.locator('.education-banner h2')).toHaveText(/40\s*시간/);
  await expect(page.locator('.planned-education')).toContainText(courseTitle);
  await navigate('나의 로드맵');
  await expect(courseCheck()).toHaveAttribute('aria-checked', 'false');
  await courseCheck().click();
  await verifyStored(courseId, true, 15, manualRecord);
  await courseCheck().click();
  await verifyStored(courseId, false, 15, manualRecord);
  await courseCheck().click();
  await verifyStored(courseId, true, 15, manualRecord);
  await page.reload();
  await navigate('나의 로드맵');
  await verifyStored(courseId, true, 15, manualRecord);

  // Concrete generated guides expose documents, contacts and safe official sites.
  await page.getByRole('button', { name: '목표일로 로드맵 생성', exact: true }).click();
  await expect.poll(() => page.locator('.task-entry').count()).toBeGreaterThan(1);
  await courseEntry().locator('summary').click();
  const guide = courseEntry().locator('.task-guide');
  await expect(guide).toBeVisible();
  await expect(guide).toContainText(/서류/);
  await expect(guide).toContainText(/문의|연락|상담/);
  const links = await guide.locator('a[href^="https://"]').evaluateAll(elements => elements.map(element => ({ href: element.href, rel: element.rel })));
  expect(links.length).toBeGreaterThan(0);
  for (const link of links) {
    expect(new URL(link.href).protocol).toBe('https:');
    expect(link.rel).toContain('noopener');
  }
  expect(await guide.locator('a[href^="javascript:"], a[href^="http:"]').count()).toBe(0);
  const generated = (await saved()).tasks.filter(item => item.id !== courseId);
  expect(generated.length).toBeGreaterThan(0);
  expect(generated.some(item => /서류|신청|신분증|수료|상담|등록/.test(item.title))).toBe(true);
  for (const task of generated) {
    const entry = page.locator('.task-entry').filter({ has: page.getByText(task.title, { exact: true }) });
    await entry.locator('summary').click();
    const detail = entry.locator('.task-guide');
    await expect(detail.getByRole('heading', { name: '필수·조건별 서류와 준비자료', exact: true })).toBeVisible();
    await expect(detail.getByRole('heading', { name: '담당기관·연락처', exact: true })).toBeVisible();
    await expect(detail.getByRole('heading', { name: '신청 사이트·서식·공식 안내', exact: true })).toBeVisible();
    expect(await detail.locator('.task-guide-documents li').count()).toBeGreaterThan(0);
    expect(await detail.locator('.task-guide-steps li').count()).toBeGreaterThan(0);
    expect(await detail.locator('a[href^="https://"]').count()).toBeGreaterThan(0);
    expect(await detail.locator('a[href^="javascript:"], a[href^="http:"]').count()).toBe(0);
    await entry.locator('summary').click();
  }
  await noOverflow();
  const artifacts = new URL('../artifacts/', import.meta.url);
  await mkdir(artifacts, { recursive: true });
  await expect(page.locator('.toast')).toHaveCount(0, { timeout: 6500 });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: fileURLToPath(new URL('education-roadmap-desktop.png', artifacts)), fullPage: true, animations: 'disabled' });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.locator('.sidebar').evaluate(element => element.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
  await expect(guide).toBeVisible();
  await noOverflow();
  await page.screenshot({ path: fileURLToPath(new URL('education-roadmap-mobile.png', artifacts)), fullPage: true, animations: 'disabled' });
  await navigate('교육 이력');
  await expect(page.locator('.education-banner h2')).toHaveText(/55\s*시간/);
  await noOverflow();
  await page.screenshot({ path: fileURLToPath(new URL('education-history-mobile.png', artifacts)), fullPage: true, animations: 'disabled' });
  await navigate('나의 로드맵');
  await page.getByRole('button', { name: `${courseTitle} 수정`, exact: true }).click();
  await expect(page.getByLabel('교육시간', { exact: true })).toHaveValue('15');
  await expect(page.getByLabel('교육기관', { exact: true })).toHaveValue('담양 실습 교육기관');
  await expect(page.getByRole('checkbox', { name: '이 교육을 수료했어요', exact: true })).toBeChecked();
  await noOverflow();
  expect(await page.getByRole('dialog').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: fileURLToPath(new URL('education-course-mobile.png', artifacts)), animations: 'disabled' });
  await page.getByRole('button', { name: '할 일 저장', exact: true }).click();
  await verifyStored(courseId, true, 15, manualRecord);
  await navigate('나의 대시보드');
  await expect(page.locator('.stats article').filter({ hasText: '기록한 수료시간' })).toContainText('55시간');
  expect(errors).toEqual([]);
  console.log('PASS: planned education, completion and total hours, reload persistence, linked edit/delete, repeated completion/undo without duplicates, manual history preserved, official guide links, desktop/mobile layouts, zero runtime errors.');
} finally { await browser.close(); }

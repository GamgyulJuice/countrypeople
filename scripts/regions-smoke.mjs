import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:5173';
const storageKey = 'countrypeople.demo.v1';
const artifactDirectory = fileURLToPath(new URL('../artifacts/', import.meta.url));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
await context.route('**/*', route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
const page = await context.newPage();
page.setDefaultNavigationTimeout(60000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const current = page.getByLabel('현재 거주 지역');
const province = page.getByLabel('희망 시·도');
const district = page.getByLabel('희망 시·군·구');
const storedProfile = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)).profile, storageKey);
const selectedValues = async () => ({ current_region: await current.inputValue(), target_province: await province.inputValue(), target_district: await district.inputValue() });
const openProfile = async () => {
  await page.getByRole('button', { name: '프로필 및 설정', exact: true }).click();
  await expect(page.getByRole('heading', { name: '내 상황에 맞게, 나의 프로필' })).toBeVisible();
};
const finishOnboarding = async () => {
  await page.getByRole('button', { name: '준비 조건 입력하기' }).click();
  await expect(page.getByRole('heading', { name: '지금까지 얼마나 준비하셨나요?' })).toBeVisible();
  await page.getByRole('button', { name: '맞춤 계획 미리보기' }).click();
  await page.getByRole('button', { name: '내 맞춤 계획 시작하기' }).click();
  await expect(page.getByRole('heading', { name: /오늘도 한 걸음/ })).toBeVisible();
};
const seedLegacyProfile = async () => {
  await page.evaluate(key => {
    const data = JSON.parse(localStorage.getItem(key));
    Object.assign(data.profile, { current_region: '서울특별시 마포구', target_province: '전라남도', target_district: '담양군' });
    localStorage.setItem(key, JSON.stringify(data));
  }, storageKey);
  await page.reload();
  await expect(page.getByRole('heading', { name: /오늘도 한 걸음/ })).toBeVisible();
};

try {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: '먼저, 나의 이주 계획부터' })).toBeVisible({ timeout: 10000 });
  console.log('REGIONS: initial form rendered');
  expect(await current.evaluate(element => element.tagName)).toBe('SELECT');
  expect(await district.evaluate(element => element.tagName)).toBe('SELECT');
  await expect(district).toBeDisabled();
  await expect(district).toHaveValue('');
  await expect(province.locator('option[value="전남광주통합특별시"]')).toHaveCount(1);
  await expect(province.locator('option[value="전라남도"]')).toHaveCount(0);

  await page.getByRole('radio', { name: /농업을 할 예정/ }).check();
  await page.getByLabel('이름 또는 별명').fill('지역 선택 확인');
  await page.getByLabel('생년월일').fill('1994-05-10');
  await page.getByRole('button', { name: '준비 조건 입력하기' }).click();
  expect(await current.evaluate(element => element.validity.valueMissing)).toBe(true);
  await expect(page.getByRole('heading', { name: '먼저, 나의 이주 계획부터' })).toBeVisible();
  await current.selectOption('서울특별시');
  await page.getByRole('button', { name: '준비 조건 입력하기' }).click();
  expect(await province.evaluate(element => element.validity.valueMissing)).toBe(true);
  await expect(page.getByRole('heading', { name: '먼저, 나의 이주 계획부터' })).toBeVisible();

  await province.selectOption('서울특별시');
  await expect(district).toBeEnabled();
  await expect(district.locator('option[value="마포구"]')).toHaveCount(1);
  await expect(district.locator('option[value="해운대구"]')).toHaveCount(0);
  await district.selectOption('강서구');
  // Both cities have a 강서구: changing province must still require a new choice.
  await province.selectOption('부산광역시');
  await expect(district).toHaveValue('');
  await expect(district.locator('option[value="강서구"]')).toHaveCount(1);
  await expect(district.locator('option[value="마포구"]')).toHaveCount(0);
  await expect(district.locator('option[value="해운대구"]')).toHaveCount(1);
  await page.getByRole('button', { name: '준비 조건 입력하기' }).click();
  expect(await district.evaluate(element => element.validity.valueMissing)).toBe(true);
  await expect(page.getByRole('heading', { name: '먼저, 나의 이주 계획부터' })).toBeVisible();
  await district.selectOption('해운대구');
  await province.selectOption('세종특별자치시');
  await expect(district).toHaveValue('');
  await expect(district.locator('option[value="세종특별자치시"]')).toHaveText('세종특별자치시 전체');
  expect(await district.locator('option').evaluateAll(options => options.filter(option => option.value).map(option => option.value))).toEqual(['세종특별자치시']);
  await district.selectOption('세종특별자치시');
  const onboardingValues = await selectedValues();
  await finishOnboarding();
  expect(await storedProfile()).toMatchObject(onboardingValues);
  await page.reload();
  await openProfile();
  expect(await selectedValues()).toEqual(onboardingValues);
  console.log('REGIONS: onboarding saved and reloaded');

  await current.selectOption('경기도');
  await province.selectOption('');
  await expect(district).toBeDisabled();
  await expect(district).toHaveValue('');
  await page.getByRole('button', { name: '프로필 저장', exact: true }).click();
  expect(await province.evaluate(element => element.validity.valueMissing)).toBe(true);
  expect(await storedProfile()).toMatchObject(onboardingValues);
  await province.selectOption('서울특별시');
  await district.selectOption('강서구');
  await province.selectOption('부산광역시');
  await expect(district).toHaveValue('');
  await expect(district.locator('option[value="마포구"]')).toHaveCount(0);
  await page.getByRole('button', { name: '프로필 저장', exact: true }).click();
  expect(await district.evaluate(element => element.validity.valueMissing)).toBe(true);
  expect(await storedProfile()).toMatchObject(onboardingValues);
  await district.selectOption('해운대구');
  const profileValues = await selectedValues();
  await page.getByRole('button', { name: '프로필 저장', exact: true }).click();
  await expect.poll(storedProfile).toMatchObject(profileValues);
  await page.reload();
  await openProfile();
  expect(await selectedValues()).toEqual(profileValues);
  console.log('REGIONS: profile saved and reloaded');

  // Opening an old record normalizes the visible choice, while storage changes only on save.
  await seedLegacyProfile();
  await openProfile();
  await expect(current).toHaveValue('서울특별시');
  await expect(province).toHaveValue('전라남도');
  await expect(district).toHaveValue('담양군');
  expect((await storedProfile()).current_region).toBe('서울특별시 마포구');
  await district.selectOption('목포시');
  await district.selectOption('담양군');
  await page.getByRole('button', { name: '프로필 저장', exact: true }).click();
  const normalizedLegacy = { current_region: '서울특별시', target_province: '전라남도', target_district: '담양군' };
  await expect.poll(storedProfile).toMatchObject(normalizedLegacy);
  await page.reload();
  await openProfile();
  expect(await selectedValues()).toEqual(normalizedLegacy);

  await seedLegacyProfile();
  await page.getByRole('button', { name: '내 조건 다시 입력하기' }).click();
  await expect(current).toHaveValue('서울특별시');
  await expect(province).toHaveValue('전라남도');
  await expect(district).toHaveValue('담양군');
  expect((await storedProfile()).current_region).toBe('서울특별시 마포구');
  await finishOnboarding();
  expect(await storedProfile()).toMatchObject(normalizedLegacy);
  await page.reload();
  await openProfile();
  expect(await selectedValues()).toEqual(normalizedLegacy);
  console.log('REGIONS: legacy profile and onboarding verified');

  await mkdir(artifactDirectory, { recursive: true });
  await page.screenshot({ path: fileURLToPath(new URL('../artifacts/regions-profile-desktop.png', import.meta.url)), fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: fileURLToPath(new URL('../artifacts/regions-profile-mobile.png', import.meta.url)), fullPage: true, animations: 'disabled' });
  expect(errors).toEqual([]);
  console.log('PASS: dependent region selects, disabled/required states, filtered districts, same-name reset, explicit Sejong choice, onboarding/profile save and reload, editable legacy regions, mobile layout.');
} catch (error) {
  console.error('REGIONS failure URL:', page.url());
  try {
    console.error('REGIONS visible page:', (await page.locator('body').innerText({ timeout: 5000 })).slice(0, 800));
    await mkdir(artifactDirectory, { recursive: true });
    await page.screenshot({ path: fileURLToPath(new URL('../artifacts/regions-failure.png', import.meta.url)), fullPage: true, animations: 'disabled', timeout: 10000 });
  } catch (diagnosticError) {
    console.error('REGIONS failure diagnostics unavailable:', diagnosticError.message);
  }
  throw error;
} finally { await browser.close(); }

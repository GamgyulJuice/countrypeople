import { expect } from '@playwright/test';

export async function completeOnboarding(page) {
  await expect(page.getByRole('heading', { name: '먼저, 나의 이주 계획부터' })).toBeVisible();
  await page.getByRole('button', { name: '준비 조건 입력하기' }).click();
  await expect(page.getByRole('heading', { name: '먼저, 나의 이주 계획부터' })).toBeVisible();
  await page.getByRole('radio', { name: /농업을 할 예정/ }).check();
  await page.getByLabel('이름 또는 별명').fill('예비 귀농인');
  await page.getByLabel('생년월일').fill('1994-05-10');
  await page.getByLabel('현재 거주 지역').fill('서울특별시 마포구');
  await page.getByLabel('희망 시·도').selectOption('전라남도');
  await page.getByLabel('희망 시·군·구').fill('담양군');
  await page.getByLabel('귀농·귀촌은 어디까지 진행했나요?').selectOption('준비');
  await page.getByRole('checkbox', { name: '아직 시기를 정하지 않았어요' }).uncheck();
  const future = new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10);
  await page.getByLabel('전입 예정일', { exact: true }).fill(future);
  await page.getByLabel('희망 작목·업종').fill('딸기 · 스마트팜');
  await page.getByRole('button', { name: '준비 조건 입력하기' }).click();
  await expect(page.getByRole('heading', { name: '지금까지 얼마나 준비하셨나요?' })).toBeVisible();
  await page.getByLabel('이주 전 연속 도시 거주기간 (개월)').fill('36');
  await page.getByRole('button', { name: '교육 추가', exact: true }).click();
  await page.getByRole('spinbutton', { name: /^수료시간/ }).fill('40');
  await page.getByLabel('교육명', { exact: true }).fill('귀농 기초과정');
  await page.getByLabel('교육기관', { exact: true }).fill('테스트 교육기관');
  await page.getByRole('button', { name: '맞춤 계획 미리보기' }).click();
  await expect(page.getByRole('heading', { name: '나만의 계획이 준비됐어요' })).toBeVisible();
  await expect(page.locator('.onboarding-task').filter({ hasText: '교육 60시간' })).toHaveCount(1);
  await page.getByRole('button', { name: '내 맞춤 계획 시작하기' }).click();
  await expect(page.getByRole('heading', { name: /오늘도 한 걸음/ })).toBeVisible();
}

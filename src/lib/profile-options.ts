// UI wording is independent of persisted values used by recommendation rules.
export const purposeOptions = [
  { value: '귀농', label: '농업을 할 예정', detail: '귀농 · 농업을 중심으로 생활해요' },
  { value: '귀촌', label: '농업 외 생활 예정', detail: '귀촌 · 취업, 창업, 은퇴 등' },
  { value: '탐색 중', label: '아직 결정하지 않음', detail: '농업을 할지는 더 생각해 볼게요' },
] as const;

export const stageOptions = [
  { value: '관심', label: '관심·정보 수집' },
  { value: '탐색', label: '지역·생활 알아보기' },
  { value: '계획', label: '지역·시기 계획' },
  { value: '준비', label: '이주 준비' },
  { value: '실행', label: '이주 진행' },
  { value: '초기 정착', label: '초기 정착 (전입 후 3년 이내)' },
  { value: '정착', label: '정착 (전입 후 3년 이상)' },
] as const;

export function stageLabel(value: string): string {
  return stageOptions.find(option => option.value === value)?.label ?? value;
}

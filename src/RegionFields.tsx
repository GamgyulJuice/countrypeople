import type { Profile } from './lib/types';
import { provinces, districtsByProvince, normalizeCurrentProvince, normalizeTargetRegion } from './lib/regions';

export function profileWithSelectableRegions(profile: Profile): Profile {
  return {
    ...profile,
    current_region: normalizeCurrentProvince(profile.current_region),
    ...normalizeTargetRegion(profile.target_province, profile.target_district),
  };
}

export function CurrentRegionField({ value, onChange, showRequired = false }: {
  value: string; onChange: (value: string) => void; showRequired?: boolean;
}) {
  return <label>현재 거주 지역 (시·도) {showRequired && <span className="required">필수</span>}
    <select required value={value} onChange={event => onChange(event.target.value)}>
      <option value="">시·도 선택</option>
      {provinces.map(province => <option key={province} value={province}>{province}</option>)}
    </select>
  </label>;
}

export function TargetRegionFields({ province, district, onChange, showRequired = false }: {
  province: string; district: string;
  onChange: (region: Pick<Profile, 'target_province' | 'target_district'>) => void;
  showRequired?: boolean;
}) {
  const districts = districtsByProvince[province] ?? [];
  return <>
    <label>희망 시·도 {showRequired && <span className="required">필수</span>}
      <select required value={province} onChange={event => onChange({ target_province: event.target.value, target_district: '' })}>
        <option value="">시·도 선택</option>
        {province && !provinces.includes(province) && districts.length > 0 && <option value={province}>{province} (기존 표기)</option>}
        {provinces.map(value => <option key={value} value={value}>{value}</option>)}
      </select>
    </label>
    <label>희망 시·군·구 {showRequired && <span className="required">필수</span>}
      <select required disabled={!province} value={district} onChange={event => onChange({ target_province: province, target_district: event.target.value })}>
        <option value="">{province ? '시·군·구 선택' : '시·도를 먼저 선택해 주세요'}</option>
        {districts.map(value => <option key={value} value={value}>{province === '세종특별자치시' ? '세종특별자치시 전체' : value}</option>)}
      </select>
    </label>
  </>;
}

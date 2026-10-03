/**
 * Administrative-area snapshot: 2026-10-03.
 * Sources checked against the current Ministry of the Interior and Safety directory:
 * https://www.mois.go.kr/frt/sub/a04/localGovernment/screen.do
 * July 2026 Jeonnam/Gwangju merger:
 * https://www.mois.go.kr/frt/bbs/type010/commonSelectBoardArticle.do?bbsId=BBSMSTR_000000000008&nttId=126845
 * July 2026 Incheon reorganization (including Seohae-gu):
 * https://www.incheon.go.kr/IC01070101
 * https://www.seohae.go.kr/open_content/main/bbs/bbsMsgDetail.do?bcd=report&msg_seq=18773
 *
 * Use municipalities, not the non-autonomous wards inside cities such as Suwon.
 * Jeju includes its two administrative cities. Sejong has no lower municipality;
 * its repeated name is an application selection value, not an administrative tier.
 */
export const provinces: string[] = [
  '서울특별시',
  '부산광역시',
  '대구광역시',
  '인천광역시',
  '전남광주통합특별시',
  '대전광역시',
  '울산광역시',
  '세종특별자치시',
  '경기도',
  '강원특별자치도',
  '충청북도',
  '충청남도',
  '전북특별자치도',
  '경상북도',
  '경상남도',
  '제주특별자치도',
];

// Keep saved targets under their original province name to preserve roadmap identity.
// These names are not offered when selecting a new province.
export const legacyDistrictsByProvince: Record<string, string[]> = {
  광주광역시: ['동구', '서구', '남구', '북구', '광산구'],
  전라남도: [
    '목포시', '여수시', '순천시', '나주시', '광양시',
    '담양군', '곡성군', '구례군', '고흥군', '보성군', '화순군',
    '장흥군', '강진군', '해남군', '영암군', '무안군', '함평군',
    '영광군', '장성군', '완도군', '진도군', '신안군',
  ],
};

export const districtsByProvince: Record<string, string[]> = {
  서울특별시: [
    '종로구', '중구', '용산구', '성동구', '광진구', '동대문구',
    '중랑구', '성북구', '강북구', '도봉구', '노원구', '은평구',
    '서대문구', '마포구', '양천구', '강서구', '구로구', '금천구',
    '영등포구', '동작구', '관악구', '서초구', '강남구', '송파구', '강동구',
  ],
  부산광역시: [
    '중구', '서구', '동구', '영도구', '부산진구', '동래구', '남구', '북구',
    '해운대구', '사하구', '금정구', '강서구', '연제구', '수영구', '사상구', '기장군',
  ],
  대구광역시: [
    '중구', '동구', '서구', '남구', '북구', '수성구', '달서구', '달성군', '군위군',
  ],
  인천광역시: [
    '제물포구', '영종구', '미추홀구', '연수구', '남동구', '부평구',
    '계양구', '서해구', '검단구', '강화군', '옹진군',
  ],
  전남광주통합특별시: [
    ...legacyDistrictsByProvince.광주광역시,
    ...legacyDistrictsByProvince.전라남도,
  ],
  대전광역시: ['동구', '중구', '서구', '유성구', '대덕구'],
  울산광역시: ['중구', '남구', '동구', '북구', '울주군'],
  세종특별자치시: ['세종특별자치시'],
  경기도: [
    '수원시', '성남시', '의정부시', '안양시', '부천시', '광명시', '평택시',
    '동두천시', '안산시', '고양시', '과천시', '구리시', '남양주시', '오산시',
    '시흥시', '군포시', '의왕시', '하남시', '용인시', '파주시', '이천시',
    '안성시', '김포시', '화성시', '광주시', '양주시', '포천시', '여주시',
    '연천군', '가평군', '양평군',
  ],
  강원특별자치도: [
    '춘천시', '원주시', '강릉시', '동해시', '태백시', '속초시', '삼척시',
    '홍천군', '횡성군', '영월군', '평창군', '정선군', '철원군', '화천군',
    '양구군', '인제군', '고성군', '양양군',
  ],
  충청북도: [
    '청주시', '충주시', '제천시', '보은군', '옥천군', '영동군',
    '증평군', '진천군', '괴산군', '음성군', '단양군',
  ],
  충청남도: [
    '천안시', '공주시', '보령시', '아산시', '서산시', '논산시', '계룡시', '당진시',
    '금산군', '부여군', '서천군', '청양군', '홍성군', '예산군', '태안군',
  ],
  전북특별자치도: [
    '전주시', '군산시', '익산시', '정읍시', '남원시', '김제시', '완주군',
    '진안군', '무주군', '장수군', '임실군', '순창군', '고창군', '부안군',
  ],
  경상북도: [
    '포항시', '경주시', '김천시', '안동시', '구미시', '영주시', '영천시',
    '상주시', '문경시', '경산시', '의성군', '청송군', '영양군', '영덕군',
    '청도군', '고령군', '성주군', '칠곡군', '예천군', '봉화군', '울진군', '울릉군',
  ],
  경상남도: [
    '창원시', '진주시', '통영시', '사천시', '김해시', '밀양시', '거제시', '양산시',
    '의령군', '함안군', '창녕군', '고성군', '남해군', '하동군', '산청군',
    '함양군', '거창군', '합천군',
  ],
  제주특별자치도: ['제주시', '서귀포시'],
  ...legacyDistrictsByProvince,
};

const provinceAliases = new Map<string, string>([
  ...provinces.map(province => [province, province] as [string, string]),
  ['서울', '서울특별시'], ['서울시', '서울특별시'],
  ['부산', '부산광역시'], ['부산시', '부산광역시'],
  ['대구', '대구광역시'], ['대구시', '대구광역시'],
  ['인천', '인천광역시'], ['인천시', '인천광역시'],
  ['광주', '전남광주통합특별시'], ['광주광역시', '전남광주통합특별시'],
  ['전남', '전남광주통합특별시'], ['전남도', '전남광주통합특별시'],
  ['전라남도', '전남광주통합특별시'], ['전남광주', '전남광주통합특별시'],
  ['대전', '대전광역시'], ['대전시', '대전광역시'],
  ['울산', '울산광역시'], ['울산시', '울산광역시'],
  ['세종', '세종특별자치시'], ['세종시', '세종특별자치시'],
  ['경기', '경기도'],
  ['강원', '강원특별자치도'], ['강원도', '강원특별자치도'],
  ['충북', '충청북도'], ['충남', '충청남도'],
  ['전북', '전북특별자치도'], ['전북도', '전북특별자치도'],
  ['전라북도', '전북특별자치도'],
  ['경북', '경상북도'], ['경남', '경상남도'],
  ['제주', '제주특별자치도'], ['제주도', '제주특별자치도'],
]);

const legacyProvinceAliases = new Map<string, string>([
  ['광주', '광주광역시'], ['광주광역시', '광주광역시'],
  ['전남', '전라남도'], ['전남도', '전라남도'], ['전라남도', '전라남도'],
]);

/** Read the province from a saved address, without guessing unknown place names. */
export function normalizeCurrentProvince(region: string): string {
  const firstPart = region.trim().split(/\s+/)[0];
  return provinceAliases.get(firstPart) ?? '';
}

/** Normalize a saved target while leaving ambiguous or invalid districts unselected. */
export function normalizeTargetRegion(province: string, district: string): {
  target_province: string;
  target_district: string;
} {
  const targetProvince = legacyProvinceAliases.get(province.trim())
    ?? normalizeCurrentProvince(province);
  const targetDistrict = district.trim();

  // In particular, old Incheon 중구/서구 do not identify a unique new district.
  return {
    target_province: targetProvince,
    target_district: districtsByProvince[targetProvince]?.includes(targetDistrict)
      ? targetDistrict
      : '',
  };
}

/** Compare policy coverage under current names without rewriting stored profiles. */
export function normalizePolicyRegion(region: string): string {
  const parts = region.trim().split(/\s+/);
  const province = normalizeCurrentProvince(region);
  if (!province) return parts.join(' ');

  const districtParts = parts.slice(1);
  if (province === '세종특별자치시') {
    while (districtParts.length && normalizeCurrentProvince(districtParts[0]) === province) {
      districtParts.shift();
    }
  }

  return [province, ...districtParts].join(' ');
}

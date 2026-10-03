import { safeSource } from './domain';
import type { Policy, Profile, Task } from './types';

export interface GuideLink { label: string; url: string }
export interface GuideDocument { name: string; requirement: '필수' | '해당 시' | '공고 확인' | '준비용'; detail: string }
export interface GuideContact { name: string; detail: string; phone?: string; url: string }
export interface TaskGuide {
  title: string; intro: string; steps: string[]; documents: GuideDocument[];
  contacts: GuideContact[]; links: GuideLink[]; note?: string; checkedAt: string;
}

// Official public guidance checked on this date, not a claim that a specific policy is verified.
export const GUIDE_CHECKED_AT = '2026-10-03';
export const guideSources = {
  green: 'https://www.greendaero.go.kr/',
  regional: 'https://www.greendaero.go.kr/svc/rfph/cnslt/cnclInfo/localCnclInfo.do',
  training: 'https://www.greendaero.go.kr/svc/rfph/edc/offline/front/applicationList.do',
  vacant: 'https://www.greendaero.go.kr/svc/rfph/cpif/front/vacantlist.do',
  education: 'https://edu.agriedu.net/',
  certificate: 'https://agriedu.net/page/client_print_info',
  moving: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000016&tp_seq=01',
  building: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=15000000098&tp_seq=03',
  entity: 'https://www.naqs.go.kr/hp/contents/contents.do?menuId=MN40248',
  entityApply: 'https://uni.agrix.go.kr/docs2/potal/main.html',
};

const regionName = (profile: Profile) => `${profile.target_province} ${profile.target_district}`.trim() || '희망 지역';
const regionalContact = (profile: Profile): GuideContact => ({ name: `${regionName(profile)} 귀농귀촌 상담기관`, detail: '지역상담 페이지에서 시·도와 시·군을 선택하면 기관별 주소와 전화번호를 볼 수 있어요.', url: guideSources.regional });
const greenContact: GuideContact = { name: '귀농귀촌 종합상담', phone: '1899-9097', detail: '희망 지역 담당부서·교육·주거 상담 안내', url: guideSources.green };
const educationContact: GuideContact = { name: '농업교육 상담센터', phone: '1811-8656', detail: '수강 신청·학습·수료증 문의 (평일 09~18시, 점심 12~13시 제외)', url: guideSources.education };

/** Upgrade labels for generated legacy tasks without rewriting the user's own titles. */
export function roadmapTaskTitle(task: Pick<Task, 'title'>, profile: Profile): string {
  const region = regionName(profile);
  const replacements: Record<string, string> = {
    '희망 지역의 공식 지원정책 비교하기': `${region} 지원사업 공고·신청기간 비교하고 상담 예약하기`,
    '지역 일자리·창업 프로그램 알아보기': `${region} 지역 일자리·창업 교육 신청서와 일정 확인하기`,
    '인정되는 귀농·영농 교육 알아보기': '농업교육포털에서 귀농·영농 교육 신청하고 수료증 받기',
    '주거 후보지 확인하고 담당기관 상담하기': '빈집 후보지 방문하고 건축물대장·임대 조건 확인하기',
    '관심 정책의 공고와 준비서류 확인하기': '지원사업 신청서·사업계획서·증빙서류 목록 준비하기',
    '전입 일정과 행정 절차 확인하기': '전입신고 신분증·신고서와 온라인 신청 방법 준비하기',
    '전입 및 정착 계획 점검하기': '정부24 또는 주민센터에서 전입신고하고 처리결과 확인하기',
    '지역 프로그램과 추가 지원정책 확인하기': profile.purpose === '귀농' ? '농업경영체 등록신청서·영농 증빙 준비하고 관할 농관원에 문의하기' : `${region} 전입 후 생활·일자리 프로그램 신청하기`,
    [`${region} 이주·정착 상담 알아보기`]: `${region} 귀농귀촌 상담센터 연락처 확인하고 상담 예약하기`,
    '귀농·영농 입문 교육 알아보기': '농업교육포털에서 귀농·영농 입문 교육 신청하기',
    '지역 일자리와 생활 프로그램 알아보기': `${region} 지역 일자리·생활 프로그램 모집공고와 신청서 찾기`,
    '귀농과 귀촌의 생활 방식 비교하기': '그린대로에서 살아보기 프로그램 일정·참가 조건 비교하기',
    '전입 목표 시기와 준비 계획 정하기': '전입 목표 시기·주거 예산·교육 수강 일정을 적어보기',
    [`${region} 전입 후 이용 가능한 지원정책 확인`]: `${region} 전입 후 지원사업 신청서·접수처·마감일 확인하기`,
    '농업경영체 등록 상태와 영농 계획 점검': '농업경영체 등록신청서·영농 증빙 준비하고 관할 농관원에 문의하기',
    '지역 생활·일자리 프로그램 알아보기': `${region} 지역 생활·일자리 프로그램 모집공고와 신청서 찾기`,
    '한 달간의 정착 상황과 다음 계획 점검': '한 달 생활비·주거·교육 수료 현황을 정리하고 다음 일정 정하기',
  };
  if (replacements[task.title]) return replacements[task.title];
  if (/: 부족한 교육 [\d.]+시간의 인정 과정 확인$/.test(task.title)) return task.title.replace(/시간의 인정 과정 확인$/, '시간 인정 과정 신청·수료증 준비').slice(0, 240);
  if (profile.interest.trim() && task.title === `${region}의 ${profile.interest.trim()} 관련 프로그램 확인`) return `${region} ${profile.interest.trim()} 프로그램 모집공고·신청서·담당 연락처 찾기`.slice(0, 240);
  return task.title;
}

function educationGuide(profile: Profile): TaskGuide {
  return {
    title: '교육 신청부터 수료증 보관까지', checkedAt: GUIDE_CHECKED_AT,
    intro: '과정명·교육기관·교육시간을 정해 로드맵에 등록하세요. 실제 수료한 뒤 완료 처리하면 해당 교육의 수료 기록과 총 완료시간에 반영돼요.',
    steps: [
      '농업교육포털 또는 그린대로 통합교육신청에서 지역·관심 작목·교육방식을 골라 과정 상세의 신청기간, 시간, 수료기준을 확인하세요.',
      '지원사업 제출용이면 접수기관에 인정 교육기관·인정시간·온라인 교육 제한·인정기간을 먼저 문의한 뒤 해당 사이트에서 수강을 신청하세요.',
      '수강을 마친 뒤 농업교육포털의 나의 강의실 → 학습종료 과정 → 수료증에서 확인하거나 교육기관에 발급을 요청하세요. 수료증의 실제 시간·날짜로 로드맵을 완료하세요.',
    ],
    documents: [
      { name: '교육 수강신청서 / 온라인 신청정보', requirement: '공고 확인', detail: '선택한 과정의 신청 화면 또는 첨부 양식에서 작성해요. 과정별 모집대상·추가 제출서류를 확인하세요.' },
      { name: '교육 수료증', requirement: '준비용', detail: '수료 후 교육기관에서 발급해 보관해요. 과정명·기관·수료일·교육시간이 표시되어 있는지 확인하세요.' },
      { name: '교육 인정기준이 적힌 지원사업 공고', requirement: '해당 시', detail: '정책 제출용이면 해당 연도 공고의 교육 인정 범위와 수료증 제출 방식도 함께 보관하세요.' },
    ],
    contacts: [educationContact, regionalContact(profile)],
    links: [{ label: '농업교육포털 · 과정 찾기/신청', url: guideSources.education }, { label: '그린대로 · 지역 교육 신청', url: guideSources.training }, { label: '수료증 발급 방법', url: guideSources.certificate }],
    note: '앱의 총 완료시간은 내가 완료한 교육 기록의 합계예요. 지원사업에서 인정하는 시간은 해당 기관이 별도로 심사합니다.',
  };
}

function policyGuide(profile: Profile, policy?: Policy): TaskGuide {
  const source = policy && !policy.is_demo ? safeSource(policy.source_url) : null;
  const listed = policy && !policy.is_demo ? policy.documents.filter(d => d.title.trim()).map(d => ({ name: d.title, requirement: '공고 확인' as const, detail: '이 정책에 등록된 제출서류예요. 원문 공고에서 필수 여부·발급일 기준·서식·제출 부수를 확인하세요.' })) : [];
  return {
    title: policy ? `${policy.title} · 서류와 접수 방법` : '지원사업 신청서류와 접수처 준비', checkedAt: GUIDE_CHECKED_AT,
    intro: `${regionName(profile)}의 해당 연도 모집공고를 열고 신청서부터 내려받으세요. 아래 준비 예시는 모든 사업의 필수서류를 뜻하지 않아요.`,
    steps: [
      '공고 본문과 첨부파일에서 지원대상, 신청기간, 제출처(온라인·방문·우편), 담당부서를 확인하고 기록하세요.',
      '공고에 붙은 신청서·사업계획서를 작성하고 제출서류 목록과 한 항목씩 대조하세요. 발급일 제한이나 행정정보 공동이용 가능 여부도 확인하세요.',
      '담당부서에 누락 서류와 접수 방법을 확인한 뒤 기한 내 제출하고 접수번호 또는 접수증을 보관하세요.',
    ],
    documents: listed.length ? listed : [
      { name: '사업 신청서·개인정보 수집/이용 동의서', requirement: '공고 확인', detail: '신청할 사업의 최신 공고 첨부서식을 사용해 작성·서명해요.' },
      { name: '사업계획서 / 영농계획서', requirement: '공고 확인', detail: '요구하는 사업에 한해 공고 양식에 사업 내용·일정·자금 조달 계획을 작성해요.' },
      { name: '주민등록 등·초본 / 교육 수료증 / 농업경영체 등록확인서', requirement: '공고 확인', detail: '거주·교육·영농 자격을 증명하도록 요구된 항목만 준비해요. 주민등록 서류는 정부24·주민센터, 수료증은 교육기관, 등록확인서는 농관원 안내를 이용하세요.' },
    ],
    contacts: policy && !policy.is_demo ? [{ name: policy.agency || '정책 담당기관', detail: policy.contact || '공고의 문의처에서 담당부서·전화번호를 확인하세요.', url: source || guideSources.regional }, regionalContact(profile)] : [regionalContact(profile), greenContact],
    links: [{ label: source ? '해당 정책 원문 · 신청서/접수처 확인' : '그린대로 · 정착·지원정보에서 공고 찾기', url: source || guideSources.green }, { label: '지역 담당기관 연락처 찾기', url: guideSources.regional }],
    note: policy?.is_demo ? '이 일정에 연결된 정책은 체험용 가상 예시입니다. 예시 서류·모집기간은 실제 신청 요건이 아니며, 링크에서 실제 공고를 찾아 주세요.' : `정책별 필수서류는 원문 공고가 기준입니다.${policy ? ` 연결 정책 확인일: ${policy.verified_at || '미확인'}.` : ''}`,
  };
}

function movingGuide(profile: Profile): TaskGuide {
  return {
    title: '전입신고 · 신분증, 신고서, 신청 경로', checkedAt: GUIDE_CHECKED_AT,
    intro: '실제 거주지를 옮긴 날부터 14일 이내에 정부24 또는 새 주소 관할 읍·면·동 주민센터에서 전입신고하세요.',
    steps: ['새 주소·전입자·세대주 정보를 확인한 뒤 정부24 전입신고 페이지의 신청하기를 이용하거나 주민센터에 방문하세요.', '방문 시 아래 신분증·서식을 준비하세요. 대리 신청은 온라인으로 할 수 없으며, 세대 구성이나 가족관계에 따라 확인 절차가 달라져요.', '신청 뒤 정부24 신청내역 또는 접수 주민센터에서 처리 완료와 세대주 확인 필요 여부를 확인하세요.'],
    documents: [
      { name: '전입신고서', requirement: '필수', detail: '정부24에서 온라인 작성하거나 주민센터 비치 서식을 사용해요. 전입 인원·세대 구성에 맞는 서식을 선택하세요.' },
      { name: '유효한 신분증', requirement: '필수', detail: '방문 시 신고자와 전입하는 분들의 신분증을 지참해요. 배우자·직계혈족이면 신고자 본인 신분증만 지참할 수 있어요. 온라인은 본인인증을 진행해요.' },
      { name: '행정정보 공동이용 사전동의서', requirement: '해당 시', detail: '정부24의 본인 방문 신청 제출서류 안내에 따라 준비하세요. 공동이용에 동의하지 않으면 확인 대상인 가족관계증명서 등을 직접 제출해야 할 수 있어요.' },
      { name: '위임장 및 위임인·대리인 신분증', requirement: '해당 시', detail: '대리 방문 신청일 때 준비해요. 구체적인 대리 신청 가능 범위와 추가 서류는 관할 주민센터에 확인하세요.' },
    ],
    contacts: [{ name: `${regionName(profile)} 새 주소 관할 읍·면·동 주민센터`, detail: '정부24 전입신고 안내의 접수·처리기관에서 관할 기관과 연락처를 확인하세요.', url: guideSources.moving }],
    links: [{ label: '정부24 · 전입신고 신청 / 구비서류', url: guideSources.moving }],
    note: '재외국민·해외체류자 등은 온라인 신청이 제한될 수 있어요. 정부24의 본인 상황별 안내를 확인하세요.',
  };
}

function entityGuide(profile: Profile): TaskGuide {
  return {
    title: '농업경영체 등록 · 재배업 기준 준비', checkedAt: GUIDE_CHECKED_AT,
    intro: '영농 사실을 확인할 수 있는 시점에 주민등록지 관할 국립농산물품질관리원에 등록을 신청하세요. 재배·축산 등 경영 형태에 따라 기준과 증빙이 달라요.',
    steps: ['농관원 등록 안내에서 경영 규모·품목에 맞는 등록 요건을 확인하고 1644-8778로 관할 사무소와 증빙 목록을 문의하세요.', '농업인용 등록신청서에 경작 농지·재배 품목·면적을 기입하고 해당 증빙을 준비하세요.', '농업경영체 등록 온라인서비스 또는 관할 농관원 방문·우편·팩스로 신청하고 등록 결과를 확인하세요.'],
    documents: [
      { name: '농업경영체 등록신청서 (농업인용)', requirement: '필수', detail: '농관원 등록 안내 페이지의 신규등록신청서에서 서식과 견본을 내려받아요. 법인은 별도 법인용 서식을 사용해요.' },
      { name: '농지대장·영농사실확인서', requirement: '해당 시', detail: '재배업 증빙으로 안내되는 자료예요. 영농사실확인서 양식은 농관원 페이지에 있고, 농지대장은 시스템 연계 확인 가능 여부를 담당자에게 확인하세요.' },
      { name: '본인 명의 농자재 구매영수증 또는 농산물 판매영수증', requirement: '해당 시', detail: '경작 면적과 등록 요건에 따라 필요한 증빙이 달라요. 어떤 영수증과 기간·금액 기준이 적용되는지 관할 농관원에 확인하세요.' },
    ],
    contacts: [{ name: '농업경영체 등록 콜센터', phone: '1644-8778', detail: `${regionName(profile)} 영농 계획과 주민등록지를 알려 관할 사무소·준비서류를 안내받으세요.`, url: guideSources.entity }],
    links: [{ label: '농관원 · 등록 요건 / 신청서 내려받기', url: guideSources.entity }, { label: '농업경영체 · 온라인 신청 / 등록확인서', url: guideSources.entityApply }],
    note: '위 목록은 농업인 재배업 중심 안내예요. 축산·곤충·법인은 공식 페이지의 해당 유형 구비서류를 적용하세요.',
  };
}

function housingGuide(profile: Profile): TaskGuide {
  return {
    title: '주거 후보지 · 방문 전 준비자료', checkedAt: GUIDE_CHECKED_AT,
    intro: '희망 지역과 예산에 맞는 후보지를 고른 뒤 주소·건물 상태·입주 조건을 확인하세요.',
    steps: ['그린대로 농촌 빈집은행에서 시·군을 선택하고 주소·금액·거래 상태를 비교하세요.', '후보지 주소로 건축물대장을 확인하고 현장 방문에서 난방·수도·수리 범위와 입주 가능일을 기록하세요.', '지역 상담기관에 빈집·임시거처 지원 여부와 실제 담당자를 문의하고, 지원사업 이용 시 해당 공고의 신청서·서류를 준비하세요.'],
    documents: [
      { name: '건축물대장', requirement: '준비용', detail: '정부24 건축물대장 발급·열람에서 주소로 조회해요. 건물 용도·면적 등 공적 기록을 확인하는 자료예요.' },
      { name: '주거 후보지 비교표·현장 사진', requirement: '준비용', detail: '주소, 임대료/매매가, 수리비, 교통, 입주일을 직접 기록해 비교하세요.' },
      { name: '임대차 조건서 / 임시거처 입주신청서', requirement: '해당 시', detail: '임대 조건은 임대인·중개업소에 확인하고, 지원 주거의 입주신청서는 해당 운영기관의 모집공고에서 받아요.' },
    ],
    contacts: [regionalContact(profile), greenContact],
    links: [{ label: '그린대로 · 농촌 빈집은행', url: guideSources.vacant }, { label: '정부24 · 건축물대장 발급/열람', url: guideSources.building }, { label: '지역 농지·주택 상담 연락처', url: guideSources.regional }],
  };
}

function localGuide(profile: Profile, lifestyle: boolean): TaskGuide {
  const region = regionName(profile);
  return {
    title: lifestyle ? `${region} 생활·일자리 신청 준비` : `${region} 상담 예약과 이주 계획 구체화`, checkedAt: GUIDE_CHECKED_AT,
    intro: lifestyle ? '희망 업종·생활 여건에 맞는 프로그램을 고르고 신청서와 접수 일정을 확보하세요.' : '상담에 가져갈 이주 계획을 적고 담당기관과 실제 상담 일정을 잡아보세요.',
    steps: [
      `그린대로 지역상담에서 ${region}을 선택하고 ${lifestyle ? '생활·일자리·교육' : '귀농상담·농지주택·교육'} 담당기관의 전화번호와 주소를 확인하세요.`,
      lifestyle ? '담당자에게 희망 활동·업종을 말하고 현재 모집하는 프로그램 이름, 신청 링크, 참가 조건, 제출서류를 요청하세요.' : '전화로 전입 목표 시기·가족 구성·주거 예산·관심 작목을 설명하고 방문 또는 전화 상담을 예약하세요.',
      '상담에서 받은 실제 공고·신청서와 담당자 연락처를 보관하고 신청 마감일·교육 시작일을 로드맵에 추가하세요.',
    ],
    documents: [
      { name: '이주·생활 계획 메모', requirement: '준비용', detail: '전입 목표 시기, 월 생활비와 주거 예산, 희망 일자리/작목, 교육 이력을 적어 상담에 활용하세요.' },
      { name: '프로그램 참가신청서', requirement: '공고 확인', detail: '참여할 교육·체험·일자리 프로그램의 모집공고에서 서식을 내려받거나 온라인으로 작성해요.' },
      { name: '자격 증빙 및 개인정보 동의서', requirement: '공고 확인', detail: '거주·연령·경력 등 참가 조건이 있는 경우 공고가 요구하는 항목만 준비하세요.' },
    ],
    contacts: [regionalContact(profile), greenContact],
    links: [{ label: `${region} 상담기관 연락처 찾기`, url: guideSources.regional }, { label: '그린대로 · 지원정책 / 살아보기', url: guideSources.green }],
  };
}

/** Works for saved legacy tasks as well as newly generated and user-created tasks. */
export function resolveTaskGuide(task: Task, profile: Profile, policy?: Policy): TaskGuide {
  const title = roadmapTaskTitle(task, profile);
  let guide: TaskGuide;
  if (/농업경영체/.test(title)) guide = entityGuide(profile);
  else if (task.category === '교육' && profile.purpose === '귀촌' && /일자리|창업/.test(title)) guide = localGuide(profile, true);
  else if (task.category === '교육' || /교육 신청|수료증|입문 교육|교육 수료 내역/.test(title) && task.category !== '정책') guide = educationGuide(profile);
  else if (policy || task.category === '정책' && !/상담 예약/.test(title)) guide = policyGuide(profile, policy);
  else if (task.category === '주거' || /빈집|주거 후보/.test(title)) guide = housingGuide(profile);
  else if (/전입신고|전입 일정과 행정|전입 및 정착/.test(title)) guide = movingGuide(profile);
  else guide = localGuide(profile, /일자리|생활 프로그램|정착 상황|한 달/.test(title));
  // A linked education task still needs the real policy's documents and contact information.
  if (policy && guide.title === '교육 신청부터 수료증 보관까지') {
    const policyInfo = policyGuide(profile, policy);
    return { ...guide, documents: [...guide.documents, ...policyInfo.documents], contacts: [...guide.contacts, ...policyInfo.contacts.slice(0, 1)], links: [...guide.links, policyInfo.links[0]], note: [guide.note, policyInfo.note].filter(Boolean).join(' ') };
  }
  return guide;
}

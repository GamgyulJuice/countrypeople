-- 참고용 템플릿. 확인된 원문 공고로 값을 교체한 뒤 사용자가 SQL Editor에서 실행하세요.
-- 기본은 비공개 초안이며, 이 파일은 자동으로 실행되지 않습니다.
-- 실제 정책명을 비롯한 값과 규칙을 원문과 대조한 후 is_published를 true로 변경하세요.
begin;
with policy as (
  insert into public.policies (
    title, summary, agency, region, category, benefit,
    source_name, source_url, policy_year, verified_at, is_published
  ) values (
    '확인한 정책명으로 교체', '원문에 근거한 설명', '사업 시행기관', '전국', '교육',
    '지원 내용 입력', '공식 공고 제목', 'https://example.org/replace-with-official-notice',
    2026, null, false
  ) returning id
)
insert into public.policy_documents (policy_id, title)
select id, '원문에 명시된 서류명으로 교체' from policy;
commit;

-- 규칙 추가 예시: value는 JSON 숫자/문자열/불리언이며 타입을 지켜야 합니다.
-- insert into public.policy_rules (policy_id, field, operator, value, label, guidance)
-- values ('POLICY_UUID', 'education_hours', 'gte', '100'::jsonb, '교육시간 확인', '원문의 인정 교육기관 및 수료 유효기간 확인');
-- values ('POLICY_UUID', 'purpose', 'eq', '"귀농"'::jsonb, '귀농 목적', '정책의 귀농인 정의 확인');
-- 공개 전 verified_at에 실제 확인일을, source_url에 개별 공고 URL을 입력하세요.

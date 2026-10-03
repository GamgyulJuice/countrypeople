# 귀농·귀촌 정책 추천 MVP 설계

사용자는 귀농·귀촌 프로필을 입력하고 검증된 정책의 충족·부족·정보부족 조건, 목표일까지 할 일, 이번 주 task와 준비도 변화를 확인한다. 준비도는 신청 성공 확률이 아니다.

## 구성

Web은 공통 Zod 계약을 사용한다. API는 Fastify route → service → repository로 분리하고 PostgreSQL에 JSON 프로필·평가·task·체크인을 저장한다. 정책 판정과 로드맵 생성은 외부 I/O 없는 독립 package로 두며 API에서는 port로 주입한다. 같은 action의 task는 `profileId + dedupeKey`로 중복을 방지한다.

Foundation package shell은 정책 결과를 꾸며 반환하지 않는다. 실제 정책은 공식 출처, 정책연도, 확인일이 있을 때만 verified로 취급한다. 확인되지 않은 조건은 needs_review 또는 demo 데이터에 남긴다.

## 데이터 흐름

프로필 저장 → 명시적 평가 요청 → 정책 결과·로드맵 task 저장 → 대시보드에서 최신 평가·주간 task·준비도 조합 → 체크인으로 상태 변경 → 주간 요약 미리보기. API 요청 시각은 Clock으로 주입하고 날짜만 있는 값은 캘린더 날짜로 계산한다.

## 제한 및 검증

실제 사용자 인증·이메일 발송·정책 신청 대행은 범위 밖이다. UUID만으로 접근하는 API를 운영에 공개하지 않는다. Foundation은 계약 parse, 최소 Web render, API health, 명시적 엔진 shell 테스트를 실행한다. 기능 브랜치에서는 fake port route 테스트와 실제 DB 통합 테스트를 구분한다.

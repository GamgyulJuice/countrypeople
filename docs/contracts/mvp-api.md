# MVP API 계약 v1

Base URL: `/api/v1`. JSON과 UTF-8을 사용한다. 날짜는 `YYYY-MM-DD`, 시각은 UTC ISO 8601이다. 이번 주는 Asia/Seoul 기준 월요일부터 일요일까지다. Foundation 단계에서는 `GET /health`만 실행 가능하고 나머지는 API 기능 브랜치가 구현한다.

## 공통

성공 데이터는 아래의 Zod schema를 따른다. 실패는 `{ "error": { "code": "VALIDATION_ERROR", "message": "입력값을 확인해 주세요.", "details": [] }, "requestId": "req-123" }` 형태다. 400은 잘못된 UUID·body·날짜, 404는 없는 profile/task, 409는 같은 체크인 key의 다른 payload 또는 저장 중 프로필 버전 충돌, 500은 내부 DB 오류다. 내부 쿼리와 stack은 응답에 포함하지 않는다. requestId는 모든 오류에 포함한다.

프로필은 `UserProfileInputSchema`로 검증한다. 예: `{ "migrationType": "farming", "migrationStatus": "planning", "stage": "exploring", "targetMoveDate": "2027-10-03", "targetRegionCode": "46710" }`. 모르는 값은 기본값으로 채우지 않는다. 정책과 대시보드, task 등의 필드·enum은 `@rural/contracts`의 schema가 기준이다.

| Method | Path | 요청 | 성공 | 오류 및 반복 요청 |
| --- | --- | --- | --- | --- |
| GET | `/health` | 없음 | `{ "api":"ok", "database":"ok", "policyEngine":"not_implemented" }` | DB 실패 시 503과 `database: unavailable`. 상태 조회만 한다. |
| POST | `/api/v1/profiles` | `UserProfileInput` JSON | 201 `ProfileRecord` | 400/500. 각 호출은 새로운 프로필을 만든다. |
| GET | `/api/v1/profiles/:profileId` | profile UUID | 200 `ProfileRecord` | 400/404/500. 읽기 요청은 저장하지 않는다. |
| PATCH | `/api/v1/profiles/:profileId` | `UserProfilePatch` JSON | 200 `ProfileRecord` | 400/404/409/500. 중첩 필드 병합 후 전체 schema를 재검증한다. 같은 patch 재시도는 동일 최종 값이다. |
| POST | `/api/v1/profiles/:profileId/evaluations` | 빈 body 또는 없음 | 200 `EligibilityResult[]` | 400/404/409/500/503. 평가 기록은 새로 저장하지만 task는 `profileId + dedupeKey`로 중복 생성하지 않는다. 미구현 엔진은 503이다. |
| GET | `/api/v1/profiles/:profileId/dashboard` | profile UUID | 200 `DashboardResponse` | 400/404/500. 평가가 없거나 프로필보다 오래되면 `eligibility: []`와 정책 집계 0. 읽기 요청은 평가를 자동 생성하지 않는다. |
| PATCH | `/api/v1/tasks/:taskId` | `{ "status": "done" }` | 200 `RoadmapTask` | 400/404/500. 같은 status 요청은 같은 최종 상태다. |
| POST | `/api/v1/profiles/:profileId/check-ins` | `Idempotency-Key` header와 `CheckInRequest` JSON | 200 `DashboardResponse` | 400/404/409/500. 같은 profile+key+payload는 저장된 응답을 그대로 반환, 같은 key+다른 payload는 409다. |
| GET | `/api/v1/profiles/:profileId/newsletter-preview` | profile UUID | 200 `NewsletterPreview` | 400/404/500. 읽기 전용, 발송 없음. |

체크인 예: `{ "completedTaskIds": ["00000000-0000-4000-8000-000000000001"], "skippedTaskIds": [], "note": "교육 신청 완료" }`. 주간 preview 예: `{ "profileId":"00000000-0000-4000-8000-000000000001", "subject":"이번 주 준비할 일", "intro":"준비 현황", "daysToMove":30, "weeklyTasks":[], "newPolicies":[], "upcomingDeadlines":[], "readinessChange":null, "generatedAt":"2026-10-03T00:00:00.000Z" }`.

## 엔진 port

`PolicyEnginePort.evaluate(profile: UserProfileInput, now: Date): Promise<EligibilityResult[]>`.

`RoadmapEnginePort.generate(profile: UserProfileInput, eligibility: EligibilityResult[], now: Date): Promise<RoadmapTaskDraft[]>`.

`RoadmapEnginePort.readiness(profile: UserProfileInput, tasks: RoadmapTask[]): Promise<number>`.

정책 package는 `parsePolicyCatalog`, `evaluatePolicy`, `evaluatePolicies`, `loadVerifiedPolicyCatalog`를 제공한다. 로드맵 package는 `generateRoadmap`, `calculateReadiness`를 제공한다. 같은 입력과 같은 now에서는 같은 결과를 반환한다. 현재 package shell 호출은 `NotImplementedError`를 던진다.

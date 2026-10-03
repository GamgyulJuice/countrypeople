# Rural Migration Foundation & API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 귀농·귀촌 MVP의 공통 Foundation과 프로필·평가·로드맵 저장·체크인 API를 구현하고, 검증된 변경을 지정 브랜치와 PR로 전달한다.

**Architecture:** 공통 Zod schema에서 TypeScript 타입을 추론한다. Fastify route → service → repository 계층을 분리하고, 정책·로드맵 엔진은 port와 package adapter로 연결한다. PostgreSQL/Prisma는 상태 저장과 트랜잭션을 담당하고, 날짜 계산에는 Clock을 주입한다.

**Tech Stack:** pnpm workspace, Turborepo, TypeScript strict, Next.js App Router, Fastify, PostgreSQL, Prisma, Zod, Vitest, React Testing Library, MSW, Playwright, Tailwind CSS. 버전은 저장소와 공식 문서 확인 후 호환되는 안정 버전을 lockfile에 고정한다.

**Spec:** 사용자가 제공한 `붙여넣은 마크다운.md`의 Foundation·백엔드 명세. 저장소 접근 후 설계 문서를 `docs/superpowers/specs/2026-10-03-rural-migration-mvp-design.md`에 기록한다.

**상태:** Foundation `integration/mvp` 커밋 `6d30aafe7fe74d4a2330827c5a2fe7231b533755` push 완료. `feat/api-platform`에서 API route와 Prisma 모델·migration을 구현했다. 실제 PostgreSQL 통합 검증과 엔진 패키지 구현은 미완료다.

## Global Constraints

- 저장소: `https://github.com/GamgyulJuice/countrypeople`.
- 기존 구조·package manager·CI·AGENTS.md를 먼저 확인한다. 접근 실패를 빈 저장소로 해석하지 않는다.
- Foundation: `integration/mvp`. 없으면 최신 `main`에서 생성한다.
- Foundation commit: `chore: establish rural migration MVP foundation`.
- Foundation 검증·push 후에만 `FOUNDATION_READY=<실제 commit hash>`를 보고한다.
- 이후 기능 branch: `feat/api-platform`. PR base: `integration/mvp`.
- PR 제목: `feat(api): add profile evaluation roadmap and check-in API`.
- Foundation 이후 수정 범위: `apps/api/**`, `packages/contracts/**`, `docs/contracts/**`, 이 계획 문서, Prisma 관련 경로, 필수 API root 설정.
- Foundation 이후 `apps/web/**`, `packages/ui/**`, 두 엔진 package, `data/policies/**`, `docs/policy-data/**`를 수정하지 않는다.
- 실제 정책·로드맵 엔진은 다른 담당자의 소유다. shell은 명시적인 `NotImplementedError`를 발생시키며 가짜 정상 결과를 반환하지 않는다.
- 알 수 없는 프로필 값은 optional/nullable로 보존한다. schema와 타입을 이중 정의하지 않는다.
- 실제 이메일 발송, 결제, 커뮤니티, 지도, 신청 대행, CMS는 범위에서 제외한다. 앱 내 요약에는 주간 task와 정책 마감 정보를 사용한다.
- 실사용자 인증은 이번 범위에 없다. UUID는 인증 수단이 아니며 이 API를 운영 환경에 공개하면 안 된다는 점을 README에 명시한다.
- route에서 Prisma를 직접 호출하지 않는다. 핵심 함수에서 현재 시각을 직접 읽지 않는다.
- 사용자 명세에 없는 HTTP 세부 규칙과 DB 보조 필드는 아래의 설계 제안이다. 기존 계약이 있으면 먼저 비교하여 필요한 부분만 반영한다.

## Review Focus

1. 같은 프로필에서 평가가 동시에 실행되어도 task 중복이 없어야 한다. Task 5의 실제 DB 병렬 요청 테스트로 검증한다.
2. 체크인에 다른 프로필의 task나 존재하지 않는 task가 섞이면 전체 요청이 실패하고 모든 변경이 롤백되어야 한다. Task 6에서 검증한다.
3. 중첩 PATCH에서 생략한 형제 값은 유지하고 명시적인 null은 보존해야 한다. Task 3의 테스트로 검증한다.
4. 프로필 수정 후 이전 평가를 최신 결과처럼 표시하면 안 된다. Task 5와 7에서 평가 버전 및 dashboard 빈 상태를 검증한다.
5. 재시도·동시 체크인·동일 key의 다른 payload가 task 상태와 준비도 이력을 훼손하면 안 된다. Task 6에서 DB 고유 제약과 트랜잭션을 검증한다.

## 구조와 공통 인터페이스 제안

| 경로 | 책임 |
| --- | --- |
| `packages/contracts/src/profile.ts` | 프로필·부분 업데이트 schema와 추론 타입 |
| `packages/contracts/src/policy.ts` | 정책 요약·조건·평가·추천 행동 schema |
| `packages/contracts/src/roadmap.ts` | task·task draft·상태 변경 schema |
| `packages/contracts/src/api.ts` | dashboard·check-in·newsletter·공통 오류 schema |
| `packages/contracts/src/index.ts` | 공통 공개 export |
| `apps/api/src/app.ts` | `buildApp(dependencies)`; 테스트에서 listen 없이 inject |
| `apps/api/src/server.ts` | 환경변수 검증과 서버 시작 |
| `apps/api/src/ports/` | Clock·정책·로드맵 인터페이스 |
| `apps/api/src/adapters/` | 실제 엔진 package 연결 |
| `apps/api/src/repositories/` | Prisma 접근·트랜잭션 |
| `apps/api/src/services/` | 프로필·평가·체크인·dashboard 조합 |
| `apps/api/src/routes/` | 요청 검증·service 호출·응답 |
| `apps/api/src/domain/date-only.ts` | timezone과 무관한 날짜 단위 계산 |
| `apps/api/prisma/` | schema·migration·seed |
| `apps/api/test/` | route·service·repository·adapter 테스트 및 fake |

```ts
interface Clock { now(): Date }
interface PolicyEnginePort {
  evaluate(profile: UserProfileInput, now: Date): Promise<EligibilityResult[]>;
}
type RoadmapTaskDraft = Omit<RoadmapTask, 'id' | 'profileId' | 'createdAt' | 'updatedAt'>;
interface RoadmapEnginePort {
  generate(profile: UserProfileInput, eligibility: EligibilityResult[], now: Date): Promise<RoadmapTaskDraft[]>;
  readiness(profile: UserProfileInput, tasks: RoadmapTask[]): Promise<number>;
}
```

Clock.now()는 요청 처리의 시작에서 한 번 읽고 같은 값을 해당 요청의 전체 계산에 전달한다. date-only 값은 검증된 `YYYY-MM-DD`로 교환하고 DB의 날짜 타입 또는 일관된 문자열 변환을 사용한다. 주간 범위와 현재 날짜의 기준은 `Asia/Seoul`, 월요일부터 일요일로 문서화한다. 저장 시각은 ISO UTC를 사용한다.

## Task 1: 저장소 확인과 실행 조건 확보

**Files:** 기존 `AGENTS.md`, root 설정, CI, contracts, API, 엔진 package를 읽는다. 파일 생성 없음.

**Interfaces:** Consumes: 사용자 제공 저장소 주소. Produces: 실제 base commit, 기존 branch·파일·도구 상태와 작업 기준.

- [ ] 저장소 접근·현재 연결 계정의 권한을 확인한다. 404이면 주소 오류, 비공개 저장소 접근, 앱 설치 범위를 구분할 증거를 확인한다.
- [ ] 접근 가능한 checkout에서 `git status --short`, `git branch --show-current`, `git remote -v`, `git log -5 --oneline`을 읽는다. 사용자 작업이 있으면 보존한다.
- [ ] `git fetch origin` 후 `integration/mvp` 존재 여부를 확인한다. 존재하면 fast-forward로 동기화하고, 없으면 최신 `main`에서 생성한다.
- [ ] 기존 Node/pnpm 버전, Docker 실행 가능 여부, dependency 설치 경로, CI를 확인한다. 네트워크나 도구가 막히면 미실행 검증 항목을 기록한다.
- [ ] 실제 파일 구조를 바탕으로 이 초안의 경로와 설계 제안을 조정한다. 이 선행 조건 전에는 임의의 대체 저장소를 초기화하지 않는다.

## Task 2: 검증 가능한 Foundation 배포

**Files:** root workspace·Turbo·TypeScript·lint 설정, lockfile, `.env.example`, `docker-compose.yml`, `.github/workflows/ci.yml`, `apps/{web,api}/`, `packages/{contracts,ui,policy-engine,roadmap-engine}/`, `data/policies/`, 설계 문서, `docs/contracts/mvp-api.md`, `docs/ownership.md`.

**Interfaces:** Produces: 명세의 모든 공통 타입·Zod schema, 두 엔진의 지정 export, root 명령, API health 및 web 최소 화면.

- [ ] 먼저 contracts schema 테스트를 작성한다. enum의 모든 명세 값, nullable 데이터, 부정확한 date-only 값, 잘못된 profile 조합, 정책·task·dashboard 응답을 검증한다.
- [ ] schema 구현 전에 contracts 테스트를 실행하여 미구현으로 실패함을 확인한다. 테스트 실행 도구 자체가 없는 경우 그 사실을 RED로 오인하지 않는다.
- [ ] schema에서 타입을 추론한다. 명세의 `MigrationType`, `MigrationStatus`, `PreparationStage`, `EligibilityStatus`, `RequirementState`, `TaskStatus`, `PolicyVerificationStatus`, `UserProfileInput`, `ProfileRecord`, `RequirementResult`, `PolicySummary`, `EligibilityResult`, `RoadmapTask`, `DashboardResponse`, `NewsletterPreview`, `CheckInRequest`를 공개한다. action·draft·오류·PATCH 타입도 동일 package에 둔다.
- [ ] Web/API/Domain dependency 범주를 명세대로 Foundation에 포함한다. 엔진 shell import는 성공하고 호출은 명시적으로 미구현 오류가 나도록 테스트한다. Web render·API health 최소 테스트를 추가한다.
- [ ] 루트의 `dev`, `lint`, `typecheck`, `test`, `build`, `test:e2e`, `db:generate`, `db:migrate`, `db:seed`를 연결한다. API 기능이 생긴 뒤 검증하는 명령은 실행 대상을 미리 명시한다.
- [ ] 환경 예시에는 `DATABASE_URL`, `PORT`, `WEB_ORIGIN`, `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_API_MODE`를 포함하고 실제 비밀값은 제외한다. CI는 frozen lockfile을 사용한다.
- [ ] 모든 endpoint의 요청·응답·400/404/409/500·예시 JSON·idempotency와 공통 `error.code/message/details`, `requestId`를 문서화한다. 업무 소유 경계와 엔진 export 계약을 기록한다.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` 및 최소 health/render/import 검증을 실행한다. 통과 후에만 Foundation commit을 만들고 `git push -u origin integration/mvp`를 실행한다. 원격 commit을 확인하여 `FOUNDATION_READY`를 보고한다.
- [ ] `feat/api-platform`을 Foundation commit에서 생성한다.

## Task 3: 프로필 생성·조회·부분 업데이트

**Files:** `apps/api/prisma/schema.prisma`, 최초 migration, `src/services/profile-service.ts`, `src/repositories/profile-repository.ts`, `src/routes/profiles.ts`, `test/profile.routes.test.ts`, `test/profile.repository.test.ts`, 공통 profile schema.

**Interfaces:** Produces: `createProfile(input: UserProfileInput): Promise<ProfileRecord>`, `getProfile(id: string): Promise<ProfileRecord>`, `updateProfile(id: string, patch: UserProfilePatch): Promise<ProfileRecord>`.

- [ ] inject 테스트를 먼저 작성한다: 유효한 요청 201, 잘못된 요청 400, 없는 UUID 404, 잘못된 UUID 400, 저장 후 재조회 일치.
- [ ] PATCH 테스트에서 `{ farming: { educationHours: 40 } }`는 기존 `experienceYears`를 유지하며, 명시적 `null`은 null로 남고, 빈 PATCH는 400인지 확인한다. 배열은 교체하며 객체는 명세가 허용한 경로만 병합한다. 병합 결과 전체 schema가 실패하면 DB가 변하지 않는지 검증한다.
- [ ] `pnpm --filter @rural/api test -- profile.routes.test.ts`를 실행하여 구현 전 실패를 확인한다.
- [ ] Profile의 UUID·JSON·createdAt·updatedAt을 구현한다. 이후 태스크가 사용하는 Evaluation·Task·CheckIn·NewsletterDigest의 기본 모델도 최초 migration에 포함하고, 서비스는 repository만 호출한다.
- [ ] route 및 실제 PostgreSQL repository 테스트를 실행해 통과를 확인한 뒤 `feat(api): persist profiles with validated partial updates`로 commit한다.

## Task 4: 오류 처리·시간·엔진 adapter 경계

**Files:** `src/app.ts`, `src/ports/*.ts`, `src/adapters/*.ts`, `src/domain/date-only.ts`, `src/routes/health.ts`, 오류 handler, `test/{errors,health,date-only,engine-adapter}.test.ts`.

**Interfaces:** Produces: `buildApp(dependencies): FastifyInstance`, 위의 세 port, `daysBetweenDates(from: string, to: string): number`, 공통 오류 응답.

- [ ] 먼저 schema 오류 400, DB 예외 500, 모든 오류의 requestId, stack·SQL 정보 비노출을 검증한다. DB 장애를 API 정상 상태로 숨기지 않는 health 응답을 검증한다.
- [ ] 날짜 테스트의 기준값을 고정한다: `2024-02-28 → 2024-03-01`은 2일, `2026-10-03 → 2026-10-03`은 0일, 잘못된 `2025-02-29`는 거부한다. timezone을 달리한 실행에서도 date-only 결과가 같아야 한다.
- [ ] 위 테스트들을 실행해 RED를 확인한다. Clock 고정값을 사용하는 fake는 테스트 폴더에만 둔다.
- [ ] 실제 adapter는 `loadVerifiedPolicyCatalog`, `evaluatePolicies`, `generateRoadmap`, `calculateReadiness`를 호출한다. 엔진의 영속 ID와 API의 task draft를 변환하는 규칙을 공통 계약에 적는다.
- [ ] adapter contract test는 skip/pending으로 두지 않는다. Foundation shell에서는 명시적인 미구현 오류를 검증하고, 실제 엔진 연결 시에는 합성 입력의 응답 schema와 결정성을 검증한다. 전환 기준은 Foundation 공개 계약으로 문서화한다. 미구현 오류는 오류 응답이며 정상 빈 정책 목록으로 바꾸지 않는다.
- [ ] health에서 API 상태·DB 상태·엔진 구현 여부를 각각 제공한다. 테스트 통과 후 `feat(api): add observable health and engine adapter boundaries`로 commit한다.

## Task 5: 정책 평가와 roadmap task 영속화

**Files:** `src/services/evaluation-service.ts`, `src/repositories/evaluation-repository.ts`, `src/routes/evaluations.ts`, `test/evaluation.routes.test.ts`, `test/evaluation.repository.test.ts`, 필요한 migration.

**Interfaces:** Produces: `evaluateProfile(profileId: string, now: Date): Promise<EligibilityResult[]>`. Consumes: PolicyEnginePort, RoadmapEnginePort, ProfileRecord.

- [ ] fake port가 받은 profile·now가 요청의 값과 일치하는지, 평가·engineVersion이 저장되는지, 같은 action을 두 번 평가해도 task 수가 증가하지 않는지 테스트한다.
- [ ] 실패하면 평가와 task가 함께 롤백되는지, 이미 done/skipped인 task가 평가 때문에 todo로 되돌아가지 않는지 테스트한다. 실제 DB 병렬 평가에서도 `profileId + dedupeKey`가 유일해야 한다.
- [ ] `pnpm --filter @rural/api test -- evaluation`을 실행해 RED를 확인한다.
- [ ] 두 port의 계산을 DB write 전에 완료한다. 저장 트랜잭션에서는 프로필 버전이 계산 시점과 같은지 확인하고 변경되었다면 409로 재평가를 요구한다. Evaluation에 프로필 버전 식별값을 함께 저장한다. task는 복합 unique로 create-or-preserve한다.
- [ ] 통과 후 `feat(api): persist evaluations and deduplicated roadmap tasks`로 commit한다.

## Task 6: task 상태 변경과 체크인 idempotency

**Files:** `src/services/{task,check-in}-service.ts`, `src/repositories/{task,check-in}-repository.ts`, `src/routes/{tasks,check-ins}.ts`, `test/{task,check-in}.routes.test.ts`, `test/check-in.repository.test.ts`, 필요한 migration.

**Interfaces:** Produces: `updateTask(taskId: string, status: TaskStatus): Promise<RoadmapTask>`, `checkIn(profileId: string, input: CheckInRequest, idempotencyKey: string, now: Date): Promise<DashboardResponse>`.

- [ ] 테스트: 상태 PATCH 성공, 부정확한 상태 400, 없는 task 404, DB 저장 실패 시 정상 응답 금지.
- [ ] 체크인 테스트: 완료·건너뛰기 목록이 겹치면 400, 다른 프로필 task/없는 task가 하나라도 포함되면 404와 전체 롤백. note만 있는 체크인은 허용한다. 체크인 응답의 준비도 비교 기준은 이번 요청으로 생성하는 기록을 제외한 직전 성공 체크인이며, 기준값은 같은 트랜잭션에서 읽어 snapshot에 고정한다.
- [ ] 설계 제안: 체크인에 `Idempotency-Key`를 필수로 받고, 누락은 400으로 정한다. 동일 key+동일 payload 재전송은 최초 성공의 저장된 dashboard 응답을 반환하며 기록과 task 전이는 추가하지 않는다. 동일 key+다른 payload는 409다. 이 세 경우 및 동시 재시도를 먼저 테스트한다.
- [ ] `pnpm --filter @rural/api test -- check-in` 및 task 테스트를 실행해 RED를 확인한다.
- [ ] CheckIn에 `idempotencyKey`, 정규화한 payload hash, 준비도 before/after, 재응답 snapshot을 추가하는 migration을 작성한다. unique는 `profileId + idempotencyKey`다. 같은 프로필의 task 변경을 트랜잭션으로 직렬화하고, 실패 시 CheckIn과 task 변경 모두 롤백한다. key 비교는 task ID 집합의 순서에 영향받지 않게 한다.
- [ ] GET의 준비도와 체크인 직후 준비도는 같은 port를 사용한다. route·실제 DB 병렬 테스트 통과 후 `feat(api): add transactional idempotent check-ins`로 commit한다.

## Task 7: dashboard와 뉴스레터 미리보기

**Files:** `src/services/{dashboard,newsletter}-service.ts`, `src/routes/{dashboard,newsletter}.ts`, `test/{dashboard,newsletter}.test.ts`, API 문서.

**Interfaces:** Produces: `getDashboard(profileId: string, now: Date): Promise<DashboardResponse>`, `buildNewsletter(input: NewsletterInput, now: Date): NewsletterPreview`. `NewsletterInput`은 현재 profile, 현재 profile 버전의 eligibility, weeklyTasks, 현재 준비도, 직전 성공 check-in의 준비도를 포함한다.

- [ ] 평가가 없으면 eligibility와 정책 집계가 빈 상태인지, profile 변경 전의 평가가 그대로 표시되지 않는지 테스트한다. 읽기 요청이 암묵적으로 평가를 생성하지 않도록 계약에 명시한다.
- [ ] 고정 now로 미래/당일/과거 전입, 이번 주 경계, 정책 마감 당일 포함·지나간 마감 제외, 최초 체크인의 readinessChange가 null인 경우를 테스트한다. 다음 체크인 이후에는 현재 준비도와 직전 성공 체크인 준비도의 차이를 사용한다.
- [ ] 뉴스레터의 `newPolicies`는 직전 평가와 비교한 새 policy ID 목록으로 정의하고, 첫 평가에서는 빈 목록으로 한다. `upcomingDeadlines`는 오늘부터 14일 이내(양 끝 포함)의 검증된 정책 신청 마감으로 정의한다. 이전 결과가 없거나 날짜 정보가 없으면 추정하지 않는다.
- [ ] 테스트를 실행해 RED를 확인한 뒤 순수 조합 함수를 구현한다. 준비도는 엔진의 설명 가능한 점수이며 정책 적합 확률로 표현하지 않는다. preview GET은 발송·DB 변경을 하지 않는다. NewsletterDigest는 저장 가능한 모델로 남기고 preview 조회 시 저장하지 않는다.
- [ ] 실제 이메일 provider·스케줄러를 추가하지 않는다. `pnpm --filter @rural/api test -- dashboard`와 newsletter 테스트 통과 후 `feat(api): compose dashboard and newsletter previews`로 commit한다.

## Task 8: 통합 검증·자체 검토·PR

**Files:** API integration tests, CI, README, API 문서, 이 계획 문서.

**Interfaces:** Produces: 실제 실행 로그·commit hash·PR. 구현된 API는 아래 9개다.

| Method | Path |
| --- | --- |
| GET | `/health` |
| POST | `/api/v1/profiles` |
| GET | `/api/v1/profiles/:profileId` |
| PATCH | `/api/v1/profiles/:profileId` |
| POST | `/api/v1/profiles/:profileId/evaluations` |
| GET | `/api/v1/profiles/:profileId/dashboard` |
| PATCH | `/api/v1/tasks/:taskId` |
| POST | `/api/v1/profiles/:profileId/check-ins` |
| GET | `/api/v1/profiles/:profileId/newsletter-preview` |

- [ ] API 통합 테스트는 실제 PostgreSQL에 프로필 생성 → 평가 → dashboard → task 완료 → 체크인 재시도 → newsletter 조회를 수행한다. 테스트 DB와 운영 DB를 구분한다. 실제 엔진 미구현 시 주입한 fake 사용 사실을 결과에 명시한다.
- [ ] `docker compose up -d`, `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:seed`를 실행한다. clean DB에서 migration이 적용되는지 확인한다.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, API 통합 테스트를 실행하고 실제 exit code와 실패 원인을 기록한다. Foundation web 검증과 root test:e2e 실행 범위도 기록한다.
- [ ] `superpowers:verification-before-completion`으로 완료 주장과 실행 증거를 대조하고, `superpowers:requesting-code-review` 기준으로 자체 검토한다. 검토 항목은 입력 검증, 원자성, idempotency, 엔진 fake 경계, 날짜, 소유 경계, 인증 부재 문서다.
- [ ] `git fetch origin`과 `git rebase origin/integration/mvp`를 실행한다. 소유 영역 밖 충돌은 임의 수정하지 않는다. rebase로 영향받은 검증을 다시 실행한다.
- [ ] `git push -u origin feat/api-platform` 후 원격 commit을 확인한다. 지정 title·base의 PR을 생성하고 URL을 확인한다. 자동 병합하지 않는다.
- [ ] 최종 보고에는 Foundation hash, branch, 최종 hash, 공통 계약, endpoint, Prisma 모델·migration, 엔진 interface, 실행 테스트·결과, fake 영역, 보안 제한, 미완료, 위험, PR 주소 또는 실제 실행 가능한 생성 명령을 포함한다. 미실행 항목을 성공으로 표시하지 않는다.

## 검증 한계

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm db:generate`, `pnpm db:seed`는 실행 완료했다.
- `docker compose up -d`는 실행 환경에 Docker가 없어 실패했다. `pnpm db:migrate`는 실행 가능한 PostgreSQL이 없어 실패했다. 실제 DB 트랜잭션·병렬 재시도 검증 전에는 운영 준비 완료로 간주하지 않는다.
- 정책·로드맵 엔진 shell은 명시적 미구현 상태다. 평가·대시보드·체크인·뉴스레터 route의 검증은 테스트용 fake port를 사용한다.

## 7시간 운영 기준

권한·환경 확보 30분, Foundation 90분, 프로필·평가·엔진 경계 90분, task·체크인·dashboard 90분, 검증·연결 수정·PR 120분을 목표로 한다. 이는 작업 배분안이며 완료 시간 보장이 아니다. 현재는 저장소 접근이 막혀 있으므로 원격 구현 단계가 시작되지 않았다. 시간이 부족하면 추가 기능을 줄이고 필수 검증의 실제 결과와 미완료를 남긴다.

## 이번 턴에 확인한 사실

- 2026-10-03 신규 첨부 명세는 컴퓨터 2의 Foundation 및 API 구현을 지정한다.
- GitHub 연결로 `GamgyulJuice/countrypeople`의 `main`(초기 README) 접근을 확인했다.
- Docker와 일반 Git HTTPS 인증은 현재 실행 환경에서 사용할 수 없다. 검증과 원격 반영은 사용 가능한 별도 경로로 진행한다.
- 이 계획은 완료 보고가 아니며 각 단계의 실제 검증 결과를 별도로 기록한다.

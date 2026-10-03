# countrypeople

귀농·귀촌 맞춤형 정책 추천 및 정착관리 MVP의 공통 workspace입니다.

## 시작

Node.js 24+, pnpm 11, Docker가 필요합니다.

```bash
pnpm install --frozen-lockfile
cp .env.example .env
docker compose up -d
pnpm db:generate
pnpm db:migrate
pnpm dev
```

검증: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## 작업 경계

- `apps/web`, `packages/ui`: 프론트엔드 담당
- `apps/api`, `packages/contracts`, Prisma: 백엔드 담당
- `packages/policy-engine`, `packages/roadmap-engine`, `data/policies`: 정책 담당

`integration/mvp`의 Foundation commit 이후에는 각자 기능 브랜치에서 작업합니다. 정책 및 로드맵 package의 현재 구현은 호출하면 `NotImplementedError`를 발생시키는 명시적인 shell입니다.

## 보안 한계

현재 MVP API에는 실사용자 인증과 권한 검사가 없습니다. 프로필 UUID를 아는 사람이 데이터에 접근할 수 있으므로 이 상태로 공개 인터넷에 배포해서는 안 됩니다. 운영 전 사용자 인증, 프로필 소유권 확인, 접근 로그, 요청 제한 및 개인정보 보호 조치를 구현해야 합니다.

이 프로젝트는 실제 이메일을 발송하지 않습니다. 주간 요약은 앱에서 미리보기 데이터로만 제공합니다.

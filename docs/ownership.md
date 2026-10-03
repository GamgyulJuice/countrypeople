# 파일 소유권과 병합 순서

| 담당 | 브랜치 | 소유 경로 |
| --- | --- | --- |
백엔드·통합 | `feat/api-platform` | `apps/api/**`, `packages/contracts/**`, `docs/contracts/**`, Prisma |
프론트엔드 | `feat/web-onboarding-dashboard` | `apps/web/**`, `packages/ui/**` |
정책 데이터·엔진 | `feat/policy-engine-data` | `packages/policy-engine/**`, `packages/roadmap-engine/**`, `data/policies/**`, `docs/policy-data/**` |

Foundation은 `integration/mvp`에 한 번만 직접 올린다. 이후 엔진 → API → Web 순서로 `integration/mvp`에 PR을 병합하며, 각 담당자는 병합 직전 최신 integration 브랜치로 rebase하고 테스트를 재실행한다. 마지막에 integration에서 main으로 PR을 만든다. 소유 영역 외의 계약 변경은 백엔드 담당에게 요청한다.

# Greendaero-inspired portal implementation plan

**Goal:** Reproduce the reference layout while retaining the existing planner and account boundary.
**Architecture:** Public portal and reusable header wrap the existing React workspace. Hash navigation identifies private destinations without accessing private data on the public page.
**Tech Stack:** Existing React, TypeScript, Vite, lucide-react; no new dependencies.
**Spec:** ../specs/2026-10-03-greendaero-design.md

## Constraints
- Preserve existing Supabase authentication and repository behavior.
- Keep the 시골로 brand and clearly label existing demo data.
- Local reference imagery and service icons; no copied government identity or invented current listings.

## Tasks
- [x] Add tested hash navigation in src/portal/navigation.ts; support private destinations, login/signup, invalid hashes, legacy onboarding query.
- [x] Build PortalHeader, PortalHome, Site and portal.css; public search, menu, carousels, official information links and responsive layout.
- [x] Adapt App props and workspace appearance in App.tsx and workspace-theme.css. Shared Header interface: onNavigate(WorkspacePage), onHome(), onAuth(signup?: boolean), userName?, activePage?.
- [x] Run full unit suite/build and browser checks; review changes and resolve material findings.

## Verification
- `pnpm test`: 98 tests passed across 11 files, including the original 94 regression tests.
- `pnpm build`: TypeScript and Vite production bundle passed.
- Browser QA: 390, 768, 1280 and 1440px portal widths; no document horizontal overflow or broken loaded images; no browser console errors.
- Tested search results and empty state, mobile full menu, carousel pause, three-step demo onboarding through persisted dashboard, roadmap/calendar navigation, and skip-link preserving the current private route.
- Independent review verified authentication boundaries and all 12 official information destinations. Fixed inherited vertical search field layout. Fixed off-screen service accessibility text causing horizontal overflow and skip-link hash conflicting with routing.
- Browser demo uses local test profile only. Production Supabase sign-in requires deployed environment configuration; no remote database changes were made.

## Review focus
- Public visitors cannot bypass existing authentication or see private user data.
- Direct private hashes and browser back restore their destination.
- Mobile menu and search are keyboard accessible; carousel can pause.
- Reference asset failures do not leave illegible text or missing destinations.
- Existing policy, onboarding and task flows retain data validation and demo labeling.

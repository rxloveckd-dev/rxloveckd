# Tasks: Renal PharmCare โ€” Core Release

**Input**: plan.md, spec.md, data-model.md, contracts/api.md, research.md
**Tests**: Required (constitution Principle II) โ€” domain and API tests are written before code.
Format: `- [ ] T### [P] [Story] description (path)`. `[P]` = can run in parallel.

## Phase 1: Setup

- [x] T001 Initialize git repository, `.gitignore` (node_modules, .env, *.db, .claude/settings.local.json) (/)
- [x] T002 Create npm workspaces root with dev/test/build scripts (package.json)
- [x] T003 [P] Create `shared` package with TS strict config and Vitest (shared/)
- [x] T004 [P] Create `backend` package: Express 5, Prisma, Zod, Vitest, Supertest (backend/)
- [x] T005 [P] Create `frontend` package: React 18, Vite 5, React Router, TanStack Query (frontend/)

## Phase 2: Foundational (blocks all stories)

- [x] T006 [P] Tests first for Thai national ID validation and masking (shared/tests/thaiId.test.ts)
- [x] T007 [P] Tests first for CKD-EPI 2021 eGFR (shared/tests/egfr.test.ts)
- [x] T008 [P] Tests first for CKD stage, GFR % change, data-quality flags (shared/tests/gfr.test.ts)
- [x] T009 [P] Tests first for urgency color + reasons and appointment status (shared/tests/urgency.test.ts)
- [x] T010 Implement domain functions to pass T006โ€“T009 (shared/src/domain/)
- [x] T011 Shared Zod schemas for patient, visit, lab, medication, DRP (shared/src/schemas/)
- [x] T012 Prisma schema per data-model.md + initial migration (backend/prisma/)
- [x] T013 Config validation at startup; demo mode refused in production (backend/src/config.ts)
- [x] T014 Tests first: login, cookie session, role guard, admin denied patient data (backend/tests/auth.test.ts)
- [x] T015 Auth routes + requireRole middleware (backend/src/auth/)
- [x] T016 Audit writer used by all routes (backend/src/audit/)
- [x] T017 Synthetic seed: users pharm1/super1/admin1, 30 patients across stages and colors (backend/prisma/seed.ts)
- [x] T018 [P] UI kit + Thai strings + app shell, login page, route guard (frontend/src/)

## Phase 3: US1 โ€” Registry and patient profile (P1) ๐ฏ MVP

- [x] T019 [US1] API tests: create, duplicate national ID/HN 409, invalid ID 400, list filters, profile derived values (backend/tests/patients.test.ts)
- [x] T020 [US1] Patient service + routes (backend/src/routes/patients.ts)
- [x] T021 [US1] Lab routes with flags and % change (backend/src/routes/labs.ts)
- [x] T022 [P] [US1] Patients list page with stage/color filters (frontend/src/pages/Patients.tsx)
- [x] T023 [P] [US1] Register patient page (frontend/src/pages/PatientNew.tsx)
- [x] T024 [US1] Patient profile page: profile, color reasons, lab table, visits, meds, DRPs (frontend/src/pages/PatientProfile.tsx)

## Phase 4: US2 โ€” Visit record, medication review, DRPs (P2)

- [x] T025 [US2] API tests: visit numbering, lab rows saved with visit, DRP decision separate (backend/tests/visits.test.ts)
- [x] T026 [US2] Visit, medication, DRP routes (backend/src/routes/visits.ts, medications.ts, drps.ts)
- [x] T027 [US2] Visit form page mirroring the paper form (frontend/src/pages/VisitNew.tsx)
- [x] T028 [US2] DRP add + prescriber decision UI on profile (frontend/src/pages/PatientProfile.tsx)
- [ ] T029 [US2] Completed visits read-only; corrections as amendments (backend + frontend)

## Phase 5: US3 โ€” ACEI/ARB optimization (P3)

- [ ] T030 [US3] Tests first: six statuses, insufficient-data, escalation alerts, no auto action (shared/tests/aceiArb.test.ts)
- [ ] T031 [US3] ACEI/ARB assessment domain function (shared/src/domain/aceiArb.ts)
- [ ] T032 [US3] Assessment persistence + override reason + routes (backend)
- [ ] T033 [US3] ACEI/ARB panel on profile (frontend)

## Phase 6: US4 โ€” Care plans and follow-up (P4)

- [x] T034 [US4] Appointment status (upcoming/missed) in list, profile, dashboard (backend + frontend)
- [ ] T035 [US4] Care plan goals and follow-up tasks (backend + frontend)

## Phase 7: US5 โ€” Dashboard (P5)

- [x] T036 [US5] API tests: worklist ordering, admin gets 403 (backend/tests/dashboard.test.ts)
- [x] T037 [US5] Dashboard route (backend/src/routes/dashboard.ts)
- [x] T038 [US5] Dashboard page: red first, missed/upcoming appointments, counts by stage and color, monthly summary (frontend/src/pages/Dashboard.tsx)

## Phase 8: US6 โ€” Reports (P6)

- [x] T039 [US6] API tests: monthly totals match fixtures, Excel export aggregate only + audited (backend/tests/reports.test.ts)
- [x] T040 [US6] Monthly report JSON + Excel (backend/src/routes/reports.ts)
- [x] T041 [US6] Reports page with month picker and download (frontend/src/pages/Reports.tsx)
- [ ] T042 [US6] Google Drive export (blocked: needs approved hospital Google account)

## Phase 9: US7 โ€” Clinical rule versions (P7)

- [ ] T043 [US7] Rule version routes, supervisor-only, demo flag (backend/src/routes/rules.ts)
- [ ] T044 [US7] Rule settings page with history (frontend/src/pages/Rules.tsx)

## Phase 10: Polish

- [ ] T045 Playwright E2E: login โ’ register โ’ visit โ’ dashboard (e2e/)
- [x] T046 README: setup, env vars, backup/restore, demo accounts (README.md)
- [ ] T047 Run code-review and fix findings

## Dependencies

Phase 1 โ’ Phase 2 โ’ US1 โ’ US2 โ’ (US3, US4, US5 in parallel) โ’ US6 โ’ US7 โ’ Polish.
MVP to open in the browser: Phases 1โ€“4 + T034 + Phase 7 + T039โ€“T041.

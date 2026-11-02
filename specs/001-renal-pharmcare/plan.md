# Implementation Plan: Renal PharmCare — Pharmacist-led CKD Care (Core Release)

**Branch**: `001-renal-pharmcare` | **Date**: 2026-11-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-renal-pharmcare/spec.md`

## Summary

A Thai-language web application for the คลินิกรักษ์ไต pharmacist team: patient registry keyed by
national ID and HN, per-visit records that replace the paper form, lab tracking with calculated
eGFR change and CKD stage, medication lists, DRPs with prescriber decisions, appointments and
reminders, green/yellow/red urgency, a dashboard with a monthly summary, Excel report export, and
an audit log. Clinical logic lives in one shared, framework-free domain package that is unit-tested
first; the API enforces roles on every route; the app runs in demo mode on SQLite with synthetic
seed data and no HOSxP XE connection.

## Technical Context

**Language/Version**: TypeScript 5 on Node.js 22 LTS

**Primary Dependencies**: Express 5, Prisma 5, Zod, bcryptjs, jsonwebtoken, ExcelJS (backend);
React 18, Vite 5, React Router 6, TanStack Query 5 (frontend) — same family as the hospital's
existing BGS projects (Smart Queue HIS)

**Storage**: Prisma ORM; SQLite file for development and demo; MySQL/MariaDB for hospital
deployment (provider switch + migration, see research.md R2)

**Testing**: Vitest (shared domain + backend with Supertest); Playwright for end-to-end journeys

**Target Platform**: Hospital intranet server (Windows or Linux) serving desktop browsers

**Project Type**: Web application — npm workspaces `shared`, `backend`, `frontend`

**Performance Goals**: Dashboard ≤ 2 s for 2,000 enrolled patients (SC-008); API p95 ≤ 300 ms
reads / 500 ms writes (constitution budget)

**Constraints**: No patient identifiers in URLs, logs, or errors (records addressed by opaque
IDs); server-side authorization on every route; demo sign-in disabled when `NODE_ENV=production`;
no automatic medication actions

**Scale/Scope**: ~10 pharmacist users, up to 2,000 patients, ~15 screens

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | How the plan complies | Status |
|---|---|---|
| I. Code Quality | TS strict, ESLint + Prettier, small modules | Pass |
| II. TDD | Domain rules (eGFR, stage, % change, color, Thai ID, data flags) written test-first in `shared`; API tests per route incl. authorization | Pass |
| III. UX Consistency | One component kit (`frontend/src/components/ui`), Thai text in one `i18n/th.ts`, loading/empty/error states on every query | Pass |
| IV. Performance | Indexed lookups (nationalId, hn, patientId+date); dashboard aggregates in SQL; paginated patient list | Pass |
| V. Reuse-First | Shared Zod schemas and domain functions used by both API and UI | Pass |
| VI. Centralized Business Logic | All clinical rules in `shared/src/domain`; UI and routes only call them | Pass |
| VII. Small, Frequent Commits | Git repository initialized; commit per task group | Pass |
| VIII. Skill-Assisted Development | Spec Kit flow; frontend-design for UI; Playwright for E2E | Pass |

Post-design re-check (after Phase 1): unchanged — Pass. No Complexity Tracking entries.

## Project Structure

### Documentation (this feature)

```text
specs/001-renal-pharmcare/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
└── tasks.md
```

### Source Code (repository root)

```text
shared/
├── src/domain/        # egfr.ts, ckdStage.ts, gfrChange.ts, urgency.ts, thaiId.ts, dataQuality.ts, rules.ts
├── src/schemas/       # zod schemas shared by API and UI
└── tests/             # vitest unit tests (written first)

backend/
├── prisma/            # schema.prisma, migrations, seed.ts (synthetic data)
├── src/
│   ├── app.ts         # express app (no listen) for tests
│   ├── index.ts       # server start, config validation
│   ├── config.ts
│   ├── auth/          # login, session cookie, requireRole
│   ├── audit/         # audit writer
│   ├── routes/        # patients, visits, labs, medications, drps, dashboard, reports, rules
│   └── services/      # use shared domain + prisma
└── tests/             # supertest API + authorization tests

frontend/
├── src/
│   ├── components/ui/ # Button, Card, Field, Badge (urgency), Table, States
│   ├── i18n/th.ts
│   ├── api/           # fetch client + query hooks
│   └── pages/         # Login, Dashboard, Patients, PatientNew, PatientProfile, VisitNew, Reports
└── tests/

e2e/                   # Playwright journeys
data/LoveCKD_Database.xlsx  # interim workbook (not used by the app)
```

**Structure Decision**: Three npm workspaces mirroring the hospital's existing BGS Smart Queue HIS
layout so the same IT team can maintain it; `shared` holds the domain layer required by
Principle VI.

## Complexity Tracking

No violations.

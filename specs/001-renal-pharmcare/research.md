# Research: Renal PharmCare Core Release

## R1. Stack

- **Decision**: TypeScript, Express 5 + Prisma backend, React + Vite frontend, npm workspaces.
- **Rationale**: Identical to the hospital's BGS Smart Queue HIS projects, so the hospital IT team
  already maintains this stack (constitution of the clinic doc §9).
- **Alternatives considered**: Next.js full-stack (new to the team); Python/FastAPI (only one
  sibling uses Python).

## R2. Database

- **Decision**: Prisma with SQLite for development/demo; MySQL/MariaDB for hospital deployment.
- **Rationale**: SQLite needs no server, so demo mode works on any PC; HOSxP XE environments run
  MySQL/MariaDB, which the hospital already operates. Prisma migrations document schema changes.
- **Alternatives considered**: Google Sheets as the data store (rejected in clarification: no
  immutable audit, no server-side access control, concurrent-edit loss).

## R3. eGFR method

- **Decision**: CKD-EPI 2021 creatinine equation (race-free):
  `eGFR = 142 × min(Scr/κ,1)^α × max(Scr/κ,1)^-1.200 × 0.9938^age × 1.012 [female]`,
  κ = 0.7 (F) / 0.9 (M), α = -0.241 (F) / -0.302 (M), Scr in mg/dL.
- **Rationale**: Current KDIGO-recommended equation; configurable later per FR-026.
- **Note**: When the lab reports GFR directly, the reported value is stored as measured/imported;
  the calculated value is shown separately and labeled.

## R4. CKD stage

- **Decision**: KDIGO 2012 GFR categories: G1 ≥ 90, G2 60–89, G3a 45–59, G3b 30–44, G4 15–29,
  G5 < 15. Cut-offs stored in the rule version.

## R5. Urgency color

- **Decision**: Worst of the red/yellow conditions in FR-003c, evaluated by a pure function that
  returns the color plus a list of reasons. Defaults: GFR fall red > 25%, yellow ≥ 10%;
  potassium red > 5.5 mmol/L; hypotension SBP < 90 mmHg; GFR stale after 180 days; reminder
  window 7 days. All are marked demo values.

## R6. Thai national ID validation

- **Decision**: 13 digits, first digit 1–8, check digit = (11 − (Σ dᵢ×(13−i) for i=0..11) mod 11)
  mod 10.

## R7. Authentication and roles

- **Decision**: Username + password (bcrypt), JWT in an httpOnly, SameSite=Strict cookie, 8-hour
  expiry; roles `pharmacist`, `supervisor`, `admin`; `requireRole` middleware on every route.
  Demo accounts are seeded only when `DEMO_MODE=true` and refused when `NODE_ENV=production`.
- **Alternatives considered**: Hospital SSO (future, per spec assumption).

## R8. Audit

- **Decision**: `AuditLog` table written in the same transaction as each change and on each
  patient record view; no update/delete routes exist for it.

## R9. Excel export

- **Decision**: ExcelJS generates the monthly report on the server as a download. Google Drive
  upload (FR-025a) is deferred until a hospital Google account and folder are approved.

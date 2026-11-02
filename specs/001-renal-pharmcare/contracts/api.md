# API Contract (JSON over HTTPS, base `/api`)

All routes except `POST /auth/login` require the session cookie. Roles: P = pharmacist,
S = supervisor, A = admin. Errors return `{ "error": { "code": string, "message": string } }`
with Thai messages and no patient identifiers. Request bodies are validated with the shared Zod
schemas.

| Method & path | Roles | Purpose |
|---|---|---|
| POST /auth/login | — | `{username,password}` → sets cookie, returns `{user}` |
| POST /auth/logout | any | clears cookie |
| GET /auth/me | any | current user |
| GET /patients?q=&stage=&color=&page= | P,S | list with derived stage, color, latest GFR, next appointment; national ID masked |
| POST /patients | P,S | register; 409 on duplicate national ID or HN |
| GET /patients/:id | P,S | profile + derived values + reasons (audited view) |
| PATCH /patients/:id | P,S | update demographics/status |
| GET /patients/:id/visits | P,S | visit history |
| POST /patients/:id/visits | P,S | create visit with lab rows and medications |
| GET /patients/:id/labs | P,S | lab history with % change and flags |
| POST /patients/:id/labs | P,S | add lab result |
| GET/POST /patients/:id/medications | P,S | medication list / add |
| PATCH /medications/:id | P,S | change status |
| GET/POST /patients/:id/drps | P,S | DRP list / add |
| PATCH /drps/:id/decision | P,S | record prescriber decision (separate from recommendation) |
| GET /dashboard | P,S | worklist: red patients, missed and upcoming appointments, pending decisions, insufficient data |
| GET /reports/monthly?month=YYYY-MM | P,S | monthly summary JSON |
| GET /reports/monthly.xlsx?month=YYYY-MM | P,S | Excel download (aggregate only, audited) |
| GET /rules/active | P,S | active rule version (shows demo flag) |
| POST /rules | S | new rule version with rationale and effective date |
| GET /audit?entity=&page= | S | audit log (read only) |

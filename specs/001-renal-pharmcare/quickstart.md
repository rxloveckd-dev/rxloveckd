# Quickstart & Validation

## Prerequisites
Node.js 22+, npm 10+. No database server needed for demo mode.

## Setup
```bash
npm install
cp backend/.env.example backend/.env     # DEMO_MODE=true, SQLite file
npm run db:setup                         # prisma migrate + synthetic seed
npm run dev                              # API :4000, web :5173
```
Open http://localhost:5173 and sign in with a demo account listed in `backend/.env.example`.

## Validate
1. `npm test` — domain unit tests (eGFR, stage, % change, color, Thai ID) and API tests pass.
2. Sign in as `pharm1` → dashboard shows red patients first, missed and upcoming appointments.
3. Register a patient with an invalid national ID → Thai error; with a duplicate HN → blocked.
4. Open a patient → profile shows HN, masked national ID, age, latest GFR, stage, color + reasons.
5. Add a visit with GFR lower than the previous by 30% → GFR change shows −30.0% and color turns red
   with reason "GFR ลดลงมากกว่า 25%".
6. Reports → choose month → totals match; "ดาวน์โหลด Excel" downloads an aggregate workbook.
7. Sign in as `admin1` → patient routes return 403 (server-side), dashboard hidden.

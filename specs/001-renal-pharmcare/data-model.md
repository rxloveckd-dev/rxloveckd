# Data Model: Renal PharmCare Core Release

All IDs are opaque CUIDs (never national ID or HN). Timestamps are UTC; dates are local dates.

## User
| Field | Type | Rules |
|---|---|---|
| id | string | PK |
| username | string | unique |
| displayName | string | shown on records ("ภก. ...") |
| passwordHash | string | bcrypt |
| role | enum pharmacist \| supervisor \| admin | admin has no clinical data access |
| active | boolean | |

## Patient
| Field | Type | Rules |
|---|---|---|
| id | string | PK |
| nationalId | string(13) | unique, Thai check digit (R6) |
| hn | string | unique |
| title, firstName, lastName | string | required names |
| birthDate | date | age derived |
| sex | enum male \| female | needed for eGFR |
| ckdCause | string? | |
| programStatus | enum active \| exited_krt \| transferred \| deceased \| withdrawn | default active |
| enrolledAt | date | |
| responsiblePharmacistId | FK User? | |
| notes | string? | |

Indexes: nationalId, hn, lastName.

## LabResult
| Field | Type | Rules |
|---|---|---|
| id, patientId, visitId? | | FK Patient, Visit |
| collectedAt | date | required |
| test | enum gfr \| scr \| albumin \| uacr \| potassium \| sbp \| dbp | |
| value | decimal | plausibility check per test |
| unit | string | required; never compared across units without conversion |
| origin | enum measured \| imported \| user_entered | |
| source | string | e.g. "บันทึกเอง", "HOSxP" |

Index: (patientId, test, collectedAt).

## Visit
| Field | Type | Rules |
|---|---|---|
| id, patientId | | |
| visitNo | int | next number per patient, unique (patientId, visitNo) |
| visitDate | date | |
| medicationTaking | enum correct \| incorrect | |
| herbalOrPainkiller | boolean; herbalDetail string? | |
| dietControlled | boolean | |
| seasoning | enum reduce_needed \| adjusted | |
| furtherAdjustments | string? | |
| nextAppointment | date? | must be ≥ visitDate |
| pharmacistId | FK User | |
| completedAt | datetime? | after completion, edits become amendments |

## Medication
patientId, visitId?, drugName, strength, directions, drugClass (acei, arb, nsaid, diabetes,
other_antihypertensive, diuretic, other), status (active \| stopped), startDate?, notes.

## Drp
patientId, visitId?, recordedAt, category (renal_dose, avoid_in_ckd, interaction, adverse_effect,
adherence, untreated_indication, other), description, drugs, severity (low \| medium \| high),
recommendation, prescriberDecision (pending \| accepted \| modified \| declined),
prescriberReason?, decidedById?, decidedAt?, status (open \| closed), pharmacistId.

## RuleVersion
id, version (int), effectiveFrom, rationale, reviewer, approved (boolean), values (JSON:
stage cut-offs, gfrFallYellowPct, gfrFallRedPct, potassiumRed, sbpLow, gfrStaleDays,
reminderDays). Exactly one active (latest effective). Values are demo until `approved`.

## AuditLog
id, at, actorId, action (view \| create \| update \| amend \| export \| login), entity, entityId,
outcome (ok \| denied \| error). No clinical content stored.

## Derived (not stored)
- Latest GFR, previous GFR, GFR % change, CKD stage, data-quality flags, urgency color + reasons,
  appointment status (upcoming \| missed \| none) — computed by `shared/src/domain`.

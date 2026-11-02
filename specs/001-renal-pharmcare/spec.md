# Feature Specification: Renal PharmCare — Pharmacist-led CKD Care (Core Release)

**Feature Branch**: `001-renal-pharmcare` (no git repository yet; spec directory only)

**Created**: 2026-11-02

**Status**: Draft

**Input**: User description: "Renal PharmCare — Project Constitution v1.0 (draft). Pharmacist-led CKD
care before kidney replacement therapy; potential integration with HOSxP XE. Supports CKD patient
registration, medication review, drug-related problems (DRPs), care plans, laboratory monitoring,
ACEI/ARB optimization, follow-up, dashboards, and reports. Clinical support application, not a
replacement for HOSxP XE, professional judgment, or approved hospital protocols. Primary users:
pharmacists." (Full governance text supplied by the project owner; its safety, privacy, audit,
data-quality, integration, and non-goal rules are carried into the requirements below.)
Supplementary input: "Love CKD รพ.เขาชัยสน" requirements document and the current paper visit form
of คลินิกรักษ์ไต (Kidney Care Clinic), Khao Chaison Hospital — see Clarifications.

## Clarifications

### Session 2026-11-02

- Q: Should the first release deliver all seven user stories or a smaller MVP subset? → A: All
  user stories P1–P7 are in scope for this release, delivered incrementally in priority order.
- Q: How far should each pharmacist be able to see and edit patient data? → A: Every program
  pharmacist can view and edit all enrolled patients; restriction is by role, not by patient
  assignment. Every view and edit remains audit-logged and completed records are still changed only
  through amendments.
- Q: Where is data stored, and how is Excel/Google Drive used? → A: All application data is kept
  in the application's own database; Google Drive is used only as a destination for report
  exports in Excel format.
- Q: What uniquely identifies a patient? → A: The 13-digit Thai national ID number is the primary
  unique identifier; HN (hospital number) is also required and unique. The patient profile holds
  first name, last name, national ID, HN, age, and latest GFR. The national ID is masked in lists
  and never placed in page addresses, logs, or exports unless a patient-level permission applies.
- Context from the clinic document (current process): patients with abnormal GFR at คลินิกรักษ์ไต
  see a pharmacist, who records care on paper notes stuck into a notebook and then in an
  Assessment. Wanted: an easy-to-understand application; per-visit key-in of each form item,
  collected per patient; next follow-up and appointment date with reminders if feasible; monthly
  summary on a dashboard; a per-patient profile; and grouping by CKD stage 1–5 or by a
  green/yellow/red level of safety and follow-up urgency.
- Q: What rule assigns green/yellow/red? → A: The worst of disease risk and follow-up urgency
  (recommended option, accepted by default when the user asked to proceed): red = CKD stage 4–5,
  GFR fall > 25% versus the previous result, potassium above threshold, hypotension, or missed
  appointment; yellow = stage 3a–3b, GFR fall 10–25%, herbal/painkiller use, incorrect medication
  taking, or missing/stale labs; green = none of these. All cut-offs live in the clinical rule
  version and are demo values until clinically approved.
- Q: The clinic also asked for an Excel database in a shared Google Drive folder — is that the
  system of record? → A: No. The application keeps its own database (earlier answer); the Excel
  workbook in `data/LoveCKD_Database.xlsx` is an interim paper replacement until the application is
  in use, and reports export to Excel.
- Clinic feedback on the visit form (2026-11-02): add ACEI/ARB yes/no with "not on it because…"
  in the patient-medicines section; replace Cr with HbA1c; add blood pressure to the lab section;
  the app must work on phones.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Register CKD patients and see their kidney-relevant record (Priority: P1)

A pharmacist registers a CKD patient into the pharmacist care program (or finds an existing one by
HN or name), records CKD stage information, and sees one patient profile showing first name, last
name, HN, age, latest GFR, CKD stage (1–5), urgency color (green/yellow/red), next appointment,
current medications, recent laboratory results with units, dates and source, and any data-quality
flags (missing, stale, conflicting, or implausible values).

**Why this priority**: Every other capability (reviews, DRPs, ACEI/ARB assessment, follow-up,
dashboard) depends on a trustworthy patient record. On its own, it already replaces scattered
paper or spreadsheet tracking.

**Independent Test**: In demo mode with synthetic data, register a patient, enter or load labs and
medications, and confirm the summary shows the correct values, units, result ages, sources, and
flags.

**Acceptance Scenarios**:

1. **Given** a pharmacist is signed in, **When** they register a new patient with the required
   identifying and CKD details, **Then** the patient appears in the program registry and the action
   is recorded in the audit log.
2. **Given** a patient with a serum creatinine result, age, and sex recorded, **When** the summary
   is shown, **Then** the derived eGFR is displayed, labeled as calculated, with the method and the
   input values and dates used.
3. **Given** the most recent potassium result is older than the configured freshness interval,
   **When** the summary is shown, **Then** the value is visibly flagged as stale with its date.
4. **Given** two results for the same test on the same date with different units, **When** the
   summary is shown, **Then** the system does not compare or trend them silently and flags the unit
   conflict.
5. **Given** no UACR result exists, **When** the summary is shown, **Then** UACR is shown as
   "missing", not as zero or normal.
6. **Given** a pharmacist tries to register a patient whose national ID or HN already exists in
   the registry, **When** they submit, **Then** the system blocks the duplicate and links to the
   existing record.
7. **Given** a pharmacist enters a national ID that is not 13 digits or fails the Thai ID check
   digit, **When** they submit, **Then** the system rejects it with a clear Thai message.
8. **Given** patients in the registry, **When** the pharmacist filters the list by CKD stage (1–5)
   or by urgency color (green/yellow/red), **Then** only matching patients are shown with counts.

---

### User Story 2 - Clinic visit record, medication review and drug-related problems (Priority: P2)

At each clinic visit, a pharmacist keys in a visit record that replaces the paper form: follow-up
visit number, visit date, lab rows (date, GFR, Cr, GFR change in percent versus the previous
result, albumin), the patient's current medications, and the counseling notes — medication-taking
correct or incorrect, herbal medicine or painkiller use, diet controlled or not, seasoning/salt
reduction needed or already adjusted, and further adjustments needed — signed by the pharmacist.
Within the same visit the pharmacist can perform a structured medication review, record
drug-related problems (DRPs) with category, cause, and severity, writes a recommendation to the
prescriber, and later records the prescriber's decision and the outcome, kept separate from the
pharmacist's recommendation.

**Why this priority**: Medication review and DRP documentation is the core pharmacist
intervention and the main evidence of the service's value.

**Independent Test**: Complete a review for a synthetic patient, add two DRPs, record
recommendations, then record one accepted and one declined prescriber decision with a reason, and
verify the history shows who did what and when.

**Acceptance Scenarios**:

1. **Given** a registered patient, **When** a pharmacist starts a visit record, **Then** the visit
   number is proposed as the next number for that patient, the previous visit's medications and
   latest labs are pre-filled for confirmation, and the GFR percent change is calculated from the
   previous GFR result and labeled as calculated.
2. **Given** a visit record, **When** the pharmacist fills the counseling items (adherence, herbal
   or painkiller use, diet control, seasoning/salt, further adjustments) and saves, **Then** the
   visit appears in the patient's visit history in date order with the pharmacist's name.
3. **Given** a registered patient, **When** a pharmacist starts a medication review, **Then** the
   current medication list and the latest relevant labs are shown alongside the review form.
4. **Given** an open review, **When** the pharmacist records a DRP, **Then** it requires a
   category, a description, and a severity, and is linked to the involved medication(s).
5. **Given** a DRP with a pharmacist recommendation, **When** the prescriber decision is recorded,
   **Then** the decision (accepted, modified, declined, pending), the reason, the responsible
   person, and the timestamp are stored separately from the recommendation.
6. **Given** a completed visit record or review, **When** it is viewed later, **Then** its content is read-only and
   any correction is recorded as an amendment that preserves the original.

---

### User Story 3 - ACEI/ARB optimization assessment (Priority: P3)

A pharmacist assesses whether ACEI/ARB therapy is relevant for a patient using the available
data (indication, albuminuria, blood pressure, diabetes status, contraindications, current drug and
dose, SCr/eGFR, potassium, adverse effects, symptoms). The system proposes a status and lists the
data it used and the data that is missing; the pharmacist confirms or overrides it with a reason.
Safety signals trigger an assessment-and-escalation task, never an automatic stop.

**Why this priority**: ACEI/ARB optimization is the program's key clinical focus, but it builds on
the record (P1) and review documentation (P2).

**Independent Test**: Using synthetic patients covering each status, run the assessment and verify
the proposed status, the reasons shown, the missing-data list, the escalation triggers, and the
recorded pharmacist and prescriber decisions.

**Acceptance Scenarios**:

1. **Given** a patient with the required data, **When** the assessment runs, **Then** the system
   proposes one of: indicated and taking; potentially indicated but not taking; insufficient data;
   no indication identified from available data; previously stopped; monitoring due — and shows the
   rule version, inputs, and reasons.
2. **Given** a patient missing UACR or recent potassium, **When** the assessment runs, **Then** the
   status is "insufficient data" with the missing items listed, and no indication is inferred.
3. **Given** a patient on an ACEI/ARB whose potassium exceeds the configured threshold, or whose
   creatinine rose beyond the configured percentage, or with recorded hypotension, **When** the
   result is entered, **Then** a high-priority alert states the reason, the values, and the
   recommended next step (assess and escalate), and no medication change is made by the system.
4. **Given** a proposed status, **When** the pharmacist overrides it, **Then** an override reason
   is required and recorded.
5. **Given** a recommendation to start, hold, or stop therapy, **When** the prescriber decides not
   to follow it, **Then** the reason is recorded against the prescriber decision, separately from
   the pharmacist recommendation.

---

### User Story 4 - Care plans and follow-up (Priority: P4)

A pharmacist creates a care plan for a patient with goals (for example blood-pressure target, lab
monitoring schedule, adherence goals) and follow-up tasks with due dates. At the end of each visit
the pharmacist sets the next appointment date; the system reminds pharmacists of upcoming and
missed appointments on the dashboard. Monitoring intervals
from the active clinical rules generate "monitoring due" tasks automatically. Completed follow-ups
are recorded with outcomes.

**Why this priority**: Follow-up closes the loop on reviews and ACEI/ARB actions, but the program
can run with manual follow-up while this is built.

**Independent Test**: Create a care plan with two goals and three tasks, advance the demo clock or
use back-dated synthetic data, and verify due and overdue tasks appear and can be completed with
an outcome.

**Acceptance Scenarios**:

1. **Given** a patient, **When** a pharmacist creates a care plan, **Then** it records goals, target
   values where relevant, responsible pharmacist, and review date.
2. **Given** a patient on an ACEI/ARB with a configured potassium monitoring interval, **When** the
   interval elapses without a new result, **Then** a "monitoring due" task is created and becomes
   overdue after its due date.
3. **Given** a follow-up task, **When** it is completed, **Then** the outcome, the person, and the
   time are recorded and the next task is scheduled if the plan requires it.
4. **Given** a saved visit with a next appointment date, **When** that date is within the
   configured reminder window (default 7 days), **Then** the patient appears in "upcoming
   appointments"; **When** the date passes without a new visit, **Then** the patient appears in
   "missed appointments" and the urgency color is re-evaluated.

---

### User Story 5 - Pharmacist worklist dashboard (Priority: P5)

On signing in, a pharmacist sees a worklist: high-priority alerts, overdue and due-today follow-ups,
reviews awaiting prescriber decisions, and patients with insufficient data — each with the next
action and a link to the patient. The dashboard also shows program counts (patients by CKD stage,
ACEI/ARB status distribution, open DRPs).

**Why this priority**: It makes daily work efficient and keeps alerts visible, but it summarizes
data produced by P1–P4.

**Independent Test**: With a synthetic data set containing known numbers of alerts and overdue
tasks, verify the dashboard counts and lists match and that each item opens the right patient.

**Acceptance Scenarios**:

1. **Given** open high-priority alerts, **When** the dashboard loads, **Then** they appear first,
   with the reason and next step, ordered by priority then age.
2. **Given** a signed-in user without a clinical role (system administrator), **When** they open
   the dashboard, **Then** no patient items or patient counts are shown and the server refuses
   direct requests for them.
3. **Given** an alert has been acknowledged with an action, **When** the dashboard reloads,
   **Then** it no longer appears as open but remains in the patient's history.

---

### User Story 6 - Program reports (Priority: P6)

A pharmacist or supervisor generates reports for a date range: patients enrolled by CKD stage,
reviews performed, DRPs by category and outcome, prescriber acceptance rate, ACEI/ARB status
distribution and changes, and overdue monitoring. Reports can be exported for hospital quality
meetings and contain aggregated counts by default.

**Why this priority**: Reporting demonstrates service value and supports quality improvement, but
does not affect daily patient care.

**Independent Test**: Generate each report over a synthetic data set with known totals and verify
the figures and the export.

**Acceptance Scenarios**:

1. **Given** a date range, **When** a report is generated, **Then** totals match the underlying
   records for that range and the report states the range and generation time.
2. **Given** an aggregate report, **When** it is exported, **Then** it contains no patient
   identifiers unless a patient-level report was explicitly chosen by a user with that permission,
   and the export is audit-logged.
3. **Given** a generated report, **When** the user chooses "save to Google Drive", **Then** an Excel
   file appears in the configured Drive folder and the user sees a confirmation; if the upload
   fails, the user is told and can still download the file.

---

### User Story 7 - Clinical rule and threshold settings (Priority: P7)

A pharmacist supervisor maintains clinical rules: thresholds (for example potassium, creatinine
rise, blood pressure), monitoring intervals, lab freshness windows, and eGFR calculation method.
Each change creates a new version with an effective date, reviewer, and rationale; previous
versions remain viewable, and every assessment records the rule version it used.

**Why this priority**: Required before clinical use, but demo defaults allow P1–P6 to be built and
tested first.

**Independent Test**: Change a potassium threshold, confirm a new version is created, confirm
assessments after the effective date use it and earlier assessments still show the old version.

**Acceptance Scenarios**:

1. **Given** a supervisor, **When** they change a threshold, **Then** they must enter a rationale
   and effective date, and a new rule version is created; the change is audit-logged.
2. **Given** a pharmacist without supervisor permission, **When** they try to change a rule,
   **Then** the server rejects the action regardless of what the interface shows.
3. **Given** rule values that have not been clinically approved, **When** they are active,
   **Then** every screen using them shows that they are demo or unapproved values.

---

### Edge Cases

- A lab value is physiologically implausible (for example potassium 25 mmol/L): it is flagged as
  implausible, excluded from automated assessment, and shown for the pharmacist to verify.
- Units differ between results (mg/dL vs µmol/L creatinine): values are only compared after a
  documented conversion; unknown units are flagged, never guessed.
- A patient starts kidney replacement therapy (dialysis or transplant): the program status changes
  to "exited — KRT", ACEI/ARB pre-KRT rules stop generating tasks, and history is retained.
- A patient dies or transfers: the record is closed with a reason; open tasks are cancelled with
  that reason.
- Two pharmacists edit the same review at the same time: the second save is blocked with a
  notice and the latest version is shown; nothing is silently overwritten.
- An application-entered error is corrected: the original value is kept in history with who
  corrected it, when, and why.
- Session expires during data entry: the user is returned to sign-in without losing the unsaved
  form content on that device, and no patient data is shown in the sign-in URL.
- The system is used in demo mode: all data is visibly synthetic, and demo sign-in cannot be
  enabled in a production configuration.
- An error occurs: the user sees a friendly message without patient identifiers or clinical
  details; details go to protected logs only.

## Requirements *(mandatory)*

### Functional Requirements

**Patient registry and record**

- **FR-001**: System MUST let authorized pharmacists register, search, view, update, and close CKD
  patients in the pharmacist care program.
- **FR-002**: System MUST use the 13-digit Thai national ID as the primary unique patient
  identifier (validated by length and check digit), MUST also require a unique HN, and MUST
  prevent duplicate registration on either. The national ID MUST be masked in lists and MUST NOT
  appear in page addresses, logs, or aggregate exports.
- **FR-003**: System MUST record CKD stage information (stage 1–5 / GFR category, albuminuria
  category, cause where known) and program status (active, exited — KRT, transferred, deceased,
  withdrawn).
- **FR-003a**: The patient profile MUST show first name, last name, HN, masked national ID, age,
  latest GFR with its date, CKD stage, urgency color, and next appointment.
- **FR-003b**: Users MUST be able to filter and group patients by CKD stage (1–5) and by urgency
  color (green, yellow, red).
- **FR-003c**: System MUST assign each active patient an urgency color (green, yellow, red) from
  the active clinical rule version, showing every reason that contributed. The color is the worst
  of: red — CKD stage 5, GFR fall greater than the red threshold (default 25%) versus the
  previous result, potassium above threshold, recorded hypotension, or missed appointment;
  orange — CKD stage 4 (clinic request 2026-11-02); yellow — stage 3a–3b, GFR fall between the yellow and red thresholds (default 10–25%),
  herbal/painkiller use or incorrect medication taking at the latest visit, or missing/stale GFR;
  green — none of these.
- **FR-004**: System MUST store each laboratory result with value, unit, collection date and time,
  source, and reference range when available.
- **FR-005**: System MUST distinguish and label values as measured, imported, calculated,
  user-entered, or missing.
- **FR-006**: System MUST calculate eGFR using the configured, documented method and display the
  method and inputs with the result.
- **FR-007**: System MUST flag missing, stale (older than the configured window), conflicting, and
  implausible values, and MUST NOT infer missing facts.
- **FR-008**: System MUST maintain a current medication list per patient with drug, dose,
  frequency, start date, source, and status.

**Clinic visit record, medication review and DRPs**

- **FR-008a**: Pharmacists MUST be able to create a visit record per clinic visit containing:
  follow-up visit number, visit date, lab rows (date, GFR, GFR percent change versus the previous
  GFR, HbA1c, albumin, potassium, blood pressure systolic/diastolic), current medications, whether
  the patient is on an ACEI/ARB (yes/no, with a required reason when no), medication-taking correct/incorrect,
  herbal medicine or painkiller use (with details), diet controlled or not, seasoning/salt
  reduction needed or already adjusted, further adjustments needed (free text), and the recording
  pharmacist.
- **FR-008b**: System MUST propose the next visit number, pre-fill the previous visit's medications
  for confirmation, and calculate the GFR percent change, labeled as calculated.
- **FR-009**: Pharmacists MUST be able to create medication reviews that capture the medications
  and labs considered, findings, and recommendations.
- **FR-010**: System MUST record DRPs with category, cause, severity, linked medication(s),
  recommendation, and status, using a configurable DRP classification.
- **FR-011**: System MUST store pharmacist recommendations and prescriber decisions as separate
  records, each with responsible person, timestamp, and reason.
- **FR-012**: Completed reviews MUST become read-only; corrections MUST be stored as amendments that
  preserve the original.

**ACEI/ARB optimization**

- **FR-013**: System MUST assess ACEI/ARB status using indication, UACR, diabetes status,
  ACEI/ARB drug and dose, blood pressure, SCr/eGFR, potassium, adverse effects, relevant symptoms,
  and contraindications when available.
- **FR-014**: System MUST assign one of these statuses: indicated and taking; potentially indicated
  but not taking; insufficient data; no indication identified from available data; previously
  stopped; monitoring due.
- **FR-015**: Every assessment MUST show the inputs used, missing inputs, the reasoning, and the
  rule version.
- **FR-016**: Pharmacists MUST be able to confirm or override a proposed status; an override MUST
  require a reason.
- **FR-017**: Abnormal potassium, creatinine rise, hypotension, or overdue monitoring MUST create a
  high-priority alert with reason, relevant values, and recommended next step (assess and
  escalate).
- **FR-018**: System MUST NOT prescribe, start, stop, hold, or change any medication, and MUST NOT
  label any alert as an automatic medication stop.

**Care plans, follow-up, alerts**

- **FR-019**: Pharmacists MUST be able to create care plans with goals, targets, responsible
  pharmacist, and review date.
- **FR-020**: System MUST generate follow-up and "monitoring due" tasks from care plans and active
  monitoring intervals, and mark them overdue after the due date.
- **FR-021**: Pharmacists MUST be able to acknowledge alerts and complete tasks with an outcome; the
  alert or task history MUST be retained.
- **FR-022**: System MUST de-duplicate alerts for the same patient and cause so that one condition
  produces one open alert.
- **FR-022a**: Pharmacists MUST be able to set a next appointment date on each visit; the system
  MUST list upcoming appointments within a configurable reminder window and missed appointments,
  as in-app reminders on the dashboard.

**Dashboard and reports**

- **FR-023**: System MUST provide a worklist dashboard showing high-priority alerts, overdue and
  due-today tasks, reviews awaiting prescriber decision, and patients with insufficient data, each
  with the next action.
- **FR-023a**: The dashboard MUST show a monthly summary for a selected month: patients seen,
  visits, new enrollments, patients by CKD stage and by urgency color, upcoming and missed
  appointments, counseling findings (incorrect medication-taking, herbal/painkiller use,
  uncontrolled diet), and DRPs by category.
- **FR-024**: System MUST provide program reports for a chosen date range: enrollment by CKD stage,
  reviews, DRPs by category and outcome, prescriber acceptance rate, ACEI/ARB status distribution,
  and overdue monitoring.
- **FR-025**: Reports MUST be aggregate by default; patient-level exports MUST require a specific
  permission and MUST be audit-logged.
- **FR-025a**: Users MUST be able to export any report as an Excel file, either downloaded or saved
  to a configured Google Drive folder; each Drive export MUST record the destination, the user,
  and the time in the audit log, and a failed upload MUST be reported to the user without losing
  the generated file.

**Clinical rules**

- **FR-026**: Authorized supervisors MUST be able to configure thresholds, monitoring intervals,
  freshness windows, and the eGFR method; each change MUST create a new version with rationale,
  reviewer, and effective date.
- **FR-027**: System MUST record which rule version was used by each assessment and alert.
- **FR-028**: System MUST visibly mark rule values that are demo or not clinically approved.

**Access, privacy, audit**

- **FR-029**: System MUST require sign-in and enforce role-based authorization on the server for
  every protected action, with at least these roles: pharmacist, pharmacist supervisor, and system
  administrator.
- **FR-030**: Users with the pharmacist or pharmacist supervisor role MUST be able to view and edit
  all enrolled patients (no per-patient assignment restriction). Users without a clinical role
  (such as a system administrator) MUST NOT see patient clinical data, including in dashboards,
  searches, and reports.
- **FR-031**: System MUST log access to and material changes of patient records, reviews, DRPs, care
  plans, ACEI/ARB assessments, rule settings, and exports, with actor, action, timestamp, record
  reference, and outcome, minimizing sensitive content.
- **FR-032**: Audit history MUST NOT be alterable by ordinary users.
- **FR-033**: System MUST NOT expose patient identifiers or clinical details in page addresses,
  logs, analytics, or error messages.
- **FR-034**: User-facing labels MUST be in clear Thai with consistent terminology, with English
  technical terms where helpful.

**Demo mode and external system**

- **FR-035**: System MUST run fully in demo mode with synthetic patients and no connection to
  HOSxP XE; demo data and demo sign-in MUST be clearly marked and MUST be impossible to enable in
  a production configuration.
- **FR-036**: Clinical data import from external systems MUST pass through a single replaceable
  integration boundary; in this release only the synthetic demo source is provided.

### Key Entities *(include if feature involves data)*

- **Patient (program enrollment)**: A CKD patient enrolled in the pharmacist program; 13-digit
  national ID (primary, unique), HN (unique), first and last name, date of birth/age, sex, CKD
  stage info, urgency color, program status, responsible pharmacist.
- **Visit Record**: One clinic visit; visit number, visit date, lab rows, medications, counseling
  items (medication-taking, herbal/painkiller use, diet control, seasoning/salt, further
  adjustments), next appointment date, recording pharmacist.
- **Lab Result**: One measured or imported result; test, value, unit, collection time, source,
  reference range, value origin (measured/imported/user-entered), quality flags.
- **Derived Value**: A calculated value such as eGFR; method, inputs, input dates, rule version.
- **Medication**: An entry in the patient's medication list; drug, dose, frequency, dates, source,
  status.
- **Medication Review**: A dated review by a pharmacist; medications and labs considered, findings,
  status, amendments.
- **Drug-Related Problem (DRP)**: A problem found in a review; category, cause, severity, linked
  medications, status.
- **Recommendation**: A pharmacist recommendation linked to a DRP or ACEI/ARB assessment.
- **Prescriber Decision**: The prescriber's response to a recommendation; decision, reason,
  responsible person, timestamp.
- **ACEI/ARB Assessment**: A dated assessment; inputs used, missing inputs, proposed and final
  status, override reason, rule version.
- **Care Plan**: Goals, targets, responsible pharmacist, review date.
- **Follow-up Task**: Due date, type (follow-up, monitoring due), status, outcome.
- **Alert**: Patient, cause, priority, reason, values, recommended next step, status,
  acknowledgement.
- **Clinical Rule Version**: Set of thresholds, intervals, freshness windows, eGFR method; version,
  effective date, rationale, reviewer, approval state.
- **User and Role**: Signed-in person and role (pharmacist, pharmacist supervisor, system
  administrator); clinical roles have access to all enrolled patients.
- **Audit Entry**: Actor, action, timestamp, record reference, outcome.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A pharmacist can register a patient and see a complete kidney-relevant summary in
  under 3 minutes.
- **SC-002**: A pharmacist can complete a medication review with up to 3 DRPs in under 10 minutes.
- **SC-003**: In acceptance testing with a synthetic set covering every ACEI/ARB status, 100% of
  proposed statuses match the expected status defined by the clinical owner.
- **SC-004**: 100% of injected safety signals (high potassium, creatinine rise, hypotension,
  overdue monitoring) in the test set produce an alert within one data refresh, and 0 produce an
  automatic medication action.
- **SC-005**: 100% of missing, stale, conflicting, and implausible values in the test set are
  flagged; 0 are silently used in an assessment.
- **SC-006**: Unauthorized cross-role access attempts in testing (for example a system
  administrator requesting patient data, or a pharmacist changing clinical rules) are blocked 100%
  of the time, including direct requests that bypass the interface.
- **SC-007**: 100% of the actions listed in FR-031 produce an audit entry, and 0 audit entries,
  logs, page addresses, or error messages in testing contain patient identifiers.
- **SC-008**: The dashboard shows a pharmacist's worklist within 2 seconds for a program of up to
  2,000 enrolled patients.
- **SC-009**: In user acceptance testing, at least 90% of participating pharmacists complete the
  register → review → follow-up workflow without assistance and rate the Thai labels as clear.
- **SC-010**: Report totals match the underlying records exactly for every report in the test set.

## Assumptions

- This release includes all user stories P1–P7; they are built and verified in priority order so
  each completed story is independently demonstrable.
- Primary users are hospital pharmacists; a pharmacist supervisor role maintains clinical rules and
  a system administrator manages accounts. Prescribers do not use the application in this release;
  their decisions are recorded by pharmacists.
- The program serves patients of คลินิกรักษ์ไต with abnormal GFR, CKD stages 1–5, who are not on
  dialysis or transplant ("before kidney replacement therapy").
- Reminders are in-app (dashboard lists); SMS, LINE, or other external notifications are out of
  scope for this release.
- The default eGFR method is CKD-EPI 2021 (creatinine), configurable per FR-026.
- The default DRP classification follows PCNE categories, configurable per FR-010.
- All thresholds and intervals shipped with the application are demo defaults and are marked
  unapproved until the clinical owner approves them.
- This release uses application accounts with role-based access; hospital single sign-on may
  replace this later.
- HOSxP XE integration (read-only import) is out of scope for this release and will be a separate
  feature once hospital IT supplies an approved access method and field specifications; this
  release provides only the integration boundary and a synthetic demo source.
- Data entry is manual or via synthetic demo data in this release.
- The application's own database is the only store of application data; spreadsheets are never
  used as the system of record. Google Drive receives report exports only, through a hospital
  account and folder approved by the project owner; patient-level exports to Drive require the
  same permission as other patient-level exports.
- Usage is on hospital desktop browsers and on phones (layout works from 360 px wide); access is
  over the hospital network.
- Audit and record retention follow hospital policy; the application keeps records indefinitely
  until a policy period is configured.
- Non-goals (from the project document): replacing HOSxP XE, autonomous diagnosis or medication
  changes, writing back to HOSxP XE, treating demo authentication as production security, and
  claiming certification or clinical effectiveness without formal review.

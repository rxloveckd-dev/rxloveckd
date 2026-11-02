Renal PharmCare --- Project Constitution
Version: 1.0
Status: Draft for review
Target: Pharmacist-led CKD care before kidney replacement therapy;
potential integration with HOSxP XE.
1. Purpose
Renal PharmCare supports CKD patient registration, medication review,
drug-related problems (DRPs), care plans, laboratory monitoring,
ACEI/ARB optimization, follow-up, dashboards, and reports. It is a
clinical support application, not a replacement for HOSxP XE,
professional judgment, or approved hospital protocols.
2. Patient Safety and Clinical Governance
- A qualified healthcare professional must review clinical
  recommendations.
- The application must not autonomously prescribe, discontinue, or
  change medication.
- Alerts must state the reason, relevant data, and recommended next
  step.
- Clinical rules, thresholds, and monitoring intervals must be
  reviewed against current guidance and locally approved protocols
  before clinical use.
- Missing, stale, conflicting, or implausible data must be clearly
  flagged; the system must not silently infer missing facts.
- Pharmacist recommendations must be distinct from prescriber
  decisions. Record decisions, reasons, responsible users, and
  timestamps.
3. ACEI/ARB Optimization
- Do not assume every patient with CKD should receive an ACEI/ARB.
  Assessment depends on indication, albuminuria, blood pressure,
  comorbidities, contraindications, current therapy, and clinical
  judgment.
- Capture relevant information when available: UACR, diabetes status,
  ACEI/ARB drug and dose, BP, SCr/eGFR, potassium, adverse effects,
  relevant symptoms, and planned follow-up.
- Support statuses such as indicated and taking; potentially indicated
  but not taking; insufficient data; no indication identified from
  available data; previously stopped; and monitoring due.
- Record pharmacist recommendations separately from prescriber
  decisions and reasons for not starting, holding, or stopping
  therapy.
- Abnormal potassium, a creatinine rise, hypotension, or overdue
  monitoring must trigger assessment and escalation---not an automatic
  medication stop.
- Thresholds and monitoring intervals must be configurable, versioned,
  clinically reviewed, and tested.
4. Privacy and Security
- Apply least-privilege access and role-based authorization.
- Use synthetic data in development, demonstrations, and automated
  tests.
- Never commit credentials, API keys, session secrets, or real patient
  data to source control.
- Follow applicable Thai personal-data requirements and hospital
  policy.
- Do not expose patient identifiers or clinical details in URLs, logs,
  analytics, or error messages unless explicitly approved and
  protected.
- Use secure sessions, input validation, parameterized database
  queries, appropriate CSRF protections, rate limiting, secure
  transport, dependency updates, and managed secrets as applicable.
- Enforce authorization on the server for every protected action;
  hiding UI controls is not access control.
5. Auditability
- Log access to and material changes to patient records, medication
  reviews, DRPs, care plans, ACEI/ARB reviews, and clinical-rule
  settings.
- Audit entries should identify the actor, action, timestamp, record
  reference, and outcome while minimizing sensitive content.
- Protect audit history against ordinary user alteration and retain it
  according to hospital policy.
- Show source and timestamp for imported clinical data when available.
6. HOSxP XE Integration
- Treat HOSxP XE as the external system of record unless the hospital
  formally decides otherwise.
- Begin with read-only access through a hospital-approved API, service
  layer, or database view/account.
- Do not guess database tables, schemas, identifiers, database engine,
  API endpoints, or credentials. Obtain approved specifications from
  hospital IT.
- Never use unrestricted production database access or guessed
  credentials.
- Explicitly map identifiers and clinical fields, document their
  meanings, and handle missing or changed fields safely.
- Isolate integration logic behind an adapter so the core application
  can be tested without HOSxP XE.
- Test with synthetic data and a non-production environment before any
  live connection.
- Any write-back, order creation, or modification of HOSxP XE requires
  separate approval, risk assessment, audit controls, and end-to-end
  validation.
7. Clinical Data Quality
- Store units, collection dates/times, source, and relevant reference
  ranges for laboratory results.
- Do not compare incompatible units or disregard the age of a result.
- Distinguish measured, imported, calculated, user-entered, and
  missing values.
- Document calculation methods and inputs for derived values.
- Allow correction of application-entered errors while preserving an
  audit trail.
8. Usability and Workflow
- Minimize duplicate data entry and support the pharmacist's normal
  workflow.
- Make high-priority alerts visible without unnecessary alert fatigue.
- Use clear Thai labels and consistent terminology, with English
  technical terms where helpful.
- Show review status, outstanding tasks, and the next action.
- The app must remain usable in demo mode without a live HOSxP XE
  connection.
9. Architecture and Maintainability
- Separate UI, API/application logic, persistence, clinical rules, and
  the HOSxP XE adapter.
- Keep configuration outside source code and validate required
  settings at startup.
- Use database migrations and document schema changes.
- Provide setup instructions, environment-variable documentation,
  synthetic seed data, and backup/restore guidance.
- Choose components that the hospital IT team can reasonably maintain.
10. Testing and Release Gates
Include appropriate tests for: - Clinical calculations and decision
rules - API behavior and authorization - Missing, malformed, stale, and
conflicting data - Integration adapters using synthetic HOSxP XE
responses - Cross-user access restrictions - Audit logging and sensitive
actions - Regression after clinical-rule changes

A feature is not production-ready merely because it runs locally.
Production readiness requires documented tests, security review,
clinical validation, user acceptance testing, and hospital approval.
11. Operational Readiness
Before production use, define: - Clinical and technical system owners -
Approved hosting and network design - Identity and access management -
Privacy and security assessment - Approved clinical rules and version
history - Backup, restore, monitoring, and incident response - User
training, documentation, defect reporting, and rollback procedures
12. Explicit Non-Goals
Unless separately approved, the application will not: - Replace HOSxP XE
as the official patient record - Autonomously diagnose, prescribe,
discontinue, or modify medication - Automatically write clinical changes
or medication orders back to HOSxP XE - Treat demo authentication or
sample data as production security - Claim certification, legal
compliance, or clinical effectiveness without evidence and formal review
13. Definition of Done
A feature is complete only when its purpose and failure states are
documented; authorization, audit, validation, and tests are implemented;
sensitive information is not exposed; clinical behavior has appropriate
clinical review; integration is tested without guessed schemas; and user
instructions and limitations are documented.
14. Change Control
- Changes to this constitution require a rationale, version update,
  and project-owner approval.
- Changes to clinical rules require clinical review, test evidence, an
  effective date, and rollback plan.
- Security-impacting changes require review by the responsible
  IT/security team.
- Conflicts with law, hospital policy, or approved clinical protocols
  must be escalated before implementation.
Initial Approval Checklist
- [ ] Clinical owner appointed
- [ ] Hospital IT owner appointed
- [ ] HOSxP XE integration method confirmed
- [ ] Data fields and access permissions approved
- [ ] Clinical rules and alert thresholds approved
- [ ] Privacy and security review completed
- [ ] Test environment and synthetic data prepared
- [ ] User acceptance testing completed
- [ ] Production deployment approved
Document note: This is a project governance baseline, not a clinical
guideline, legal opinion, security certification, or approval to connect
to production systems.
<!--
Sync Impact Report
- Version change: (template, unversioned) → 1.0.0
- Modified principles: n/a (initial adoption; all placeholders replaced)
- Added principles:
  I. Code Quality
  II. Test-Driven Development (NON-NEGOTIABLE)
  III. User Experience Consistency
  IV. Performance Requirements
  V. Reuse-First Components & Functions
  VI. Centralized Business Logic
  VII. Small, Frequent Commits
  VIII. Skill-Assisted Development
- Added sections: Quality Gates & Performance Budgets; Development Workflow; Governance
- Removed sections: none
- Templates: plan/spec/tasks templates read this file at runtime; no template edits made
- Follow-up TODOs: none (git repository not yet initialized — required by Principle VII)
-->

# Rx loveckd Constitution

## Core Principles

### I. Code Quality

- Code MUST pass the project's linter, formatter, and type checker with zero errors before commit.
- TypeScript (or the chosen typed language) MUST run in strict mode; `any` and untyped escapes
  require an inline justification comment.
- Functions MUST do one thing; a function longer than ~50 lines or a file longer than ~300 lines
  MUST be split unless a justification is recorded in the plan's Complexity Tracking table.
- Names MUST describe intent; magic numbers and strings MUST be named constants.
- Dead code, commented-out code, and unused dependencies MUST be removed, not left behind.

Rationale: readable, consistently checked code is the cheapest defense against defects.

### II. Test-Driven Development (NON-NEGOTIABLE)

- Every behavior change MUST follow Red → Green → Refactor: write a failing test, confirm it fails
  for the expected reason, write the minimum code to pass, then refactor with tests green.
- Business logic (Principle VI) MUST have unit tests covering normal, boundary, and error cases.
- User journeys defined in a spec MUST have at least one integration or end-to-end test.
- Bug fixes MUST start with a test that reproduces the bug.
- Tests MUST be deterministic; flaky tests are treated as failures and fixed or quarantined with
  a tracked task, never ignored.
- Coverage for business-logic modules MUST stay at or above 80% lines/branches.

Rationale: tests written first define the contract and prevent regressions in a domain where
mistakes are costly.

### III. User Experience Consistency

- UI MUST be built from the shared component library and design tokens (color, spacing,
  typography); one-off styles require justification.
- Identical actions MUST look and behave identically across screens (labels, placement,
  confirmation, feedback).
- Every async interaction MUST present loading, empty, error, and success states.
- Destructive or irreversible actions MUST require explicit confirmation.
- UI MUST meet WCAG 2.1 AA: keyboard navigable, labeled controls, sufficient contrast.
- User-facing text MUST be centralized (no hard-coded strings scattered in components) so it can
  be reviewed and localized (Thai/English).

Rationale: consistency reduces user error and training cost for clinical and staff users.

### IV. Performance Requirements

- Every feature spec MUST state measurable performance targets; absent a spec value, the defaults
  in "Quality Gates & Performance Budgets" apply.
- Lists or tables that can exceed 100 rows MUST paginate or virtualize.
- Database queries on hot paths MUST be indexed and free of N+1 patterns.
- Performance regressions beyond budget MUST block merge until fixed or the budget is formally
  amended.

Rationale: slow tools get worked around; predictable speed keeps users on the safe path.

### V. Reuse-First Components & Functions

- Before writing new code, existing components, hooks, utilities, and services MUST be searched
  for and reused or extended.
- Logic or UI used in two or more places MUST be extracted into a shared, documented, tested
  module (rule of two).
- Shared modules MUST expose a small, typed public API and live in a designated shared location
  (e.g., `components/ui`, `lib`, `hooks`).
- Copy-paste duplication found in review MUST be refactored before merge.

Rationale: one well-tested implementation is safer and cheaper than many divergent copies.

### VI. Centralized Business Logic

- Business rules (calculations, validation, eligibility, state transitions) MUST live in a
  dedicated domain/service layer, never in UI components, route handlers, or database triggers
  alone.
- UI and API layers MUST call the domain layer; they MUST NOT re-implement its rules.
- Validation schemas MUST be defined once and shared by client and server.
- The domain layer MUST be framework-independent and unit-testable without UI or network.

Rationale: a single source of truth for rules makes behavior auditable and changes safe.

### VII. Small, Frequent Commits

- Work MUST be committed in small, atomic, buildable steps — at minimum after each completed task
  and after each Red→Green→Refactor cycle reaches green.
- Each commit MUST leave tests passing; never commit a broken build to a shared branch.
- Commit messages MUST follow Conventional Commits (`feat:`, `fix:`, `test:`, `refactor:`,
  `docs:`, `chore:`) and reference the task ID when one exists.
- Feature work MUST happen on a feature branch, not directly on the default branch.
- Secrets, credentials, and patient or other personal data MUST never be committed.

Rationale: frequent checkpoints make mistakes easy to find and cheap to roll back.

### VIII. Skill-Assisted Development

- Developers and AI agents MUST use the available project and plugin skills where they apply,
  including Spec Kit (`speckit-*`) for specification → plan → tasks → implement, TDD and
  systematic-debugging skills, code-review/simplify skills before merge, and framework skills
  (e.g., frontend-design, Supabase, Vercel) for their domains.
- Library and framework APIs MUST be verified against current documentation (e.g., Context7)
  rather than memory.
- Skill or agent output MUST still satisfy every principle above; skills assist, they do not
  waive standards.

Rationale: proven workflows and current docs reduce avoidable mistakes and rework.

## Quality Gates & Performance Budgets

A change MAY merge only when all gates pass:

1. Lint, format, and type check: zero errors.
2. All tests pass; business-logic coverage ≥ 80%.
3. New behavior has tests written first (Principle II), visible in commit history.
4. Code review (human or review skill) completed with no unresolved blocking findings.
5. No duplicated logic or business rules outside the domain layer (Principles V, VI).
6. Performance budgets met (defaults unless a spec overrides):
   - Web: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 on a mid-range device.
   - API: p95 latency ≤ 300 ms for reads and ≤ 500 ms for writes under expected load.
   - Initial JavaScript per route ≤ 200 KB gzipped.
7. Security: no secrets in code, inputs validated server-side, access checks enforced on the
   server for every protected resource.

## Development Workflow

1. `/speckit-specify` → `/speckit-clarify` (when ambiguity exists) → `/speckit-plan` →
   `/speckit-tasks` → `/speckit-analyze` → `/speckit-implement`.
2. The plan's Constitution Check MUST be completed before implementation; violations are recorded
   with justification in Complexity Tracking or the plan is revised.
3. Implementation proceeds task by task using TDD, committing after each task (Principle VII).
4. Before merge, run code review and simplification skills, then `/speckit-checklist` or
   `/speckit-analyze` to confirm the feature meets this constitution.

## Governance

- This constitution supersedes other practices and conventions; where they conflict, this
  document wins.
- Amendments MUST be proposed as a change to this file with rationale, reviewed, and recorded
  with an updated version and amendment date.
- Versioning follows semantic versioning: MAJOR for removed or redefined principles, MINOR for
  new principles or materially expanded guidance, PATCH for clarifications.
- Every plan, review, and checklist MUST verify compliance; any exception MUST be justified in
  writing and time-boxed.
- `CLAUDE.md` and Spec Kit templates provide runtime guidance and MUST stay consistent with this
  document.

**Version**: 1.0.0 | **Ratified**: 2026-11-02 | **Last Amended**: 2026-11-02

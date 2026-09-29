# Placement Helper 2.0 — frontend implementation status

## Current architecture

This repository is a Next.js App Router application using React, TypeScript, Tailwind CSS, and seeded TypeScript records under `lib/data`. Student and placement-office routes use separate route-group layouts. The existing app is a frontend demo: it has no API or database layer.

The new `lib/useLocalStorageState.ts` hook keeps selected changes in the current browser. Local storage is useful for trying workflows, but it is not shared between users, devices, or browsers and must not hold sensitive data. Seed data remains the source for unmodified records.

## Frontend workflows now available

| Area | Routes / entry points | Current behavior |
| --- | --- | --- |
| Student opportunity discovery | `/companies`, `/companies/[id]`, `/drives` | Search and filter drives, browser-persisted saved drives, criteria explanations, external application link, confirmation form, and deadline/eligibility gating. |
| Student application tracking | `/applications` | Shows application stages updated by the placement-office candidate workspace. |
| Career workspace | `/workspace` | Preparation checklist, sample quiz with saved attempts and rough browser tab/focus flags for human review, role/eligibility comparison, skills frequency graph, resume keyword review, printable resume draft, portfolio visibility preference, written mock interview prompts, local career guidance, internship checklist, alumni directory, experience submission, cohorts/events sign-up, document filename checklist, privacy settings, and notification preferences. |
| Company and drive management | `/admin/companies`, `/admin/drives` | Add/archive sample companies, create drives with eligibility rules, package, dates, skills, job description, and application link; status changes persist in the browser and appear in the student directory. |
| Candidate ATS and recruiter workflow preview | `/admin/operations` → Candidate ATS | Search candidate rows, inspect basic branch criteria, change application stages, and see stage changes in the student tracker. |
| TPO operations | `/admin/operations` | Employer CRM and notes, configurable policy simulator, interview scheduling with room/time conflict detection, rescheduling, drive-day check-in, assessment outline drafts, offer lifecycle controls, CSV reports/import, announcement drafts, local audit trail, employer discovery from sample history, drive status snapshot, and rule-based data query preview. |
| Placement settings and public profile | `/admin/settings`, `/placements` | Browser-persisted campus/year settings, multi-role permission matrix preview, public profile visibility toggle, and sample placement statistics page. |
| Notifications | `/notifications`, `/admin/notifications` | Browser-persisted demo feed, mark-as-read, and local broadcast entries. No messages are transmitted. |

## Scope and data truth

This implements web interactions around the available sample records. It does not make a local browser workflow a production multi-user system. Eligibility and role matching are explicit rule/keyword checks, not AI predictions. Readiness is a task checklist, not an invented score. Analytics and the public placement page are sample-record summaries, not verified institutional outcomes. Drive snapshots count current status labels; they do not infer historical conversion or causality. Browser focus flags are incomplete signals and are never used to judge a student automatically.

Modules that require services outside a frontend-only build remain service-dependent: authentication and enforced RBAC, tenant/campus isolation, secure document upload and verification, email/SMS/push delivery and event automation, live calendar integration, QR generation/check-in infrastructure, coding execution and hidden-test grading, proctoring signals, verified recruiter/interviewer portals, real AI services, and auditable cross-user data. The career/TPO helpers are clearly labeled rule-based previews; no AI model is connected. The document checklist stores file names only.

## Recommended production architecture

Keep the current App Router UI as a client of authenticated APIs. Add server-side validation and authorization before introducing shared writes. A relational database such as PostgreSQL fits the placement records and their history. Store uploaded files in private object storage; keep only access-controlled metadata in the database. Add background jobs only for actual reminder and notification workflows. A protected provider adapter can later serve AI features with structured outputs and explicit approval for record-changing actions.

### Suggested relational entities

`Institution`, `Campus`, `Department`, `User`, `RoleAssignment`, `StudentProfile`, `AcademicRecord`, `Skill`, `StudentSkill`, `Project`, `Resume`, `Document`, `Company`, `RecruiterContact`, `EmployerInteraction`, `Job`, `PlacementDrive`, `EligibilityRule`, `PlacementPolicy`, `Application`, `ApplicationStageEvent`, `Assessment`, `Question`, `AssessmentAttempt`, `Interview`, `InterviewPanel`, `InterviewFeedback`, `Offer`, `Notification`, `NotificationPreference`, `Cohort`, `Event`, `AlumniProfile`, `InterviewExperience`, `AuditLog`, and `AIResult`.

Use institution/campus foreign keys on tenant-owned records. Keep application stage events append-only so analytics can compute actual funnels. Keep AI results separate from verified student and recruiter data.

### Suggested API groups

`/auth`, `/institutions`, `/campuses`, `/students`, `/companies`, `/recruiters`, `/jobs`, `/drives`, `/eligibility`, `/applications`, `/assessments`, `/interviews`, `/offers`, `/documents`, `/notifications`, `/cohorts`, `/events`, `/alumni`, `/analytics`, `/reports`, and `/ai`. Each write endpoint needs authentication, role/campus authorization, input validation, and an audit event.

## Role and navigation model

The role matrix preview includes Super Admin, College Admin/TPO, Department Coordinator, Faculty, Student, Recruiter, Interviewer, and Alumni. It is a settings prototype only; it does not grant or deny access. Student navigation exposes Dashboard, Companies, Applications, Drives, Career Workspace, Notifications, and Profile. TPO navigation exposes Dashboard, Companies, Drives, Students, Applications, Operations Center, Follow-ups, Placed Students, Analytics, Broadcasts, and Settings. Recruiter, interviewer, faculty, alumni, and super-admin access require authenticated server-side role checks before becoming real portals.

## Recommended build sequence

1. **Placement core:** authenticated profiles, companies/jobs/drives, server-side eligibility, shared application stage history, interview scheduling, offers, and notifications.
2. **TPO operating system:** CRM, configurable placement policy enforcement, import validation, reporting, audit log, drive-day operations, and analytics built from stage events.
3. **Student career tools:** secure resume/document storage, profile editing, assessments, readiness evidence, preparation content, alumni consent, and portfolio publishing.
4. **Recruiter and interviewer portals:** scoped candidate access, assessments, interview feedback, and offer decisions.
5. **Intelligence services:** protected AI adapters for resume feedback, matching, skill gaps, copilots, and drive analysis, with evidence and human review.

## Module coverage cross-reference

The module list in the product vision is represented in the frontend areas above as follows:

- **Placement core (1–10):** existing student/drive records, criteria checks, company/job/drive UI, candidate stage workspace, student tracker, interview scheduler, check-in queue, quiz and assessment outline.
- **Assessment and career tools (11–20):** resume draft/print, transparent resume keyword check, role-skill comparison, task-based preparation, written mock interview, and local rule-based career guidance. Secure coding/proctoring and real AI remain service-dependent.
- **TPO and employer tools (21–25):** CRM, history-based employer suggestions, candidate ATS preview, offer lifecycle, and internship checklist.
- **Community and engagement (26–32):** seeded alumni directory, local experience submissions, preparation checklist, sample cohorts/events, draft communications, and local notification preferences/feed.
- **Policy and insights (33–40):** policy simulator, sample analytics routes, status snapshot, portfolio preview, drive skill-frequency graph, filename-only documents, and CSV reporting/import.
- **Institution operations (41–50):** gated public profile preview, manual local check-in queue, browser-local audit trail, CSV import/export, campus setting and permission preview, privacy controls, and explicitly labeled local assistant previews. Server isolation, enforced security, real automations, and connected AI remain service-dependent.

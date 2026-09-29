# Backend setup

The app backend uses Supabase Auth and PostgreSQL through Next.js Route Handlers. Supabase access tokens are kept in HttpOnly cookies. API reads and writes use the user's token, so PostgreSQL row-level security remains active; the app never exposes a service-role key.

## Connect a Supabase project

1. Create a Supabase project and copy its project URL and publishable/anon key into a local `.env.local` using `.env.example` as a template.
2. Run [`supabase/schema.sql`](supabase/schema.sql) once in the Supabase SQL Editor.
3. Create the first user through `/api/auth/register` (or the Supabase dashboard). Registration creates a profile with no campus assignment, so the new account cannot access placement records yet.
4. In the SQL Editor, create an institution and campus, then attach the first placement administrator to them. For example:

```sql
insert into public.institutions (name, slug) values ('Example College', 'example-college') returning id;
-- Use the returned institution UUID below.
insert into public.campuses (institution_id, name) values ('INSTITUTION_UUID', 'Main Campus') returning id;
-- Use the returned campus UUID, and the registered user's UUID from Authentication > Users.
update public.profiles
set institution_id = 'INSTITUTION_UUID', campus_id = 'CAMPUS_UUID', role = 'college_admin'
where id = 'AUTH_USER_UUID';
```

5. Assign additional users to a campus through the college-admin/TPO workflow. Never put a Supabase service-role key in a `NEXT_PUBLIC_*` variable or browser code.

## API

Auth endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, and `GET /api/auth/me`.

Shared placement resources use `GET` and `POST /api/{resource}` plus staff-only `PATCH` and `DELETE /api/{resource}/{id}`. Resource names include `companies`, `drives`, `applications`, `application_stage_events`, `interviews`, `offers`, `notifications`, `student_profiles`, `documents`, `assessments`, `cohorts`, `events`, `alumni_profiles`, `placement_policies`, `employer_interactions`, `interview_experiences`, and `audit_logs`. Reads support filters such as `?campus_id=eq.UUID&status=eq.Open&limit=50`.

Placement applications are scoped by student and campus. Application status history is generated in PostgreSQL and is append-only. Sensitive rows are protected by row-level security in addition to API role checks. Document records contain private storage metadata only; configure a private Supabase Storage bucket and signed upload/download flows before enabling real files. Email/SMS, calendar, coding execution, and proctoring still need their respective service integrations.

## AI features

Add `OPENAI_API_KEY` to the server environment and optionally choose `OPENAI_MODEL` (defaults to `gpt-5-mini`). The key must never use a `NEXT_PUBLIC_` name. `POST /api/ai` provides structured practice assessments and feedback, resume drafting and review, mock-interview feedback, career coaching, study plans, and a placement-staff copilot. Outputs are suggestions; the app does not use them to decide eligibility, grades, shortlisting, or hiring outcomes. Candidate-entered text is sent to the configured model provider and is not stored by this app. If Supabase is configured, calls require a valid app session and the TPO copilot is limited to placement-office roles. Without Supabase, the AI route is a demo guest endpoint with a process-local rate limit; configure authentication and a durable request quota before a public production launch.

Placement pages still use seeded data and browser-local persistence. The new AI panels send only their explicit request context; the TPO panel receives aggregate sample counts rather than candidate names. Replacing other pages' local demo data with authenticated API reads/writes is a separate frontend integration pass.

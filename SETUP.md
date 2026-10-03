# Going Live — Real Data Setup Guide

This guide takes you from demo mode to a fully live system where:
- **You upload students from Excel → they appear everywhere instantly**
- **You add a company/drive → all eligible students see it live**
- **20,000+ students can use the system simultaneously**

---

## Step 1 — Create a Supabase Project (Free)

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Choose a name (e.g. `college-placement`) and a strong database password
3. Wait ~2 minutes for provisioning

---

## Step 2 — Copy Your Credentials

In Supabase dashboard → **Project Settings → API**:

| Setting | Where to find |
|---------|--------------|
| Project URL | `https://xxxxx.supabase.co` |
| `anon` / `public` key | Under "Project API keys" |

Create a `.env.local` file in your project root (copy from `.env.example`):

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
```

> ⚠️ Never commit `.env.local` to git. It's already in `.gitignore`.

---

## Step 3 — Apply the Database Schema

In Supabase dashboard → **SQL Editor** → paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.

This creates all tables, indexes, Row Level Security policies, and triggers.

---

## Step 4 — Create Your College & Admin Account

Run these SQL statements one by one in the SQL Editor:

```sql
-- 1. Create your institution
INSERT INTO public.institutions (name, slug)
VALUES ('Your College Name', 'your-college-slug')
RETURNING id;
-- Copy the UUID returned ↑

-- 2. Create a campus
INSERT INTO public.campuses (institution_id, name)
VALUES ('INSTITUTION_UUID_HERE', 'Main Campus')
RETURNING id;
-- Copy the UUID returned ↑
```

Now register yourself via the app:
1. Go to `http://localhost:3000` → **Admin Login → Create Account** (or use `/api/auth/register`)
2. Sign in once

Then in SQL Editor, promote your account to admin:

```sql
-- Replace with your actual UUIDs
UPDATE public.profiles
SET
  institution_id = 'INSTITUTION_UUID',
  campus_id      = 'CAMPUS_UUID',
  role           = 'college_admin'
WHERE email = 'your@email.com';
```

---

## Step 5 — Import Student Data from Excel

1. Go to **Admin → Students** → click **"Import from Excel / CSV"**
2. Download the template if needed
3. Drag and drop your `.xlsx` or `.csv` file
4. Preview the data → click **Import**

**Column names your file can use** (flexible, case-insensitive):

| Data | Accepted column names |
|------|-----------------------|
| Roll Number | `roll_number`, `Roll No`, `Enrollment` |
| Full Name | `full_name`, `Name`, `Student Name` |
| Email | `email`, `Email ID` |
| Department | `department`, `Branch`, `Dept` |
| CGPA | `cgpa`, `GPA`, `CPI` |
| 10th % | `tenth_percent`, `10th`, `SSC` |
| 12th % | `twelfth_percent`, `12th`, `HSC` |
| Backlogs | `backlogs`, `Active Backlogs`, `Arrears` |
| Skills | `skills` (comma-separated) |

> **500 students per upload** — run multiple imports for large batches.

---

## Step 6 — Add Companies & Drives

1. **Admin → Companies → "Add Company"**
2. **Admin → Drives → "New Placement Drive"** — set eligibility (branches, min CGPA, max backlogs)
3. Change drive status to **"Open"** → students immediately see it on their dashboard

## Step 7 — Configure Student Email & WhatsApp

The Admin → **Broadcasts** page sends individual emails to all campus students (or one department) for company drives, placement updates, industry talks, and general notices. Marking an application **Shortlisted** in Admin → Applications saves the status and automatically attempts an email and WhatsApp alert to that student.

Add these server-side environment variables to `.env.local` and your hosting provider. Do not expose provider secrets in `NEXT_PUBLIC_*` variables.

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend API key for sending email |
| `RESEND_FROM_EMAIL` | Verified sender, for example `Placement Cell <placements@yourcollege.edu>` |
| `WHATSAPP_ACCESS_TOKEN` | Meta WhatsApp Cloud API access token |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta phone number ID |
| `WHATSAPP_TEMPLATE_NAME` | Approved WhatsApp template name |
| `WHATSAPP_TEMPLATE_LANGUAGE` | Approved template language code (defaults to `en`) |
| `WHATSAPP_API_VERSION` | Graph API version (defaults to `v23.0`) |

The WhatsApp template must be approved by Meta and contain **two body text parameters**, in order: `{{1}}` for the alert title and `{{2}}` for the message. Meta requires an approved template for business-initiated messages outside the customer service window. Only send WhatsApp messages to students who have provided the required opt-in. Without the WhatsApp settings, email broadcasts still work; shortlist attempts report channel failures in the admin screen.

---

## Handling 20,000+ Simultaneous Users

The architecture is built for scale:

| Layer | What handles scale |
|-------|-------------------|
| **Frontend** | Next.js static/server rendering; Vercel CDN |
| **API** | Next.js Route Handlers (serverless, auto-scales) |
| **Database** | Supabase PostgreSQL with connection pooling (PgBouncer built-in) |
| **Security** | Row Level Security — students only see their campus data |
| **Rate limiting** | Add Vercel Edge middleware or Upstash rate-limiting if needed |

**For production (>1,000 concurrent users), upgrade Supabase** to a paid plan which includes:
- Dedicated Postgres instance
- Read replicas
- Built-in PgBouncer connection pooling

---

## How Real-Time Sync Works

When you make any change as admin:
- Student page refreshes call the API → fetch latest data from Supabase
- No caching — all fetches use `cache: "no-store"` 
- Students who already have a page open: they see updates on next refresh or manual reload
- Want push notifications? Enable Supabase Realtime (websockets) per the Supabase docs

---

## Deploying to Production

```bash
# On Vercel (recommended)
vercel deploy

# Set environment variables in Vercel dashboard:
# SUPABASE_URL=...
# SUPABASE_PUBLISHABLE_KEY=...
```

Or any Node.js host:
```bash
npm run build
npm start
```

---

## Quick Troubleshooting

| Problem | Fix |
|---------|-----|
| Seeing "Demo data" banner | Add `.env.local` with Supabase credentials → restart `npm run dev` |
| 401 errors | Your session expired — log out and log back in |
| 403 on import | Your account isn't linked to a campus yet (Step 4) |
| Students can't log in | They need to register at `/` → their profile auto-creates |
| Import fails | Check that `roll_number` and `full_name` columns exist in your Excel |

# Student Data Import Guide — Admin Panel & Supabase

This guide explains how to import and manage student records using **both methods**:
1. **From the Admin Panel** (UI Drag-and-Drop for non-technical placement staff)
2. **Directly from Supabase** (Table Editor CSV Import or SQL for DB administrators)

Both methods populate the exact same database table (`public.student_profiles`), immediately updating the Admin Student Directory, Dashboard Metrics, and student eligibility.

---

## 📋 Required & Optional Student Fields

Whether importing via Admin Panel or Supabase, use this standard schema:

| Column | Required? | Example | Description |
|---|---|---|---|
| `roll_number` | **Yes** | `21CSE001` | Unique student roll / enrollment number |
| `full_name` | **Yes** | `Arjun Sharma` | Student's full legal name |
| `email` | Optional | `arjun@college.edu` | Student email address |
| `department` | **Yes** | `CSE` | Branch / Dept (`CSE`, `IT`, `ECE`, `ME`, etc.) |
| `section` | Optional | `A` | Class section |
| `year_of_study` | Optional | `3` | Current year (1, 2, 3, 4) |
| `graduation_year`| Optional | `2025` | Expected graduation year |
| `phone` | Optional | `9876543210` | Contact phone number |
| `cgpa` | Optional | `8.45` | Current cumulative GPA (0.00 – 10.00) |
| `tenth_percent` | Optional | `91.5` | 10th standard percentage |
| `twelfth_percent`| Optional | `87.0` | 12th standard percentage |
| `backlogs` | Optional | `0` | Active backlog count (defaults to 0) |
| `skills` | Optional | `Python,Java,React` | Comma-separated technical skills |

---

## Method 1: Upload from the Admin Panel (Recommended for Placement Officers)

No SQL or Supabase console access needed. 

### Step-by-Step Instructions:
1. Log in to the portal as an Admin (`/admin/dashboard` or `/admin/students`).
2. Navigate to **Students** in the left navigation sidebar.
3. Click the **"Import from Excel / CSV"** button in the top right header.
4. *(Optional)* Click **"Download sample CSV template"** to get a pre-formatted file with the exact column headers.
5. Drag and drop your `.xlsx`, `.xls`, or `.csv` file into the upload zone (supports up to 2,000 students per batch).
6. The parser automatically validates your data:
   - Identifies any formatting issues (e.g. invalid CGPA, missing roll numbers).
   - Shows a live preview table with the first 5 records.
7. Click **"Import X Students"**.
8. The system upserts all records directly into `public.student_profiles`.
9. The Student Directory and Dashboard automatically refresh with the new student count and roster!

> The Admin import automatically handles updates: if a student with the same roll number already exists, their records (CGPA, backlogs, branch) will be updated with the new file data without creating duplicates.

---

## Method 2: Upload Directly from Supabase Studio

If you prefer uploading directly into Supabase via the web dashboard or via SQL:

### Prerequisites:
Ensure your database has the updated schema. If you set up Supabase previously, run the migration in the Supabase SQL Editor:
- File: `supabase/migrations/20261003000000_allow_direct_student_imports.sql`

This migration makes `user_id` nullable and adds automatic triggers that auto-populate `institution_id` and `campus_id`!

### Option A: Using Supabase Table Editor (CSV Import)
1. Open your Supabase Dashboard (`https://supabase.com/dashboard/projects`).
2. Go to **Table Editor** (grid icon in left menu).
3. Select the **`student_profiles`** table.
4. Click **"Insert"** at the top right → select **"Import data from CSV"**.
5. Drag and drop your student CSV file.
6. Supabase will preview the columns and automatically map them to the table columns:
   - `roll_number` → `roll_number`
   - `full_name` → `full_name`
   - `email` → `email`
   - `department` → `department`
   - `section` → `section`
   - `cgpa` → `cgpa`
   - `backlogs` → `backlogs`
   - `graduation_year` → `graduation_year`
7. Click **"Import data"**.
8. Done! The database trigger `trg_default_student_institution_campus` automatically links each row to your campus institution.

### Option B: Using Supabase SQL Editor (Bulk SQL Insert)
You can also run SQL statements directly:

```sql
INSERT INTO public.student_profiles (
  roll_number, full_name, email, department, section, cgpa, backlogs, graduation_year, skills
) VALUES
  ('21CSE001', 'Arjun Sharma', 'arjun@college.edu', 'CSE', 'A', 8.50, 0, 2025, ARRAY['Python', 'React']),
  ('21CSE002', 'Priya Patel', 'priya@college.edu', 'CSE', 'B', 9.10, 0, 2025, ARRAY['Java', 'Spring', 'AWS']),
  ('21ECE015', 'Rahul Verma', 'rahul@college.edu', 'ECE', 'A', 7.80, 0, 2025, ARRAY['Embedded C', 'IoT'])
ON CONFLICT (campus_id, roll_number) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  department = EXCLUDED.department,
  cgpa = EXCLUDED.cgpa,
  backlogs = EXCLUDED.backlogs,
  updated_at = now();
```

---

## 🔑 How Student Login Works After Import

1. **Before student logs in:**
   - The student appears in the Admin Directory, counts towards total students, and is considered for drive eligibility filters.
   - `student_profiles.user_id` is `NULL`.

2. **When student logs in with Roll Number:**
   - Student enters their Roll Number on `/login`.
   - The system finds their profile in `student_profiles`.
   - Temporary / initial access is granted immediately.
   
3. **When student registers / signs up with Email:**
   - Supabase Auth creates an `auth.users` entry.
   - The database trigger `trg_auto_link_student_profile` automatically matches their email and links `student_profiles.user_id = auth.users.id`.
   - The student now has full access to view upcoming drives, submit applications, and receive real-time notifications.

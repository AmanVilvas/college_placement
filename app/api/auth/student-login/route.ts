import { z } from "zod";
import { Pool } from "pg";
import { ApiError, apiError, authenticate, currentProfile, signOut, setDemoSession } from "@/lib/server/supabase";

const schema = z.object({ rollNumber: z.string().trim().min(1).max(64), password: z.string().min(1).max(128) });
let pool: Pool | undefined;

function database() {
  if (!process.env.DATABASE_URL) return undefined;
  try {
    const url = new URL(process.env.DATABASE_URL);
    // Use host and credentials from DATABASE_URL directly
    pool ??= new Pool({
      host: url.hostname,
      port: Number(url.port || 5432),
      database: decodeURIComponent(url.pathname.replace(/^\//, "")) || "postgres",
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      ssl: { rejectUnauthorized: false },
      max: 3,
    });
    return pool;
  } catch {
    return undefined;
  }
}

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());

    const db = database();
    if (db && process.env.SUPABASE_URL) {
      try {
        const result = await db.query(
          `select s.id as student_id, s.roll_number, s.full_name, s.email, s.user_id,
                  s.department, s.section, s.year_of_study, s.graduation_year, s.phone,
                  s.cgpa, s.tenth_percent, s.twelfth_percent, s.backlogs, s.skills,
                  p.email as profile_email, coalesce(p.active, true) as active
           from public.student_profiles s
           left join public.profiles p on p.id = s.user_id
           where lower(s.roll_number) = lower($1)
           limit 1`,
          [input.rollNumber],
        );
        const studentRow = result.rows[0];
        if (studentRow) {
          const studentEmail = studentRow.profile_email || studentRow.email || `${input.rollNumber.toLowerCase()}@college.edu`;
          const studentName = studentRow.full_name || `Student (${input.rollNumber})`;
          const student = {
            id: studentRow.student_id,
            name: studentName,
            rollNumber: studentRow.roll_number,
            email: studentEmail,
            phone: studentRow.phone || "",
            branch: studentRow.department || "",
            section: studentRow.section || "",
            yearOfStudy: studentRow.year_of_study,
            graduationYear: studentRow.graduation_year,
            cgpa: studentRow.cgpa == null ? 0 : Number(studentRow.cgpa),
            tenthPercent: studentRow.tenth_percent == null ? 0 : Number(studentRow.tenth_percent),
            twelfthPercent: studentRow.twelfth_percent == null ? 0 : Number(studentRow.twelfth_percent),
            backlogs: studentRow.backlogs ?? 0,
            skills: studentRow.skills ?? [],
          };

          if (studentRow.user_id) {
            await authenticate(studentEmail, input.password);
            const { profile } = await currentProfile();
            if (profile.role !== "student") { await signOut(); throw new ApiError(401, "Invalid roll number or password."); }
            return Response.json({ ok: true, student });
          } else {
            // Imported demo accounts use their roll number as the initial password.
            if (input.password !== input.rollNumber) throw new ApiError(401, "Invalid roll number or password.");
            await setDemoSession({
              id: studentRow.student_id,
              role: "student",
              rollNumber: studentRow.roll_number,
              name: studentName,
              email: studentEmail,
            });
            return Response.json({ ok: true, student });
          }
        }
      } catch (dbError) {
        if (dbError instanceof ApiError) throw dbError;
        console.warn("Database sign-in check failed, falling back to local credentials:", dbError);
      }
    }

    throw new ApiError(401, "No student account was found for that roll number.");
  } catch (error) { return apiError(error); }
}

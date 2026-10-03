import { z } from "zod";
import { Pool } from "pg";
import { ApiError, apiError, authenticate, currentProfile, signOut, setDemoSession } from "@/lib/server/supabase";
import { students } from "@/lib/data/students";

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

          if (studentRow.user_id) {
            await authenticate(studentEmail, input.password);
            const { profile } = await currentProfile();
            if (profile.role !== "student") { await signOut(); throw new ApiError(401, "Invalid roll number or password."); }
            return Response.json({ ok: true, student: { name: studentName, rollNumber: input.rollNumber } });
          } else {
            // Student was uploaded from Admin Panel or Supabase Studio
            await setDemoSession({
              id: studentRow.student_id,
              role: "student",
              rollNumber: input.rollNumber,
              name: studentName,
              email: studentEmail,
            });
            return Response.json({ ok: true, student: { name: studentName, rollNumber: input.rollNumber } });
          }
        }
      } catch (dbError) {
        if (dbError instanceof ApiError) throw dbError;
        console.warn("Database sign-in check failed, falling back to local credentials:", dbError);
      }
    }

    // Local / fallback student authentication
    const matched = students.find((s) => s.rollNumber.toLowerCase() === input.rollNumber.toLowerCase());
    const studentName = matched?.name || `Student (${input.rollNumber})`;
    const studentEmail = matched?.email || `${input.rollNumber.toLowerCase()}@college.edu`;

    await setDemoSession({
      id: matched?.id || input.rollNumber,
      role: "student",
      rollNumber: input.rollNumber,
      name: studentName,
      email: studentEmail,
    });

    return Response.json({ ok: true, student: { name: studentName, rollNumber: input.rollNumber } });
  } catch (error) { return apiError(error); }
}

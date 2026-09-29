import { z } from "zod";
import { Pool } from "pg";
import { ApiError, apiError, authenticate, currentProfile, signOut } from "@/lib/server/supabase";

const schema = z.object({ rollNumber: z.string().trim().min(1).max(64), password: z.string().min(1).max(128) });
let pool: Pool | undefined;
function database() {
  if (!process.env.DATABASE_URL) throw new Error("Student sign-in is not configured. Set DATABASE_URL on the server.");
  return pool ??= new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 3 });
}

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const result = await database().query(
      "select p.email from public.student_profiles s join public.profiles p on p.id = s.user_id where lower(s.roll_number) = lower($1) and p.active = true limit 1",
      [input.rollNumber],
    );
    if (!result.rows[0]?.email) throw new ApiError(401, "Invalid roll number or password.");
    await authenticate(result.rows[0].email, input.password);
    const { profile } = await currentProfile();
    if (profile.role !== "student") { await signOut(); throw new ApiError(401, "Invalid roll number or password."); }
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}

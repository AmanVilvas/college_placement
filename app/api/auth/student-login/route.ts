import { z } from "zod";
import { Pool } from "pg";
import { ApiError, apiError, authenticate, currentProfile, signOut } from "@/lib/server/supabase";

const schema = z.object({ rollNumber: z.string().trim().min(1).max(64), password: z.string().min(1).max(128) });
let pool: Pool | undefined;
function database() {
  if (!process.env.DATABASE_URL) throw new Error("Student sign-in is not configured. Set DATABASE_URL on the server.");
  const url = new URL(process.env.DATABASE_URL);
  // Supabase's direct database hostname is IPv6-only on some plans/runtimes.
  // Route it through this project's verified Singapore session pooler instead.
  const directHost = url.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
  if (directHost) {
    url.hostname = "aws-0-ap-southeast-1.pooler.supabase.com";
    url.port = "5432";
    url.username = `postgres.${directHost[1]}`;
  }
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

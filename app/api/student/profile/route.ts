import { apiError, ApiError, developmentDatabaseQuery } from "@/lib/server/supabase";
import { ownStudentScope, ownStudentWhere, readStudentProfile } from "@/lib/server/studentProfile";
import { studentProfileUpdate } from "@/lib/profileValidation";

export async function GET() {
  try { return Response.json({ data: await readStudentProfile(await ownStudentScope()) }, { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const scope = await ownStudentScope();
    const input = studentProfileUpdate.parse(await request.json());
    const entries = Object.entries(input);
    const assignments = entries.map(([key], index) => `${key} = $${index + 4}${key === "skills" ? "::text[]" : ""}`);
    const rows = await developmentDatabaseQuery(`update public.student_profiles s set ${assignments.join(", ")}, updated_at = now()
      where ${ownStudentWhere} returning s.id`, [...scope, ...entries.map(([, value]) => value)] as (string | number | null)[]);
    if (!rows.length) throw new ApiError(404, "Your student profile could not be found.");
    return Response.json({ data: await readStudentProfile(scope) });
  } catch (error) { return apiError(error); }
}

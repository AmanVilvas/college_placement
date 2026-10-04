import { apiError, ApiError, currentProfile, developmentDatabaseQuery } from "@/lib/server/supabase";

const staffRoles = new Set(["super_admin", "college_admin", "tpo", "coordinator", "admin-local"]);

export async function GET() {
  try {
    const { profile } = await currentProfile();
    if (!staffRoles.has(profile.role)) throw new ApiError(403, "Only placement staff can view event audience options.");
    if (!profile.institution_id || !profile.campus_id) throw new ApiError(400, "Placement office is not linked to a campus.");
    const rows = await developmentDatabaseQuery<{ id: string; full_name: string; roll_number: string; department: string }>(
      `select id, full_name, roll_number, department from public.student_profiles
       where institution_id=$1 and campus_id=$2 order by roll_number asc limit 2000`,
      [profile.institution_id, profile.campus_id],
    );
    return Response.json({ data: { students: rows, branches: [...new Set(rows.map((row) => row.department).filter(Boolean))].sort() } });
  } catch (error) { return apiError(error); }
}

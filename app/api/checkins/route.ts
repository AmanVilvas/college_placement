import { z } from "zod";
import { apiError, ApiError, currentProfile, developmentDatabaseQuery } from "@/lib/server/supabase";

async function staff() {
  const { profile } = await currentProfile();
  if (!["super_admin", "college_admin", "tpo", "coordinator", "admin-local"].includes(profile.role)) throw new ApiError(403, "Only placement staff can manage drive-day check-ins.");
  if (!profile.institution_id || !profile.campus_id) throw new ApiError(400, "Placement office is not linked to a campus.");
  return profile;
}

export async function GET() {
  try {
    const profile = await staff();
    const rows = await developmentDatabaseQuery(
      `select x.application_id, x.checked_in, x.checked_in_at from public.drive_checkins x
       where x.institution_id = $1 and x.campus_id = $2`,
      [profile.institution_id, profile.campus_id],
    );
    return Response.json({ data: rows });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const profile = await staff();
    const input = z.object({ application_id: z.string().uuid(), checked_in: z.boolean() }).parse(await request.json());
    const application = await developmentDatabaseQuery<{ id: string }>(
      `select id from public.applications where id = $1 and institution_id = $2 and campus_id = $3 limit 1`,
      [input.application_id, profile.institution_id, profile.campus_id],
    );
    if (!application[0]) throw new ApiError(404, "Applicant not found for this campus.");
    const rows = await developmentDatabaseQuery(
      `insert into public.drive_checkins (institution_id, campus_id, application_id, checked_in, checked_in_at, checked_by)
       values ($1, $2, $3, $4, case when $4 then now() else null end, $5)
       on conflict (application_id) do update set checked_in = excluded.checked_in,
         checked_in_at = excluded.checked_in_at, checked_by = excluded.checked_by, updated_at = now()
       returning application_id, checked_in, checked_in_at`,
      [profile.institution_id, profile.campus_id, input.application_id, input.checked_in, profile.id === "admin-local" ? null : profile.id],
    );
    return Response.json({ data: rows }, { status: 200 });
  } catch (error) { return apiError(error); }
}

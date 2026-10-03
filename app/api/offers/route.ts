import { z } from "zod";
import { apiError, ApiError, currentProfile, developmentDatabaseQuery } from "@/lib/server/supabase";

async function staff() {
  const { profile } = await currentProfile();
  if (!["super_admin", "college_admin", "tpo", "coordinator", "admin-local"].includes(profile.role)) throw new ApiError(403, "Only placement staff can manage offers.");
  if (!profile.institution_id || !profile.campus_id) throw new ApiError(400, "Placement office is not linked to a campus.");
  return profile;
}

export async function GET() {
  try {
    const profile = await staff();
    const rows = await developmentDatabaseQuery(
      `select o.*, a.student_id, a.drive_id, s.full_name as student_name, s.roll_number,
              d.role_title, d.company_id, c.name as company_name
       from public.offers o join public.applications a on a.id = o.application_id
       join public.student_profiles s on s.id = a.student_id join public.drives d on d.id = a.drive_id
       join public.companies c on c.id = d.company_id
       where o.institution_id = $1 and o.campus_id = $2 order by o.created_at desc`,
      [profile.institution_id, profile.campus_id],
    );
    return Response.json({ data: rows });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const profile = await staff();
    const input = z.object({ application_id: z.string().uuid(), package_lpa: z.number().finite().nonnegative().max(1000), deadline: z.string().date().nullable().optional() }).parse(await request.json());
    const applications = await developmentDatabaseQuery<{ id: string }>(
      `select id from public.applications where id = $1 and institution_id = $2 and campus_id = $3 limit 1`,
      [input.application_id, profile.institution_id, profile.campus_id],
    );
    if (!applications[0]) throw new ApiError(404, "Application not found for this campus.");
    const rows = await developmentDatabaseQuery(
      `insert into public.offers (institution_id, campus_id, application_id, status, package_lpa, details)
       values ($1, $2, $3, 'Draft', $4, $5::jsonb) returning *`,
      [profile.institution_id, profile.campus_id, input.application_id, input.package_lpa, JSON.stringify({ deadline: input.deadline || null })],
    );
    return Response.json({ data: rows }, { status: 201 });
  } catch (error) { return apiError(error); }
}

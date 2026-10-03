import { z } from "zod";
import { apiError, ApiError, currentProfile, developmentDatabaseQuery } from "@/lib/server/supabase";

async function staff() {
  const { profile } = await currentProfile();
  if (!["super_admin", "college_admin", "tpo", "coordinator", "admin-local"].includes(profile.role)) throw new ApiError(403, "Only placement staff can manage recruiter contacts.");
  if (!profile.institution_id || !profile.campus_id) throw new ApiError(400, "Placement office is not linked to a campus.");
  return profile;
}

export async function GET() {
  try {
    const profile = await staff();
    const rows = await developmentDatabaseQuery(
      `select r.*, c.name as company_name,
         coalesce((select string_agg(e.notes, E'\\n' order by e.happened_at desc) from public.employer_interactions e where e.company_id = r.company_id and e.institution_id = r.institution_id and e.campus_id = r.campus_id), r.notes, '') as interaction_notes
       from public.recruiter_contacts r join public.companies c on c.id = r.company_id
       where r.institution_id = $1 and r.campus_id = $2 order by r.created_at desc`,
      [profile.institution_id, profile.campus_id],
    );
    return Response.json({ data: rows });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const profile = await staff();
    const input = z.object({
      company_id: z.string().uuid(), name: z.string().trim().min(1).max(160),
      email: z.string().trim().email().max(254), next_follow_up: z.string().date().nullable().optional(),
    }).parse(await request.json());
    const company = await developmentDatabaseQuery<{ id: string }>(
      `select id from public.companies where id = $1 and institution_id = $2 and campus_id = $3 and archived = false limit 1`,
      [input.company_id, profile.institution_id, profile.campus_id],
    );
    if (!company[0]) throw new ApiError(404, "Company not found for this campus.");
    const rows = await developmentDatabaseQuery(
      `insert into public.recruiter_contacts (institution_id, campus_id, company_id, name, email, next_follow_up)
       values ($1, $2, $3, $4, $5, $6) returning *`,
      [profile.institution_id, profile.campus_id, input.company_id, input.name, input.email, input.next_follow_up || null],
    );
    return Response.json({ data: rows }, { status: 201 });
  } catch (error) { return apiError(error); }
}

import { z } from "zod";
import { apiError, ApiError, currentProfile, developmentDatabaseQuery } from "@/lib/server/supabase";

export async function POST(request: Request) {
  try {
    const { profile } = await currentProfile();
    if (!["super_admin", "college_admin", "tpo", "coordinator", "admin-local"].includes(profile.role)) throw new ApiError(403, "Only placement staff can log employer interactions.");
    if (!profile.institution_id || !profile.campus_id) throw new ApiError(400, "Placement office is not linked to a campus.");
    const input = z.object({ company_id: z.string().uuid(), kind: z.string().trim().min(1).max(80).default("Follow-up"), notes: z.string().trim().min(1).max(4000) }).parse(await request.json());
    const company = await developmentDatabaseQuery<{ id: string }>(
      `select id from public.companies where id = $1 and institution_id = $2 and campus_id = $3 and archived = false limit 1`,
      [input.company_id, profile.institution_id, profile.campus_id],
    );
    if (!company[0]) throw new ApiError(404, "Company not found for this campus.");
    const rows = await developmentDatabaseQuery(
      `insert into public.employer_interactions (institution_id, campus_id, company_id, actor_id, kind, notes)
       values ($1, $2, $3, $4, $5, $6) returning *`,
      [profile.institution_id, profile.campus_id, input.company_id, profile.id === "admin-local" ? null : profile.id, input.kind, input.notes],
    );
    return Response.json({ data: rows }, { status: 201 });
  } catch (error) { return apiError(error); }
}

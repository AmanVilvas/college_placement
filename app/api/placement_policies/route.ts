import { z } from "zod";
import { apiError, ApiError, currentProfile, developmentDatabaseQuery } from "@/lib/server/supabase";

async function staff() {
  const { profile } = await currentProfile();
  if (!["super_admin", "college_admin", "tpo", "coordinator", "admin-local"].includes(profile.role)) throw new ApiError(403, "Only placement staff can manage placement policies.");
  if (!profile.institution_id || !profile.campus_id) throw new ApiError(400, "Placement office is not linked to a campus.");
  return profile;
}

export async function GET() {
  try {
    const profile = await staff();
    const rows = await developmentDatabaseQuery(
      `select id, name, rules, active, updated_at from public.placement_policies
       where institution_id = $1 and campus_id = $2 and name = 'Campus placement rules'
       order by updated_at desc limit 1`,
      [profile.institution_id, profile.campus_id],
    );
    return Response.json({ data: rows });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const profile = await staff();
    const input = z.object({ rules: z.object({
      maxAppsPerDay: z.number().int().min(1).max(20), minCGPA: z.number().min(0).max(10), noActiveBacklogs: z.boolean(),
      blockAfterPlacement: z.boolean(), dreamThresholdLPA: z.number().min(0).max(1000),
    }) }).parse(await request.json());
    const existing = await developmentDatabaseQuery<{ id: string }>(
      `select id from public.placement_policies where institution_id=$1 and campus_id=$2 and name='Campus placement rules' order by updated_at desc limit 1`,
      [profile.institution_id, profile.campus_id],
    );
    const rows = existing[0]
      ? await developmentDatabaseQuery(
          `update public.placement_policies set rules=$1::jsonb, active=true, updated_by=$2, updated_at=now()
           where id=$3 and institution_id=$4 and campus_id=$5 returning id, name, rules, active, updated_at`,
          [JSON.stringify(input.rules), profile.id === "admin-local" ? null : profile.id, existing[0].id, profile.institution_id, profile.campus_id],
        )
      : await developmentDatabaseQuery(
          `insert into public.placement_policies (institution_id, campus_id, name, rules, active, updated_by)
           values ($1,$2,'Campus placement rules',$3::jsonb,true,$4) returning id, name, rules, active, updated_at`,
          [profile.institution_id, profile.campus_id, JSON.stringify(input.rules), profile.id === "admin-local" ? null : profile.id],
        );
    return Response.json({ data: rows });
  } catch (error) { return apiError(error); }
}

import { z } from "zod";
import { apiError, ApiError, currentProfile, developmentDatabaseQuery } from "@/lib/server/supabase";

const updateInput = z.object({
  round: z.string().trim().min(1).max(120).optional(),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional(),
  location: z.string().trim().max(300).nullable().optional(),
  meeting_url: z.string().trim().url().max(1000).nullable().optional(),
  status: z.enum(["Scheduled", "Completed", "Cancelled"]).optional(),
}).refine((value) => Object.keys(value).length > 0, "Provide at least one interview field.");

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { profile } = await currentProfile();
    if (!["super_admin", "college_admin", "tpo", "coordinator", "admin-local"].includes(profile.role)) {
      throw new ApiError(403, "Only placement staff can manage interviews.");
    }
    if (!profile.institution_id || !profile.campus_id) throw new ApiError(400, "Placement office is not linked to a campus.");
    const { id } = await context.params;
    const input = updateInput.parse(await request.json());
    const existing = await developmentDatabaseQuery<{ starts_at: string; ends_at: string; location: string | null; status: string }>(
      `select starts_at, ends_at, location, status from public.interviews where id = $1 and institution_id = $2 and campus_id = $3 limit 1`,
      [id, profile.institution_id, profile.campus_id],
    );
    if (!existing[0]) throw new ApiError(404, "Interview not found for this campus.");
    const starts = input.starts_at ?? existing[0].starts_at;
    const ends = input.ends_at ?? existing[0].ends_at;
    if (new Date(ends) <= new Date(starts)) throw new ApiError(400, "Interview end time must be after the start time.");
    const location = input.location === undefined ? existing[0].location : input.location;
    const status = input.status ?? existing[0].status;
    if (location && status === "Scheduled") {
      const conflict = await developmentDatabaseQuery<{ id: string }>(
        `select id from public.interviews where institution_id = $1 and campus_id = $2 and id <> $3
           and lower(coalesce(location, '')) = lower($4) and status = 'Scheduled' and starts_at < $6 and ends_at > $5 limit 1`,
        [profile.institution_id, profile.campus_id, id, location, starts, ends],
      );
      if (conflict[0]) throw new ApiError(409, "That room or meeting location is already booked for this time.");
    }
    const fields = Object.entries(input);
    const values: unknown[] = [];
    const assignments = fields.map(([column, value]) => { values.push(value); return `${column} = $${values.length}`; });
    values.push(id, profile.institution_id, profile.campus_id);
    const rows = await developmentDatabaseQuery(
      `update public.interviews set ${assignments.join(", ")} where id = $${values.length - 2} and institution_id = $${values.length - 1} and campus_id = $${values.length} returning *`,
      values as (string | null)[],
    );
    return Response.json({ data: rows });
  } catch (error) { return apiError(error); }
}

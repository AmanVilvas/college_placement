import { z } from "zod";
import { apiError, ApiError, currentProfile, developmentDatabaseQuery } from "@/lib/server/supabase";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { profile } = await currentProfile();
    if (!["super_admin", "college_admin", "tpo", "coordinator", "admin-local"].includes(profile.role)) throw new ApiError(403, "Only placement staff can update assessments.");
    if (!profile.institution_id || !profile.campus_id) throw new ApiError(400, "Placement office is not linked to a campus.");
    const input = z.object({ status: z.enum(["Draft", "Published"]) }).parse(await request.json());
    const { id } = await context.params;
    const existing = await developmentDatabaseQuery<{ outline: Record<string, unknown> }>(
      `select outline from public.assessments where id=$1 and institution_id=$2 and campus_id=$3 limit 1`,
      [id, profile.institution_id, profile.campus_id],
    );
    if (!existing[0]) throw new ApiError(404, "Assessment not found for this campus.");
    const outline = { ...existing[0].outline, status: input.status,
      ...(input.status === "Published" ? { publishedAt: new Date().toISOString() } : { publishedAt: null }) };
    const rows = await developmentDatabaseQuery(
      `update public.assessments set outline=$1::jsonb where id=$2 and institution_id=$3 and campus_id=$4
       returning id, title, kind, outline, created_at`,
      [JSON.stringify(outline), id, profile.institution_id, profile.campus_id],
    );
    return Response.json({ data: rows });
  } catch (error) { return apiError(error); }
}

import { z } from "zod";
import { apiError, ApiError, currentProfile, developmentDatabaseQuery } from "@/lib/server/supabase";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { profile } = await currentProfile();
    if (!["super_admin", "college_admin", "tpo", "coordinator", "admin-local"].includes(profile.role)) throw new ApiError(403, "Only placement staff can manage offers.");
    if (!profile.institution_id || !profile.campus_id) throw new ApiError(400, "Placement office is not linked to a campus.");
    const { id } = await context.params;
    const input = z.object({ status: z.enum(["Draft", "Released", "Viewed", "Accepted", "Rejected", "Joined"]) }).parse(await request.json());
    const rows = await developmentDatabaseQuery(
      `update public.offers set status = $1, responded_at = case when $1 in ('Accepted', 'Rejected', 'Joined') then now() else responded_at end
       where id = $2 and institution_id = $3 and campus_id = $4 returning *`,
      [input.status, id, profile.institution_id, profile.campus_id],
    );
    if (!rows.length) throw new ApiError(404, "Offer not found for this campus.");
    return Response.json({ data: rows });
  } catch (error) { return apiError(error); }
}

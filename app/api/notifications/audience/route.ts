import { ApiError, apiError, currentProfile } from "@/lib/server/supabase";
import { broadcastAudienceSchema, loadBroadcastAudience, validateBroadcastAudience } from "@/lib/server/broadcastAudience";

export async function GET(request: Request) {
  try {
    const { profile } = await currentProfile();
    if (!["super_admin", "college_admin", "tpo", "coordinator", "admin-local"].includes(profile.role)) throw new ApiError(403, "Only placement staff can preview broadcast recipients.");
    if (!profile.institution_id || !profile.campus_id) throw new ApiError(400, "Your account is not linked to a campus.");
    const input = broadcastAudienceSchema.parse(Object.fromEntries([...new URL(request.url).searchParams].filter(([, value]) => value !== "")));
    try { validateBroadcastAudience(input); } catch (error) { throw new ApiError(400, (error as Error).message); }
    const students = await loadBroadcastAudience(profile, input);
    return Response.json({ data: students }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

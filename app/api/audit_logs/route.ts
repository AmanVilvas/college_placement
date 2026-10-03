import { apiError, ApiError, currentProfile, developmentDatabaseQuery } from "@/lib/server/supabase";

export async function GET() {
  try {
    const { profile } = await currentProfile();
    if (!["super_admin", "college_admin", "tpo", "coordinator", "admin-local"].includes(profile.role)) throw new ApiError(403, "Only placement staff can view the audit trail.");
    if (!profile.institution_id || !profile.campus_id) throw new ApiError(400, "Placement office is not linked to a campus.");
    const rows = await developmentDatabaseQuery<{ id: string; action: string; entity_type: string; entity_id: string | null; changes: Record<string, unknown>; created_at: string }>(
      `select id, action, entity_type, entity_id, changes, created_at from public.audit_logs
       where institution_id=$1 and campus_id=$2 order by created_at desc limit 200`,
      [profile.institution_id, profile.campus_id],
    );
    return Response.json({ data: rows.map((row) => ({ id: row.id, action: `${row.action.toUpperCase()} ${row.entity_type}${row.entity_id ? ` (${row.entity_id})` : ""}`,
      at: row.created_at, changes: row.changes })) });
  } catch (error) { return apiError(error); }
}

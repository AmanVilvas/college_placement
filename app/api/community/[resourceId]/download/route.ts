import { ApiError, apiError, currentProfile, developmentDatabaseQuery } from "@/lib/server/supabase";
import { eligibleDriveSql } from "@/lib/server/companyCommunity";

export const runtime = "nodejs";
const staffRoles = new Set(["super_admin", "college_admin", "tpo", "coordinator", "admin-local"]);

export async function GET(_request: Request, context: { params: Promise<{ resourceId: string }> }) {
  try {
    const { user, profile } = await currentProfile();
    if (!profile.institution_id || !profile.campus_id) throw new ApiError(400, "Your account is not linked to a campus.");
    const { resourceId } = await context.params;
    const staff = staffRoles.has(profile.role);
    if (!staff && profile.role !== "student") throw new ApiError(403, "Your account cannot download community resources.");
    const rows = await developmentDatabaseQuery<{ title: string; file_name: string; content_type: string; file_size: number; file_data: Buffer }>(
      `select r.title, r.file_name, r.content_type, r.file_size, r.file_data
       from placement_private.company_community_resources r
       where r.id=$1 and r.institution_id=$2 and r.campus_id=$3 and r.file_data is not null
         and (
           $4::boolean
           or exists(
             select 1 from public.student_profiles s
             where s.institution_id=$2 and s.campus_id=$3
               and (s.id::text=$5 or s.user_id::text=$5 or lower(s.roll_number)=lower($6))
               and (
                 (r.drive_id is not null and exists(
                   select 1 from public.drives d where d.id=r.drive_id and d.company_id=r.company_id
                     and d.institution_id=$2 and d.campus_id=$3 and ${eligibleDriveSql}
                 ))
                 or (r.drive_id is null and exists(
                   select 1 from public.drives d where d.company_id=r.company_id
                     and d.institution_id=$2 and d.campus_id=$3 and ${eligibleDriveSql}
                 ))
               )
           )
         ) limit 1`,
      [resourceId, profile.institution_id, profile.campus_id, staff, user.id, profile.roll_number ?? ""],
    );
    const resource = rows[0];
    if (!resource) throw new ApiError(404, "This file is unavailable for your account.");
    const filename = resource.file_name.replace(/[\r\n"\\]/g, "_");
    return new Response(new Uint8Array(resource.file_data), {
      headers: {
        "Content-Type": resource.content_type,
        "Content-Length": String(resource.file_size),
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(resource.file_name)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) { return apiError(error); }
}

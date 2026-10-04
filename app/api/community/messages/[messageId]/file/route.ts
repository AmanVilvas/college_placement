import { z } from "zod";
import { ApiError, apiError, currentProfile, developmentDatabaseQuery } from "@/lib/server/supabase";
import { eligibleDriveSql } from "@/lib/server/companyCommunity";

const staffRoles = new Set(["super_admin", "college_admin", "tpo", "coordinator", "admin-local"]);

export async function GET(_request: Request, context: RouteContext<"/api/community/messages/[messageId]/file">) {
  try {
    const { user, profile } = await currentProfile();
    const staff = staffRoles.has(profile.role);
    if (!staff && profile.role !== "student") throw new ApiError(403, "You cannot access this community attachment.");
    if (!profile.institution_id || !profile.campus_id) throw new ApiError(400, "Your account is not linked to a campus.");
    const { messageId } = await context.params;
    z.string().uuid().parse(messageId);
    const rows = await developmentDatabaseQuery<{ file_name: string; content_type: string; file_data: Buffer; company_id: string; drive_id: string | null }>(
      `select file_name,content_type,file_data,company_id,drive_id from placement_private.company_community_messages
       where id=$1 and institution_id=$2 and campus_id=$3 and file_data is not null limit 1`,
      [messageId, profile.institution_id, profile.campus_id],
    );
    const file = rows[0];
    if (!file) throw new ApiError(404, "Community attachment not found.");
    if (!staff) {
      const students = await developmentDatabaseQuery<{ id: string; department: string; cgpa: number | null; backlogs: number }>(
        `select id,department,cgpa,backlogs from public.student_profiles where institution_id=$1 and campus_id=$2
         and (id::text=$3 or user_id::text=$3 or lower(roll_number)=lower($4)) limit 1`,
        [profile.institution_id, profile.campus_id, user.id, typeof profile.roll_number === "string" ? profile.roll_number : ""],
      );
      const student = students[0];
      if (!student) throw new ApiError(403, "Your student account is not linked to a placement profile.");
      const eligibility = await developmentDatabaseQuery<{ allowed: boolean }>(
        `select exists(select 1 from public.drives d cross join public.student_profiles s
           where s.id=$1 and d.company_id=$2 and d.institution_id=$3 and d.campus_id=$4
             and ($5::uuid is null or d.id=$5) and ${eligibleDriveSql}) as allowed`,
        [student.id, file.company_id, profile.institution_id, profile.campus_id, file.drive_id],
      );
      if (!eligibility[0]?.allowed) throw new ApiError(403, "You are no longer eligible to access this attachment.");
    }
    const bytes = Buffer.isBuffer(file.file_data) ? file.file_data : Buffer.from(file.file_data as unknown as Uint8Array);
    const safeName = file.file_name.replace(/[\r\n"\\]/g, "_");
    return new Response(new Uint8Array(bytes), { headers: {
      "Content-Type": file.content_type || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Content-Length": String(bytes.length), "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store",
    } });
  } catch (error) { return apiError(error); }
}

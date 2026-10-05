import { z } from "zod";
import { ApiError, apiError, currentProfile, developmentDatabaseQuery } from "@/lib/server/supabase";
import { eligibleDriveSql } from "@/lib/server/companyCommunity";

const reactions = ["👍", "❤️", "😂", "👏", "🔥", "✅"] as const;

export async function POST(request: Request, context: RouteContext<"/api/community/messages/[messageId]/reactions">) {
  try {
    const { user, profile } = await currentProfile();
    if (profile.role !== "student") throw new ApiError(403, "Only students can react to community messages.");
    if (!profile.institution_id || !profile.campus_id) throw new ApiError(400, "Your account is not linked to a campus.");
    const { messageId } = await context.params;
    const isResource = messageId.startsWith("resource:");
    const targetId = z.string().uuid().parse(isResource ? messageId.slice("resource:".length) : messageId);
    const input = z.object({ emoji: z.enum(reactions) }).parse(await request.json());
    const students = await developmentDatabaseQuery<{ id: string; department: string; cgpa: number | null; backlogs: number }>(
      `select id,department,cgpa,backlogs from public.student_profiles where institution_id=$1 and campus_id=$2
       and (id::text=$3 or user_id::text=$3 or lower(roll_number)=lower($4)) limit 1`,
      [profile.institution_id, profile.campus_id, user.id, typeof profile.roll_number === "string" ? profile.roll_number : ""],
    );
    const student = students[0];
    if (!student) throw new ApiError(403, "Your student account is not linked to a placement profile.");
    const visible = await developmentDatabaseQuery<{ id: string }>(
      `select m.id from ${isResource ? "placement_private.company_community_resources" : "placement_private.company_community_messages"} m
       join public.companies c on c.id=m.company_id and c.archived=false
       where m.id=$1 and m.institution_id=$2 and m.campus_id=$3
         and (m.drive_id is null or exists(select 1 from public.drives d cross join public.student_profiles s
           where s.id=$4 and d.id=m.drive_id and d.company_id=m.company_id and d.institution_id=$2 and d.campus_id=$3 and ${eligibleDriveSql}))`,
      [targetId, profile.institution_id, profile.campus_id, student.id],
    );
    if (!visible[0]) throw new ApiError(404, "This message is not available for your account.");
    const table = isResource ? "placement_private.company_community_resource_reactions" : "placement_private.company_community_message_reactions";
    const targetColumn = isResource ? "resource_id" : "message_id";
    // The primary key makes concurrent submissions safe: a student's first reaction wins.
    const inserted = await developmentDatabaseQuery<{ emoji: string }>(
      `insert into ${table}(${targetColumn},student_id,emoji)
       values($1,$2,$3) on conflict(${targetColumn},student_id) do nothing returning emoji`,
      [targetId, student.id, input.emoji],
    );
    const saved = inserted[0] ?? (await developmentDatabaseQuery<{ emoji: string }>(
      `select emoji from ${table} where ${targetColumn}=$1 and student_id=$2`,
      [targetId, student.id],
    ))[0];
    if (!saved) throw new ApiError(404, "This message is no longer available.");
    return Response.json({ data: { messageId, emoji: saved.emoji, alreadyReacted: inserted.length === 0 } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

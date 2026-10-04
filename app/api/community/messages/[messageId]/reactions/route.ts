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
    z.string().uuid().parse(messageId);
    const input = z.object({ emoji: z.enum(reactions) }).parse(await request.json());
    const students = await developmentDatabaseQuery<{ id: string; department: string; cgpa: number | null; backlogs: number }>(
      `select id,department,cgpa,backlogs from public.student_profiles where institution_id=$1 and campus_id=$2
       and (id::text=$3 or user_id::text=$3 or lower(roll_number)=lower($4)) limit 1`,
      [profile.institution_id, profile.campus_id, user.id, typeof profile.roll_number === "string" ? profile.roll_number : ""],
    );
    const student = students[0];
    if (!student) throw new ApiError(403, "Your student account is not linked to a placement profile.");
    const visible = await developmentDatabaseQuery<{ id: string }>(
      `select m.id from placement_private.company_community_messages m
       join public.companies c on c.id=m.company_id and c.archived=false
       where m.id=$1 and m.institution_id=$2 and m.campus_id=$3
         and (m.drive_id is null or exists(select 1 from public.drives d cross join public.student_profiles s
           where s.id=$4 and d.id=m.drive_id and d.company_id=m.company_id and d.institution_id=$2 and d.campus_id=$3 and ${eligibleDriveSql}))
         and (m.drive_id is not null or exists(select 1 from public.drives d cross join public.student_profiles s
           where s.id=$4 and d.company_id=m.company_id and d.institution_id=$2 and d.campus_id=$3 and ${eligibleDriveSql}))`,
      [messageId, profile.institution_id, profile.campus_id, student.id],
    );
    if (!visible[0]) throw new ApiError(404, "This message is not available in your eligible company groups.");
    const previous = await developmentDatabaseQuery<{ emoji: string }>(
      `select emoji from placement_private.company_community_message_reactions where message_id=$1 and student_id=$2 limit 1`,
      [messageId, student.id],
    );
    if (previous[0]?.emoji === input.emoji) {
      await developmentDatabaseQuery(`delete from placement_private.company_community_message_reactions where message_id=$1 and student_id=$2`, [messageId, student.id]);
      return Response.json({ data: { messageId, emoji: input.emoji, removed: true } }, { headers: { "Cache-Control": "private, no-store" } });
    }
    await developmentDatabaseQuery(
      `insert into placement_private.company_community_message_reactions(message_id,student_id,emoji)
       values($1,$2,$3) on conflict(message_id,student_id) do update set emoji=excluded.emoji,created_at=now()`,
      [messageId, student.id, input.emoji],
    );
    return Response.json({ data: { messageId, emoji: input.emoji, removed: false } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

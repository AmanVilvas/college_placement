import { z } from "zod";
import { ApiError, apiError, currentProfile, developmentDatabaseQuery } from "@/lib/server/supabase";
import { eligibleDriveSql } from "@/lib/server/companyCommunity";

export async function POST(request: Request, context: RouteContext<"/api/community/messages/[messageId]/vote">) {
  try {
    const { user, profile } = await currentProfile();
    if (profile.role !== "student") throw new ApiError(403, "Only eligible students can vote in community polls.");
    if (!profile.institution_id || !profile.campus_id) throw new ApiError(400, "Your account is not linked to a campus.");
    const { messageId } = await context.params;
    z.string().uuid().parse(messageId);
    const input = z.object({ optionIndex: z.number().int().min(0).max(7) }).parse(await request.json());
    const students = await developmentDatabaseQuery<{ id: string; department: string; cgpa: number | null; backlogs: number }>(
      `select id,department,cgpa,backlogs from public.student_profiles where institution_id=$1 and campus_id=$2
       and (id::text=$3 or user_id::text=$3 or lower(roll_number)=lower($4)) limit 1`,
      [profile.institution_id, profile.campus_id, user.id, typeof profile.roll_number === "string" ? profile.roll_number : ""],
    );
    const student = students[0];
    if (!student) throw new ApiError(403, "Your student account is not linked to a placement profile.");
    const polls = await developmentDatabaseQuery<{ id: string; drive_id: string | null; company_id: string; options: string[] }>(
      `select m.id,m.drive_id,m.company_id,m.poll_options as options from placement_private.company_community_messages m
       join public.companies c on c.id=m.company_id and c.archived=false
       where m.id=$1 and m.institution_id=$2 and m.campus_id=$3 and m.message_type='poll'
       and (m.drive_id is null or exists(select 1 from public.drives d cross join public.student_profiles s
          where s.id=$4 and d.id=m.drive_id and d.company_id=m.company_id and d.institution_id=$2 and d.campus_id=$3 and ${eligibleDriveSql}))
       and (m.drive_id is not null or exists(select 1 from public.drives d cross join public.student_profiles s
          where s.id=$4 and d.company_id=m.company_id and d.institution_id=$2 and d.campus_id=$3 and ${eligibleDriveSql}))`,
      [messageId, profile.institution_id, profile.campus_id, student.id],
    );
    const poll = polls[0];
    if (!poll) throw new ApiError(404, "This poll is not available in your eligible company groups.");
    if (input.optionIndex >= poll.options.length) throw new ApiError(400, "Choose one of the available poll options.");
    await developmentDatabaseQuery(
      `insert into placement_private.company_community_poll_votes(message_id,student_id,option_index)
       values($1,$2,$3) on conflict(message_id,student_id) do update set option_index=excluded.option_index,created_at=now()`,
      [messageId, student.id, input.optionIndex],
    );
    return Response.json({ data: { messageId, optionIndex: input.optionIndex } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

import { z } from "zod";
import { ApiError, apiError, currentProfile, developmentDatabaseQuery } from "@/lib/server/supabase";
import { deliverBatch } from "@/lib/server/message-delivery";

export const runtime = "nodejs";

const staffRoles = new Set(["super_admin", "college_admin", "tpo", "coordinator", "admin-local"]);
const followUpSchema = z.object({
  driveId: z.string().uuid(),
  studentId: z.string().uuid(),
  channels: z.object({ email: z.boolean().default(true), whatsapp: z.boolean().default(false) })
    .default({ email: true, whatsapp: false })
    .refine((channels) => channels.email || channels.whatsapp, "Choose at least one channel."),
});

async function requirePlacementOffice() {
  const { profile } = await currentProfile();
  if (!staffRoles.has(profile.role)) throw new ApiError(403, "Only placement staff can manage follow-ups.");
  if (!profile.institution_id || !profile.campus_id) throw new ApiError(400, "Placement office is not linked to a campus.");
  return profile;
}

export async function GET() {
  try {
    const profile = await requirePlacementOffice();
    const rows = await developmentDatabaseQuery(
      `with candidates as (
         select s.id as student_id, s.full_name as student_name, s.roll_number as student_roll_number,
                s.department as student_branch, s.section as student_section, s.phone as student_phone,
                d.id as drive_id, d.role_title as drive_name, d.application_deadline,
                c.id as company_id, c.name as company_name, a.id as application_id, coalesce(a.status, 'Not Responded') as status,
                count(f.id)::int as follow_up_count
         from public.drives d
         join public.companies c on c.id = d.company_id
         join public.student_profiles s on s.institution_id = d.institution_id and s.campus_id = d.campus_id
         left join public.applications a on a.drive_id = d.id and a.student_id = s.id
         left join public.follow_up_events f on f.drive_id = d.id and f.student_id = s.id
         where d.institution_id = $1 and d.campus_id = $2
           and d.status in ('Open', 'Closing Soon')
           and (d.application_deadline is null or d.application_deadline >= current_date)
           and case when jsonb_typeof(d.eligibility->'branches') = 'array'
             then jsonb_array_length(d.eligibility->'branches') = 0 or d.eligibility->'branches' ? s.department
             else true end
           and coalesce(nullif(d.eligibility->>'minCGPA', '')::numeric, 0) <= coalesce(s.cgpa, 0)
           and coalesce(nullif(d.eligibility->>'maxBacklogs', '')::integer, 2147483647) >= coalesce(s.backlogs, 0)
         group by s.id, d.id, c.id, c.name, a.id, s.phone
       )
       select * from candidates where application_id is null or status in ('Applied','Not Responded','Shortlisted','Assessment','Interview')
       order by case status when 'Not Responded' then 0 when 'Shortlisted' then 1 else 2 end, application_deadline asc nulls last, student_name asc
       limit 2000`,
      [profile.institution_id, profile.campus_id],
    );
    return Response.json({ data: rows });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const profile = await requirePlacementOffice();
    const input = followUpSchema.parse(await request.json());
    const recipients = await developmentDatabaseQuery<{
      student_id: string; user_id: string | null; student_name: string; email: string | null; phone: string | null;
      drive_id: string; drive_name: string; company_name: string; application_id: string | null; official_apply_link: string | null;
    }>(
      `select s.id as student_id, s.user_id, s.full_name as student_name,
              coalesce(s.email, p.email) as email, coalesce(s.phone, '') as phone,
              d.id as drive_id, d.role_title as drive_name, c.name as company_name,
              a.id as application_id, d.official_apply_link
       from public.student_profiles s
       join public.drives d on d.id = $1 and d.institution_id = s.institution_id and d.campus_id = s.campus_id
       join public.companies c on c.id = d.company_id
       left join public.profiles p on p.id = s.user_id
       left join public.applications a on a.drive_id = d.id and a.student_id = s.id
       where s.id = $2 and s.institution_id = $3 and s.campus_id = $4
         and d.status in ('Open', 'Closing Soon')
         and (d.application_deadline is null or d.application_deadline >= current_date)
         and case when jsonb_typeof(d.eligibility->'branches') = 'array'
           then jsonb_array_length(d.eligibility->'branches') = 0 or d.eligibility->'branches' ? s.department
           else true end
         and coalesce(nullif(d.eligibility->>'minCGPA', '')::numeric, 0) <= coalesce(s.cgpa, 0)
         and coalesce(nullif(d.eligibility->>'maxBacklogs', '')::integer, 2147483647) >= coalesce(s.backlogs, 0)
       limit 1`,
      [input.driveId, input.studentId, profile.institution_id, profile.campus_id],
    );
    const recipient = recipients[0];
    if (!recipient) throw new ApiError(404, "Eligible student or active drive was not found for this campus.");
    const title = `Placement reminder: ${recipient.company_name} — ${recipient.drive_name}`;
    const message = `Hello ${recipient.student_name}, this is a reminder to review the ${recipient.drive_name} opportunity with ${recipient.company_name}. Complete the external application if required, then confirm your participation in the student portal.${recipient.official_apply_link ? `\n\nOfficial application link: ${recipient.official_apply_link}` : ""}`;
    const delivery = await deliverBatch([{ name: recipient.student_name, email: recipient.email, phone: recipient.phone }], input.channels, title, message);
    const saved = await developmentDatabaseQuery<{ id: string }>(
      `insert into public.follow_up_events (institution_id, campus_id, drive_id, student_id, application_id, channels, delivery_result)
       values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb) returning id`,
      [profile.institution_id, profile.campus_id, recipient.drive_id, recipient.student_id, recipient.application_id,
        JSON.stringify(input.channels), JSON.stringify(delivery)],
    );
    const followUpId = saved[0]?.id;
    if (followUpId) {
      await developmentDatabaseQuery(
        `insert into public.notifications (institution_id, campus_id, user_id, student_id, title, message, category, metadata)
         values ($1, $2, $3, $4, $5, $6, 'Placement update', $7::jsonb)`,
        [profile.institution_id, profile.campus_id, recipient.user_id, recipient.student_id, title, message,
          JSON.stringify({ companyName: recipient.company_name, driveId: recipient.drive_id, followUpId, channels: input.channels, delivery })],
      );
    }
    return Response.json({ data: { id: followUpId, delivery, inAppNotificationCreated: Boolean(followUpId) } }, { status: 201 });
  } catch (error) { return apiError(error); }
}

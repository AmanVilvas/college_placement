import { z } from "zod";
import { apiError, ApiError, currentProfile, developmentDatabaseQuery } from "@/lib/server/supabase";
import { deliverBatch, sendEmail } from "@/lib/server/message-delivery";
import { sendBulkEmails } from "@/lib/server/bulkEmail";
import { broadcastAudienceSchema, loadBroadcastAudience, validateBroadcastAudience } from "@/lib/server/broadcastAudience";

export const runtime = "nodejs";

const schema = z.discriminatedUnion("action", [
  broadcastAudienceSchema.extend({ action: z.literal("broadcast"), title: z.string().trim().min(3).max(180), message: z.string().trim().min(5).max(5000), category: z.enum(["Company announcement", "Industry talk", "Placement update", "General notice"]), companyName: z.string().trim().max(120).optional(), studentIds: z.array(z.string().uuid()).min(1).max(2000).optional(), channels: z.object({ email: z.boolean(), whatsapp: z.boolean() }), cc: z.array(z.string().trim().email()).max(20).default([]), bcc: z.array(z.string().trim().email()).max(20).default([]) }),
  z.object({ action: z.literal("shortlist"), applicationId: z.string().uuid(), roundDetails: z.string().trim().max(2000).optional() }),
  z.object({ action: z.literal("application_status"), applicationId: z.string().uuid(), status: z.enum(["Eligible", "Interested", "Applied", "Confirmed", "Shortlisted", "Assessment", "Interview", "Selected", "Placed", "Rejected", "Not Responded"]) }),
]);
const administrators = new Set(["super_admin", "college_admin", "tpo", "coordinator", "admin-local"]);

export async function GET() {
  try {
    const { profile } = await currentProfile();
    if (profile.role !== "student") throw new ApiError(403, "Only students can view their notifications.");
    if (!profile.institution_id || !profile.campus_id) throw new ApiError(400, "Your student account is not linked to a campus.");
    const students = await developmentDatabaseQuery<{ id: string; user_id: string | null }>(
      `select id, user_id from public.student_profiles where institution_id=$1 and campus_id=$2
       and (id::text=$3 or user_id::text=$3 or lower(roll_number)=lower($4)) limit 1`,
      [profile.institution_id, profile.campus_id, profile.id, profile.roll_number ?? ""],
    );
    const student = students[0];
    if (!student) throw new ApiError(403, "This student account is not linked to a placement profile.");
    const rows = await developmentDatabaseQuery<{ id: string; title: string; message: string; category: string; read_at: string | null; metadata: Record<string, unknown> | null; created_at: string }>(
      `select id, title, message, category, read_at, metadata, created_at from public.notifications
       where institution_id=$1 and campus_id=$2 and
         (student_id=$3 or ($4::uuid is not null and user_id=$4))
       order by created_at desc limit 500`,
      [profile.institution_id, profile.campus_id, student.id, student.user_id],
    );
    return Response.json({ data: rows.map((row) => ({ id: row.id, title: row.title, message: row.message, category: row.category,
      read: Boolean(row.read_at), readAt: row.read_at, createdAt: row.created_at,
      companyName: row.metadata?.companyName, driveId: row.metadata?.driveId,
      communityCompanyId: row.metadata?.source === "community" ? row.metadata?.companyId : undefined })) },
      { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const { profile } = await currentProfile();
    if (profile.role !== "student") throw new ApiError(403, "Only students can update their notifications.");
    if (!profile.institution_id || !profile.campus_id) throw new ApiError(400, "Your student account is not linked to a campus.");
    const input = z.object({ id: z.string().uuid(), read: z.boolean().default(true) }).parse(await request.json());
    const students = await developmentDatabaseQuery<{ id: string; user_id: string | null }>(
      `select id, user_id from public.student_profiles where institution_id=$1 and campus_id=$2
       and (id::text=$3 or user_id::text=$3 or lower(roll_number)=lower($4)) limit 1`,
      [profile.institution_id, profile.campus_id, profile.id, profile.roll_number ?? ""],
    );
    if (!students[0]) throw new ApiError(403, "This student account is not linked to a placement profile.");
    const rows = await developmentDatabaseQuery(
      `update public.notifications set read_at=case when $1 then coalesce(read_at,now()) else null end
       where id=$2 and institution_id=$3 and campus_id=$4 and
         (student_id=$5 or ($6::uuid is not null and user_id=$6)) returning id`,
      [input.read, input.id, profile.institution_id, profile.campus_id, students[0].id, students[0].user_id],
    );
    if (!rows.length) throw new ApiError(404, "Notification not found for this student.");
    return Response.json({ data: { id: input.id, read: input.read } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const { profile } = await currentProfile();
    if (!administrators.has(profile.role)) throw new ApiError(403, "Only placement administrators can send student notifications.");
    if (!profile.campus_id || !profile.institution_id) throw new ApiError(400, "Your admin account is not linked to a campus.");
    const input = schema.parse(await request.json());

    if (input.action === "application_status") {
      const rows = await developmentDatabaseQuery<{ id: string; status: string; notification_id: string }>(
        `with changed as (
           update public.applications a set status=$1, updated_at=now()
           where a.id=$2 and a.institution_id=$3 and a.campus_id=$4 and a.status is distinct from $1
           returning a.id, a.student_id, a.drive_id, a.status, a.institution_id, a.campus_id
         ), inserted_notification as (
           insert into public.notifications (institution_id, campus_id, user_id, student_id, title, message, category, metadata)
           select changed.institution_id, changed.campus_id, s.user_id, s.id,
             'Placement update: ' || changed.status,
             'Your application for ' || coalesce(c.name, 'this company') || ' — ' || coalesce(d.role_title, 'this drive') ||
               ' is now marked ' || changed.status || '. Check the placement portal for next steps.',
             'Placement update',
             jsonb_build_object('applicationId', changed.id, 'driveId', d.id, 'companyName', c.name, 'status', changed.status)
           from changed
           join public.student_profiles s on s.id=changed.student_id
           join public.drives d on d.id=changed.drive_id
           join public.companies c on c.id=d.company_id
           returning id
         )
         select changed.id, changed.status, inserted_notification.id as notification_id
         from changed cross join inserted_notification`,
        [input.status, input.applicationId, profile.institution_id, profile.campus_id],
      );
      if (!rows[0]) throw new ApiError(409, "No status change was made. Check that this application belongs to your campus and choose a different status.");
      const recipients = await developmentDatabaseQuery<{
        student_name: string; email: string | null; company_name: string; role_title: string;
      }>(
        `select s.full_name as student_name, coalesce(nullif(s.email, ''), p.email) as email,
                c.name as company_name, d.role_title
         from public.applications a
         join public.student_profiles s on s.id=a.student_id
         left join public.profiles p on p.id=s.user_id
         join public.drives d on d.id=a.drive_id
         join public.companies c on c.id=d.company_id
         where a.id=$1 and a.institution_id=$2 and a.campus_id=$3 limit 1`,
        [input.applicationId, profile.institution_id, profile.campus_id],
      );
      const recipient = recipients[0];
      let emailSent = false;
      let emailError: string | undefined;
      if (recipient?.email) {
        const subject = input.status === "Placed"
          ? `Congratulations on your placement at ${recipient.company_name}`
          : `Application update: ${recipient.company_name} — ${input.status}`;
        const greeting = recipient.student_name ? `Hello ${recipient.student_name},` : "Hello,";
        const message = input.status === "Placed"
          ? `${greeting}\n\nCongratulations! The placement office has marked your application for ${recipient.company_name} — ${recipient.role_title} as Placed.\n\nYou can view this update in My Applications in the student portal.\n\nPlacement Office`
          : `${greeting}\n\nThe placement office has updated your application for ${recipient.company_name} — ${recipient.role_title} to ${input.status}.\n\nYou can view this update in My Applications in the student portal. Contact the placement office if you need more information.\n\nPlacement Office`;
        try {
          await sendEmail(recipient.email, subject, message);
          emailSent = true;
        } catch (error) {
          emailError = error instanceof Error ? error.message : "Email delivery failed.";
        }
      } else {
        emailError = "No email address is saved for this student.";
      }
      return Response.json({ data: {
        applicationId: rows[0].id, status: rows[0].status, notificationId: rows[0].notification_id,
        notified: true, emailSent, emailError,
      } });
    }

    if (input.action === "broadcast") {
      try { validateBroadcastAudience(input); } catch (error) { throw new ApiError(400, (error as Error).message); }
      if (!input.channels.email && (input.cc.length || input.bcc.length)) throw new ApiError(400, "Enable email to use CC or BCC.");
      const students = await loadBroadcastAudience(profile, input, input.studentIds);
      const recipients = students.map((student) => ({ id: student.id, user_id: student.user_id, name: student.full_name || "Student",
        email: student.email, phone: student.phone }));
      if (!recipients.length) throw new ApiError(404, "No students matched this campus and audience.");
      const body = `${input.companyName ? `${input.companyName}\n\n` : ""}${input.message}`;
      const cc = [...new Set(input.cc.map((address) => address.toLowerCase()))];
      const bcc = [...new Set(input.bcc.map((address) => address.toLowerCase()))].filter((address) => !cc.includes(address));
      const emailResult = input.channels.email ? await sendBulkEmails(recipients.map((recipient) => ({ email: recipient.email, subject: input.title, message: body,
        cc: cc.filter((address) => address !== recipient.email?.toLowerCase()), bcc: bcc.filter((address) => address !== recipient.email?.toLowerCase()) }))) : { emailSent: 0, failures: [] };
      const whatsappResult = input.channels.whatsapp ? await deliverBatch(recipients, { email: false, whatsapp: true }, input.title, body) : { whatsappSent: 0, failures: [] };
      const result = { emailSent: emailResult.emailSent, whatsappSent: whatsappResult.whatsappSent, failures: [...emailResult.failures, ...whatsappResult.failures] };
      await recordNotifications(profile, recipients, input.title, input.message, input.category, { channels: input.channels, companyName: input.companyName,
        audienceFilter: input.audienceFilter, driveId: input.driveId });
      return Response.json({ data: { audience: recipients.length, ...result } });
    }

    const applications = await developmentDatabaseQuery<{ id: string; status: string; student_id: string; student_name: string; student_email: string | null; profile_email: string | null; phone: string | null; user_id: string | null; role_title: string; company_name: string }>(
      `select a.id, a.status, s.id as student_id, s.full_name as student_name, s.email as student_email, p.email as profile_email,
              s.phone, s.user_id, d.role_title, c.name as company_name
       from public.applications a join public.student_profiles s on s.id=a.student_id
       join public.drives d on d.id=a.drive_id join public.companies c on c.id=d.company_id
       left join public.profiles p on p.id=s.user_id
       where a.id=$1 and a.institution_id=$2 and a.campus_id=$3 limit 1`,
      [input.applicationId, profile.institution_id, profile.campus_id],
    );
    const application = applications[0];
    if (!application) throw new ApiError(404, "Application not found in your campus.");
    if (application.status.toLowerCase() !== "shortlisted") throw new ApiError(409, "The application must be marked Shortlisted before sending this notification.");
    const title = `Shortlisted: ${application.company_name || "Placement drive"}`;
    const message = `Congratulations ${application.student_name || ""}, you have been shortlisted for ${application.company_name || "the placement drive"}${application.role_title ? ` — ${application.role_title}` : ""}.${input.roundDetails ? `\n\nNext steps: ${input.roundDetails}` : " Please check the placement portal for next steps."}`;
    const recipients = [{ id: application.student_id, user_id: application.user_id, name: application.student_name || "Student",
      email: application.student_email || application.profile_email, phone: application.phone }];
    const result = await deliverBatch(recipients, { email: true, whatsapp: true }, title, message);
    await recordNotifications(profile, recipients, title, message, "Shortlist", { applicationId: input.applicationId });
    return Response.json({ data: { audience: 1, ...result } });
  } catch (error) { return apiError(error); }
}

async function recordNotifications(profile: { institution_id: string; campus_id: string }, recipients: { id: string; user_id: string | null }[], title: string, message: string, category: string, metadata: Record<string, unknown>) {
  await developmentDatabaseQuery(
    `insert into public.notifications (institution_id, campus_id, user_id, student_id, title, message, category, metadata)
     select $1, $2, rows.user_id, rows.student_id, $3, $4, $5, $6::jsonb
     from jsonb_to_recordset($7::jsonb) as rows(user_id uuid, student_id uuid)`,
    [profile.institution_id, profile.campus_id, title, message, category, JSON.stringify(metadata), JSON.stringify(recipients.map((recipient) => ({ user_id: recipient.user_id, student_id: recipient.id })))],
  );
}

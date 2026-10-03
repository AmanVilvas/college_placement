import { z } from "zod";
import { apiError, ApiError, currentProfile, developmentDatabaseQuery } from "@/lib/server/supabase";
import { deliverBatch } from "@/lib/server/message-delivery";

export const runtime = "nodejs";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("broadcast"), title: z.string().trim().min(3).max(180), message: z.string().trim().min(5).max(5000), category: z.enum(["Company announcement", "Industry talk", "Placement update", "General notice"]), companyName: z.string().trim().max(120).optional(), department: z.string().trim().max(50).optional(), channels: z.object({ email: z.boolean(), whatsapp: z.boolean() }).refine((value) => value.email || value.whatsapp, "Choose at least one delivery channel.") }),
  z.object({ action: z.literal("shortlist"), applicationId: z.string().uuid(), roundDetails: z.string().trim().max(2000).optional() }),
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
      companyName: row.metadata?.companyName, driveId: row.metadata?.driveId })) });
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

    if (input.action === "broadcast") {
      const students = await developmentDatabaseQuery<{ id: string; user_id: string | null; full_name: string; email: string | null; profile_email: string | null; phone: string | null }>(
        `select s.id, s.user_id, s.full_name, s.email, p.email as profile_email, s.phone
         from public.student_profiles s left join public.profiles p on p.id=s.user_id
         where s.institution_id=$1 and s.campus_id=$2 and ($3::text is null or s.department=$3)
         order by s.full_name asc`,
        [profile.institution_id, profile.campus_id, input.department || null],
      );
      const recipients = students.map((student) => ({ id: student.id, user_id: student.user_id, name: student.full_name || "Student",
        email: student.email || student.profile_email, phone: student.phone }));
      if (!recipients.length) throw new ApiError(404, "No students matched this campus and audience.");
      const result = await deliverBatch(recipients, input.channels, input.title, `${input.companyName ? `${input.companyName}\n\n` : ""}${input.message}`);
      await recordNotifications(profile, recipients, input.title, input.message, input.category, { channels: input.channels, companyName: input.companyName });
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

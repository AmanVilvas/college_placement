import { z } from "zod";
import { apiError, ApiError, currentProfile, databaseRequest } from "@/lib/server/supabase";
import { deliverBatch } from "@/lib/server/message-delivery";

export const runtime = "nodejs";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("broadcast"), title: z.string().trim().min(3).max(180), message: z.string().trim().min(5).max(5000), category: z.enum(["Company announcement", "Industry talk", "Placement update", "General notice"]), companyName: z.string().trim().max(120).optional(), department: z.string().trim().max(50).optional(), channels: z.object({ email: z.boolean(), whatsapp: z.boolean() }).refine((value) => value.email || value.whatsapp, "Choose at least one delivery channel.") }),
  z.object({ action: z.literal("shortlist"), applicationId: z.string().uuid(), roundDetails: z.string().trim().max(2000).optional() }),
]);

const administrators = new Set(["super_admin", "college_admin", "tpo", "coordinator"]);

export async function POST(request: Request) {
  try {
    const { profile } = await currentProfile();
    if (!administrators.has(profile.role)) throw new ApiError(403, "Only placement administrators can send student notifications.");
    if (!profile.campus_id || !profile.institution_id) throw new ApiError(400, "Your admin account is not linked to a campus.");
    const input = schema.parse(await request.json());

    if (input.action === "broadcast") {
      const filters = new URLSearchParams({
        select: "id,user_id,full_name,email,phone,department,profiles(email)",
        campus_id: `eq.${profile.campus_id}`, institution_id: `eq.${profile.institution_id}`,
        order: "full_name.asc", limit: "1000",
      });
      if (input.department) filters.set("department", `eq.${input.department}`);
      const directoryRows: Record<string, unknown>[] = [];
      for (let offset = 0; ; offset += 1000) {
        filters.set("offset", String(offset));
        const { body } = await databaseRequest(`student_profiles?${filters}`);
        const page = Array.isArray(body) ? body as Record<string, unknown>[] : [];
        directoryRows.push(...page);
        if (page.length < 1000) break;
      }
      const recipients = directoryRows.map((student) => ({
        id: student.id as string, user_id: student.user_id as string | null,
        name: String(student.full_name || "Student"), email: String(student.email || (student.profiles as { email?: string } | null)?.email || "") || null,
        phone: String(student.phone || "") || null,
      }));
      if (!recipients.length) throw new ApiError(404, "No students matched this campus and audience.");
      const result = await deliverBatch(recipients, input.channels, input.title, `${input.companyName ? `${input.companyName}\n\n` : ""}${input.message}`);
      await recordNotifications(profile, recipients, input.title, input.message, input.category, { channels: input.channels, companyName: input.companyName }).catch((error) => console.error("Could not save notification feed entries:", error));
      return Response.json({ data: { audience: recipients.length, ...result } });
    }

    const query = new URLSearchParams({
      select: "id,status,student_profiles(id,user_id,full_name,email,phone,profiles(email)),drives(role_title,companies(name))",
      id: `eq.${input.applicationId}`, campus_id: `eq.${profile.campus_id}`, institution_id: `eq.${profile.institution_id}`, limit: "1",
    });
    const { body } = await databaseRequest(`applications?${query}`);
    const application = Array.isArray(body) ? body[0] : null;
    if (!application) throw new ApiError(404, "Application not found in your campus.");
    if (String(application.status).toLowerCase() !== "shortlisted") throw new ApiError(409, "The application must be marked Shortlisted before sending this notification.");
    const student = application.student_profiles as Record<string, unknown> | null;
    if (!student) throw new ApiError(404, "Student record not found.");
    const company = application.drives as { role_title?: string; companies?: { name?: string } } | null;
    const title = `Shortlisted: ${company?.companies?.name || "Placement drive"}`;
    const message = `Congratulations ${String(student.full_name || "")}, you have been shortlisted for ${company?.companies?.name || "the placement drive"}${company?.role_title ? ` — ${company.role_title}` : ""}.${input.roundDetails ? `\n\nNext steps: ${input.roundDetails}` : " Please check the placement portal for next steps."}`;
    const result = await deliverBatch([{
      id: String(student.id), user_id: student.user_id as string | null, name: String(student.full_name || "Student"),
      email: String(student.email || (student.profiles as { email?: string } | null)?.email || "") || null,
      phone: String(student.phone || "") || null,
    }], { email: true, whatsapp: true }, title, message);
    await recordNotifications(profile, [student as { user_id?: string | null }], title, message, "Shortlist", { applicationId: input.applicationId }).catch((error) => console.error("Could not save shortlist feed entry:", error));
    return Response.json({ data: { audience: 1, ...result } });
  } catch (error) {
    return apiError(error);
  }
}

async function recordNotifications(profile: Record<string, unknown>, recipients: { user_id?: string | null }[], title: string, message: string, category: string, metadata: Record<string, unknown>) {
  const rows = recipients.filter((recipient) => recipient.user_id).map((recipient) => ({
    institution_id: profile.institution_id, campus_id: profile.campus_id, user_id: recipient.user_id,
    title, message, category, metadata,
  }));
  if (rows.length) await databaseRequest("notifications", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(rows) });
}

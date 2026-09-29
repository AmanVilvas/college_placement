import { z } from "zod";
import { apiError, ApiError, currentProfile, databaseRequest } from "@/lib/server/supabase";

const tables = new Set([
  "institutions", "campuses", "profiles", "student_profiles", "companies", "recruiter_contacts",
  "employer_interactions", "drives", "applications", "application_stage_events", "placement_policies",
  "assessments", "assessment_attempts", "interviews", "interview_feedback", "offers", "notifications",
  "notification_preferences", "documents", "cohorts", "events", "alumni_profiles", "interview_experiences",
  "audit_logs",
]);
const bodySchema = z.record(z.string(), z.unknown());

async function target(resource: string, id: string) {
  if (!tables.has(resource)) throw new ApiError(404, "Resource not found");
  await currentProfile();
  return `${resource}?id=eq.${encodeURIComponent(id)}`;
}

async function requireStaff() {
  const { profile } = await currentProfile();
  if (!["super_admin", "college_admin", "tpo", "coordinator"].includes(profile.role)) {
    throw new ApiError(403, "Your role cannot perform this operation.");
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ resource: string; id: string }> }) {
  try {
    const { resource, id } = await context.params;
    await requireStaff();
    const path = await target(resource, id);
    const input = bodySchema.parse(await request.json());
    const { body } = await databaseRequest(path, {
      method: "PATCH", body: JSON.stringify(input), headers: { Prefer: "return=representation" },
    });
    return Response.json({ data: body });
  } catch (error) { return apiError(error); }
}

export async function DELETE(_request: Request, context: { params: Promise<{ resource: string; id: string }> }) {
  try {
    const { resource, id } = await context.params;
    await requireStaff();
    const path = await target(resource, id);
    await databaseRequest(path, { method: "DELETE" });
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}

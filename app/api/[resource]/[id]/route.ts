import { z } from "zod";
import { apiError, ApiError, currentProfile, databaseRequest, developmentDatabaseQuery } from "@/lib/server/supabase";

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
    const { profile: actor } = await currentProfile();
    const hostname = new URL(request.url).hostname.toLowerCase().replace(/^\[|\]$/g, "");
    const useDirectDatabase = process.env.NODE_ENV === "production"
      || (process.env.NODE_ENV === "development" && ["localhost", "127.0.0.1", "::1"].includes(hostname));
    const isStaff = ["super_admin", "college_admin", "tpo", "coordinator"].includes(actor.role);
    let isOwnStudentProfile = false;
    if (!isStaff && resource === "student_profiles" && actor.role === "student" && useDirectDatabase) {
      const owned = await developmentDatabaseQuery<{ id: string }>(
        `select id from public.student_profiles where id::text = $1 and institution_id = $2 and campus_id = $3
           and (user_id::text = $4 or id::text = $4) limit 1`,
        [id, actor.institution_id, actor.campus_id, actor.id],
      );
      isOwnStudentProfile = owned.length > 0;
    }
    if (!isStaff && !isOwnStudentProfile) throw new ApiError(403, "Your role cannot perform this operation.");
    const path = await target(resource, id);
    const input = bodySchema.parse(await request.json());

    const directColumns: Record<string, Set<string>> = {
      companies: new Set(["archived", "name", "website", "industry", "description", "metadata"]),
      drives: new Set(["role_title", "job_type", "description", "location", "work_mode", "package_lpa", "stipend_monthly", "openings", "application_deadline", "drive_date", "status", "official_apply_link", "eligibility", "required_skills", "selection_process"]),
      applications: new Set(["status", "confirmation_data"]),
      student_profiles: new Set(["full_name", "email", "department", "section", "year_of_study", "graduation_year", "phone", "cgpa", "tenth_percent", "twelfth_percent", "backlogs", "skills", "profile_data"]),
    };
    if (useDirectDatabase && directColumns[resource]) {
      const { profile } = await currentProfile();
      const allowedColumns = isOwnStudentProfile
        ? new Set(["full_name", "phone", "skills"])
        : directColumns[resource];
      const entries = Object.entries(input).filter(([column]) => allowedColumns.has(column));
      if (entries.length === 0 || entries.length !== Object.keys(input).length) {
        throw new ApiError(400, "No supported fields were provided for this update.");
      }
      const jsonColumns = new Set(["metadata", "eligibility", "selection_process", "confirmation_data", "profile_data"]);
      const textArrayColumns = new Set(["required_skills", "skills"]);
      const values: unknown[] = [];
      const assignments = entries.map(([column, value]) => {
        values.push(jsonColumns.has(column) && value != null ? JSON.stringify(value) : value);
        const placeholder = `$${values.length}`;
        const cast = jsonColumns.has(column) ? "::jsonb" : textArrayColumns.has(column) ? "::text[]" : "";
        return `${column} = ${placeholder}${cast}`;
      });
      values.push(id);
      const idParam = `$${values.length}`;
      const tenantScoped = ["companies", "drives", "applications", "student_profiles"].includes(resource);
      let scope = "";
      if (tenantScoped) {
        if (!profile.institution_id || !profile.campus_id) throw new ApiError(400, "Placement office is not linked to a campus.");
        values.push(profile.institution_id, profile.campus_id);
        scope = ` and institution_id = $${values.length - 1} and campus_id = $${values.length}`;
      }
      if (["companies", "drives", "applications", "student_profiles"].includes(resource)) assignments.push("updated_at = now()");
      const rows = await developmentDatabaseQuery(
        `update public.${resource} set ${assignments.join(", ")} where id = ${idParam}${scope} returning *`,
        values as (string | number | boolean | null)[],
      );
      if (!rows.length) throw new ApiError(404, "Record not found for this campus.");
      return Response.json({ data: rows });
    }

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

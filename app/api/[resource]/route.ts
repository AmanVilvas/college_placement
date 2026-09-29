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

async function tableFor(resource: string) {
  if (!tables.has(resource)) throw new ApiError(404, "Resource not found");
  await currentProfile();
  return resource;
}

async function authorizeWrite(resource: string, method: "POST" | "PATCH" | "DELETE") {
  const { profile } = await currentProfile();
  const staff = ["super_admin", "college_admin", "tpo", "coordinator"].includes(profile.role);
  if (staff) return;
  const selfServiceCreate = ["applications", "assessment_attempts", "notification_preferences", "documents", "interview_experiences"].includes(resource);
  if (method === "POST" && selfServiceCreate) return;
  throw new ApiError(403, "Your role cannot perform this operation.");
}

export async function GET(request: Request, context: RouteContext<"/api/[resource]">) {
  try {
    const { resource } = await context.params;
    const table = await tableFor(resource);
    await authorizeWrite(table, "POST");
    const incoming = new URL(request.url).searchParams;
    const query = new URLSearchParams();
    const filters = ["id", "institution_id", "campus_id", "student_id", "company_id", "drive_id", "status"];
    for (const key of filters) {
      const value = incoming.get(key);
      if (value !== null) {
        if (!/^(eq|neq|gte|lte|gt|lt|is)\.[A-Za-z0-9_@:+-]{1,120}$/.test(value)) throw new ApiError(400, `Invalid filter: ${key}`);
        query.set(key, value);
      }
    }
    const select = incoming.get("select");
    if (select !== null) {
      if (!/^[A-Za-z0-9_,.*()!]+$/.test(select)) throw new ApiError(400, "Invalid select expression");
      query.set("select", select);
    }
    const order = incoming.get("order");
    if (order !== null) {
      if (!/^[a-z_]+\.(asc|desc)(,[a-z_]+\.(asc|desc))*$/.test(order)) throw new ApiError(400, "Invalid order expression");
      query.set("order", order);
    }
    const limit = Number(incoming.get("limit") ?? 100);
    const offset = Number(incoming.get("offset") ?? 0);
    if (!Number.isInteger(limit) || limit < 1 || limit > 500 || !Number.isInteger(offset) || offset < 0) throw new ApiError(400, "Invalid pagination");
    query.set("limit", String(limit));
    query.set("offset", String(offset));
    const { body } = await databaseRequest(`${table}?${query}`, { headers: { Prefer: "count=exact" } });
    return Response.json({ data: body });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request, context: RouteContext<"/api/[resource]">) {
  try {
    const { resource } = await context.params;
    const table = await tableFor(resource);
    const input = bodySchema.parse(await request.json());
    const { body } = await databaseRequest(table, {
      method: "POST", body: JSON.stringify(input), headers: { Prefer: "return=representation" },
    });
    return Response.json({ data: body }, { status: 201 });
  } catch (error) { return apiError(error); }
}


import { z } from "zod";
import { apiError, ApiError, currentProfile, developmentDatabaseQuery } from "@/lib/server/supabase";

export const runtime = "nodejs";

const staffRoles = new Set(["super_admin", "college_admin", "tpo", "coordinator", "admin-local"]);
const eventSchema = z.object({
  title: z.string().trim().min(3).max(180),
  event_type: z.enum(["Company session", "Guest lecture", "Workshop", "Webinar", "Campus event", "Other"]),
  description: z.string().trim().max(4000).optional().default(""),
  meeting_url: z.string().trim().url().max(1000).optional().or(z.literal("")),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
}).refine((value) => new Date(value.ends_at) > new Date(value.starts_at), {
  message: "Event end time must be after its start time.", path: ["ends_at"],
});

export async function GET() {
  try {
    const { profile } = await currentProfile();
    if (!profile.institution_id || !profile.campus_id) throw new ApiError(400, "Your account is not linked to a campus.");
    if (profile.role !== "student" && !staffRoles.has(profile.role)) throw new ApiError(403, "Your account cannot view campus events.");
    const rows = await developmentDatabaseQuery(
      `select id, title, event_type, description, meeting_url, starts_at, ends_at, created_at
       from public.events where institution_id=$1 and campus_id=$2
       order by starts_at asc nulls last, created_at desc`,
      [profile.institution_id, profile.campus_id],
    );
    return Response.json({ data: rows });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const { profile } = await currentProfile();
    if (!staffRoles.has(profile.role)) throw new ApiError(403, "Only placement staff can create campus events.");
    if (!profile.institution_id || !profile.campus_id) throw new ApiError(400, "Placement office is not linked to a campus.");
    const input = eventSchema.parse(await request.json());
    const rows = await developmentDatabaseQuery(
      `insert into public.events (institution_id, campus_id, title, event_type, description, meeting_url, starts_at, ends_at, visibility, created_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,'campus',$9) returning id, title, event_type, description, meeting_url, starts_at, ends_at, created_at`,
      [profile.institution_id, profile.campus_id, input.title, input.event_type, input.description || null,
        input.meeting_url || null, input.starts_at, input.ends_at,
        profile.id === "admin-local" ? null : profile.id],
    );
    return Response.json({ data: rows[0] }, { status: 201 });
  } catch (error) { return apiError(error); }
}

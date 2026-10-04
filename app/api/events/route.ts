import { z } from "zod";
import { apiError, ApiError, currentProfile, developmentDatabaseQuery } from "@/lib/server/supabase";

export const runtime = "nodejs";

const staffRoles = new Set(["super_admin", "college_admin", "tpo", "coordinator", "admin-local"]);
const audienceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("campus") }),
  z.object({ kind: z.literal("branch"), branches: z.array(z.string().trim().min(1).max(80)).min(1).max(50) }),
  z.object({ kind: z.literal("applied") }),
  z.object({ kind: z.literal("placed") }),
  z.object({ kind: z.literal("students"), studentIds: z.array(z.string().uuid()).min(1).max(500) }),
]);
const eventSchema = z.object({
  title: z.string().trim().min(3).max(180),
  event_type: z.enum(["Company session", "Guest lecture", "Workshop", "Webinar", "Campus event", "Other"]),
  custom_event_type: z.string().trim().max(80).optional().default(""),
  event_mode: z.enum(["In person", "Remote", "Hybrid"]),
  location: z.string().trim().max(300).optional().default(""),
  description: z.string().trim().max(4000).optional().default(""),
  meeting_url: z.string().trim().url().max(1000).optional().or(z.literal("")),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  audience: audienceSchema,
}).refine((value) => new Date(value.ends_at) > new Date(value.starts_at), {
  message: "Event end time must be after its start time.", path: ["ends_at"],
}).refine((value) => value.event_type !== "Other" || value.custom_event_type.trim().length > 0, {
  message: "Enter a name for the other event type.", path: ["custom_event_type"],
}).refine((value) => value.event_mode === "Remote" ? Boolean(value.meeting_url) : Boolean(value.location), {
  message: "Add a location for in-person or hybrid events, or a meeting link for remote events.", path: ["location"],
}).refine((value) => value.event_mode !== "Hybrid" || Boolean(value.meeting_url), {
  message: "Add a meeting link for hybrid events.", path: ["meeting_url"],
});

export async function GET() {
  try {
    const { profile } = await currentProfile();
    if (!profile.institution_id || !profile.campus_id) throw new ApiError(400, "Your account is not linked to a campus.");
    if (profile.role !== "student" && !staffRoles.has(profile.role)) throw new ApiError(403, "Your account cannot view campus events.");
    if (profile.role !== "student") {
      const rows = await developmentDatabaseQuery(
        `select id, title, event_type, custom_event_type, event_mode, location, audience, description, meeting_url, starts_at, ends_at, created_at
         from public.events where institution_id=$1 and campus_id=$2
         order by starts_at asc nulls last, created_at desc`,
        [profile.institution_id, profile.campus_id],
      );
      return Response.json({ data: rows });
    }
    const rows = await developmentDatabaseQuery(
      `select e.id, e.title, e.event_type, e.custom_event_type, e.event_mode, e.location, e.description, e.meeting_url, e.starts_at, e.ends_at, e.created_at
       from public.events e
       join public.student_profiles s on s.institution_id=e.institution_id and s.campus_id=e.campus_id
         and (s.user_id::text=$3 or lower(s.roll_number)=lower($4))
       where e.institution_id=$1 and e.campus_id=$2 and (
         coalesce(e.audience->>'kind','campus')='campus'
         or (e.audience->>'kind'='branch' and e.audience->'branches' ? s.department)
         or (e.audience->>'kind'='applied' and exists(select 1 from public.applications a where a.student_id=s.id))
         or (e.audience->>'kind'='placed' and exists(select 1 from public.applications a where a.student_id=s.id and lower(a.status) in ('placed','selected')))
         or (e.audience->>'kind'='students' and e.audience->'studentIds' ? s.id::text)
       ) order by e.starts_at asc nulls last, e.created_at desc`,
      [profile.institution_id, profile.campus_id, profile.id, profile.roll_number ?? ""],
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
    if (input.audience.kind === "students") {
      const matched = await developmentDatabaseQuery<{ count: string }>(
        `select count(*)::text as count from public.student_profiles where institution_id=$1 and campus_id=$2 and id=any($3::uuid[])`,
        [profile.institution_id, profile.campus_id, input.audience.studentIds],
      );
      if (Number(matched[0]?.count ?? 0) !== input.audience.studentIds.length) throw new ApiError(400, "One or more selected students are outside your campus.");
    }
    if (input.audience.kind === "branch") {
      const matched = await developmentDatabaseQuery<{ count: string }>(
        `select count(distinct department)::text as count from public.student_profiles where institution_id=$1 and campus_id=$2 and department=any($3::text[])`,
        [profile.institution_id, profile.campus_id, input.audience.branches],
      );
      if (Number(matched[0]?.count ?? 0) !== new Set(input.audience.branches).size) throw new ApiError(400, "One or more selected branches are not available in this campus.");
    }
    const rows = await developmentDatabaseQuery(
      `insert into public.events (institution_id, campus_id, title, event_type, custom_event_type, event_mode, location, audience, description, meeting_url, starts_at, ends_at, visibility, created_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,'campus',$13)
       returning id, title, event_type, custom_event_type, event_mode, location, audience, description, meeting_url, starts_at, ends_at, created_at`,
      [profile.institution_id, profile.campus_id, input.title, input.event_type, input.event_type === "Other" ? input.custom_event_type : null,
        input.event_mode, input.location || null, JSON.stringify(input.audience), input.description || null,
        input.meeting_url || null, input.starts_at, input.ends_at, profile.id === "admin-local" ? null : profile.id],
    );
    return Response.json({ data: rows[0] }, { status: 201 });
  } catch (error) { return apiError(error); }
}

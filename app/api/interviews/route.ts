import { z } from "zod";
import { apiError, ApiError, currentProfile, developmentDatabaseQuery } from "@/lib/server/supabase";

const interviewInput = z.object({
  application_id: z.string().uuid(),
  round: z.string().trim().min(1).max(120),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  location: z.string().trim().max(300).nullable().optional(),
  meeting_url: z.string().trim().url().max(1000).nullable().optional(),
  status: z.enum(["Scheduled", "Completed", "Cancelled"]).default("Scheduled"),
}).refine((value) => new Date(value.ends_at) > new Date(value.starts_at), {
  message: "Interview end time must be after the start time.",
});

async function staffCampus() {
  const { profile } = await currentProfile();
  if (!["super_admin", "college_admin", "tpo", "coordinator", "admin-local"].includes(profile.role)) {
    throw new ApiError(403, "Only placement staff can manage interviews.");
  }
  if (!profile.institution_id || !profile.campus_id) throw new ApiError(400, "Placement office is not linked to a campus.");
  return profile;
}

export async function GET() {
  try {
    const profile = await staffCampus();
    const rows = await developmentDatabaseQuery(
      `select i.*, a.student_id, a.drive_id, s.full_name as student_name, s.roll_number,
              d.role_title, d.company_id, c.name as company_name
       from public.interviews i
       join public.applications a on a.id = i.application_id
       join public.student_profiles s on s.id = a.student_id
       join public.drives d on d.id = a.drive_id
       join public.companies c on c.id = d.company_id
       where i.institution_id = $1 and i.campus_id = $2
       order by i.starts_at asc`,
      [profile.institution_id, profile.campus_id],
    );
    return Response.json({ data: rows });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const profile = await staffCampus();
    const input = interviewInput.parse(await request.json());
    const application = await developmentDatabaseQuery<{ id: string }>(
      `select id from public.applications where id = $1 and institution_id = $2 and campus_id = $3 limit 1`,
      [input.application_id, profile.institution_id, profile.campus_id],
    );
    if (!application[0]) throw new ApiError(404, "Application not found for this campus.");
    if (input.location) {
      const conflict = await developmentDatabaseQuery<{ id: string }>(
        `select id from public.interviews where institution_id = $1 and campus_id = $2
           and lower(coalesce(location, '')) = lower($3) and status = 'Scheduled'
           and starts_at < $5 and ends_at > $4 limit 1`,
        [profile.institution_id, profile.campus_id, input.location, input.starts_at, input.ends_at],
      );
      if (conflict[0]) throw new ApiError(409, "That room or meeting location is already booked for this time.");
    }
    const rows = await developmentDatabaseQuery(
      `insert into public.interviews (institution_id, campus_id, application_id, round, starts_at, ends_at, location, meeting_url, status, created_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning *`,
      [profile.institution_id, profile.campus_id, input.application_id, input.round, input.starts_at, input.ends_at,
        input.location || null, input.meeting_url || null, input.status, profile.id === "admin-local" ? null : profile.id],
    );
    return Response.json({ data: rows }, { status: 201 });
  } catch (error) { return apiError(error); }
}

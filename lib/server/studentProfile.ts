import { ApiError, currentProfile, developmentDatabaseQuery } from "./supabase";

export async function ownStudentScope() {
  const { profile } = await currentProfile();
  if (profile.role !== "student" || !profile.active) throw new ApiError(403, "Sign in with your student account.");
  return [profile.id, profile.institution_id, profile.campus_id] as string[];
}

export const ownStudentWhere = "(s.user_id::text = $1 or s.id::text = $1) and s.institution_id = $2 and s.campus_id = $3";

export async function readStudentProfile(scope: string[]) {
  const rows = await developmentDatabaseQuery(`select s.id, s.full_name as name, s.roll_number as "rollNumber",
    s.email, s.phone, s.department as branch, s.section, s.year_of_study::text as year,
    s.graduation_year as "graduationYear", s.cgpa::float8, s.tenth_percent::float8 as "tenthPercent",
    s.twelfth_percent::float8 as "twelfthPercent", s.backlogs, s.skills, s.created_at as "createdAt",
    coalesce(s.profile_data->>'placementStatus', 'Unplaced') as "placementStatus",
    coalesce(s.profile_data->>'avatarUrl', '') as "avatarUrl",
    r.file_name as "resumeFileName", r.file_size as "resumeSize", r.updated_at as "resumeUpdatedAt"
    from public.student_profiles s left join placement_private.student_resumes r on r.student_id = s.id
    where ${ownStudentWhere} limit 1`, scope);
  if (!rows[0]) throw new ApiError(404, "Your student profile could not be found.");
  return rows[0];
}

import { ApiError, currentProfile, developmentDatabaseQuery } from "@/lib/server/supabase";

const staffRoles = new Set(["super_admin", "college_admin", "tpo", "coordinator"]);
export type AdminStudentDocumentScope = { where: string; values: (string | null)[] };

export async function adminStudentDocumentScope(studentId: string): Promise<AdminStudentDocumentScope> {
  const { profile } = await currentProfile();
  if (!staffRoles.has(profile.role) || !profile.active) throw new ApiError(403, "Your role cannot view student documents.");

  const values: (string | null)[] = [studentId];
  let where = "s.id::text = $1";
  if (profile.role !== "super_admin") {
    if (!profile.institution_id || !profile.campus_id) throw new ApiError(403, "Your account is not assigned to a campus.");
    values.push(profile.institution_id, profile.campus_id);
    where += " and s.institution_id::text = $2 and s.campus_id::text = $3";
  }
  const student = await developmentDatabaseQuery(`select s.id from public.student_profiles s where ${where} limit 1`, values);
  if (!student.length) throw new ApiError(404, "Student not found.");
  return { where, values };
}

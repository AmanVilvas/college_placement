import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { useApiResource } from "@/lib/useApi";
import type { Application, Branch, Section, Student, Year } from "@/lib/types";

export const STUDENT_PROFILE_KEY = "placement-helper:student-profile";
export type EditableStudentProfile = Student & { resumeFileName?: string | null; resumeSize?: number | null; resumeUpdatedAt?: string | null; graduationYear?: number | null };

const emptyStudentProfile: EditableStudentProfile = {
  id: "",
  name: "",
  rollNumber: "",
  branch: "CSE" as Branch,
  section: "A" as Section,
  year: "1" as Year,
  email: "",
  phone: "",
  cgpa: 0,
  placementStatus: "Unplaced",
  skills: [],
  tenthPercent: 0,
  twelfthPercent: 0,
  backlogs: 0,
  createdAt: "",
};

export function useStudentProfile() {
  return useLocalStorageState<EditableStudentProfile>(STUDENT_PROFILE_KEY, emptyStudentProfile);
}

export function useStudentApplications() {
  const { data, loading, error, refetch } = useApiResource<Array<{
    id: string; student_id: string; drive_id: string; status: string; confirmation_data?: Application["confirmationData"];
    applied_at?: string; updated_at?: string;
    student_profiles?: { full_name?: string; roll_number?: string; department?: string; section?: string };
    drives?: { role_title?: string; company_id?: string; companies?: { name?: string } };
  }>>("applications", {
    select: "id,status",
    order: "applied_at.desc",
    limit: "1000",
  }, { fallback: [] });
  const applications: Application[] = (data ?? []).map((row) => ({
    id: row.id,
    studentId: row.student_id,
    studentName: row.confirmation_data?.fullName || row.student_profiles?.full_name || "",
    studentRollNumber: row.confirmation_data?.rollNumber || row.student_profiles?.roll_number || "",
    studentBranch: (row.confirmation_data?.specialization || row.student_profiles?.department || "") as Application["studentBranch"],
    studentSection: row.confirmation_data?.section || row.student_profiles?.section || "",
    driveId: row.drive_id,
    driveName: row.drives?.role_title || "",
    companyId: row.drives?.company_id || "",
    companyName: row.drives?.companies?.name || "Company",
    status: row.status as Application["status"],
    appliedAt: row.applied_at,
    confirmedAt: row.confirmation_data?.confirmedAt || row.updated_at,
    confirmationData: row.confirmation_data,
    followUpCount: 0,
    updatedAt: row.updated_at || row.applied_at || "",
  }));
  return { applications, loading, error, refetch };
}

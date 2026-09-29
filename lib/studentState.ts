import { applications as seededApplications } from "@/lib/data/applications";
import { students } from "@/lib/data/students";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import type { Application, Student } from "@/lib/types";

export const CURRENT_STUDENT_ID = "s1";
export const STUDENT_PROFILE_KEY = `placement-helper:student-profile:${CURRENT_STUDENT_ID}`;
export const STUDENT_APPLICATIONS_KEY = `placement-helper:student-applications:${CURRENT_STUDENT_ID}`;
export const APPLICATION_STAGES_KEY = "placement-helper:application-stages";

export type EditableStudentProfile = Student & { resumeFileName?: string; graduationYear?: number };

export function useStudentProfile() {
  const initialProfile = students.find((student) => student.id === CURRENT_STUDENT_ID)!;
  return useLocalStorageState<EditableStudentProfile>(STUDENT_PROFILE_KEY, initialProfile);
}

export function useStudentApplications() {
  const [extraApplications, setExtraApplications] = useLocalStorageState<Application[]>(STUDENT_APPLICATIONS_KEY, []);
  const [stageOverrides, setStageOverrides] = useLocalStorageState<Record<string, Application["status"]>>(APPLICATION_STAGES_KEY, {});
  const applicationMap = new Map<string, Application>();
  for (const application of [...seededApplications.filter((item) => item.studentId === CURRENT_STUDENT_ID), ...extraApplications]) {
    applicationMap.set(application.id, application);
  }
  const applications = [...applicationMap.values()].map((application) => ({ ...application, status: stageOverrides[application.id] ?? application.status }));

  function updateStatus(applicationId: string, status: Application["status"]) {
    setStageOverrides((current) => ({ ...current, [applicationId]: status }));
  }

  function saveApplication(application: Application) {
    setExtraApplications((current) => [application, ...current.filter((item) => item.id !== application.id)]);
    updateStatus(application.id, application.status);
  }

  return { applications, updateStatus, saveApplication };
}

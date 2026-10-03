import { Application } from "@/lib/types";

// Application history is database-backed; do not pre-populate fictional records.
export const applications: Application[] = [];

export function getApplicationsByStudent(studentId: string): Application[] {
  return applications.filter((application) => application.studentId === studentId);
}

export function getApplicationsByDrive(driveId: string): Application[] {
  return applications.filter((application) => application.driveId === driveId);
}

export function getApplicationsByCompany(companyId: string): Application[] {
  return applications.filter((application) => application.companyId === companyId);
}

export function getFollowUpRequired(): Application[] {
  return applications.filter((application) =>
    ["Not Responded", "Shortlisted", "Assessment"].includes(application.status),
  );
}

export function getPendingConfirmations(): Application[] {
  return applications.filter((application) => application.status === "Not Responded");
}

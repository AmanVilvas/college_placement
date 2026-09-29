import type { Drive, Student } from "@/lib/types";
import { getDaysUntilDeadline } from "@/lib/utils";

export function getDriveEligibilityIssues(drive: Drive, student: Student) {
  const issues: string[] = [];
  if (!drive.eligibility.branches.includes(student.branch)) issues.push(`${student.branch} is not in the eligible branches`);
  if (student.cgpa < drive.eligibility.minCGPA) issues.push(`CGPA ${student.cgpa} is below the ${drive.eligibility.minCGPA} minimum`);
  if (student.backlogs > drive.eligibility.maxBacklogs) issues.push(`${student.backlogs} backlogs exceeds the limit of ${drive.eligibility.maxBacklogs}`);
  if (drive.eligibility.tenthMin && student.tenthPercent < drive.eligibility.tenthMin) issues.push(`10th score is below ${drive.eligibility.tenthMin}%`);
  if (drive.eligibility.twelfthMin && student.twelfthPercent < drive.eligibility.twelfthMin) issues.push(`12th score is below ${drive.eligibility.twelfthMin}%`);
  if (drive.eligibility.passOutYear && drive.eligibility.passOutYear !== "2026") issues.push(`Graduation year ${drive.eligibility.passOutYear} does not match your batch`);
  return issues;
}

/** Date-only deadlines stay open through the end of the displayed deadline date. */
export function isDriveAcceptingApplications(drive: Drive) {
  return (drive.status === "Open" || drive.status === "Closing Soon")
    && getDaysUntilDeadline(drive.applicationDeadline) >= 0;
}

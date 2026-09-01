import { Application } from "@/lib/types";

export const applications: Application[] = [
  // Microsoft
  {
    id: "a1", studentId: "s1", studentName: "Rahul Sharma", studentRollNumber: "21CSE102",
    studentBranch: "CSE", studentSection: "A", driveId: "d1", driveName: "Software Development Engineer",
    companyId: "c1", companyName: "Microsoft", status: "Confirmed",
    appliedAt: "2026-08-25T10:00:00Z", confirmedAt: "2026-08-25T11:00:00Z",
    confirmationData: {
      fullName: "Rahul Sharma", rollNumber: "21CSE102", section: "A", branch: "CSE",
      collegeEmail: "rahul.sharma@college.edu", phone: "9876543210",
      resumeFileName: "rahul_resume.pdf", applicationReferenceId: "MS-2026-1234",
      confirmedAt: "2026-08-25T11:00:00Z",
    },
    followUpCount: 0, updatedAt: "2026-08-25T11:00:00Z",
  },
  {
    id: "a2", studentId: "s3", studentName: "Karan Singh", studentRollNumber: "21CSE121",
    studentBranch: "CSE", studentSection: "B", driveId: "d1", driveName: "Software Development Engineer",
    companyId: "c1", companyName: "Microsoft", status: "Shortlisted",
    appliedAt: "2026-08-24T09:00:00Z", confirmedAt: "2026-08-24T10:00:00Z",
    confirmationData: {
      fullName: "Karan Singh", rollNumber: "21CSE121", section: "B", branch: "CSE",
      collegeEmail: "karan.singh@college.edu", phone: "9876543212",
      resumeFileName: "karan_resume.pdf", applicationReferenceId: "MS-2026-1189",
      confirmedAt: "2026-08-24T10:00:00Z",
    },
    followUpCount: 0, updatedAt: "2026-09-01T09:00:00Z",
  },
  {
    id: "a3", studentId: "s4", studentName: "Priya Patel", studentRollNumber: "21CSE145",
    studentBranch: "CSE", studentSection: "B", driveId: "d1", driveName: "Software Development Engineer",
    companyId: "c1", companyName: "Microsoft", status: "Not Responded",
    followUpCount: 1, lastFollowUpAt: "2026-08-26T10:00:00Z", updatedAt: "2026-08-26T10:00:00Z",
  },
  // Amazon
  {
    id: "a4", studentId: "s2", studentName: "Aman Verma", studentRollNumber: "21CSE118",
    studentBranch: "CSE", studentSection: "A", driveId: "d2", driveName: "SDE-1 (Backend)",
    companyId: "c2", companyName: "Amazon", status: "Selected",
    appliedAt: "2026-08-20T09:00:00Z", confirmedAt: "2026-08-20T10:00:00Z",
    confirmationData: {
      fullName: "Aman Verma", rollNumber: "21CSE118", section: "A", branch: "CSE",
      collegeEmail: "aman.verma@college.edu", phone: "9876543211",
      resumeFileName: "aman_resume.pdf", applicationReferenceId: "AMZ-2026-5567",
      confirmedAt: "2026-08-20T10:00:00Z",
    },
    adminNotes: "Cleared all 5 rounds. Offer letter received.",
    followUpCount: 0, updatedAt: "2026-08-30T10:00:00Z",
  },
  {
    id: "a5", studentId: "s1", studentName: "Rahul Sharma", studentRollNumber: "21CSE102",
    studentBranch: "CSE", studentSection: "A", driveId: "d2", driveName: "SDE-1 (Backend)",
    companyId: "c2", companyName: "Amazon", status: "Not Responded",
    followUpCount: 2, lastFollowUpAt: "2026-09-01T08:00:00Z", updatedAt: "2026-09-01T08:00:00Z",
  },
  // Deloitte
  {
    id: "a6", studentId: "s5", studentName: "Sneha Gupta", studentRollNumber: "21IT201",
    studentBranch: "IT", studentSection: "A", driveId: "d3", driveName: "Business Technology Analyst",
    companyId: "c3", companyName: "Deloitte", status: "Confirmed",
    appliedAt: "2026-08-28T10:00:00Z", confirmedAt: "2026-08-28T11:30:00Z",
    confirmationData: {
      fullName: "Sneha Gupta", rollNumber: "21IT201", section: "A", branch: "IT",
      collegeEmail: "sneha.gupta@college.edu", phone: "9876543214",
      resumeFileName: "sneha_resume.pdf",
      confirmedAt: "2026-08-28T11:30:00Z",
    },
    followUpCount: 0, updatedAt: "2026-08-28T11:30:00Z",
  },
  {
    id: "a7", studentId: "s7", studentName: "Anjali Mehta", studentRollNumber: "21CSE156",
    studentBranch: "CSE", studentSection: "C", driveId: "d3", driveName: "Business Technology Analyst",
    companyId: "c3", companyName: "Deloitte", status: "Not Responded",
    followUpCount: 1, lastFollowUpAt: "2026-09-01T09:00:00Z", updatedAt: "2026-09-01T09:00:00Z",
  },
  {
    id: "a8", studentId: "s10", studentName: "Arjun Kapoor", studentRollNumber: "21IT212",
    studentBranch: "IT", studentSection: "B", driveId: "d3", driveName: "Business Technology Analyst",
    companyId: "c3", companyName: "Deloitte", status: "Shortlisted",
    appliedAt: "2026-08-27T10:00:00Z", confirmedAt: "2026-08-27T12:00:00Z",
    confirmationData: {
      fullName: "Arjun Kapoor", rollNumber: "21IT212", section: "B", branch: "IT",
      collegeEmail: "arjun.kapoor@college.edu", phone: "9876543219",
      resumeFileName: "arjun_resume.pdf",
      confirmedAt: "2026-08-27T12:00:00Z",
    },
    followUpCount: 0, updatedAt: "2026-09-01T10:00:00Z",
  },
  // TCS - Completed drive
  {
    id: "a9", studentId: "s13", studentName: "Meera Pillai", studentRollNumber: "21MCA601",
    studentBranch: "MCA", studentSection: "A", driveId: "d5", driveName: "Assistant System Engineer",
    companyId: "c5", companyName: "TCS", status: "Placed",
    appliedAt: "2026-08-22T10:00:00Z", confirmedAt: "2026-08-22T11:00:00Z",
    adminNotes: "Offer letter issued. Package: 3.6 LPA",
    followUpCount: 0, updatedAt: "2026-08-30T10:00:00Z",
  },
  {
    id: "a10", studentId: "s17", studentName: "Kavya Reddy", studentRollNumber: "21CSE201",
    studentBranch: "CSE", studentSection: "B", driveId: "d5", driveName: "Assistant System Engineer",
    companyId: "c5", companyName: "TCS", status: "Placed",
    appliedAt: "2026-08-21T10:00:00Z", confirmedAt: "2026-08-21T11:00:00Z",
    adminNotes: "Offer letter issued. Package: 3.6 LPA",
    followUpCount: 0, updatedAt: "2026-08-30T10:00:00Z",
  },
  // Google internship
  {
    id: "a11", studentId: "s14", studentName: "Aditya Bhatt", studentRollNumber: "21CSE189",
    studentBranch: "CSE", studentSection: "D", driveId: "d6", driveName: "Software Engineer (STEP Intern)",
    companyId: "c6", companyName: "Google", status: "Confirmed",
    appliedAt: "2026-08-29T10:00:00Z", confirmedAt: "2026-08-29T11:00:00Z",
    confirmationData: {
      fullName: "Aditya Bhatt", rollNumber: "21CSE189", section: "D", branch: "CSE",
      collegeEmail: "aditya.bhatt@college.edu", phone: "9876543223",
      resumeFileName: "aditya_resume.pdf", applicationReferenceId: "G-STEP-2026-889",
      confirmedAt: "2026-08-29T11:00:00Z",
    },
    followUpCount: 0, updatedAt: "2026-08-29T11:00:00Z",
  },
  // Accenture
  {
    id: "a12", studentId: "s12", studentName: "Suresh Kumar", studentRollNumber: "21CSE178",
    studentBranch: "CSE", studentSection: "D", driveId: "d8", driveName: "Associate Software Engineer",
    companyId: "c8", companyName: "Accenture", status: "Not Responded",
    followUpCount: 0, updatedAt: "2026-09-01T07:00:00Z",
  },
  {
    id: "a13", studentId: "s15", studentName: "Riya Shah", studentRollNumber: "21CSE190",
    studentBranch: "CSE", studentSection: "A", driveId: "d8", driveName: "Associate Software Engineer",
    companyId: "c8", companyName: "Accenture", status: "Confirmed",
    appliedAt: "2026-08-30T10:00:00Z", confirmedAt: "2026-08-30T11:00:00Z",
    confirmationData: {
      fullName: "Riya Shah", rollNumber: "21CSE190", section: "A", branch: "CSE",
      collegeEmail: "riya.shah@college.edu", phone: "9876543224",
      resumeFileName: "riya_resume.pdf",
      confirmedAt: "2026-08-30T11:00:00Z",
    },
    followUpCount: 0, updatedAt: "2026-08-30T11:00:00Z",
  },
];

export function getApplicationsByStudent(studentId: string): Application[] {
  return applications.filter((a) => a.studentId === studentId);
}

export function getApplicationsByDrive(driveId: string): Application[] {
  return applications.filter((a) => a.driveId === driveId);
}

export function getApplicationsByCompany(companyId: string): Application[] {
  return applications.filter((a) => a.companyId === companyId);
}

export function getFollowUpRequired(): Application[] {
  return applications.filter(
    (a) => a.status === "Not Responded" || a.status === "Shortlisted" || a.status === "Assessment"
  );
}

export function getPendingConfirmations(): Application[] {
  return applications.filter((a) => a.status === "Not Responded");
}

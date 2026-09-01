// ============================================================
// Core Types for College Placement Management Platform
// ============================================================

export type Branch = "CSE" | "IT" | "ECE" | "EEE" | "ME" | "CE" | "MCA" | "MBA";
export type Section = "A" | "B" | "C" | "D";
export type Year = "1" | "2" | "3" | "4";
export type WorkMode = "On-site" | "Remote" | "Hybrid";
export type JobType = "Full-time" | "Internship" | "Part-time" | "Contract";
export type DriveStatus = "Open" | "Closing Soon" | "Closed" | "Completed";
export type PlacementStatus = "Unplaced" | "Placed" | "In Process";

export type ApplicationStatus =
  | "Eligible"
  | "Interested"
  | "Applied"
  | "Confirmed"
  | "Shortlisted"
  | "Assessment"
  | "Interview"
  | "Selected"
  | "Placed"
  | "Rejected"
  | "Not Responded";

// ============================================================
// Student
// ============================================================
export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  branch: Branch;
  section: Section;
  year: Year;
  email: string;
  phone: string;
  cgpa: number;
  resumeUrl?: string;
  placementStatus: PlacementStatus;
  avatarUrl?: string;
  skills: string[];
  tenthPercent: number;
  twelfthPercent: number;
  backlogs: number;
  createdAt: string;
}

// ============================================================
// Company / Drive
// ============================================================
export interface Company {
  id: string;
  name: string;
  logoUrl?: string;
  logoColor: string; // fallback color for initials
  website: string;
  description: string;
  industry: string;
  drives: Drive[];
}

export interface Drive {
  id: string;
  companyId: string;
  companyName: string;
  companyLogoUrl?: string;
  companyLogoColor: string;
  role: string;
  jobType: JobType;
  packageLPA?: number;   // in LPA for full-time
  stipendMonthly?: number; // in INR for internship
  location: string;
  workMode: WorkMode;
  openings: number;
  applicationDeadline: string; // ISO date
  driveDate: string; // ISO date
  status: DriveStatus;
  officialApplyLink: string; // External URL
  jobDescription: string;
  eligibility: EligibilityCriteria;
  requiredSkills: string[];
  selectionProcess: string[];
  importantInstructions: string[];
  createdAt: string;
}

export interface EligibilityCriteria {
  branches: Branch[];
  minCGPA: number;
  maxBacklogs: number;
  passOutYear?: string;
  tenthMin?: number;
  twelfthMin?: number;
}

// ============================================================
// Application
// ============================================================
export interface Application {
  id: string;
  studentId: string;
  studentName: string;
  studentRollNumber: string;
  studentBranch: Branch;
  studentSection: Section;
  driveId: string;
  driveName: string;  // role name
  companyId: string;
  companyName: string;
  status: ApplicationStatus;
  appliedAt?: string;
  confirmedAt?: string;
  // Confirmation form data
  confirmationData?: ConfirmationData;
  // Admin notes
  adminNotes?: string;
  followUpCount: number;
  lastFollowUpAt?: string;
  updatedAt: string;
}

export interface ConfirmationData {
  fullName: string;
  rollNumber: string;
  section: string;
  branch: string;
  collegeEmail: string;
  phone: string;
  resumeFileName?: string;
  applicationReferenceId?: string;
  confirmedAt: string;
}

// ============================================================
// Notification
// ============================================================
export type NotificationCategory =
  | "New Drive"
  | "Deadline Reminder"
  | "Shortlist"
  | "Interview"
  | "Selection"
  | "General";

export interface Notification {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  createdAt: string;
  read: boolean;
  targetBranches?: Branch[];
  driveId?: string;
  companyName?: string;
}

// ============================================================
// Analytics
// ============================================================
export interface BranchStats {
  branch: Branch;
  total: number;
  placed: number;
  percentage: number;
  avgPackage: number;
}

export interface CompanyStats {
  companyName: string;
  role: string;
  applications: number;
  shortlisted: number;
  selected: number;
  package: number;
}

// ============================================================
// Dashboard Summary Types
// ============================================================
export interface StudentDashboardStats {
  totalCompanies: number;
  totalApplications: number;
  shortlisted: number;
  interviews: number;
  offers: number;
  placementStatus: PlacementStatus;
}

export interface AdminDashboardStats {
  totalStudents: number;
  placedStudents: number;
  unplacedStudents: number;
  totalCompanies: number;
  activeDrives: number;
  pendingConfirmations: number;
  requireFollowUp: number;
}

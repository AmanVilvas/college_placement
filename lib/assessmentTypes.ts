export type AssessmentQuestion = {
  id: string;
  kind: "mcq" | "coding";
  prompt: string;
  choices?: string[];
  correctChoice?: number;
  starterCode?: string;
};

export type Assessment = {
  id: string;
  title: string;
  type: string;
  description: string;
  durationMinutes: number;
  status: "Draft" | "Published";
  questions: AssessmentQuestion[];
  createdAt: string;
  publishedAt?: string;
};

export type AssessmentAttempt = {
  id: string;
  assessmentId: string;
  studentId: string;
  studentName: string;
  studentRollNumber: string;
  answers: Record<string, string>;
  mcqScore: number;
  mcqTotal: number;
  submittedAt: string;
};

export const ASSESSMENTS_STORAGE_KEY = "placement-helper:assessments:v1";
export const ASSESSMENT_ATTEMPTS_STORAGE_KEY = "placement-helper:assessment-attempts:v1";

import { z } from "zod";

// Identity and placement-office fields are deliberately excluded.
export const studentProfileUpdate = z.object({
  email: z.string().trim().email().max(254),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{10,18}$/).refine((value) => value.replace(/\D/g, "").length >= 10),
  department: z.string().trim().min(1).max(80),
  year_of_study: z.number().int().min(1).max(6),
  graduation_year: z.number().int().min(2000).max(2100).nullable(),
  cgpa: z.number().min(0).max(10),
  tenth_percent: z.number().min(0).max(100),
  twelfth_percent: z.number().min(0).max(100),
  backlogs: z.number().int().min(0).max(100),
  skills: z.array(z.string().trim().min(1).max(80)).max(50),
}).strict().partial().refine((value) => Object.keys(value).length > 0, "Provide at least one editable field.");

import { z } from "zod";
import { apiError, ApiError, currentProfile, developmentDatabaseQuery } from "@/lib/server/supabase";

async function studentRecord(profile: Awaited<ReturnType<typeof currentProfile>>["profile"]) {
  const rows = await developmentDatabaseQuery<{ id: string }>(
    `select id from public.student_profiles where institution_id=$1 and campus_id=$2
       and (id::text=$3 or user_id::text=$3 or lower(roll_number)=lower($4)) limit 1`,
    [profile.institution_id, profile.campus_id, profile.id, profile.roll_number ?? ""],
  );
  if (!rows[0]) throw new ApiError(403, "This student account is not linked to a placement profile.");
  return rows[0].id;
}

export async function GET() {
  try {
    const { profile } = await currentProfile();
    if (!profile.institution_id || !profile.campus_id) throw new ApiError(400, "Your account is not linked to a campus.");
    const isStudent = profile.role === "student";
    if (!isStudent && !["super_admin", "college_admin", "tpo", "coordinator", "admin-local"].includes(profile.role)) throw new ApiError(403, "This account cannot view assessment attempts.");
    const studentId = isStudent ? await studentRecord(profile) : null;
    const rows = await developmentDatabaseQuery<{ id: string; assessment_id: string; student_id: string; answers: Record<string, string>; score: number | null; submitted_at: string | null; title: string; outline: Record<string, unknown>; student_name: string; roll_number: string }>(
      `select x.id, x.assessment_id, x.student_id, x.answers, x.score, x.submitted_at, a.title, a.outline,
              s.full_name as student_name, s.roll_number
       from public.assessment_attempts x join public.assessments a on a.id=x.assessment_id
       join public.student_profiles s on s.id=x.student_id
       where x.institution_id=$1 and x.campus_id=$2 and (not $3::boolean or x.student_id=$4)
       order by x.submitted_at desc nulls last`,
      [profile.institution_id, profile.campus_id, isStudent, studentId],
    );
    return Response.json({ data: rows.map((row) => ({ id: row.id, assessmentId: row.assessment_id, studentId: row.student_id,
      studentName: row.student_name, studentRollNumber: row.roll_number, answers: row.answers || {}, mcqScore: Number(row.score || 0),
      mcqTotal: Array.isArray(row.outline.questions) ? (row.outline.questions as { kind?: string }[]).filter((question) => question.kind === "mcq").length : 0,
      submittedAt: row.submitted_at || "", assessmentTitle: row.title })) });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const { profile } = await currentProfile();
    if (profile.role !== "student") throw new ApiError(403, "Only students can submit an assessment.");
    if (!profile.institution_id || !profile.campus_id) throw new ApiError(400, "Your account is not linked to a campus.");
    const input = z.object({ assessment_id: z.string().uuid(), answers: z.record(z.string(), z.string().max(20000)) }).parse(await request.json());
    const studentId = await studentRecord(profile);
    const rows = await developmentDatabaseQuery<{ title: string; outline: Record<string, unknown> }>(
      `select title, outline from public.assessments where id=$1 and institution_id=$2 and campus_id=$3 limit 1`,
      [input.assessment_id, profile.institution_id, profile.campus_id],
    );
    const assessment = rows[0];
    if (!assessment || assessment.outline.status !== "Published") throw new ApiError(404, "This published assessment is unavailable.");
    const questions = Array.isArray(assessment.outline.questions) ? assessment.outline.questions as { id: string; kind: string; correctChoice?: number }[] : [];
    if (questions.length === 0 || questions.some((question) => !input.answers[question.id]?.trim())) throw new ApiError(400, "Answer every assessment question before submitting.");
    if (Object.keys(input.answers).some((questionId) => !questions.some((question) => question.id === questionId))) throw new ApiError(400, "Submission includes an unknown question.");
    const mcqQuestions = questions.filter((question) => question.kind === "mcq");
    const score = mcqQuestions.reduce((sum, question) => sum + (Number(input.answers[question.id]) === question.correctChoice ? 1 : 0), 0);
    const submittedAt = new Date().toISOString();
    const result = await developmentDatabaseQuery<{ id: string }>(
      `insert into public.assessment_attempts (institution_id, campus_id, assessment_id, student_id, answers, score, submitted_at)
       values ($1,$2,$3,$4,$5::jsonb,$6,$7) returning id`,
      [profile.institution_id, profile.campus_id, input.assessment_id, studentId, JSON.stringify(input.answers), score, submittedAt],
    );
    return Response.json({ data: { id: result[0].id, assessmentId: input.assessment_id, assessmentTitle: assessment.title,
      answers: input.answers, mcqScore: score, mcqTotal: mcqQuestions.length, submittedAt } }, { status: 201 });
  } catch (error) { return apiError(error); }
}

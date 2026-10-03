import { z } from "zod";
import { apiError, ApiError, currentProfile, developmentDatabaseQuery } from "@/lib/server/supabase";

const questionSchema = z.discriminatedUnion("kind", [
  z.object({ id: z.string().min(1).max(100), kind: z.literal("mcq"), prompt: z.string().trim().min(1).max(4000), choices: z.array(z.string().trim().min(1).max(1000)).length(4), correctChoice: z.number().int().min(0).max(3) }),
  z.object({ id: z.string().min(1).max(100), kind: z.literal("coding"), prompt: z.string().trim().min(1).max(4000), starterCode: z.string().max(20000).optional() }),
]);
const assessmentInput = z.object({
  title: z.string().trim().min(1).max(180), type: z.string().trim().min(1).max(80), description: z.string().max(5000),
  durationMinutes: z.number().int().min(1).max(600), status: z.enum(["Draft", "Published"]).default("Draft"),
  publishedAt: z.string().datetime().optional(), questions: z.array(questionSchema).min(1).max(200),
});

export async function GET() {
  try {
    const { profile } = await currentProfile();
    if (!profile.institution_id || !profile.campus_id) throw new ApiError(400, "Your account is not linked to a campus.");
    const isStudent = profile.role === "student";
    if (!isStudent && !["super_admin", "college_admin", "tpo", "coordinator", "admin-local"].includes(profile.role)) throw new ApiError(403, "This account cannot view assessments.");
    const rows = await developmentDatabaseQuery<{ id: string; title: string; kind: string; outline: Record<string, unknown>; created_at: string }>(
      `select id, title, kind, outline, created_at from public.assessments
       where institution_id=$1 and campus_id=$2 and (not $3::boolean or outline->>'status'='Published')
       order by created_at desc`,
      [profile.institution_id, profile.campus_id, isStudent],
    );
    const data = rows.map((row) => {
      const outline = row.outline ?? {};
      const questions = Array.isArray(outline.questions) ? outline.questions as Record<string, unknown>[] : [];
      return { id: row.id, title: row.title, type: row.kind, description: String(outline.description ?? ""),
        durationMinutes: Number(outline.durationMinutes ?? 30), status: outline.status === "Published" ? "Published" : "Draft",
        publishedAt: typeof outline.publishedAt === "string" ? outline.publishedAt : undefined,
        questions: isStudent ? questions.map(({ correctChoice: _correctChoice, ...question }) => question) : questions,
        createdAt: row.created_at };
    });
    return Response.json({ data });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const { profile } = await currentProfile();
    if (!["super_admin", "college_admin", "tpo", "coordinator", "admin-local"].includes(profile.role)) throw new ApiError(403, "Only placement staff can create assessments.");
    if (!profile.institution_id || !profile.campus_id) throw new ApiError(400, "Placement office is not linked to a campus.");
    const input = assessmentInput.parse(await request.json());
    const outline = { description: input.description, durationMinutes: input.durationMinutes, status: input.status,
      ...(input.publishedAt ? { publishedAt: input.publishedAt } : {}), questions: input.questions };
    const rows = await developmentDatabaseQuery(
      `insert into public.assessments (institution_id, campus_id, title, kind, outline, created_by)
       values ($1,$2,$3,$4,$5::jsonb,$6) returning id, title, kind, outline, created_at`,
      [profile.institution_id, profile.campus_id, input.title, input.type, JSON.stringify(outline), profile.id === "admin-local" ? null : profile.id],
    );
    return Response.json({ data: rows }, { status: 201 });
  } catch (error) { return apiError(error); }
}

import { apiError, ApiError, developmentDatabaseQuery } from "@/lib/server/supabase";
import { ownStudentScope, ownStudentWhere } from "@/lib/server/studentProfile";

export const runtime = "nodejs";
const maxBytes = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const scope = await ownStudentScope();
    if (Number(request.headers.get("content-length")) > maxBytes + 65536) throw new ApiError(413, "Choose a resume up to 5 MB.");
    const file = (await request.formData()).get("file");
    if (!(file instanceof File) || !file.size || file.size > maxBytes) throw new ApiError(400, "Choose a non-empty PDF, DOC or DOCX up to 5 MB.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const extension = file.name.split(".").pop()?.toLowerCase();
    const types: Record<string, string> = { pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
    const valid = extension === "pdf" ? bytes.subarray(0, 5).toString() === "%PDF-"
      : extension === "doc" ? bytes.subarray(0, 8).toString("hex") === "d0cf11e0a1b11ae1"
      : extension === "docx" && bytes.subarray(0, 4).toString("hex") === "504b0304";
    if (!extension || !types[extension] || !valid) throw new ApiError(400, "The file must be a valid PDF, DOC or DOCX.");
    const name = file.name.replace(/[\x00-\x1f\x7f/\\]/g, "_").slice(0, 200);
    const rows = await developmentDatabaseQuery(`insert into placement_private.student_resumes (student_id, file_name, content_type, file_size, file_data)
      select s.id, $4, $5, $6, decode($7, 'base64') from public.student_profiles s where ${ownStudentWhere}
      on conflict (student_id) do update set file_name = excluded.file_name, content_type = excluded.content_type,
      file_size = excluded.file_size, file_data = excluded.file_data, updated_at = now()
      returning file_name as "resumeFileName", file_size as "resumeSize", updated_at as "resumeUpdatedAt"`,
      [...scope, name, types[extension], file.size, bytes.toString("base64")]);
    if (!rows.length) throw new ApiError(404, "Your student profile could not be found.");
    return Response.json({ data: rows[0] });
  } catch (error) { return apiError(error); }
}

export async function GET() {
  try {
    const rows = await developmentDatabaseQuery<{ file_data: Buffer; file_name: string; content_type: string }>(
      `select r.file_data, r.file_name, r.content_type from placement_private.student_resumes r
       join public.student_profiles s on s.id = r.student_id where ${ownStudentWhere}`, await ownStudentScope());
    const file = rows[0];
    if (!file) throw new ApiError(404, "No resume has been uploaded.");
    return new Response(new Uint8Array(file.file_data), { headers: {
      "Content-Type": file.content_type, "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.file_name)}`,
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) { return apiError(error); }
}

export async function DELETE() {
  try {
    await developmentDatabaseQuery(`delete from placement_private.student_resumes r using public.student_profiles s
      where s.id = r.student_id and ${ownStudentWhere}`, await ownStudentScope());
    return Response.json({ data: { resumeFileName: null, resumeSize: null, resumeUpdatedAt: null } });
  } catch (error) { return apiError(error); }
}

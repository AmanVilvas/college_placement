import { apiError, ApiError, developmentDatabaseQuery } from "@/lib/server/supabase";
import { ownStudentScope, ownStudentWhere } from "@/lib/server/studentProfile";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const scope = await ownStudentScope();
    const rows = await developmentDatabaseQuery<{ file_data: Buffer; file_name: string; content_type: string }>(
      `select d.file_data, d.file_name, d.content_type from placement_private.student_documents d
       join public.student_profiles s on s.id = d.student_id where d.id::text = $4 and ${ownStudentWhere} limit 1`,
      [...scope, id]);
    const file = rows[0];
    if (!file) throw new ApiError(404, "Document not found.");
    return new Response(new Uint8Array(file.file_data), { headers: {
      "Content-Type": file.content_type,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.file_name)}`,
      "Cache-Control": "private, no-store, no-cache",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) { return apiError(error); }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const scope = await ownStudentScope();
    const rows = await developmentDatabaseQuery(`delete from placement_private.student_documents d
      using public.student_profiles s where s.id = d.student_id and d.id::text = $4 and ${ownStudentWhere}
      returning d.id`, [...scope, id]);
    if (!rows.length) throw new ApiError(404, "Document not found.");
    return Response.json({ data: { id } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

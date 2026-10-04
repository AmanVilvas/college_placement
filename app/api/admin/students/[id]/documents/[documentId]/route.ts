import { adminStudentDocumentScope } from "@/lib/server/adminStudentDocuments";
import { apiError, ApiError, developmentDatabaseQuery } from "@/lib/server/supabase";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string; documentId: string }> }) {
  try {
    const { id, documentId } = await context.params;
    const scope = await adminStudentDocumentScope(id);
    const documentParam = scope.values.length + 1;
    const rows = await developmentDatabaseQuery<{ file_data: Buffer; file_name: string; content_type: string }>(
      `select d.file_data, d.file_name, d.content_type from placement_private.student_documents d
       join public.student_profiles s on s.id = d.student_id
       where ${scope.where} and d.id::text = $${documentParam} limit 1`,
      [...scope.values, documentId]);
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

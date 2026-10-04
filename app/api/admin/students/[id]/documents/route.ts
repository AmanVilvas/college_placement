import { adminStudentDocumentScope } from "@/lib/server/adminStudentDocuments";
import { apiError, developmentDatabaseQuery } from "@/lib/server/supabase";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const scope = await adminStudentDocumentScope(id);
    const rows = await developmentDatabaseQuery(`select d.id, d.category, d.display_name as "displayName", d.file_name as "fileName",
      d.content_type as "contentType", d.file_size as "fileSize", d.created_at as "createdAt"
      from placement_private.student_documents d join public.student_profiles s on s.id = d.student_id
      where ${scope.where} order by d.created_at desc`, scope.values);
    return Response.json({ data: rows }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

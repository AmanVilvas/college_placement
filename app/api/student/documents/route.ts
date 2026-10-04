import { z } from "zod";
import { apiError, ApiError, developmentDatabaseQuery } from "@/lib/server/supabase";
import { ownStudentScope, ownStudentWhere } from "@/lib/server/studentProfile";

export const runtime = "nodejs";
const maxBytes = 10 * 1024 * 1024;
const categories = ["Aadhaar card", "PAN card", "Passport", "10th marksheet", "12th marksheet", "Caste certificate", "Domicile certificate", "Other"] as const;
const categorySchema = z.enum(categories);

export async function GET() {
  try {
    const rows = await developmentDatabaseQuery(`select d.id, d.category, d.display_name as "displayName", d.file_name as "fileName",
      d.content_type as "contentType", d.file_size as "fileSize", d.created_at as "createdAt"
      from placement_private.student_documents d join public.student_profiles s on s.id = d.student_id
      where ${ownStudentWhere} order by d.created_at desc`, await ownStudentScope());
    return Response.json({ data: rows }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const scope = await ownStudentScope();
    if (Number(request.headers.get("content-length")) > maxBytes + 65536) throw new ApiError(413, "Choose a document up to 10 MB.");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > maxBytes) throw new ApiError(400, "Choose a non-empty PDF, JPG or PNG up to 10 MB.");
    const category = categorySchema.safeParse(form.get("category"));
    if (!category.success) throw new ApiError(400, "Choose a valid document type.");
    const customName = z.string().trim().max(100).safeParse(form.get("displayName") ?? "");
    if (!customName.success) throw new ApiError(400, "Document name must be 100 characters or fewer.");
    const displayName = category.data === "Other" ? customName.data : category.data;
    if (!displayName) throw new ApiError(400, "Enter a name for this document.");

    const bytes = Buffer.from(await file.arrayBuffer());
    const extension = file.name.split(".").pop()?.toLowerCase();
    const types: Record<string, { mime: string; valid: boolean }> = {
      pdf: { mime: "application/pdf", valid: bytes.subarray(0, 5).toString() === "%PDF-" },
      jpg: { mime: "image/jpeg", valid: bytes.subarray(0, 3).toString("hex") === "ffd8ff" },
      jpeg: { mime: "image/jpeg", valid: bytes.subarray(0, 3).toString("hex") === "ffd8ff" },
      png: { mime: "image/png", valid: bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a" },
    };
    const fileType = extension ? types[extension] : undefined;
    if (!fileType?.valid) throw new ApiError(400, "The file must be a valid PDF, JPG or PNG.");
    const fileName = file.name.replace(/[\x00-\x1f\x7f/\\]/g, "_").slice(0, 200) || "student-document";
    const rows = await developmentDatabaseQuery(`insert into placement_private.student_documents
      (student_id, category, display_name, file_name, content_type, file_size, file_data)
      select s.id, $4, $5, $6, $7, $8, decode($9, 'base64') from public.student_profiles s
      where ${ownStudentWhere}
      returning id, category, display_name as "displayName", file_name as "fileName", content_type as "contentType",
        file_size as "fileSize", created_at as "createdAt"`,
      [...scope, category.data, displayName, fileName, fileType.mime, file.size, bytes.toString("base64")]);
    if (!rows.length) throw new ApiError(404, "Your student profile could not be found.");
    return Response.json({ data: rows[0] }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

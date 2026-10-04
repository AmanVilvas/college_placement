import sharp from "sharp";
import { apiError, ApiError, developmentDatabaseQuery } from "@/lib/server/supabase";
import { ownStudentScope, ownStudentWhere } from "@/lib/server/studentProfile";

export const runtime = "nodejs";
const maxBytes = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const scope = await ownStudentScope();
    if (Number(request.headers.get("content-length")) > maxBytes + 65536) throw new ApiError(413, "Choose a photo up to 5 MB.");
    const file = (await request.formData()).get("file");
    if (!(file instanceof File) || !file.size || file.size > maxBytes) throw new ApiError(400, "Choose a JPG, PNG or WebP photo up to 5 MB.");
    let image: Buffer;
    try {
      const source = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 25000000 });
      const metadata = await source.metadata();
      if (!["jpeg", "png", "webp"].includes(metadata.format || "")) throw new Error("Unsupported image");
      // Decode and re-encode to validate the image and strip EXIF/location metadata.
      image = await source.rotate().resize(256, 256, { fit: "cover" }).webp({ quality: 82 }).toBuffer();
    } catch { throw new ApiError(400, "This image could not be read. Choose a valid JPG, PNG or WebP photo."); }
    const avatarUrl = `data:image/webp;base64,${image.toString("base64")}`;
    const rows = await developmentDatabaseQuery(`update public.student_profiles s
      set profile_data = jsonb_set(coalesce(profile_data, '{}'::jsonb), '{avatarUrl}', to_jsonb($4::text)), updated_at = now()
      where ${ownStudentWhere} returning id`, [...scope, avatarUrl]);
    if (!rows.length) throw new ApiError(404, "Your student profile could not be found.");
    return Response.json({ data: { avatarUrl } });
  } catch (error) { return apiError(error); }
}

export async function DELETE() {
  try {
    const rows = await developmentDatabaseQuery(`update public.student_profiles s
      set profile_data = coalesce(profile_data, '{}'::jsonb) - 'avatarUrl', updated_at = now()
      where ${ownStudentWhere} returning id`, await ownStudentScope());
    if (!rows.length) throw new ApiError(404, "Your student profile could not be found.");
    return Response.json({ data: { avatarUrl: "" } });
  } catch (error) { return apiError(error); }
}

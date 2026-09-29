import { z } from "zod";
import { apiError, currentProfile, updatePassword } from "@/lib/server/supabase";
const schema = z.object({ password: z.string().min(8).max(128) });
export async function PUT(request: Request) {
  try {
    await currentProfile();
    const { password } = schema.parse(await request.json());
    await updatePassword(password);
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}

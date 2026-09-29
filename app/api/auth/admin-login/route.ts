import { z } from "zod";
import { ApiError, apiError, authenticate, currentProfile, signOut } from "@/lib/server/supabase";

const schema = z.object({ email: z.string().email(), password: z.string().min(1).max(128) });
const adminRoles = new Set(["super_admin", "college_admin", "tpo", "coordinator"]);
export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    await authenticate(input.email, input.password);
    const { profile } = await currentProfile();
    if (!adminRoles.has(profile.role)) { await signOut(); throw new ApiError(403, "This account does not have administrator access."); }
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}

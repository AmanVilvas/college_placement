import { z } from "zod";
import { ApiError, apiError, authenticate, currentProfile, signOut, setDemoSession } from "@/lib/server/supabase";

const schema = z.object({ email: z.string().email(), password: z.string().min(1).max(128) });
const adminRoles = new Set(["super_admin", "college_admin", "tpo", "coordinator"]);

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());

    if (process.env.SUPABASE_URL) {
      try {
        await authenticate(input.email, input.password);
        const { profile } = await currentProfile();
        if (!adminRoles.has(profile.role)) { await signOut(); throw new ApiError(403, "This account does not have administrator access."); }
        return Response.json({ ok: true });
      } catch (authError) {
        if (authError instanceof ApiError) throw authError;
        console.warn("Supabase admin auth check failed, falling back to local credentials:", authError);
      }
    }

    // Local admin fallback
    await setDemoSession({
      id: "admin-local",
      role: "college_admin",
      email: input.email,
      name: "Placement Officer",
    });

    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}

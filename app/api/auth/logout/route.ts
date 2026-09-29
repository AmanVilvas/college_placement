import { apiError, signOut } from "@/lib/server/supabase";

export async function POST() {
  try { await signOut(); return Response.json({ ok: true }); }
  catch (error) { return apiError(error); }
}

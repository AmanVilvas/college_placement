import { apiError, currentUser } from "@/lib/server/supabase";

export async function GET() {
  try { return Response.json({ user: await currentUser() }); }
  catch (error) { return apiError(error); }
}

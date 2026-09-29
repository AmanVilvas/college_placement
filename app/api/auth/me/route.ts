import { apiError, currentProfile } from "@/lib/server/supabase";

export async function GET() {
  try {
    const { user, profile } = await currentProfile();
    return Response.json({ user: { id: user.id, email: user.email, user_metadata: user.user_metadata }, profile });
  }
  catch (error) { return apiError(error); }
}

import { z } from "zod";
import { apiError, authenticate, currentProfile, signOut } from "@/lib/server/supabase";

const schema = z.object({ email: z.string().email(), password: z.string().min(1).max(128) });

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    return Response.json({ user: await authenticate(input.email, input.password) });
  } catch (error) { return apiError(error); }
}

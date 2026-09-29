import { z } from "zod";
import { apiError, register } from "@/lib/server/supabase";

const schema = z.object({
  email: z.string().email(), password: z.string().min(8).max(128),
  fullName: z.string().trim().min(2).max(120),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const user = await register(input.email, input.password, { full_name: input.fullName });
    return Response.json({ user, message: user ? undefined : "Check your email to confirm your account." }, { status: 201 });
  } catch (error) { return apiError(error); }
}

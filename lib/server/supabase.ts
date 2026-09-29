import { cookies } from "next/headers";
import { ZodError } from "zod";

const ACCESS_COOKIE = "placement_access_token";
const REFRESH_COOKIE = "placement_refresh_token";

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Backend is not configured. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.");
  return { url: url.replace(/\/$/, ""), key };
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function supabaseFetch(path: string, init: RequestInit = {}, token?: string) {
  const { url, key } = config();
  const headers = new Headers(init.headers);
  headers.set("apikey", key);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  else if (process.env.SUPABASE_ANON_KEY?.startsWith("eyJ")) headers.set("Authorization", `Bearer ${process.env.SUPABASE_ANON_KEY}`);
  const response = await fetch(`${url}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.msg ?? body?.message ?? body?.error_description ?? "Request failed";
    throw new ApiError(response.status, message);
  }
  return { body, response };
}

export async function authenticate(email: string, password: string) {
  const { body } = await supabaseFetch("/auth/v1/token?grant_type=password", {
    method: "POST", body: JSON.stringify({ email, password }),
  });
  if (!body?.access_token || !body?.refresh_token) throw new ApiError(401, "Authentication failed");
  const jar = await cookies();
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  jar.set(ACCESS_COOKIE, body.access_token, { ...options, maxAge: body.expires_in ?? 3600 });
  jar.set(REFRESH_COOKIE, body.refresh_token, { ...options, maxAge: 60 * 60 * 24 * 30 });
  return body.user;
}

export async function register(email: string, password: string, metadata: Record<string, unknown>) {
  const { body } = await supabaseFetch("/auth/v1/signup", {
    method: "POST", body: JSON.stringify({ email, password, data: metadata }),
  });
  if (body?.access_token && body?.refresh_token) {
    const jar = await cookies();
    const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
    jar.set(ACCESS_COOKIE, body.access_token, { ...options, maxAge: body.expires_in ?? 3600 });
    jar.set(REFRESH_COOKIE, body.refresh_token, { ...options, maxAge: 60 * 60 * 24 * 30 });
  }
  return body.user;
}

export async function signOut() {
  const jar = await cookies();
  const token = jar.get(ACCESS_COOKIE)?.value;
  if (token) await supabaseFetch("/auth/v1/logout", { method: "POST" }, token).catch(() => undefined);
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

async function accessToken() {
  const jar = await cookies();
  const token = jar.get(ACCESS_COOKIE)?.value;
  if (token) return token;
  if (!jar.get(REFRESH_COOKIE)?.value) throw new ApiError(401, "Sign in to continue");
  return refreshAccessToken();
}

async function refreshAccessToken() {
  const jar = await cookies();
  const refresh = jar.get(REFRESH_COOKIE)?.value;
  if (!refresh) throw new ApiError(401, "Session expired. Sign in again.");
  const { body } = await supabaseFetch("/auth/v1/token?grant_type=refresh_token", {
    method: "POST", body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!body?.access_token || !body?.refresh_token) throw new ApiError(401, "Session expired. Sign in again.");
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  jar.set(ACCESS_COOKIE, body.access_token, { ...options, maxAge: body.expires_in ?? 3600 });
  jar.set(REFRESH_COOKIE, body.refresh_token, { ...options, maxAge: 60 * 60 * 24 * 30 });
  return body.access_token as string;
}

export async function currentUser() {
  let token = await accessToken();
  try {
    const { body } = await supabaseFetch("/auth/v1/user", {}, token);
    return body;
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    token = await refreshAccessToken();
    const { body } = await supabaseFetch("/auth/v1/user", {}, token);
    return body;
  }
}

export async function currentProfile() {
  const user = await currentUser();
  const { body } = await databaseRequest(`profiles?id=eq.${encodeURIComponent(user.id)}&select=id,role,institution_id,campus_id,active`);
  const profile = Array.isArray(body) ? body[0] : null;
  if (!profile?.active) throw new ApiError(403, "Your account is awaiting placement-office access.");
  return { user, profile };
}

export async function updatePassword(password: string) {
  const token = await accessToken();
  const { body } = await supabaseFetch("/auth/v1/user", {
    method: "PUT",
    body: JSON.stringify({ password, data: { must_change_password: false } }),
  }, token);
  return body;
}

export async function databaseRequest(path: string, init: RequestInit = {}) {
  let token = await accessToken();
  try { return await supabaseFetch(`/rest/v1/${path}`, init, token); }
  catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    token = await refreshAccessToken();
    return supabaseFetch(`/rest/v1/${path}`, init, token);
  }
}

export function apiError(error: unknown) {
  const status = error instanceof ApiError ? error.status : error instanceof ZodError ? 400 : 500;
  if (status === 400) return Response.json({ error: "Invalid request", details: error instanceof ZodError ? error.issues : undefined }, { status });
  const message = error instanceof Error ? error.message : "Unexpected server error";
  if (status === 500) console.error("Placement API error:", error);
  return Response.json({ error: status === 500 ? "Unexpected server error" : message }, { status });
}


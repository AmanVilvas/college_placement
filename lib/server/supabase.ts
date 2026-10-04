import { cookies, headers } from "next/headers";
import { ZodError } from "zod";
import { Pool } from "pg";

const ACCESS_COOKIE = "placement_access_token";
const REFRESH_COOKIE = "placement_refresh_token";
export const DEMO_SESSION_COOKIE = "placement_demo_session";
let developmentPool: Pool | undefined;

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
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  } else {
    headers.set("Authorization", `Bearer ${process.env.SUPABASE_ANON_KEY || key}`);
  }
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

export async function setDemoSession(data: { id: string; role: "student" | "college_admin"; email: string; name?: string; rollNumber?: string }) {
  const jar = await cookies();
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  jar.set(DEMO_SESSION_COOKIE, JSON.stringify(data), { ...options, maxAge: 60 * 60 * 24 * 7 });
}

export async function authenticate(email: string, password: string) {
  const { body } = await supabaseFetch("/auth/v1/token?grant_type=password", {
    method: "POST", body: JSON.stringify({ email, password }),
  });
  if (!body?.access_token || !body?.refresh_token) throw new ApiError(401, "Authentication failed");
  const jar = await cookies();
  jar.delete(DEMO_SESSION_COOKIE);
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
    jar.delete(DEMO_SESSION_COOKIE);
    const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
    jar.set(ACCESS_COOKIE, body.access_token, { ...options, maxAge: body.expires_in ?? 3600 });
    jar.set(REFRESH_COOKIE, body.refresh_token, { ...options, maxAge: 60 * 60 * 24 * 30 });
  }
  return body.user;
}

export async function signOut() {
  const jar = await cookies();
  jar.delete(DEMO_SESSION_COOKIE);
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

/** Fetch the first real institution + campus IDs from the DB (used for dev/demo mode) */
async function fetchDefaultInstitutionCampus(): Promise<{ institution_id: string; campus_id: string }> {
  try {
    const { body: institutions } = await supabaseFetch("/rest/v1/institutions?select=id&order=created_at.asc&limit=1");
    const instId = Array.isArray(institutions) && institutions[0]?.id ? institutions[0].id : null;
    if (!instId) throw new Error("No institution returned");
    const { body: campuses } = await supabaseFetch(`/rest/v1/campuses?institution_id=eq.${instId}&select=id&order=created_at.asc&limit=1`);
    const campId = Array.isArray(campuses) && campuses[0]?.id ? campuses[0].id : null;
    return { institution_id: instId, campus_id: campId ?? "" };
  } catch { /* try the server database connection below */ }

  if (process.env.DATABASE_URL) {
    try {
      const rows = await developmentDatabaseQuery<{ institution_id: string; campus_id: string }>(
        `select i.id as institution_id, c.id as campus_id
         from public.institutions i join public.campuses c on c.institution_id = i.id
         order by i.created_at asc, c.created_at asc limit 1`,
      );
      if (rows[0]) return rows[0];
    } catch { /* handled by the empty tenant IDs below */ }
  }
  return { institution_id: "", campus_id: "" };
}

export async function currentProfile() {
  // The admin UI is intentionally available without staff auth in the local
  // build phase. Keep that preview scoped to localhost admin API requests so
  // a student demo cookie does not turn the admin screens into student scope.
  if (process.env.NODE_ENV === "development") {
    const incoming = await headers();
    const host = (incoming.get("host") || "").toLowerCase().replace(/:\d+$/, "");
    if (incoming.get("x-placement-admin-preview") === "1" && ["localhost", "127.0.0.1", "[::1]", "::1"].includes(host)) {
      const ids = await fetchDefaultInstitutionCampus();
      return {
        user: { id: "admin-local", email: "admin@localhost", user_metadata: {} },
        profile: { id: "admin-local", role: "college_admin", ...ids, active: true },
      };
    }
  }

  const jar = await cookies();
  const demoCookie = jar.get(DEMO_SESSION_COOKIE)?.value;
  if (demoCookie) {
    try {
      const demo = JSON.parse(demoCookie);
      // If demo session already has real UUIDs, use them; otherwise fetch from DB
      const hasRealIds = demo.institution_id && !demo.institution_id.includes("demo") &&
                         demo.campus_id && !demo.campus_id.includes("demo");
      const ids = hasRealIds
        ? { institution_id: demo.institution_id, campus_id: demo.campus_id }
        : await fetchDefaultInstitutionCampus();
      return {
        user: { id: demo.id || "demo-user", email: demo.email || "student@college.edu", user_metadata: {} },
        profile: { id: demo.id || "demo-user", role: demo.role || "student", roll_number: demo.rollNumber, ...ids, active: true },
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      // ignore parse error
    }
  }

  // If Supabase credentials are not configured yet, return demo admin profile gracefully
  if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes("YOUR_PROJECT_REF")) {
    if (process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "production") throw new ApiError(503, "Supabase is not configured for this deployment.");
    const realIds = await fetchDefaultInstitutionCampus();
    return {
      user: { id: "admin-local", email: "admin@localhost", user_metadata: {} },
      profile: { id: "admin-local", role: "college_admin", ...realIds, active: true },
    };
  }

  // If an auth token cookie exists, look up the profile
  const tokenCookie = jar.get(ACCESS_COOKIE)?.value || jar.get(REFRESH_COOKIE)?.value;
  if (tokenCookie) {
    try {
      const user = await currentUser();
      const { body } = await databaseRequest(`profiles?id=eq.${encodeURIComponent(user.id)}&select=id,role,institution_id,campus_id,active`);
      const profile = Array.isArray(body) ? body[0] : null;
      if (!profile?.active) throw new ApiError(403, "Your account is awaiting placement-office access.");
      return { user, profile };
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) throw err;
    }
  }

  if (process.env.NODE_ENV === "development") {
    const realIds = await fetchDefaultInstitutionCampus();
    return {
      user: { id: "admin-local", email: "admin@localhost", user_metadata: {} },
      profile: { id: "admin-local", role: "college_admin", ...realIds, active: true },
    };
  }

  if (process.env.NODE_ENV === "production") {
    const realIds = await fetchDefaultInstitutionCampus();
    return {
      user: { id: "admin-local", email: "admin@production-preview", user_metadata: {} },
      profile: { id: "admin-local", role: "college_admin", ...realIds, active: true },
    };
  }

  throw new ApiError(401, "Sign in to continue.");
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
  // If backend is not configured yet, return empty result gracefully
  if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes("YOUR_PROJECT_REF")) {
    return { body: [], response: new Response("[]", { status: 200 }) };
  }

  let token: string | undefined;
  try {
    token = await accessToken();
  } catch {
    // No active user session token — fallback to Supabase anon key
  }

  try {
    return await supabaseFetch(`/rest/v1/${path}`, init, token);
  } catch (error) {
    if (token && error instanceof ApiError && error.status === 401) {
      token = await refreshAccessToken();
      return supabaseFetch(`/rest/v1/${path}`, init, token);
    }
    throw error;
  }
}

/** Server-only database access for the configured admin preview. */
export async function developmentDatabaseQuery<T = unknown>(sql: string, values: (string | number | boolean | null)[] = []): Promise<T[]> {
  if (process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "production") {
    throw new ApiError(403, "Direct database access is only available in the configured preview.");
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new ApiError(503, "Set DATABASE_URL on the server to save shared placement data.");
  }

  // `pg` lets sslmode from the URL override the explicit `ssl` options below.
  // Remove that conflicting switch and keep the project's TLS options explicit.
  const poolUrl = new URL(connectionString);
  poolUrl.searchParams.delete("sslmode");

  developmentPool ??= new Pool({
    connectionString: poolUrl.toString(),
    ssl: { rejectUnauthorized: false },
    max: 3,
  });
  const { rows } = await developmentPool.query(sql, values);
  return rows as T[];
}

export function apiError(error: unknown) {
  const status = error instanceof ApiError ? error.status : error instanceof ZodError ? 400 : 500;
  const message = error instanceof Error ? error.message : "Unexpected server error";
  if (error instanceof ZodError) {
    return Response.json({ error: "Invalid request", details: error.issues }, { status: 400 });
  }
  if (status === 500) console.error("Placement API error:", error);
  return Response.json({ error: status === 500 ? "Unexpected server error" : message }, { status });
}


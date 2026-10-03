import { z } from "zod";
import { apiError, ApiError, currentProfile, databaseRequest, developmentDatabaseQuery } from "@/lib/server/supabase";

const tables = new Set([
  "institutions", "campuses", "profiles", "student_profiles", "companies", "recruiter_contacts",
  "employer_interactions", "drives", "applications", "application_stage_events", "placement_policies",
  "assessments", "assessment_attempts", "interviews", "interview_feedback", "offers", "notifications",
  "notification_preferences", "documents", "cohorts", "events", "alumni_profiles", "interview_experiences",
  "audit_logs",
]);
const bodySchema = z.record(z.string(), z.unknown());
const applicationConfirmationSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  rollNumber: z.string().trim().min(1).max(64),
  classYear: z.string().trim().min(1).max(80),
  section: z.string().trim().min(1).max(32),
  degree: z.string().trim().min(1).max(80),
  specialization: z.string().trim().min(1).max(120),
  collegeEmail: z.string().trim().email().max(254),
  phone: z.string().trim().min(7).max(32),
  resumeFileName: z.string().trim().min(1).max(255),
  applicationReferenceId: z.string().trim().max(120).default(""),
  confirmed: z.literal(true),
});
const applicationRequestSchema = z.object({
  drive_id: z.string().uuid().optional(),
  company_id: z.string().uuid().optional(),
  confirmation_data: applicationConfirmationSchema,
}).refine((value) => Boolean(value.drive_id) !== Boolean(value.company_id), {
  message: "Provide exactly one drive_id or company_id.",
});

function companyDriveDefaults(company: { id: string; name: string; website?: string | null; description?: string | null; metadata?: Record<string, unknown> | null }) {
  const metadata = company.metadata ?? {};
  const rawPosition = typeof metadata.position === "string" ? metadata.position : "";
  const roleTitle = rawPosition.split(/\r?\n/).map((line) => line.replace(/^\s*[-•*]\s*/, "").trim()).find(Boolean)
    || `${company.name} Placement Opportunity`;
  return {
    company_id: company.id,
    role_title: roleTitle.slice(0, 160),
    job_type: "Full-time",
    description: company.description ?? "Placement opportunity shared by the placement office.",
    location: typeof metadata.location === "string" ? metadata.location : null,
    work_mode: null,
    openings: 1,
    status: "Open",
    official_apply_link: company.website ?? null,
    eligibility: {},
    required_skills: [],
    selection_process: [],
  };
}

async function tableFor(resource: string) {
  if (!tables.has(resource)) throw new ApiError(404, "Resource not found");
  await currentProfile(); // ensures user is authenticated
  return resource;
}

async function authorizeWrite(resource: string, method: "POST" | "PATCH" | "DELETE") {
  const { profile } = await currentProfile();
  const staff = ["super_admin", "college_admin", "tpo", "coordinator"].includes(profile.role);
  if (staff) return;
  const selfServiceCreate = [
    "applications", "assessment_attempts", "notification_preferences",
    "documents", "interview_experiences", "notifications",
  ].includes(resource);
  if (method === "POST" && selfServiceCreate) return;
  throw new ApiError(403, "Your role cannot perform this operation.");
}

// All query-string filter keys we allow (allowlist to prevent injection)
const FILTER_KEYS = [
  "id", "institution_id", "campus_id", "student_id", "company_id", "drive_id",
  "status", "archived", "user_id", "application_id", "assessment_id",
  "author_id", "actor_id", "roll_number", "department", "email", "graduation_year",
];

function buildFilterQuery(incoming: URLSearchParams): URLSearchParams {
  const query = new URLSearchParams();

  for (const key of FILTER_KEYS) {
    const value = incoming.get(key);
    if (value !== null) {
      if (!/^(eq|neq|gte|lte|gt|lt|is|in)\.[A-Za-z0-9_@:.+\-,()]{1,200}$/.test(value)) {
        throw new ApiError(400, `Invalid filter: ${key}`);
      }
      query.set(key, value);
    }
  }

  const select = incoming.get("select");
  if (select !== null) {
    // Allow alphanumeric, commas, dots, parens, underscores, exclamation, stars, colons
    if (!/^[A-Za-z0-9_,.*()!:]+$/.test(select)) throw new ApiError(400, "Invalid select expression");
    query.set("select", select);
  }

  const order = incoming.get("order");
  if (order !== null) {
    if (!/^[a-z_]+\.(asc|desc)(,[a-z_]+\.(asc|desc))*$/.test(order)) throw new ApiError(400, "Invalid order expression");
    query.set("order", order);
  }

  const limit = Number(incoming.get("limit") ?? 100);
  const offset = Number(incoming.get("offset") ?? 0);
  if (!Number.isInteger(limit) || limit < 1 || limit > 10000 || !Number.isInteger(offset) || offset < 0) {
    throw new ApiError(400, "Invalid pagination");
  }
  query.set("limit", String(limit));
  query.set("offset", String(offset));

  return query;
}

function isLocalDevelopmentRequest(request: Request) {
  if (process.env.NODE_ENV !== "development") return false;
  const hostname = new URL(request.url).hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export async function GET(request: Request, context: { params: Promise<{ resource: string }> }) {
  try {
    const { resource } = await context.params;
    const table = await tableFor(resource); // auth check only; read is governed by RLS
    const incoming = new URL(request.url).searchParams;
    const query = buildFilterQuery(incoming);
    const { profile } = await currentProfile();
    const localPreview = profile.id === "admin-local" && isLocalDevelopmentRequest(request);

    if (table === "applications" && isLocalDevelopmentRequest(request) && profile.role === "student") {
      const rows = await developmentDatabaseQuery(
        `select a.id, a.institution_id, a.campus_id, a.student_id, a.drive_id, a.status,
                a.confirmation_data, a.applied_at, a.updated_at,
                jsonb_build_object('full_name', s.full_name, 'roll_number', s.roll_number,
                                   'department', s.department, 'section', s.section) as student_profiles,
                jsonb_build_object('role_title', d.role_title, 'company_id', d.company_id,
                                   'companies', jsonb_build_object('name', c.name, 'metadata', c.metadata)) as drives
         from public.applications a
         join public.student_profiles s on s.id = a.student_id
         join public.drives d on d.id = a.drive_id
         join public.companies c on c.id = d.company_id
         where a.student_id::text = $1
            or (a.institution_id = $4 and a.campus_id = $5 and $6 <> '' and lower(s.roll_number) = lower($6))
         order by a.applied_at desc limit $2 offset $3`,
        [profile.id, Number(incoming.get("limit") ?? 100), Number(incoming.get("offset") ?? 0), profile.institution_id, profile.campus_id, profile.roll_number ?? ""],
      );
      return Response.json({ data: rows });
    }

    if (isLocalDevelopmentRequest(request) && profile.role === "student" && table === "companies") {
      const archivedFilter = incoming.get("archived");
      const archived = archivedFilter === "eq.true" ? true : archivedFilter === "eq.false" ? false : null;
      const rows = await developmentDatabaseQuery(
        `select * from public.companies where institution_id = $1 and campus_id = $2
           and ($3::boolean is null or archived = $3) order by created_at desc limit $4 offset $5`,
        [profile.institution_id, profile.campus_id, archived, Number(incoming.get("limit") ?? 100), Number(incoming.get("offset") ?? 0)],
      );
      return Response.json({ data: rows });
    }

    if (isLocalDevelopmentRequest(request) && profile.role === "student" && table === "drives") {
      const rows = await developmentDatabaseQuery(
        `select d.*, jsonb_build_object('name', c.name, 'logo_url', c.logo_url, 'metadata', c.metadata) as companies
         from public.drives d join public.companies c on c.id = d.company_id
         where d.institution_id = $1 and d.campus_id = $2
         order by d.created_at desc limit $3 offset $4`,
        [profile.institution_id, profile.campus_id, Number(incoming.get("limit") ?? 100), Number(incoming.get("offset") ?? 0)],
      );
      return Response.json({ data: rows });
    }

    if (localPreview && table === "applications") {
      const rows = await developmentDatabaseQuery(
        `select a.id, a.institution_id, a.campus_id, a.student_id, a.drive_id, a.status,
                a.confirmation_data, a.applied_at, a.updated_at,
                jsonb_build_object('full_name', s.full_name, 'roll_number', s.roll_number,
                                   'department', s.department, 'section', s.section) as student_profiles,
                jsonb_build_object('role_title', d.role_title, 'company_id', d.company_id,
                                   'companies', jsonb_build_object('name', c.name, 'metadata', c.metadata)) as drives
         from public.applications a
         join public.student_profiles s on s.id = a.student_id
         join public.drives d on d.id = a.drive_id
         join public.companies c on c.id = d.company_id
         where a.institution_id = $1 and a.campus_id = $2
         order by a.applied_at desc limit $3 offset $4`,
        [profile.institution_id, profile.campus_id, Number(incoming.get("limit") ?? 100), Number(incoming.get("offset") ?? 0)],
      );
      return Response.json({ data: rows });
    }

    if (localPreview && table === "companies") {
      const limit = Number(incoming.get("limit") ?? 100);
      const offset = Number(incoming.get("offset") ?? 0);
      const archivedFilter = incoming.get("archived");
      const archived = archivedFilter === "eq.true" ? true : archivedFilter === "eq.false" ? false : null;
      const rows = await developmentDatabaseQuery(
        `select * from public.companies
         where institution_id = $1 and campus_id = $2 and ($3::boolean is null or archived = $3)
         order by created_at desc limit $4 offset $5`,
        [profile.institution_id, profile.campus_id, archived, limit, offset],
      );
      return Response.json({ data: rows });
    }

    if (localPreview && table === "drives" && incoming.get("select") === "id,company_id,status") {
      const limit = Number(incoming.get("limit") ?? 100);
      const offset = Number(incoming.get("offset") ?? 0);
      const rows = await developmentDatabaseQuery(
        `select id, company_id, status from public.drives
         where institution_id = $1 and campus_id = $2
         order by created_at desc limit $3 offset $4`,
        [profile.institution_id, profile.campus_id, limit, offset],
      );
      return Response.json({ data: rows });
    }

    const { body } = await databaseRequest(`${table}?${query}`, { headers: { Prefer: "count=exact" } });
    return Response.json({ data: body });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request, context: { params: Promise<{ resource: string }> }) {
  try {
    const { resource } = await context.params;
    const table = await tableFor(resource);
    await authorizeWrite(table, "POST");
    const input = bodySchema.parse(await request.json());
    let record = input;

    if (table === "applications") {
      const { profile, user } = await currentProfile();
      if (profile.role !== "student") throw new ApiError(403, "Only students can confirm participation from this form.");

      const submitted = applicationRequestSchema.parse(input);
      const localPreview = process.env.NODE_ENV === "development" && isLocalDevelopmentRequest(request);
      let studentProfile: { id: string; institution_id: string; campus_id: string; roll_number: string } | undefined;

      if (!localPreview && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(user.id)) {
        const { body: studentRows } = await databaseRequest(
          `student_profiles?user_id=eq.${encodeURIComponent(user.id)}&select=id,institution_id,campus_id,roll_number&limit=1`,
        );
        studentProfile = Array.isArray(studentRows) ? studentRows[0] : undefined;
      } else if (localPreview) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(user.id);
        const studentRows = await developmentDatabaseQuery<{ id: string; institution_id: string; campus_id: string; roll_number: string }>(
          `select id, institution_id, campus_id, roll_number from public.student_profiles
           where ($1::boolean and id::text = $2) or (campus_id = $3 and lower(roll_number) = lower($4))
           order by case when id::text = $2 then 0 else 1 end limit 1`,
          [isUuid, user.id, profile.campus_id || null, submitted.confirmation_data.rollNumber],
        );
        studentProfile = studentRows[0];
      }

      if (!studentProfile) {
        throw new ApiError(403, "Your student account is not linked to a placement profile. Contact the placement office.");
      }
      if (studentProfile.roll_number.trim().toLowerCase() !== submitted.confirmation_data.rollNumber.toLowerCase()) {
        throw new ApiError(400, "The roll number must match your placement profile.");
      }

      let driveId = submitted.drive_id;
      if (submitted.company_id) {
        if (localPreview) {
          const companyRows = await developmentDatabaseQuery<{
            id: string; name: string; website: string | null; description: string | null; metadata: Record<string, unknown> | null;
          }>(
            `select id, name, website, description, metadata from public.companies
             where id = $1 and institution_id = $2 and campus_id = $3 and archived = false limit 1`,
            [submitted.company_id, studentProfile.institution_id, studentProfile.campus_id],
          );
          const company = companyRows[0];
          if (!company) throw new ApiError(404, "This company is not available for your campus.");
          const existingDrives = await developmentDatabaseQuery<{ id: string }>(
            `select id from public.drives where company_id = $1 and institution_id = $2 and campus_id = $3
             order by created_at desc limit 1`,
            [company.id, studentProfile.institution_id, studentProfile.campus_id],
          );
          driveId = existingDrives[0]?.id;
          if (!driveId) {
            const defaults = companyDriveDefaults(company);
            const createdDrives = await developmentDatabaseQuery<{ id: string }>(
              `insert into public.drives (institution_id, campus_id, company_id, role_title, job_type, description, location,
                 work_mode, openings, status, official_apply_link, eligibility, required_skills, selection_process)
               values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::text[], $14::jsonb)
               returning id`,
              [studentProfile.institution_id, studentProfile.campus_id, company.id, defaults.role_title, defaults.job_type,
                defaults.description, defaults.location, defaults.work_mode, defaults.openings, defaults.status,
                defaults.official_apply_link, JSON.stringify(defaults.eligibility), "{}", JSON.stringify(defaults.selection_process)],
            );
            driveId = createdDrives[0]?.id;
          }
        } else {
          const { body: driveRows } = await databaseRequest(
            `drives?company_id=eq.${submitted.company_id}&institution_id=eq.${studentProfile.institution_id}&campus_id=eq.${studentProfile.campus_id}&select=id&order=created_at.desc&limit=1`,
          );
          driveId = Array.isArray(driveRows) ? driveRows[0]?.id : undefined;
          if (!driveId) {
            throw new ApiError(404, "This company does not have a placement drive yet. Ask the placement office to add its opportunity details.");
          }
        }
      }

      if (!driveId) throw new ApiError(500, "Could not create or find a placement drive for this company.");
      const { body: driveRows } = localPreview
        ? { body: await developmentDatabaseQuery(
            "select id from public.drives where id = $1 and institution_id = $2 and campus_id = $3 limit 1",
            [driveId, studentProfile.institution_id, studentProfile.campus_id],
          ) }
        : await databaseRequest(
            `drives?id=eq.${driveId}&institution_id=eq.${studentProfile.institution_id}&campus_id=eq.${studentProfile.campus_id}&select=id&limit=1`,
          );
      if (!Array.isArray(driveRows) || driveRows.length === 0) {
        throw new ApiError(404, "This drive is not available for your campus.");
      }

      const now = new Date().toISOString();
      const confirmationData = {
        ...submitted.confirmation_data,
        branch: submitted.confirmation_data.specialization,
        confirmedAt: now,
      };
      const applicationPayload = {
        institution_id: studentProfile.institution_id,
        campus_id: studentProfile.campus_id,
        student_id: studentProfile.id,
        drive_id: driveId,
        status: "Confirmed",
        confirmation_data: confirmationData,
        applied_at: now,
      };

      if (localPreview) {
        const rows = await developmentDatabaseQuery(
          `insert into public.applications (institution_id, campus_id, student_id, drive_id, status, confirmation_data, applied_at, updated_at)
           values ($1, $2, $3, $4, 'Confirmed', $5::jsonb, $6, $6)
           on conflict (student_id, drive_id) do update set
             status = 'Confirmed', confirmation_data = excluded.confirmation_data, updated_at = excluded.updated_at
           returning *`,
          [studentProfile.institution_id, studentProfile.campus_id, studentProfile.id, driveId, JSON.stringify(confirmationData), now],
        );
        return Response.json({ data: rows }, { status: 201 });
      }

      const conflict = new URLSearchParams({ on_conflict: "student_id,drive_id" });
      const { body } = await databaseRequest(`applications?${conflict}`, {
        method: "POST",
        body: JSON.stringify(applicationPayload),
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      });
      return Response.json({ data: body }, { status: 201 });
    }

    if (table === "companies") {
      const { profile } = await currentProfile();
      const hasDatabaseIdentity = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(profile.id);
      const localPreview = profile.id === "admin-local" && isLocalDevelopmentRequest(request);
      if (!hasDatabaseIdentity && !localPreview) {
        throw new ApiError(401, "Sign in with your Supabase placement-office account to publish companies to students.");
      }
      if (!profile.institution_id || !profile.campus_id) {
        throw new ApiError(400, "The default development campus could not be found. Check the Supabase campus setup.");
      }

      // Company visibility is campus-scoped by row-level security. Never trust
      // tenant IDs supplied by the browser; bind the row to the staff profile.
      record = {
        ...input,
        institution_id: profile.institution_id,
        campus_id: profile.campus_id,
        ...(hasDatabaseIdentity ? { created_by: profile.id } : {}),
      };

      if (localPreview) {
        const name = typeof input.name === "string" ? input.name.trim() : "";
        if (!name) throw new ApiError(400, "Company name is required.");
        const nullableText = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;
        const metadata = input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)
          ? JSON.stringify(input.metadata)
          : "{}";
        const rows = await developmentDatabaseQuery<{
          id: string; name: string; website?: string | null; description?: string | null; metadata?: Record<string, unknown> | null;
        }>(
          `insert into public.companies (institution_id, campus_id, name, website, industry, description, metadata)
           values ($1, $2, $3, $4, $5, $6, $7::jsonb) returning *`,
          [profile.institution_id, profile.campus_id, name, nullableText(input.website), nullableText(input.industry), nullableText(input.description), metadata],
        );
        const company = Array.isArray(rows) ? rows[0] : undefined;
        if (company) {
          const defaults = companyDriveDefaults(company);
          await developmentDatabaseQuery(
            `insert into public.drives (institution_id, campus_id, company_id, role_title, job_type, description, location,
               work_mode, openings, status, official_apply_link, eligibility, required_skills, selection_process)
             values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::text[], $14::jsonb)`,
            [profile.institution_id, profile.campus_id, company.id, defaults.role_title, defaults.job_type,
              defaults.description, defaults.location, defaults.work_mode, defaults.openings, defaults.status,
              defaults.official_apply_link, JSON.stringify(defaults.eligibility), "{}", JSON.stringify(defaults.selection_process)],
          );
        }
        return Response.json({ data: rows }, { status: 201 });
      }
    }

    const { body } = await databaseRequest(table, {
      method: "POST", body: JSON.stringify(record), headers: { Prefer: "return=representation" },
    });
    if (table === "companies" && Array.isArray(body) && body[0]) {
      const company = body[0] as { id: string; name: string; website?: string | null; description?: string | null; metadata?: Record<string, unknown> | null };
      const defaults = companyDriveDefaults(company);
      const companyRecord = record as { institution_id: string; campus_id: string; created_by?: string };
      await databaseRequest("drives", {
        method: "POST",
        body: JSON.stringify({
          ...defaults,
          institution_id: companyRecord.institution_id,
          campus_id: companyRecord.campus_id,
          ...(companyRecord.created_by ? { created_by: companyRecord.created_by } : {}),
        }),
        headers: { Prefer: "return=minimal" },
      });
    }
    return Response.json({ data: body }, { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request, context: { params: Promise<{ resource: string }> }) {
  try {
    const { resource } = await context.params;
    const table = await tableFor(resource);
    await authorizeWrite(table, "PATCH");
    const incoming = new URL(request.url).searchParams;
    // Build WHERE clause from filter params only
    const where = new URLSearchParams();
    for (const key of FILTER_KEYS) {
      const value = incoming.get(key);
      if (value !== null) {
        if (!/^(eq|neq)\.[A-Za-z0-9_@:.+\-]{1,120}$/.test(value)) throw new ApiError(400, `Invalid filter: ${key}`);
        where.set(key, value);
      }
    }
    if (where.toString() === "") throw new ApiError(400, "PATCH requires at least one filter (e.g. ?id=eq.UUID)");
    const input = bodySchema.parse(await request.json());
    const { body } = await databaseRequest(`${table}?${where}`, {
      method: "PATCH", body: JSON.stringify(input), headers: { Prefer: "return=representation" },
    });
    return Response.json({ data: body });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request, context: { params: Promise<{ resource: string }> }) {
  try {
    const { resource } = await context.params;
    const table = await tableFor(resource);
    await authorizeWrite(table, "DELETE");
    const incoming = new URL(request.url).searchParams;
    const where = new URLSearchParams();
    for (const key of FILTER_KEYS) {
      const value = incoming.get(key);
      if (value !== null) {
        if (!/^(eq|neq)\.[A-Za-z0-9_@:.+\-]{1,120}$/.test(value)) throw new ApiError(400, `Invalid filter: ${key}`);
        where.set(key, value);
      }
    }
    if (where.toString() === "") throw new ApiError(400, "DELETE requires at least one filter");
    await databaseRequest(`${table}?${where}`, { method: "DELETE" });
    return new Response(null, { status: 204 });
  } catch (error) { return apiError(error); }
}

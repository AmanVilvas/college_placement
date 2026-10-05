import { z } from "zod";
import { apiError, ApiError, currentProfile, developmentDatabaseQuery } from "@/lib/server/supabase";
import { eligibleDriveSql } from "@/lib/server/companyCommunity";
import { communityNotificationsSql } from "@/lib/server/communityNotifications";

export const runtime = "nodejs";
const staffRoles = new Set(["super_admin", "college_admin", "tpo", "coordinator", "admin-local"]);
type CompanyRow = { id: string; name: string; website: string | null; industry: string | null; description: string | null; logo_url: string | null; metadata: Record<string, unknown> | null };
type DriveRow = { id: string; company_id: string; role_title: string; package_lpa: number | null; location: string | null; work_mode: string | null; application_deadline: string | null; eligibility: Record<string, unknown> | null };
type EligibleDriveRow = DriveRow & { company_name: string; website: string | null; industry: string | null; description: string | null; logo_url: string | null; metadata: Record<string, unknown> | null };
type ResourceRow = { id: string; company_id: string; drive_id: string | null; title: string; body: string | null; file_name: string | null; content_type: string | null; file_size: number | null; created_at: string };

function groupCompanies(companies: CompanyRow[], drives: DriveRow[], resources: ResourceRow[]) {
  return companies.map((company) => ({
    ...company,
    drives: drives.filter((drive) => drive.company_id === company.id),
    resources: resources.filter((resource) => resource.company_id === company.id),
  }));
}

export async function GET() {
  try {
    const { user, profile } = await currentProfile();
    if (!profile.institution_id || !profile.campus_id) throw new ApiError(400, "Your account is not linked to a campus.");
    const isStaff = staffRoles.has(profile.role);
    if (!isStaff && profile.role !== "student") throw new ApiError(403, "Your account cannot access company community.");

    let companies: CompanyRow[];
    let drives: DriveRow[];
    let resources: ResourceRow[];
    if (isStaff) {
      companies = await developmentDatabaseQuery<CompanyRow>(
        `select id, name, website, industry, description, logo_url, metadata from public.companies
         where institution_id=$1 and campus_id=$2 and archived=false order by name asc`,
        [profile.institution_id, profile.campus_id],
      );
      drives = await developmentDatabaseQuery<DriveRow>(
        `select id, company_id, role_title, package_lpa, location, work_mode, application_deadline, eligibility
         from public.drives where institution_id=$1 and campus_id=$2
           and lower(trim(status)) in ('open','closing soon')
           and (application_deadline is null or application_deadline >= current_date)
         order by created_at desc`,
        [profile.institution_id, profile.campus_id],
      );
      resources = await developmentDatabaseQuery<ResourceRow>(
        `select id, company_id, drive_id, title, body, file_name, content_type, file_size, created_at
         from placement_private.company_community_resources where institution_id=$1 and campus_id=$2
         order by created_at desc limit 1000`,
        [profile.institution_id, profile.campus_id],
      );
    } else {
      const studentRows = await developmentDatabaseQuery<{ id: string; department: string; cgpa: number | null; backlogs: number }>(
        `select id, department, cgpa, backlogs from public.student_profiles
         where institution_id=$1 and campus_id=$2
           and (id::text=$3 or user_id::text=$3 or lower(roll_number)=lower($4)) limit 1`,
        [profile.institution_id, profile.campus_id, user.id, profile.roll_number ?? ""],
      );
      const student = studentRows[0];
      if (!student) throw new ApiError(403, "Your student account is not linked to a placement profile.");
      const eligible = await developmentDatabaseQuery<EligibleDriveRow>(
        `select c.id as company_id, c.name as company_name, c.website, c.industry, c.description, c.logo_url, c.metadata,
                d.id, d.company_id, d.role_title, d.package_lpa, d.location, d.work_mode, d.application_deadline, d.eligibility
         from public.drives d join public.companies c on c.id=d.company_id
         cross join public.student_profiles s
         where s.id=$1 and c.institution_id=$2 and c.campus_id=$3 and c.archived=false
           and d.institution_id=$2 and d.campus_id=$3 and ${eligibleDriveSql}
         order by c.name asc, d.application_deadline asc nulls last`,
        [student.id, profile.institution_id, profile.campus_id],
      );
      drives = [];
      for (const row of eligible) {
        drives.push({ id: row.id, company_id: row.company_id, role_title: row.role_title, package_lpa: row.package_lpa,
          location: row.location, work_mode: row.work_mode, application_deadline: row.application_deadline, eligibility: row.eligibility });
      }
      companies = await developmentDatabaseQuery<CompanyRow>(
        `select id, name, website, industry, description, logo_url, metadata from public.companies
         where institution_id=$1 and campus_id=$2 and archived=false order by name asc`,
        [profile.institution_id, profile.campus_id],
      );
      const companyIds = companies.map((company) => company.id);
      const driveIds = drives.map((drive) => drive.id);
      resources = companyIds.length
        ? await developmentDatabaseQuery<ResourceRow>(
          `select id, company_id, drive_id, title, body, file_name, content_type, file_size, created_at
           from placement_private.company_community_resources where institution_id=$1 and campus_id=$2
             and company_id=any($3::uuid[]) and (drive_id is null or drive_id=any($4::uuid[]))
           order by created_at desc limit 1000`,
          [profile.institution_id, profile.campus_id, companyIds, driveIds],
        )
        : [];
    }
    return Response.json({ data: groupCompanies(companies, drives, resources) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

const allowedFiles: Record<string, string> = {
  pdf: "application/pdf", txt: "text/plain", doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
};
// Keep upload payloads below typical serverless request-body limits.
const maxFileBytes = 4 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const { profile } = await currentProfile();
    if (!staffRoles.has(profile.role)) throw new ApiError(403, "Only placement staff can post to company community.");
    if (!profile.institution_id || !profile.campus_id) throw new ApiError(400, "Placement office is not linked to a campus.");
    const form = await request.formData();
    const input = z.object({
      companyId: z.string().uuid(), driveId: z.string().uuid().optional().or(z.literal("")),
      title: z.string().trim().min(3).max(180), body: z.string().trim().max(30000).optional().default(""),
    }).parse({ companyId: form.get("companyId"), driveId: form.get("driveId") || "", title: form.get("title"), body: form.get("body") || "" });
    const fileValue = form.get("file");
    const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;
    if (!input.body && !file) throw new ApiError(400, "Add a note or attach a file before publishing.");
    if (file && file.size > maxFileBytes) throw new ApiError(413, "Community files must be 4 MB or smaller.");
    const extension = file?.name.split(".").pop()?.toLowerCase() || "";
    if (file && !allowedFiles[extension]) throw new ApiError(400, "Attach a PNG, JPG, PDF, Word, PowerPoint, or TXT file.");
    const companies = await developmentDatabaseQuery<{ id: string }>(
      `select id from public.companies where id=$1 and institution_id=$2 and campus_id=$3 and archived=false limit 1`,
      [input.companyId, profile.institution_id, profile.campus_id],
    );
    if (!companies.length) throw new ApiError(404, "Active company was not found in this campus.");
    if (input.driveId) {
      const scopedDrive = await developmentDatabaseQuery<{ id: string }>(
        `select id from public.drives where id=$1 and company_id=$2 and institution_id=$3 and campus_id=$4 limit 1`,
        [input.driveId, input.companyId, profile.institution_id, profile.campus_id],
      );
      if (!scopedDrive.length) throw new ApiError(400, "Choose a drive that belongs to this company and campus.");
    }
    const bytes = file ? Buffer.from(await file.arrayBuffer()) : null;
    const mime = file ? allowedFiles[extension] : null;
    const rows = await developmentDatabaseQuery(
      `with posted as (insert into placement_private.company_community_resources
        (institution_id,campus_id,company_id,drive_id,title,body,file_name,content_type,file_size,file_data,created_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,case when $10::text is null then null else decode($10,'base64') end,$11)
       returning id, institution_id, campus_id, company_id, drive_id, title, body, file_name, content_type, file_size, created_at
       ), notified as (${communityNotificationsSql("resource")})
       select posted.*, (select count(*)::int from notified) as notification_count from posted`,
      [profile.institution_id, profile.campus_id, input.companyId, input.driveId || null, input.title, input.body || null,
        file ? file.name.replace(/[\x00-\x1f\x7f/\\]/g, "_").slice(0, 200) : null, mime, file?.size ?? null,
        bytes?.toString("base64") ?? null, profile.id === "admin-local" ? null : profile.id],
    );
    return Response.json({ data: rows[0] }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

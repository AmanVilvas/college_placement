import { z } from "zod";
import { ApiError, apiError, currentProfile, developmentDatabaseQuery } from "@/lib/server/supabase";
import { eligibleDriveSql } from "@/lib/server/companyCommunity";

export const runtime = "nodejs";
const staffRoles = new Set(["super_admin", "college_admin", "tpo", "coordinator", "admin-local"]);
const maxFileBytes = 4 * 1024 * 1024;
const allowedFiles: Record<string, string> = {
  pdf: "application/pdf", txt: "text/plain", doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp",
};
type Student = { id: string; full_name: string; department: string; cgpa: number | null; backlogs: number };

async function findStudent(profile: Record<string, unknown>, userId: string, institutionId: string, campusId: string) {
  const rows = await developmentDatabaseQuery<Student>(
    `select id, full_name, department, cgpa, backlogs from public.student_profiles
     where institution_id=$1 and campus_id=$2
       and (id::text=$3 or user_id::text=$3 or lower(roll_number)=lower($4)) limit 1`,
    [institutionId, campusId, userId, typeof profile.roll_number === "string" ? profile.roll_number : ""],
  );
  return rows[0] ?? null;
}

async function loadCompanyAndEligibleDrives(companyId: string, institutionId: string, campusId: string, student: Student | null) {
  const companies = await developmentDatabaseQuery<{ id: string; name: string }>(
    `select id, name from public.companies where id=$1 and institution_id=$2 and campus_id=$3 and archived=false limit 1`,
    [companyId, institutionId, campusId],
  );
  if (!companies[0]) throw new ApiError(404, "Active company was not found for this campus.");
  const drives = student
    ? await developmentDatabaseQuery<{ id: string }>(
      `select d.id from public.drives d join public.companies c on c.id=d.company_id
       cross join public.student_profiles s where s.id=$1 and c.id=$2 and c.archived=false
       and d.institution_id=$3 and d.campus_id=$4 and ${eligibleDriveSql}`,
      [student.id, companyId, institutionId, campusId],
    )
    : await developmentDatabaseQuery<{ id: string }>(
      `select id from public.drives where company_id=$1 and institution_id=$2 and campus_id=$3
       and lower(trim(status)) in ('open','closing soon') and (application_deadline is null or application_deadline>=current_date)`,
      [companyId, institutionId, campusId],
    );
  return { company: companies[0], driveIds: drives.map((drive) => drive.id) };
}

export async function GET(request: Request) {
  try {
    const { user, profile } = await currentProfile();
    const staff = staffRoles.has(profile.role);
    if (!staff && profile.role !== "student") throw new ApiError(403, "Only students and placement staff can access group chats.");
    if (!profile.institution_id || !profile.campus_id) throw new ApiError(400, "Your account is not linked to a campus.");
    const companyId = new URL(request.url).searchParams.get("companyId") ?? "";
    const companyInput = z.string().uuid().parse(companyId);
    const student = staff ? null : await findStudent(profile, user.id, profile.institution_id, profile.campus_id);
    if (!staff && !student) throw new ApiError(403, "Your student account is not linked to a placement profile.");
    const { driveIds } = await loadCompanyAndEligibleDrives(companyInput, profile.institution_id, profile.campus_id, student);
    if (!staff && driveIds.length === 0) throw new ApiError(403, "You are not currently eligible for this company group.");
    const rows = await developmentDatabaseQuery<Record<string, unknown>>(
      `select m.id,m.company_id,m.drive_id,m.author_student_id,m.author_name,m.author_role,m.message_type,m.body,
              m.file_name,m.content_type,m.file_size,m.poll_topic,m.poll_options,m.created_at,
              (select v.option_index from placement_private.company_community_poll_votes v
               where v.message_id=m.id and v.student_id=$4::uuid limit 1) as my_vote,
              case when $5::boolean then m.author_role='placement_staff'
                   when $4::uuid is not null and m.author_student_id=$4::uuid then true
                   when $6::uuid is not null and m.author_profile_id=$6::uuid then true else false end as is_mine,
              case when m.message_type='poll' then (
                select coalesce(jsonb_agg(vote_counts.total order by vote_counts.option_index),'[]'::jsonb)
                from (select options.option_index, count(v.student_id)::int as total
                      from generate_series(0,jsonb_array_length(m.poll_options)-1) as options(option_index)
                      left join placement_private.company_community_poll_votes v
                        on v.message_id=m.id and v.option_index=options.option_index
                      group by options.option_index) vote_counts
              ) else '[]'::jsonb end as poll_votes,
              coalesce((select jsonb_agg(jsonb_build_object('emoji',reaction_counts.emoji,'count',reaction_counts.total,'mine',reaction_counts.mine) order by reaction_counts.emoji)
                from (select r.emoji,count(*)::int as total,bool_or(r.student_id=$4::uuid) as mine
                      from placement_private.company_community_message_reactions r
                      where r.message_id=m.id group by r.emoji) reaction_counts),'[]'::jsonb) as reactions
       from placement_private.company_community_messages m
       where m.institution_id=$1 and m.campus_id=$2 and m.company_id=$3
         and (m.drive_id is null or m.drive_id=any($7::uuid[]))
       order by m.created_at desc limit 200`,
      [profile.institution_id, profile.campus_id, companyInput, student?.id ?? null,
        staff && profile.id === "admin-local", staff && profile.id !== "admin-local" ? profile.id : null, driveIds],
    );
    const resources = await developmentDatabaseQuery<Record<string, unknown>>(
      `select id,company_id,drive_id,title,body,file_name,content_type,file_size,created_at
       from placement_private.company_community_resources
       where institution_id=$1 and campus_id=$2 and company_id=$3
         and (drive_id is null or drive_id=any($4::uuid[]))
       order by created_at desc limit 200`,
      [profile.institution_id, profile.campus_id, companyInput, driveIds],
    );
    const resourceMessages = resources.map((resource) => ({
      id: `resource:${String(resource.id)}`, resource_id: resource.id,
      company_id: resource.company_id, drive_id: resource.drive_id,
      author_student_id: null, author_name: "Placement Office", author_role: "placement_staff",
      message_type: "resource", resource_title: resource.title, body: resource.body ?? "",
      file_name: resource.file_name, content_type: resource.content_type, file_size: resource.file_size,
      poll_topic: null, poll_options: null, my_vote: null, is_mine: false, poll_votes: [], reactions: [],
      created_at: resource.created_at,
    }));
    const timeline = [...rows, ...resourceMessages]
      .sort((left, right) => new Date(String(left.created_at)).getTime() - new Date(String(right.created_at)).getTime())
      .slice(-200);
    return Response.json({ data: timeline, viewer: { role: staff ? "placement_staff" : "student", studentId: student?.id ?? null } },
      { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const { user, profile } = await currentProfile();
    const staff = staffRoles.has(profile.role);
    if (!staff) throw new ApiError(403, "Only placement staff can post messages, attachments, or polls in company groups.");
    if (!profile.institution_id || !profile.campus_id) throw new ApiError(400, "Your account is not linked to a campus.");
    const student: Student | null = null;
    const form = await request.formData();
    const input = z.object({
      companyId: z.string().uuid(), driveId: z.string().uuid().optional().or(z.literal("")),
      body: z.string().trim().max(30000).default(""), type: z.enum(["text", "poll"]).default("text"),
      topic: z.string().trim().max(120).default(""), options: z.string().optional().default(""),
    }).parse({ companyId: form.get("companyId"), driveId: form.get("driveId") || "", body: form.get("body") || "", type: form.get("type") || "text", topic: form.get("topic") || "", options: form.get("options") || "" });
    const rawFile = form.get("file");
    const file = rawFile instanceof File && rawFile.size > 0 ? rawFile : null;
    if (file && input.type === "poll") throw new ApiError(400, "Polls cannot include an attachment yet.");
    if (file && file.size > maxFileBytes) throw new ApiError(413, "Community attachments must be 4 MB or smaller.");
    const extension = file?.name.split(".").pop()?.toLowerCase() ?? "";
    if (file && !allowedFiles[extension]) throw new ApiError(400, "Attach a PDF, Word, PowerPoint, TXT, PNG, JPG, or WebP file.");
    if (input.type === "poll" && !staff) throw new ApiError(403, "Only placement staff can create polls.");
    if (input.type === "poll" && !input.body) throw new ApiError(400, "Enter a question for the poll.");
    if (input.type === "poll" && !input.topic) throw new ApiError(400, "Add a topic for the poll.");
    let options: string[] | null = null;
    if (input.type === "poll") {
      let parsedOptions: unknown;
      try { parsedOptions = JSON.parse(input.options || "[]"); }
      catch { throw new ApiError(400, "Poll choices could not be read. Please re-enter them."); }
      options = z.array(z.string().trim().min(1).max(160)).min(2).max(8).parse(parsedOptions);
    }
    if (new Set(options ?? []).size !== (options?.length ?? 0)) throw new ApiError(400, "Poll options must be unique.");
    if (!input.body && !file && input.type !== "poll") throw new ApiError(400, "Write a message or attach a file.");
    const { driveIds } = await loadCompanyAndEligibleDrives(input.companyId, profile.institution_id, profile.campus_id, student);
    const driveId = input.driveId || null;
    if (driveId && !driveIds.includes(driveId)) throw new ApiError(400, "Choose an open drive for this company.");
    const authorName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "Placement Office";
    const bytes = file ? Buffer.from(await file.arrayBuffer()) : null;
    const rows = await developmentDatabaseQuery<Record<string, unknown>>(
      `insert into placement_private.company_community_messages
        (institution_id,campus_id,company_id,drive_id,author_profile_id,author_student_id,author_name,author_role,
         message_type,body,file_name,content_type,file_size,file_data,poll_options,poll_topic)
       values ($1,$2,$3,$4,$5::uuid,$6::uuid,$7,$8,$9,$10,$11,$12,$13,
               case when $14::text is null then null else decode($14,'base64') end,$15::jsonb,$16)
       returning id,company_id,drive_id,author_name,author_role,message_type,body,file_name,content_type,file_size,poll_topic,poll_options,created_at`,
      [profile.institution_id, profile.campus_id, input.companyId, driveId,
        staff && profile.id !== "admin-local" ? profile.id : null, null, authorName,
        "placement_staff", input.type === "poll" ? "poll" : file ? "file" : "text", input.body,
        file ? file.name.replace(/[\x00-\x1f\x7f/\\]/g, "_").slice(0, 200) : null,
        file ? allowedFiles[extension] : null, file?.size ?? null, bytes?.toString("base64") ?? null,
        options ? JSON.stringify(options) : null, input.type === "poll" ? input.topic : null],
    );
    return Response.json({ data: rows[0] }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

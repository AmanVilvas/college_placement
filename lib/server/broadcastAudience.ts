import { z } from "zod";
import { developmentDatabaseQuery } from "@/lib/server/supabase";
import { eligibleDriveSql } from "@/lib/server/companyCommunity";

const mark = (maximum: number) => z.coerce.number().min(0).max(maximum).optional();
export const broadcastAudienceSchema = z.object({
  department: z.string().trim().max(50).optional(),
  audienceFilter: z.enum(["all", "eligible", "shortlisted"]).default("all"),
  driveId: z.string().uuid().optional(),
  minCgpa: mark(10), maxCgpa: mark(10),
  minTenth: mark(100), maxTenth: mark(100),
  minTwelfth: mark(100), maxTwelfth: mark(100),
});

export function validateBroadcastAudience(input: z.infer<typeof broadcastAudienceSchema>) {
  if (input.audienceFilter === "eligible" && !input.driveId) throw new Error("Choose a placement drive to find eligible students.");
  for (const [minimum, maximum] of [[input.minCgpa, input.maxCgpa], [input.minTenth, input.maxTenth], [input.minTwelfth, input.maxTwelfth]]) {
    if (minimum != null && maximum != null && minimum > maximum) throw new Error("Minimum marks must not exceed maximum marks.");
  }
}

export async function loadBroadcastAudience(profile: { institution_id: string; campus_id: string }, input: z.infer<typeof broadcastAudienceSchema>, studentIds?: string[]) {
  return developmentDatabaseQuery<{
    id: string; user_id: string | null; full_name: string; roll_number: string; department: string;
    email: string | null; phone: string | null; cgpa: number | null; tenth_percent: number | null; twelfth_percent: number | null;
  }>(
    `select s.id,s.user_id,s.full_name,s.roll_number,s.department,
      coalesce(nullif(nullif(trim(s.email),''),'NA'),p.email) as email,s.phone,s.cgpa,s.tenth_percent,s.twelfth_percent
     from public.student_profiles s left join public.profiles p on p.id=s.user_id
     where s.institution_id=$1 and s.campus_id=$2 and ($3::text is null or s.department=$3)
       and ($4::jsonb is null or s.id::text in (select jsonb_array_elements_text($4::jsonb)))
       and ($5::numeric is null or s.cgpa >= $5) and ($6::numeric is null or s.cgpa <= $6)
       and ($7::numeric is null or s.tenth_percent >= $7) and ($8::numeric is null or s.tenth_percent <= $8)
       and ($9::numeric is null or s.twelfth_percent >= $9) and ($10::numeric is null or s.twelfth_percent <= $10)
       and ($11::text <> 'eligible' or exists (
         select 1 from public.drives d join public.companies c on c.id=d.company_id and c.archived=false
         where d.id=$12 and d.institution_id=$1 and d.campus_id=$2 and ${eligibleDriveSql}
       ))
       and ($11::text <> 'shortlisted' or exists (
         select 1 from public.applications a join public.drives d on d.id=a.drive_id
         join public.companies c on c.id=d.company_id and c.archived=false
         where a.student_id=s.id and a.institution_id=$1 and a.campus_id=$2
           and d.institution_id=$1 and d.campus_id=$2 and lower(trim(a.status))='shortlisted'
           and ($12::uuid is null or a.drive_id=$12)
       )) order by s.full_name,s.id`,
    [profile.institution_id, profile.campus_id, input.department || null, studentIds ? JSON.stringify(studentIds) : null,
      input.minCgpa ?? null, input.maxCgpa ?? null, input.minTenth ?? null, input.maxTenth ?? null,
      input.minTwelfth ?? null, input.maxTwelfth ?? null, input.audienceFilter, input.driveId ?? null],
  );
}

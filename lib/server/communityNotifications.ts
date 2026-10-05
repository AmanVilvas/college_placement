import { eligibleDriveSql } from "@/lib/server/companyCommunity";

// Used with the post's INSERT CTE so publishing and notifying succeed together.
export function communityNotificationsSql(kind: "message" | "resource") {
  return `insert into public.notifications
    (institution_id, campus_id, user_id, student_id, title, message, category, metadata)
    select posted.institution_id, posted.campus_id, s.user_id, s.id,
      'New community ${kind}: ' || c.name,
      ${kind === "resource" ? "posted.title || ': ' || " : ""}
      coalesce(nullif(left(posted.body, 500), ''), 'A new ${kind} has been shared. Open the company community to view it.'),
      'General',
      jsonb_build_object('source', 'community', 'companyId', c.id, 'companyName', c.name,
        'driveId', posted.drive_id, '${kind}Id', posted.id)
    from posted
    join public.companies c on c.id=posted.company_id
      and c.institution_id=posted.institution_id and c.campus_id=posted.campus_id and c.archived=false
    join public.student_profiles s on s.institution_id=posted.institution_id and s.campus_id=posted.campus_id
    where posted.drive_id is null or exists (
      select 1 from public.drives d where d.id=posted.drive_id and d.company_id=posted.company_id
        and d.institution_id=posted.institution_id and d.campus_id=posted.campus_id and ${eligibleDriveSql}
    ) returning id`;
}

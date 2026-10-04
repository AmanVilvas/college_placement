create schema if not exists placement_private;

create table if not exists placement_private.company_community_messages (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions on delete cascade,
  campus_id uuid not null references public.campuses on delete cascade,
  company_id uuid not null references public.companies on delete cascade,
  drive_id uuid references public.drives on delete set null,
  author_profile_id uuid references public.profiles on delete set null,
  author_student_id uuid references public.student_profiles on delete cascade,
  author_name text not null,
  author_role text not null check (author_role in ('placement_staff', 'student')),
  message_type text not null default 'text' check (message_type in ('text', 'file', 'poll')),
  body text not null default '',
  file_name text,
  content_type text,
  file_size integer,
  file_data bytea,
  poll_options jsonb,
  created_at timestamptz not null default now(),
  constraint community_message_content check (
    (message_type = 'text' and nullif(btrim(body), '') is not null and poll_options is null and file_data is null)
    or (message_type = 'file' and file_data is not null and poll_options is null)
    or (message_type = 'poll' and nullif(btrim(body), '') is not null and jsonb_typeof(poll_options) = 'array' and file_data is null)
  )
);

create index if not exists company_community_messages_group_idx
  on placement_private.company_community_messages(campus_id, company_id, created_at desc);
create index if not exists company_community_messages_drive_idx
  on placement_private.company_community_messages(campus_id, drive_id, created_at desc);

create table if not exists placement_private.company_community_poll_votes (
  message_id uuid not null references placement_private.company_community_messages on delete cascade,
  student_id uuid not null references public.student_profiles on delete cascade,
  option_index integer not null check (option_index >= 0),
  created_at timestamptz not null default now(),
  primary key (message_id, student_id)
);

create index if not exists company_community_poll_votes_student_idx
  on placement_private.company_community_poll_votes(student_id, created_at desc);

revoke all on placement_private.company_community_messages from anon, authenticated;
revoke all on placement_private.company_community_poll_votes from anon, authenticated;

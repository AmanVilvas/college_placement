create table if not exists placement_private.company_community_message_reactions (
  message_id uuid not null references placement_private.company_community_messages on delete cascade,
  student_id uuid not null references public.student_profiles on delete cascade,
  emoji text not null check (emoji in ('👍','❤️','😂','👏','🔥','✅')),
  created_at timestamptz not null default now(),
  primary key (message_id, student_id)
);

create index if not exists company_community_message_reactions_student_idx
  on placement_private.company_community_message_reactions(student_id, created_at desc);

revoke all on placement_private.company_community_message_reactions from anon, authenticated;

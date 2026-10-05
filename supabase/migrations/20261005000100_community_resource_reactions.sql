create table if not exists placement_private.company_community_resource_reactions (
  resource_id uuid not null references placement_private.company_community_resources on delete cascade,
  student_id uuid not null references public.student_profiles on delete cascade,
  emoji text not null check (emoji in ('👍','❤️','😂','👏','🔥','✅')),
  created_at timestamptz not null default now(),
  primary key (resource_id, student_id)
);

create index if not exists company_community_resource_reactions_student_idx
  on placement_private.company_community_resource_reactions(student_id, created_at desc);

revoke all on placement_private.company_community_resource_reactions from anon, authenticated;

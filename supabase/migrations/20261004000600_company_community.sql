create schema if not exists placement_private;

create table if not exists placement_private.company_community_resources (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions on delete cascade,
  campus_id uuid not null references public.campuses on delete cascade,
  company_id uuid not null references public.companies on delete cascade,
  drive_id uuid references public.drives on delete set null,
  title text not null,
  body text,
  file_name text,
  content_type text,
  file_size integer,
  file_data bytea,
  created_by uuid references public.profiles on delete set null,
  created_at timestamptz not null default now(),
  constraint company_community_resource_content check (
    nullif(btrim(coalesce(body, '')), '') is not null or file_data is not null
  )
);

create index if not exists company_community_resources_company_idx
  on placement_private.company_community_resources(campus_id, company_id, created_at desc);

create index if not exists company_community_resources_drive_idx
  on placement_private.company_community_resources(campus_id, drive_id, created_at desc);

revoke all on placement_private.company_community_resources from anon, authenticated;

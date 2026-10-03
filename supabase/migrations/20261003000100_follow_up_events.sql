create table if not exists public.follow_up_events (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions on delete cascade,
  campus_id uuid not null references public.campuses on delete cascade,
  drive_id uuid not null references public.drives on delete cascade,
  student_id uuid not null references public.student_profiles on delete cascade,
  application_id uuid references public.applications on delete set null,
  channels jsonb not null default '{}',
  delivery_result jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists follow_up_events_campus_drive_student_idx
  on public.follow_up_events (campus_id, drive_id, student_id, created_at desc);

alter table public.follow_up_events enable row level security;
drop policy if exists tenant_read on public.follow_up_events;
drop policy if exists tenant_write on public.follow_up_events;
create policy tenant_read on public.follow_up_events for select to authenticated
  using (public.can_manage_campus(campus_id));
create policy tenant_write on public.follow_up_events for insert to authenticated
  with check (public.can_manage_campus(campus_id));
grant select, insert on public.follow_up_events to authenticated;

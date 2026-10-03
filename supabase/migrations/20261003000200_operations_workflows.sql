alter table public.interviews add column if not exists round text not null default 'Interview';
alter table public.recruiter_contacts add column if not exists next_follow_up date;

create table if not exists public.drive_checkins (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions on delete cascade,
  campus_id uuid not null references public.campuses on delete cascade,
  application_id uuid not null unique references public.applications on delete cascade,
  checked_in boolean not null default true,
  checked_in_at timestamptz,
  checked_by uuid references public.profiles,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists drive_checkins_campus_idx on public.drive_checkins (institution_id, campus_id, checked_in_at desc);
alter table public.drive_checkins enable row level security;
drop policy if exists drive_checkins_staff_select on public.drive_checkins;
create policy drive_checkins_staff_select on public.drive_checkins for select to authenticated
  using (public.can_manage_campus(campus_id));
drop policy if exists drive_checkins_staff_write on public.drive_checkins;
create policy drive_checkins_staff_write on public.drive_checkins for all to authenticated
  using (public.can_manage_campus(campus_id)) with check (public.can_manage_campus(campus_id));
grant select, insert, update, delete on public.drive_checkins to authenticated;

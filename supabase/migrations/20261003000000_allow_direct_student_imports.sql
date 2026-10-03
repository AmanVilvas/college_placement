-- Migration: Allow Direct Student Imports (From Admin Panel and Supabase Studio)
-- Run this in Supabase SQL Editor to enable direct CSV/Excel imports into student_profiles.

-- 1. Ensure extensions
create extension if not exists pgcrypto;

-- 2. Modify student_profiles to allow user_id to be NULL
-- (Students can be imported before they create or link an auth account)
alter table public.student_profiles alter column user_id drop not null;

-- 3. Add direct full_name and email columns to student_profiles
alter table public.student_profiles add column if not exists full_name text not null default '';
alter table public.student_profiles add column if not exists email text;
alter table public.student_profiles add column if not exists updated_at timestamptz not null default now();

-- 4. Backfill full_name and email from profiles where linked
update public.student_profiles s
set full_name = coalesce(nullif(p.full_name, ''), nullif(s.profile_data->>'imported_name', ''), s.full_name),
    email = coalesce(nullif(p.email, ''), nullif(s.profile_data->>'email', ''), s.email)
from public.profiles p
where s.user_id = p.id;

-- 5. Auto-default institution_id and campus_id trigger
-- Allows uploading CSVs directly in Supabase Table Editor without having to manually supply UUIDs
create or replace function public.default_student_institution_campus()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.institution_id is null then
    select id into new.institution_id from public.institutions order by created_at asc limit 1;
  end if;
  if new.campus_id is null and new.institution_id is not null then
    select id into new.campus_id from public.campuses where institution_id = new.institution_id order by created_at asc limit 1;
    if new.campus_id is null then
      select id into new.campus_id from public.campuses order by created_at asc limit 1;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_default_student_institution_campus on public.student_profiles;
create trigger trg_default_student_institution_campus
before insert on public.student_profiles
for each row
execute function public.default_student_institution_campus();

-- 6. Auto-link trigger: When an auth user signs up / profile is created,
-- automatically link any pre-imported student_profile matching that email
create or replace function public.auto_link_student_profile()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  matched_sp record;
begin
  select id, institution_id, campus_id, full_name
  into matched_sp
  from public.student_profiles
  where user_id is null
    and (lower(email) = lower(new.email) or lower(profile_data->>'email') = lower(new.email))
  limit 1;

  if matched_sp.id is not null then
    -- Link student_profiles to this user profile
    update public.student_profiles
    set user_id = new.id
    where id = matched_sp.id;

    -- Update profiles with institution, campus, and full_name
    update public.profiles
    set institution_id = coalesce(institution_id, matched_sp.institution_id),
        campus_id = coalesce(campus_id, matched_sp.campus_id),
        full_name = case when full_name is null or full_name = '' then matched_sp.full_name else full_name end
    where id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_auto_link_student_profile on public.profiles;
create trigger trg_auto_link_student_profile
after insert on public.profiles
for each row
execute function public.auto_link_student_profile();

-- 7. Add index for fast roll_number and email lookups
create index if not exists student_profiles_roll_number_idx on public.student_profiles(campus_id, lower(roll_number));
create index if not exists student_profiles_email_idx on public.student_profiles(lower(email));

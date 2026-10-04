-- Private binary storage in Supabase Postgres; never exposed through PostgREST.
create schema if not exists placement_private;
revoke all on schema placement_private from public, anon, authenticated;
create table if not exists placement_private.student_resumes (
  student_id uuid primary key references public.student_profiles(id) on delete cascade,
  file_name text not null,
  content_type text not null,
  file_size integer not null check (file_size > 0 and file_size <= 5242880),
  file_data bytea not null check (octet_length(file_data) = file_size),
  updated_at timestamptz not null default now()
);
revoke all on placement_private.student_resumes from public, anon, authenticated;

-- Sensitive student files stay in a private schema and never enter PostgREST.
create schema if not exists placement_private;
revoke all on schema placement_private from public, anon, authenticated;

create table if not exists placement_private.student_documents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  category text not null check (category in (
    'Aadhaar card', 'PAN card', 'Passport', '10th marksheet', '12th marksheet',
    'Caste certificate', 'Domicile certificate', 'Other'
  )),
  display_name text not null check (length(display_name) between 1 and 100),
  file_name text not null check (length(file_name) between 1 and 200),
  content_type text not null check (content_type in ('application/pdf', 'image/jpeg', 'image/png')),
  file_size integer not null check (file_size > 0 and file_size <= 10485760),
  file_data bytea not null check (octet_length(file_data) = file_size),
  created_at timestamptz not null default now()
);

create index if not exists student_documents_student_created_idx
  on placement_private.student_documents (student_id, created_at desc);

revoke all on placement_private.student_documents from public, anon, authenticated;

create table if not exists public.voice_call_events (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions on delete cascade,
  campus_id uuid not null references public.campuses on delete cascade,
  student_id uuid not null references public.student_profiles on delete cascade,
  drive_id uuid not null references public.drives on delete cascade,
  requested_by uuid references public.profiles on delete set null,
  provider_call_id text,
  status text not null default 'dispatched',
  summary text,
  sentiment text,
  call_duration_seconds integer,
  transcript text,
  recording_url text,
  provider_response jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists voice_call_events_provider_call_idx
  on public.voice_call_events(campus_id, provider_call_id) where provider_call_id is not null;

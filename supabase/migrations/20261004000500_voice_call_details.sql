-- Bring installations with the original minimal call log table up to the
-- shape used by the call-history API. CREATE TABLE IF NOT EXISTS does not add
-- columns to an existing table, so each field is added independently.
alter table public.voice_call_events
  add column if not exists summary text,
  add column if not exists sentiment text,
  add column if not exists call_duration_seconds integer,
  add column if not exists transcript text,
  add column if not exists recording_url text,
  add column if not exists updated_at timestamptz not null default now();

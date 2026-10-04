alter table public.events
  add column if not exists event_type text not null default 'Campus event',
  add column if not exists meeting_url text;

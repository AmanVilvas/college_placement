alter table public.events
  add column if not exists custom_event_type text,
  add column if not exists event_mode text not null default 'In person',
  add column if not exists location text,
  add column if not exists audience jsonb not null default '{"kind":"campus"}';

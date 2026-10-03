alter table public.notifications
  add column if not exists student_id uuid references public.student_profiles on delete cascade;
create index if not exists notifications_student_created_idx
  on public.notifications (student_id, created_at desc);

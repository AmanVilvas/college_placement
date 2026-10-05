-- An unknown backlog count must not be stored as a confirmed zero.
alter table public.student_profiles alter column backlogs drop not null;

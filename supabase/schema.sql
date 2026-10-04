-- Placement Helper backend schema (Supabase PostgreSQL).
-- Apply once in Supabase SQL Editor. Auth identities live in auth.users.
create extension if not exists pgcrypto;

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
  settings jsonb not null default '{}', created_at timestamptz not null default now()
);
create table if not exists public.campuses (
  id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.institutions on delete cascade,
  name text not null, settings jsonb not null default '{}', created_at timestamptz not null default now(), unique(institution_id,name)
);
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade, institution_id uuid references public.institutions on delete cascade,
  campus_id uuid references public.campuses on delete set null, role text not null default 'student'
    check (role in ('super_admin','college_admin','tpo','coordinator','faculty','student','recruiter','interviewer','alumni')),
  full_name text not null default '', email text not null, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.student_profiles (
  id uuid primary key default gen_random_uuid(), user_id uuid unique references public.profiles on delete set null,
  institution_id uuid not null references public.institutions on delete cascade, campus_id uuid not null references public.campuses on delete cascade,
  roll_number text not null, full_name text not null default '', email text,
  department text not null, section text, year_of_study int, graduation_year int,
  phone text, cgpa numeric(4,2), tenth_percent numeric(5,2), twelfth_percent numeric(5,2), backlogs int not null default 0,
  skills text[] not null default '{}', profile_data jsonb not null default '{}', created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(campus_id,roll_number)
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.institutions on delete cascade,
  campus_id uuid not null references public.campuses on delete cascade, name text not null, website text, industry text,
  description text, logo_url text, archived boolean not null default false, metadata jsonb not null default '{}',
  created_by uuid references public.profiles, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(campus_id,name)
);
create table if not exists public.recruiter_contacts (
  id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.institutions on delete cascade,
  campus_id uuid not null references public.campuses on delete cascade, company_id uuid not null references public.companies on delete cascade,
  name text not null, email text, phone text, title text, notes text, next_follow_up date, created_at timestamptz not null default now()
);
create table if not exists public.employer_interactions (
  id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.institutions on delete cascade,
  campus_id uuid not null references public.campuses on delete cascade, company_id uuid not null references public.companies on delete cascade,
  actor_id uuid references public.profiles, kind text not null, notes text, happened_at timestamptz not null default now()
);
create table if not exists public.drives (
  id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.institutions on delete cascade,
  campus_id uuid not null references public.campuses on delete cascade, company_id uuid not null references public.companies on delete cascade,
  role_title text not null, job_type text not null default 'Full-time', description text, location text, work_mode text,
  package_lpa numeric(9,2), stipend_monthly numeric(12,2), openings int not null default 1,
  application_deadline timestamptz, drive_date timestamptz, status text not null default 'Open',
  official_apply_link text, eligibility jsonb not null default '{}', required_skills text[] not null default '{}',
  selection_process jsonb not null default '[]', created_by uuid references public.profiles,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.institutions on delete cascade,
  campus_id uuid not null references public.campuses on delete cascade, student_id uuid not null references public.student_profiles on delete cascade,
  drive_id uuid not null references public.drives on delete cascade, status text not null default 'Applied',
  confirmation_data jsonb not null default '{}', admin_notes text, applied_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), unique(student_id,drive_id)
);
create table if not exists public.follow_up_events (
  id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.institutions on delete cascade,
  campus_id uuid not null references public.campuses on delete cascade, drive_id uuid not null references public.drives on delete cascade,
  student_id uuid not null references public.student_profiles on delete cascade, application_id uuid references public.applications on delete set null,
  channels jsonb not null default '{}', delivery_result jsonb not null default '{}', created_at timestamptz not null default now()
);
create index if not exists follow_up_events_campus_drive_student_idx on public.follow_up_events(campus_id,drive_id,student_id,created_at desc);
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
  on public.voice_call_events(campus_id,provider_call_id) where provider_call_id is not null;
create table if not exists public.application_stage_events (
  id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.institutions on delete cascade,
  campus_id uuid not null references public.campuses on delete cascade, application_id uuid not null references public.applications on delete cascade,
  from_status text, to_status text not null, note text, changed_by uuid references public.profiles, created_at timestamptz not null default now()
);
create table if not exists public.placement_policies (
  id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.institutions on delete cascade,
  campus_id uuid not null references public.campuses on delete cascade, name text not null, rules jsonb not null default '{}',
  active boolean not null default true, updated_by uuid references public.profiles, updated_at timestamptz not null default now()
);
create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.institutions on delete cascade,
  campus_id uuid not null references public.campuses on delete cascade, drive_id uuid references public.drives on delete set null,
  title text not null, kind text not null, outline jsonb not null default '{}', starts_at timestamptz, ends_at timestamptz,
  created_by uuid references public.profiles, created_at timestamptz not null default now()
);
create table if not exists public.assessment_attempts (
  id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.institutions on delete cascade,
  campus_id uuid not null references public.campuses on delete cascade, assessment_id uuid not null references public.assessments on delete cascade,
  student_id uuid not null references public.student_profiles on delete cascade, answers jsonb not null default '{}',
  score numeric(8,2), submitted_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.interviews (
  id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.institutions on delete cascade,
  campus_id uuid not null references public.campuses on delete cascade, application_id uuid not null references public.applications on delete cascade, round text not null default 'Interview',
  interviewer_id uuid references public.profiles, starts_at timestamptz not null, ends_at timestamptz not null,
  location text, meeting_url text, status text not null default 'Scheduled', created_by uuid references public.profiles,
  created_at timestamptz not null default now(), check(ends_at > starts_at)
);
create table if not exists public.drive_checkins (
  id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.institutions on delete cascade,
  campus_id uuid not null references public.campuses on delete cascade, application_id uuid not null unique references public.applications on delete cascade,
  checked_in boolean not null default true, checked_in_at timestamptz, checked_by uuid references public.profiles,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.interview_feedback (
  id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.institutions on delete cascade,
  campus_id uuid not null references public.campuses on delete cascade, interview_id uuid not null references public.interviews on delete cascade,
  interviewer_id uuid not null references public.profiles, rating int check(rating between 1 and 5), feedback text, recommendation text,
  created_at timestamptz not null default now()
);
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.institutions on delete cascade,
  campus_id uuid not null references public.campuses on delete cascade, application_id uuid not null references public.applications on delete cascade,
  status text not null default 'Pending', package_lpa numeric(9,2), offered_at timestamptz, responded_at timestamptz,
  details jsonb not null default '{}', created_at timestamptz not null default now()
);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.institutions on delete cascade,
  campus_id uuid not null references public.campuses on delete cascade, user_id uuid references public.profiles on delete cascade,
  student_id uuid references public.student_profiles on delete cascade,
  title text not null, message text not null, category text not null default 'General', read_at timestamptz,
  metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles on delete cascade, institution_id uuid not null references public.institutions on delete cascade,
  campus_id uuid not null references public.campuses on delete cascade, preferences jsonb not null default '{}', updated_at timestamptz not null default now()
);
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.institutions on delete cascade,
  campus_id uuid not null references public.campuses on delete cascade, user_id uuid not null references public.profiles on delete cascade,
  storage_path text not null, file_name text not null, content_type text, verified_by uuid references public.profiles,
  verified_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.cohorts (
  id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.institutions on delete cascade,
  campus_id uuid not null references public.campuses on delete cascade, name text not null, details jsonb not null default '{}',
  created_by uuid references public.profiles, created_at timestamptz not null default now()
);
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.institutions on delete cascade,
  campus_id uuid not null references public.campuses on delete cascade, title text not null, description text,
  event_type text not null default 'Campus event', meeting_url text, starts_at timestamptz, ends_at timestamptz,
  visibility text not null default 'campus', created_by uuid references public.profiles,
  created_at timestamptz not null default now()
);
alter table public.events add column if not exists event_type text not null default 'Campus event';
alter table public.events add column if not exists meeting_url text;
create table if not exists public.alumni_profiles (
  id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.institutions on delete cascade,
  campus_id uuid not null references public.campuses on delete cascade, user_id uuid references public.profiles on delete set null,
  name text not null, graduation_year int, employer text, role_title text, consent_public boolean not null default false,
  details jsonb not null default '{}', created_at timestamptz not null default now()
);
create table if not exists public.interview_experiences (
  id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.institutions on delete cascade,
  campus_id uuid not null references public.campuses on delete cascade, author_id uuid not null references public.profiles on delete cascade,
  company_name text not null, role_title text, content text not null, approved boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.institutions on delete cascade,
  campus_id uuid references public.campuses on delete cascade, actor_id uuid references public.profiles on delete set null,
  action text not null, entity_type text not null, entity_id uuid, changes jsonb not null default '{}', created_at timestamptz not null default now()
);

create index if not exists drives_campus_status_idx on public.drives(campus_id,status);
create index if not exists applications_campus_status_idx on public.applications(campus_id,status);
create index if not exists applications_student_idx on public.applications(student_id);
create index if not exists events_campus_start_idx on public.events(campus_id,starts_at);
create index if not exists notifications_user_created_idx on public.notifications(user_id,created_at desc);

create or replace function public.current_role() returns text language sql stable security definer set search_path=public
as $$ select role from public.profiles where id=auth.uid() and active $$;
create or replace function public.can_manage_campus(target_campus uuid) returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles p where p.id=auth.uid() and p.active and p.campus_id=target_campus
  and p.role in ('super_admin','college_admin','tpo','coordinator')) $$;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public
as $$ begin insert into public.profiles(id,email,full_name) values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name','')); return new; end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.default_student_institution_campus() returns trigger language plpgsql security definer set search_path=public
as $$ begin
  if new.institution_id is null then select id into new.institution_id from public.institutions order by created_at asc limit 1; end if;
  if new.campus_id is null and new.institution_id is not null then
    select id into new.campus_id from public.campuses where institution_id=new.institution_id order by created_at asc limit 1;
    if new.campus_id is null then select id into new.campus_id from public.campuses order by created_at asc limit 1; end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_default_student_institution_campus on public.student_profiles;
create trigger trg_default_student_institution_campus before insert on public.student_profiles for each row execute function public.default_student_institution_campus();

create or replace function public.auto_link_student_profile() returns trigger language plpgsql security definer set search_path=public
as $$ declare matched_sp record; begin
  select id, institution_id, campus_id, full_name into matched_sp from public.student_profiles
  where user_id is null and (lower(email)=lower(new.email) or lower(profile_data->>'email')=lower(new.email)) limit 1;
  if matched_sp.id is not null then
    update public.student_profiles set user_id=new.id where id=matched_sp.id;
    update public.profiles set
      institution_id=coalesce(institution_id, matched_sp.institution_id),
      campus_id=coalesce(campus_id, matched_sp.campus_id),
      full_name=case when full_name is null or full_name='' then matched_sp.full_name else full_name end
    where id=new.id;
  end if;
  return new;
end $$;
drop trigger if exists trg_auto_link_student_profile on public.profiles;
create trigger trg_auto_link_student_profile after insert on public.profiles for each row execute function public.auto_link_student_profile();
create or replace function public.record_application_stage() returns trigger language plpgsql security definer set search_path=public
as $$ begin
  if tg_op='INSERT' or old.status is distinct from new.status then
    insert into public.application_stage_events(institution_id,campus_id,application_id,from_status,to_status,changed_by)
    values(new.institution_id,new.campus_id,new.id,case when tg_op='INSERT' then null else old.status end,new.status,auth.uid());
  end if;
  return new;
end $$;
drop trigger if exists application_stage_history on public.applications;
create trigger application_stage_history after insert or update of status on public.applications
for each row execute procedure public.record_application_stage();
create or replace function public.record_audit_change() returns trigger language plpgsql security definer set search_path=public
as $$ declare row_data jsonb; begin
  row_data := case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into public.audit_logs(institution_id,campus_id,actor_id,action,entity_type,entity_id,changes)
  values((row_data->>'institution_id')::uuid,nullif(row_data->>'campus_id','')::uuid,auth.uid(),lower(tg_op),tg_table_name,
    (row_data->>'id')::uuid,case when tg_op='DELETE' then jsonb_build_object('before',row_data) else jsonb_build_object('after',row_data) end);
  return case when tg_op='DELETE' then old else new end;
end $$;
do $$ declare t text; begin
  foreach t in array array['companies','drives','applications','interviews','offers','placement_policies','events'] loop
    execute format('drop trigger if exists audit_change on public.%I',t);
    execute format('create trigger audit_change after insert or update or delete on public.%I for each row execute procedure public.record_audit_change()',t);
  end loop;
end $$;

-- Enable tenant isolation on every API-exposed table. Students see their own private records;
-- campus staff manage records only within their assigned campus. Supabase JWT RLS is the boundary.
do $$ declare t text; begin
  foreach t in array array['institutions','campuses','profiles','student_profiles','companies','recruiter_contacts','employer_interactions','drives','applications','follow_up_events','application_stage_events','placement_policies','assessments','assessment_attempts','interviews','interview_feedback','offers','notifications','notification_preferences','documents','cohorts','events','alumni_profiles','interview_experiences','audit_logs','drive_checkins'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('drop policy if exists tenant_read on public.%I',t);
    execute format('drop policy if exists tenant_write on public.%I',t);
    execute format('drop policy if exists tenant_update on public.%I',t);
    execute format('drop policy if exists tenant_delete on public.%I',t);
    if t='institutions' then
      execute format('create policy tenant_read on public.%I for select to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.institution_id=institutions.id and p.active))',t);
    elsif t='campuses' then
      execute format('create policy tenant_read on public.%I for select to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.institution_id=campuses.institution_id and p.active))',t);
    elsif t='profiles' then
      execute format('create policy tenant_read on public.%I for select to authenticated using (id=auth.uid() or public.can_manage_campus(campus_id))',t);
      execute format('create policy tenant_write on public.%I for insert to authenticated with check (public.current_role() in (''super_admin'',''college_admin'',''tpo'') and public.can_manage_campus(campus_id))',t);
      execute format('create policy tenant_update on public.%I for update to authenticated using (public.can_manage_campus(campus_id)) with check (public.can_manage_campus(campus_id))',t);
      execute format('create policy tenant_delete on public.%I for delete to authenticated using (public.current_role() in (''super_admin'',''college_admin'') and public.can_manage_campus(campus_id))',t);
    elsif t='student_profiles' then
      execute format('create policy tenant_read on public.%I for select to authenticated using (user_id=auth.uid() or public.can_manage_campus(campus_id))',t);
      execute format('create policy tenant_write on public.%I for insert to authenticated with check ((user_id=auth.uid() and institution_id=(select p.institution_id from public.profiles p where p.id=auth.uid()) and campus_id=(select p.campus_id from public.profiles p where p.id=auth.uid())) or public.can_manage_campus(campus_id))',t);
      execute format('create policy tenant_update on public.%I for update to authenticated using (user_id=auth.uid() or public.can_manage_campus(campus_id)) with check ((user_id=auth.uid() and institution_id=(select p.institution_id from public.profiles p where p.id=auth.uid()) and campus_id=(select p.campus_id from public.profiles p where p.id=auth.uid())) or public.can_manage_campus(campus_id))',t);
      execute format('create policy tenant_delete on public.%I for delete to authenticated using (public.can_manage_campus(campus_id))',t);
    elsif t='application_stage_events' then
      execute format('create policy tenant_read on public.%I for select to authenticated using (public.can_manage_campus(campus_id) or application_id in (select a.id from public.applications a join public.student_profiles s on s.id=a.student_id where s.user_id=auth.uid()))',t);
      execute format('create policy tenant_write on public.%I for insert to authenticated with check (public.can_manage_campus(campus_id))',t);
    elsif t='follow_up_events' then
      execute format('create policy tenant_read on public.%I for select to authenticated using (public.can_manage_campus(campus_id))',t);
      execute format('create policy tenant_write on public.%I for insert to authenticated with check (public.can_manage_campus(campus_id))',t);
    elsif t='audit_logs' then
      execute format('create policy tenant_read on public.%I for select to authenticated using (public.can_manage_campus(campus_id))',t);
    elsif t='drive_checkins' then
      execute format('create policy tenant_read on public.%I for select to authenticated using (public.can_manage_campus(campus_id))',t);
      execute format('create policy tenant_write on public.%I for all to authenticated using (public.can_manage_campus(campus_id)) with check (public.can_manage_campus(campus_id))',t);
    else
      if t in ('applications','application_stage_events','assessment_attempts','interviews','offers','notifications','notification_preferences','documents','alumni_profiles','interview_experiences') then
        execute format('create policy tenant_read on public.%I for select to authenticated using (public.can_manage_campus(campus_id) or %s)', t,
          case t
            when 'applications' then 'student_id in (select s.id from public.student_profiles s where s.user_id=auth.uid())'
            when 'application_stage_events' then 'application_id in (select a.id from public.applications a join public.student_profiles s on s.id=a.student_id where s.user_id=auth.uid())'
            when 'assessment_attempts' then 'student_id in (select s.id from public.student_profiles s where s.user_id=auth.uid())'
            when 'interviews' then 'interviewer_id=auth.uid() or application_id in (select a.id from public.applications a join public.student_profiles s on s.id=a.student_id where s.user_id=auth.uid())'
            when 'offers' then 'application_id in (select a.id from public.applications a join public.student_profiles s on s.id=a.student_id where s.user_id=auth.uid())'
            when 'notifications' then 'user_id=auth.uid() or user_id is null or student_id in (select id from public.student_profiles where user_id=auth.uid())'
            when 'notification_preferences' then 'user_id=auth.uid()'
            when 'documents' then 'user_id=auth.uid()'
            when 'alumni_profiles' then 'user_id=auth.uid() or consent_public'
            else 'author_id=auth.uid() or approved'
          end);
      else
        execute format('create policy tenant_read on public.%I for select to authenticated using (public.can_manage_campus(campus_id) or (campus_id=(select p.campus_id from public.profiles p where p.id=auth.uid() and p.active)))',t);
      end if;
      if t in ('applications','assessment_attempts','notifications','notification_preferences','documents','interview_experiences') then
        execute format('create policy tenant_write on public.%I for insert to authenticated with check (institution_id=(select p.institution_id from public.profiles p where p.id=auth.uid()) and campus_id=(select p.campus_id from public.profiles p where p.id=auth.uid()) and (public.can_manage_campus(campus_id) or %s))',t,
          case t
            when 'applications' then 'student_id in (select s.id from public.student_profiles s where s.user_id=auth.uid())'
            when 'assessment_attempts' then 'student_id in (select s.id from public.student_profiles s where s.user_id=auth.uid())'
            when 'notifications' then 'user_id=auth.uid()'
            when 'notification_preferences' then 'user_id=auth.uid()'
            when 'documents' then 'user_id=auth.uid()'
            else 'author_id=auth.uid()'
          end);
      else
        execute format('create policy tenant_write on public.%I for insert to authenticated with check (public.can_manage_campus(campus_id))',t);
      end if;
      if t in ('applications','assessment_attempts','notifications','notification_preferences','documents','interview_experiences') then
        execute format('create policy tenant_update on public.%I for update to authenticated using (public.can_manage_campus(campus_id) or %s) with check (institution_id=(select p.institution_id from public.profiles p where p.id=auth.uid()) and campus_id=(select p.campus_id from public.profiles p where p.id=auth.uid()) and (public.can_manage_campus(campus_id) or %s))',t,
          case t when 'applications' then 'student_id in (select s.id from public.student_profiles s where s.user_id=auth.uid())' when 'assessment_attempts' then 'student_id in (select s.id from public.student_profiles s where s.user_id=auth.uid())' when 'notifications' then 'user_id=auth.uid()' when 'notification_preferences' then 'user_id=auth.uid()' when 'documents' then 'user_id=auth.uid()' else 'author_id=auth.uid()' end,
          case t when 'applications' then 'student_id in (select s.id from public.student_profiles s where s.user_id=auth.uid())' when 'assessment_attempts' then 'student_id in (select s.id from public.student_profiles s where s.user_id=auth.uid())' when 'notifications' then 'user_id=auth.uid()' when 'notification_preferences' then 'user_id=auth.uid()' when 'documents' then 'user_id=auth.uid()' else 'author_id=auth.uid()' end);
      elsif t <> 'application_stage_events' then
        execute format('create policy tenant_update on public.%I for update to authenticated using (public.can_manage_campus(campus_id)) with check (public.can_manage_campus(campus_id))',t);
      end if;
      if t <> 'application_stage_events' then
        execute format('create policy tenant_delete on public.%I for delete to authenticated using (public.can_manage_campus(campus_id))',t);
      end if;
    end if;
  end loop;
end $$;

grant usage on schema public to authenticated;
grant select,insert,update,delete on all tables in schema public to authenticated;
grant usage,select on all sequences in schema public to authenticated;

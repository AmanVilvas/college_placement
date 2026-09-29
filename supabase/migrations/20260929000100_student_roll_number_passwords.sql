-- Run once after student_profiles and profiles have been populated and linked to auth.users.
-- Existing students receive their roll number as a temporary password and must change it at first sign-in.
create extension if not exists pgcrypto with schema extensions;

update auth.users u
set encrypted_password = extensions.crypt(s.roll_number, extensions.gen_salt('bf')),
    raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb) || '{"must_change_password":true}'::jsonb,
    updated_at = now()
from public.student_profiles s
join public.profiles p on p.id = s.user_id
where u.id = p.id
  and p.role = 'student'
  and s.roll_number is not null
  and length(s.roll_number) > 0;

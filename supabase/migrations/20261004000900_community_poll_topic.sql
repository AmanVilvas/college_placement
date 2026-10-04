alter table placement_private.company_community_messages
  add column if not exists poll_topic text;

update placement_private.company_community_messages
set poll_topic = 'Community poll'
where message_type = 'poll' and nullif(btrim(poll_topic), '') is null;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'community_poll_topic_required'
      and conrelid = 'placement_private.company_community_messages'::regclass
  ) then
    alter table placement_private.company_community_messages
      add constraint community_poll_topic_required
      check (message_type <> 'poll' or nullif(btrim(poll_topic), '') is not null);
  end if;
end $$;

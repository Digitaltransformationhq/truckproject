-- Fares24x7: support queries become conversations.
--  * support_tickets.thread keeps every reply in order: [{ "from": "support" | "user", "text": ..., "at": ... }].
--  * An admin reply (admin_reply) is appended to the thread automatically.
--  * The user can add a follow-up at any time with follow_up_support_ticket(); a Resolved query re-opens
--    and the admins are notified again.

alter table public.support_tickets add column if not exists thread jsonb not null default '[]'::jsonb;

-- Backfill: existing single replies become the first thread entry.
update public.support_tickets
   set thread = jsonb_build_array(jsonb_build_object('from', 'support', 'text', admin_reply, 'at', coalesce(replied_at, updated_at)))
 where thread = '[]'::jsonb and nullif(trim(admin_reply), '') is not null;

-- Admin reply -> appended to the thread; user notified. Follow-ups by the user skip the user notification.
create or replace function public.notify_ticket_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  if coalesce(current_setting('fares24x7.user_followup', true), '') = '1' then
    return new;
  end if;
  if new.admin_reply is distinct from old.admin_reply and nullif(trim(new.admin_reply), '') is not null then
    new.replied_at := now();
    new.thread := coalesce(old.thread, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('from', 'support', 'text', new.admin_reply, 'at', now()));
    insert into public.notifications (user_id, title, body, link_view)
    values (new.user_id, format('Reply to your support query #%s', new.id), left(new.admin_reply, 180), 'support');
    perform public.mark_admin_notifications_handled('ticket:' || new.id);
  elsif new.status is distinct from old.status then
    insert into public.notifications (user_id, title, body, link_view)
    values (new.user_id, format('Support query #%s is %s', new.id, lower(new.status::text)), new.subject, 'support');
    perform public.mark_admin_notifications_handled('ticket:' || new.id);
  end if;
  return new;
end;
$$;

-- The user continues (or re-opens) their own query.
create or replace function public.follow_up_support_ticket(p_ticket_id bigint, p_message text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.support_tickets;
  msg text := trim(coalesce(p_message, ''));
begin
  if msg = '' then raise exception 'Write your message first.'; end if;
  if char_length(msg) > 2000 then raise exception 'Message is too long (2000 characters maximum).'; end if;

  select * into t from public.support_tickets where id = p_ticket_id for update;
  if not found or t.user_id is distinct from auth.uid() then
    raise exception 'Support query not found.' using errcode = '42501';
  end if;

  perform set_config('fares24x7.user_followup', '1', true);
  update public.support_tickets
     set thread = coalesce(thread, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('from', 'user', 'text', msg, 'at', now())),
         status = 'Open'
   where id = p_ticket_id;
  perform set_config('fares24x7.user_followup', '', true);

  -- One open admin alert per query.
  perform public.mark_admin_notifications_handled('ticket:' || p_ticket_id);
  perform public.notify_admins(
    case when t.status = 'Resolved' then 'Support query reopened' else 'Support query follow-up' end,
    format('#%s · %s', t.id, t.subject), 'admin-support', 'ticket:' || t.id);
end;
$$;
revoke execute on function public.follow_up_support_ticket(bigint, text) from public, anon;
grant execute on function public.follow_up_support_ticket(bigint, text) to authenticated;

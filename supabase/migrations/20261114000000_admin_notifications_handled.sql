-- Fares24x7: admin notifications clear themselves once the item is handled.
-- Each admin notification carries a reference (kyc:<profile id> / ticket:<id>). When any admin
-- approves/rejects/requests information on a KYC application, or replies to / reviews / resolves a
-- support query, the matching notifications are marked read for every admin.

alter table public.notifications add column if not exists ref text;
create index if not exists notifications_open_ref_idx on public.notifications (ref) where read_at is null;

drop function if exists public.notify_admins(text, text, text);
create or replace function public.notify_admins(p_title text, p_body text, p_view text, p_ref text default null)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, title, body, link_view, ref)
  select id, p_title, p_body, p_view, p_ref from public.profiles where role = 'admin' and account_status = 'active';
$$;
revoke execute on function public.notify_admins(text, text, text, text) from public, anon, authenticated;

create or replace function public.mark_admin_notifications_handled(p_ref text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications n
     set read_at = now()
   where n.ref = p_ref and n.read_at is null
     and exists (select 1 from public.profiles p where p.id = n.user_id and p.role = 'admin');
$$;
revoke execute on function public.mark_admin_notifications_handled(text) from public, anon, authenticated;

-- New KYC submission / support query notifications now carry their reference.
create or replace function public.on_kyc_submitted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  who public.profiles;
begin
  select * into who from public.profiles where id = new.profile_id;
  -- A resubmission replaces any older unhandled alert for the same business.
  perform public.mark_admin_notifications_handled('kyc:' || new.profile_id);
  perform public.notify_admins('New KYC submission',
    format('%s (%s) is waiting for verification.', coalesce(nullif(who.business_name, ''), who.email),
           case who.role when 'load_owner' then 'customer' else 'truck owner' end),
    'admin-compliance', 'kyc:' || new.profile_id);
  return new;
end;
$$;

create or replace function public.on_ticket_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.notify_admins(
    case when new.priority = 'Urgent' then 'Urgent support query' else 'New support query' end,
    format('#%s · %s', new.id, new.subject), 'admin-support', 'ticket:' || new.id);
  return new;
end;
$$;

-- KYC decision taken -> the "New KYC submission" alert is handled.
create or replace function public.on_kyc_reviewed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kyc_status is distinct from old.kyc_status and new.kyc_status in ('verified', 'rejected', 'needs_information') then
    perform public.mark_admin_notifications_handled('kyc:' || new.id);
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_kyc_reviewed on public.profiles;
create trigger profiles_kyc_reviewed after update of kyc_status on public.profiles
  for each row execute function public.on_kyc_reviewed();

-- Support query replied to / reviewed / resolved -> its alert is handled.
create or replace function public.notify_ticket_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.admin_reply is distinct from old.admin_reply and nullif(trim(new.admin_reply), '') is not null then
    new.replied_at := now();
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

-- Backfill: link existing admin alerts and clear the ones already handled.
update public.notifications n
   set ref = 'kyc:' || p.id
  from public.profiles p
 where n.ref is null and n.title = 'New KYC submission'
   and n.body like replace(replace(coalesce(nullif(p.business_name, ''), p.email), '%', '\%'), '_', '\_') || ' (%';
update public.notifications
   set ref = 'ticket:' || substring(body from '^#([0-9]+)')
 where ref is null and title in ('New support query', 'Urgent support query') and body ~ '^#[0-9]+';
update public.notifications n
   set read_at = now()
  from public.profiles p
 where n.read_at is null and n.ref = 'kyc:' || p.id and p.kyc_status <> 'pending';
update public.notifications n
   set read_at = now()
  from public.support_tickets t
 where n.read_at is null and n.ref = 'ticket:' || t.id and (t.status <> 'Open' or t.admin_reply is not null);

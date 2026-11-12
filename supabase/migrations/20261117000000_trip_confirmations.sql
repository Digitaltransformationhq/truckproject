-- Fares24x7: reliable trip progress.
--  1. Both sides can move a trip forward: the customer confirms "Goods handed over" / "Goods received",
--     the transporter marks picked up / in transit / delivered. The other side is told and can report a problem.
--  2. Delivery code: the customer gets a 4-digit code; the transporter needs it to mark the trip delivered.
--  3. Hourly reminders for trips that are not being updated, escalating to admins.

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------
alter table public.bookings add column if not exists status_changed_at timestamptz not null default now();
alter table public.bookings add column if not exists reminder_stage smallint not null default 0;
alter table public.bookings add column if not exists last_reminder_at timestamptz;
alter table public.bookings add column if not exists disputed_at timestamptz;
alter table public.bookings add column if not exists dispute_note text;
alter table public.bookings add column if not exists disputed_by uuid references public.profiles (id) on delete set null;

-- Existing trips start their reminder clock from their last status change.
update public.bookings b
   set status_changed_at = coalesce((select max(e.created_at) from public.booking_events e where e.booking_id = b.id), b.created_at);

-- ---------------------------------------------------------------------------
-- Delivery codes: a separate table so only the customer (and admins) can read them.
-- ---------------------------------------------------------------------------
create table if not exists public.booking_codes (
  booking_id uuid primary key references public.bookings (id) on delete cascade,
  delivery_code text not null check (delivery_code ~ '^[0-9]{4}$'),
  created_at timestamptz not null default now()
);
alter table public.booking_codes enable row level security;
drop policy if exists "booking_codes_customer" on public.booking_codes;
create policy "booking_codes_customer" on public.booking_codes for select to authenticated using (
  exists (select 1 from public.bookings b where b.id = booking_codes.booking_id and b.load_owner_id = (select auth.uid()))
  or public.is_admin()
);

create or replace function public.on_booking_created_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.booking_codes (booking_id, delivery_code)
  values (new.id, lpad((floor(random() * 10000))::int::text, 4, '0'))
  on conflict (booking_id) do nothing;
  return new;
end;
$$;
drop trigger if exists bookings_delivery_code on public.bookings;
create trigger bookings_delivery_code after insert on public.bookings
  for each row execute function public.on_booking_created_code();

-- Codes for trips that already exist.
insert into public.booking_codes (booking_id, delivery_code)
select id, lpad((floor(random() * 10000))::int::text, 4, '0') from public.bookings
on conflict (booking_id) do nothing;

-- ---------------------------------------------------------------------------
-- Shared step logic
-- ---------------------------------------------------------------------------
create or replace function public.apply_booking_step(b public.bookings, p_status public.booking_status, p_note text, p_actor uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.loads;
  result public.bookings;
begin
  update public.bookings
     set status = p_status, updated_at = now(), status_changed_at = now(), reminder_stage = 0, last_reminder_at = null
   where id = b.id returning * into result;
  insert into public.booking_events (booking_id, status, note, actor_id) values (b.id, p_status, nullif(trim(p_note), ''), p_actor);
  select * into l from public.loads where id = b.load_id;

  if p_status in ('picked_up', 'in_transit') then
    update public.trucks set status = 'In transit' where id = b.truck_id;
    update public.drivers set status = 'On trip' where id = b.driver_id;
  elsif p_status = 'delivered' then
    update public.trucks set status = 'Available', current_city = l.destination where id = b.truck_id;
    update public.drivers set status = 'Available' where id = b.driver_id;
    update public.loads set status = 'completed' where id = b.load_id;
    perform public.mark_admin_notifications_handled('booking:' || b.id);
  end if;
  return result;
end;
$$;
revoke execute on function public.apply_booking_step(public.bookings, public.booking_status, text, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Transporter updates (delivery now needs the customer's code)
-- ---------------------------------------------------------------------------
drop function if exists public.update_booking_status(uuid, public.booking_status, text);
create or replace function public.update_booking_status(p_booking_id uuid, p_status public.booking_status, p_note text default null, p_code text default null)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  b public.bookings;
  l public.loads;
  steps text[] := array['confirmed', 'picked_up', 'in_transit', 'delivered'];
  expected text;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found or b.truck_owner_id is distinct from caller then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;
  if p_status = 'cancelled' then
    raise exception 'Use cancel_booking to cancel' using errcode = '22023';
  end if;
  if b.status in ('delivered', 'cancelled') then
    raise exception 'This trip is already %', replace(b.status::text, '_', ' ') using errcode = 'P0001';
  end if;
  if array_position(steps, p_status::text) <= array_position(steps, b.status::text) then
    raise exception 'Trip status can only move forward' using errcode = 'P0001';
  end if;
  if p_status = 'delivered' then
    select delivery_code into expected from public.booking_codes where booking_id = b.id;
    if expected is not null and coalesce(trim(p_code), '') <> expected then
      raise exception 'The delivery code is not correct. Ask the customer for the 4-digit code shown in their app.' using errcode = 'P0001';
    end if;
  end if;

  b := public.apply_booking_step(b, p_status, p_note, caller);
  select * into l from public.loads where id = b.load_id;
  insert into public.notifications (user_id, title, body, link_view)
  values (
    b.load_owner_id,
    case p_status when 'picked_up' then 'Your goods have been picked up'
                  when 'in_transit' then 'Your goods are on the way'
                  else 'Your goods have been delivered' end,
    format('%s → %s (request #F24-%s). Not right? Open the trip and report a problem.', l.origin, l.destination, l.id),
    'loads'
  );
  return b;
end;
$$;
revoke execute on function public.update_booking_status(uuid, public.booking_status, text, text) from public, anon;
grant execute on function public.update_booking_status(uuid, public.booking_status, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Customer confirmations: "Goods handed over" (picked up) and "Goods received" (delivered)
-- ---------------------------------------------------------------------------
create or replace function public.customer_confirm_booking(p_booking_id uuid, p_status public.booking_status, p_note text default null)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  b public.bookings;
  l public.loads;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found or b.load_owner_id is distinct from caller then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;
  if p_status = 'picked_up' and b.status <> 'confirmed' then
    raise exception 'The goods are already marked as picked up' using errcode = 'P0001';
  end if;
  if p_status = 'delivered' and b.status not in ('confirmed', 'picked_up', 'in_transit') then
    raise exception 'This trip is already %', replace(b.status::text, '_', ' ') using errcode = 'P0001';
  end if;
  if p_status not in ('picked_up', 'delivered') then
    raise exception 'Customers can confirm pickup or delivery only' using errcode = '22023';
  end if;

  b := public.apply_booking_step(b, p_status, coalesce(nullif(trim(p_note), ''), case p_status when 'picked_up' then 'Confirmed by the customer' else 'Receipt confirmed by the customer' end), caller);
  select * into l from public.loads where id = b.load_id;
  if b.truck_owner_id is not null then
    insert into public.notifications (user_id, title, body, link_view)
    values (
      b.truck_owner_id,
      case p_status when 'picked_up' then 'Customer confirmed the pickup' else 'Customer confirmed delivery' end,
      format('%s → %s (request #F24-%s) is now %s. Not right? Open the trip and report a problem.', l.origin, l.destination, l.id,
             case p_status when 'picked_up' then 'picked up' else 'delivered' end),
      'loads'
    );
  end if;
  return b;
end;
$$;
revoke execute on function public.customer_confirm_booking(uuid, public.booking_status, text) from public, anon;
grant execute on function public.customer_confirm_booking(uuid, public.booking_status, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Either side reports a problem; the other side and the admins are told.
-- ---------------------------------------------------------------------------
create or replace function public.report_booking_issue(p_booking_id uuid, p_note text)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  b public.bookings;
  l public.loads;
  other uuid;
  msg text := trim(coalesce(p_note, ''));
begin
  if msg = '' then raise exception 'Describe the problem first.'; end if;
  select * into b from public.bookings where id = p_booking_id for update;
  if not found or (b.truck_owner_id is distinct from caller and b.load_owner_id is distinct from caller) then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;
  update public.bookings set disputed_at = now(), dispute_note = left(msg, 500), disputed_by = caller, updated_at = now()
   where id = b.id returning * into b;
  select * into l from public.loads where id = b.load_id;
  other := case when caller = b.load_owner_id then b.truck_owner_id else b.load_owner_id end;
  if other is not null then
    insert into public.notifications (user_id, title, body, link_view)
    values (other, 'A problem was reported on a trip', format('%s → %s (request #F24-%s): %s', l.origin, l.destination, l.id, left(msg, 140)), 'loads');
  end if;
  perform public.notify_admins('Trip problem reported', format('#F24-%s · %s → %s: %s', l.id, l.origin, l.destination, left(msg, 120)), 'admin-operations', 'booking:' || b.id);
  return b;
end;
$$;
revoke execute on function public.report_booking_issue(uuid, text) from public, anon;
grant execute on function public.report_booking_issue(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Hourly reminders
--   Confirmed, pickup date reached        -> remind transporter (stage 1)
--   6 h later, still confirmed             -> remind transporter + ask customer (stage 2)
--   In transit / picked up for 48 h        -> ask both whether it was delivered (stage 2)
--   24 h after stage 2, still not updated  -> flag to admins (stage 3)
-- ---------------------------------------------------------------------------
create or replace function public.run_trip_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  sent integer := 0;
  route text;
begin
  for r in
    select b.*, l.origin, l.destination, l.pickup_date, l.id as request_id
      from public.bookings b join public.loads l on l.id = b.load_id
     where b.status in ('confirmed', 'picked_up', 'in_transit')
  loop
    route := format('%s → %s (request #F24-%s)', r.origin, r.destination, r.request_id);

    if r.status = 'confirmed' and r.reminder_stage = 0 and current_date >= r.pickup_date then
      if r.truck_owner_id is not null then
        insert into public.notifications (user_id, title, body, link_view)
        values (r.truck_owner_id, 'Has the truck picked up the goods?', route || ' — mark it picked up so the customer knows.', 'loads');
      end if;
      update public.bookings set reminder_stage = 1, last_reminder_at = now() where id = r.id;
      sent := sent + 1;

    elsif r.status = 'confirmed' and r.reminder_stage = 1 and r.last_reminder_at < now() - interval '6 hours' then
      if r.truck_owner_id is not null then
        insert into public.notifications (user_id, title, body, link_view)
        values (r.truck_owner_id, 'Reminder: update your trip', route || ' is still waiting for pickup to be marked.', 'loads');
      end if;
      insert into public.notifications (user_id, title, body, link_view)
      values (r.load_owner_id, 'Has your load been picked up?', route || ' — tap "Goods handed over" if the truck has collected it.', 'loads');
      update public.bookings set reminder_stage = 2, last_reminder_at = now() where id = r.id;
      sent := sent + 1;

    elsif r.status in ('picked_up', 'in_transit') and r.reminder_stage = 0 and r.status_changed_at < now() - interval '48 hours' then
      if r.truck_owner_id is not null then
        insert into public.notifications (user_id, title, body, link_view)
        values (r.truck_owner_id, 'Has this trip been delivered?', route || ' — ask the customer for the delivery code and mark it delivered.', 'loads');
      end if;
      insert into public.notifications (user_id, title, body, link_view)
      values (r.load_owner_id, 'Have you received your goods?', route || ' — tap "Goods received" once it arrives.', 'loads');
      update public.bookings set reminder_stage = 2, last_reminder_at = now() where id = r.id;
      sent := sent + 1;

    elsif r.reminder_stage = 2 and r.last_reminder_at < now() - interval '24 hours' then
      perform public.notify_admins('Trip not updated', format('#F24-%s · %s → %s is still %s', r.request_id, r.origin, r.destination, replace(r.status::text, '_', ' ')), 'admin-operations', 'booking:' || r.id);
      update public.bookings set reminder_stage = 3, last_reminder_at = now() where id = r.id;
      sent := sent + 1;
    end if;
  end loop;
  return sent;
end;
$$;
revoke execute on function public.run_trip_reminders() from public, anon, authenticated;

-- Schedule every hour (pg_cron is available on Supabase).
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
do $$
begin
  if exists (select 1 from cron.job where jobname = 'fares24x7-trip-reminders') then
    perform cron.unschedule('fares24x7-trip-reminders');
  end if;
  perform cron.schedule('fares24x7-trip-reminders', '7 * * * *', 'select public.run_trip_reminders()');
end;
$$;

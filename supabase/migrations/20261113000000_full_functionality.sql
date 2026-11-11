-- Fares24x7: complete marketplace workflow.
--  * KYC gate: only verified customers can post requests and only verified truck owners can accept.
--  * Customer budget on requests.
--  * Owner picks truck + driver when accepting; trip lifecycle (picked up -> in transit -> delivered)
--    with history, cancellation (transporter cancel re-opens the request) and truck/driver status sync.
--  * Customers can see the assigned driver; support replies; notifications for admins.

-- ---------------------------------------------------------------------------
-- KYC gate
-- ---------------------------------------------------------------------------
create or replace function public.is_verified_trader(target public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = target and account_status = 'active' and onboarded and kyc_status = 'verified'
  );
$$;

drop policy if exists "loads_insert" on public.loads;
create policy "loads_insert" on public.loads for insert to authenticated
  with check (owner_id = (select auth.uid()) and status = 'open' and public.is_verified_trader('load_owner'));

-- ---------------------------------------------------------------------------
-- Requests: optional customer budget
-- ---------------------------------------------------------------------------
alter table public.loads add column if not exists budget_inr numeric(12, 2) check (budget_inr is null or budget_inr >= 0);

-- ---------------------------------------------------------------------------
-- Bookings: driver, cancellation, history
-- ---------------------------------------------------------------------------
alter table public.bookings add column if not exists driver_id uuid references public.drivers (id) on delete set null;
alter table public.bookings add column if not exists cancelled_reason text;
-- A request can be re-opened after a transporter cancels, so only one *active* booking per request.
alter table public.bookings drop constraint if exists bookings_load_id_key;
create unique index if not exists bookings_active_load_key on public.bookings (load_id) where status <> 'cancelled';
-- Status changes go through update_booking_status() / cancel_booking() only.
drop policy if exists "bookings_update_transporter" on public.bookings;

create table if not exists public.booking_events (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  status public.booking_status not null,
  note text,
  actor_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists booking_events_booking_idx on public.booking_events (booking_id, created_at);
alter table public.booking_events enable row level security;
drop policy if exists "booking_events_select" on public.booking_events;
create policy "booking_events_select" on public.booking_events for select to authenticated using (
  public.is_admin() or exists (
    select 1 from public.bookings b
    where b.id = booking_events.booking_id and (b.truck_owner_id = (select auth.uid()) or b.load_owner_id = (select auth.uid()))
  )
);

-- Customers can see the driver assigned to their booking.
drop policy if exists "drivers_select_booking" on public.drivers;
create policy "drivers_select_booking" on public.drivers for select to authenticated using (
  exists (select 1 from public.bookings b where b.driver_id = drivers.id and b.load_owner_id = (select auth.uid()) and b.status <> 'cancelled')
);

-- ---------------------------------------------------------------------------
-- Accept a request with a chosen truck and (optionally) driver
-- ---------------------------------------------------------------------------
drop function if exists public.accept_load(bigint, uuid);
create or replace function public.accept_load(p_load_id bigint, p_truck_id uuid default null, p_driver_id uuid default null)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  target public.loads;
  chosen public.trucks;
  chosen_driver public.drivers;
  result public.bookings;
begin
  if not public.current_role_is('truck_owner') then
    raise exception 'Only active truck owners can accept requests' using errcode = '42501';
  end if;
  if not public.is_verified_trader('truck_owner') then
    raise exception 'Your business must be KYC-verified before you can accept requests' using errcode = '42501';
  end if;

  select * into target from public.loads where id = p_load_id for update;
  if not found then raise exception 'Request not found' using errcode = 'P0002'; end if;
  if target.status <> 'open' then
    raise exception 'This request has already been taken' using errcode = 'P0001';
  end if;

  if p_truck_id is not null then
    select * into chosen from public.trucks where id = p_truck_id and owner_id = caller;
    if chosen.id is null then raise exception 'Truck not found' using errcode = 'P0002'; end if;
    if chosen.status <> 'Available' then raise exception 'Truck % is not available', chosen.registration using errcode = 'P0001'; end if;
    if chosen.capacity_tonnes < target.quantity_tonnes then
      raise exception 'Truck % can carry % tonnes but this load is % tonnes', chosen.registration, chosen.capacity_tonnes, target.quantity_tonnes using errcode = 'P0001';
    end if;
  else
    select * into chosen from public.trucks
    where owner_id = caller and status = 'Available' and capacity_tonnes >= target.quantity_tonnes
    order by (lower(current_city) = lower(target.origin)) desc,
             (lower(preferred_destination) = lower(target.destination)) desc,
             capacity_tonnes asc
    limit 1;
    if chosen.id is null then
      raise exception 'You have no available truck with enough capacity for this request' using errcode = 'P0001';
    end if;
  end if;

  if p_driver_id is not null then
    select * into chosen_driver from public.drivers where id = p_driver_id and owner_id = caller;
    if chosen_driver.id is null then raise exception 'Driver not found' using errcode = 'P0002'; end if;
    if chosen_driver.status in ('Inactive', 'On trip') then
      raise exception 'Driver % is not available', chosen_driver.name using errcode = 'P0001';
    end if;
    update public.drivers set status = 'Assigned', assigned_truck_id = chosen.id where id = chosen_driver.id;
  end if;

  insert into public.bookings (load_id, truck_id, truck_owner_id, load_owner_id, driver_id)
  values (target.id, chosen.id, caller, target.owner_id, p_driver_id)
  returning * into result;
  insert into public.booking_events (booking_id, status, actor_id) values (result.id, 'confirmed', caller);

  update public.loads set status = 'booked' where id = target.id;
  delete from public.load_declines where load_id = target.id and truck_owner_id = caller;

  insert into public.notifications (user_id, title, body, link_view)
  values (
    target.owner_id,
    'Your truck request was accepted',
    format('%s → %s will be carried by %s%s.', target.origin, target.destination, chosen.registration,
           case when chosen_driver.id is not null then format(' (driver %s)', chosen_driver.name) else '' end),
    'loads'
  );
  return result;
end;
$$;
revoke execute on function public.accept_load(bigint, uuid, uuid) from public, anon;
grant execute on function public.accept_load(bigint, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Trip progress (transporter): confirmed -> picked_up -> in_transit -> delivered
-- ---------------------------------------------------------------------------
create or replace function public.update_booking_status(p_booking_id uuid, p_status public.booking_status, p_note text default null)
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

  update public.bookings set status = p_status, updated_at = now() where id = b.id returning * into b;
  insert into public.booking_events (booking_id, status, note, actor_id) values (b.id, p_status, nullif(trim(p_note), ''), caller);
  select * into l from public.loads where id = b.load_id;

  if p_status in ('picked_up', 'in_transit') then
    update public.trucks set status = 'In transit' where id = b.truck_id;
    update public.drivers set status = 'On trip' where id = b.driver_id;
  elsif p_status = 'delivered' then
    update public.trucks set status = 'Available', current_city = l.destination where id = b.truck_id;
    update public.drivers set status = 'Available' where id = b.driver_id;
    update public.loads set status = 'completed' where id = b.load_id;
  end if;

  insert into public.notifications (user_id, title, body, link_view)
  values (
    b.load_owner_id,
    case p_status when 'picked_up' then 'Your goods have been picked up'
                  when 'in_transit' then 'Your goods are on the way'
                  else 'Your goods have been delivered' end,
    format('%s → %s (request #F24-%s)', l.origin, l.destination, l.id),
    'loads'
  );
  return b;
end;
$$;
revoke execute on function public.update_booking_status(uuid, public.booking_status, text) from public, anon;
grant execute on function public.update_booking_status(uuid, public.booking_status, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Cancel a confirmed booking (before pickup). Transporter cancel re-opens the request.
-- ---------------------------------------------------------------------------
create or replace function public.cancel_booking(p_booking_id uuid, p_reason text default null)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  b public.bookings;
  l public.loads;
  by_transporter boolean;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found or (b.truck_owner_id is distinct from caller and b.load_owner_id is distinct from caller) then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;
  if b.status <> 'confirmed' then
    raise exception 'Only trips that have not been picked up can be cancelled' using errcode = 'P0001';
  end if;
  by_transporter := b.truck_owner_id = caller;

  update public.bookings set status = 'cancelled', cancelled_reason = nullif(trim(p_reason), ''), updated_at = now()
   where id = b.id returning * into b;
  insert into public.booking_events (booking_id, status, note, actor_id) values (b.id, 'cancelled', nullif(trim(p_reason), ''), caller);
  update public.drivers set status = 'Available' where id = b.driver_id and status = 'Assigned';
  select * into l from public.loads where id = b.load_id;

  if by_transporter then
    update public.loads set status = 'open' where id = b.load_id;
    insert into public.notifications (user_id, title, body, link_view)
    values (b.load_owner_id, 'The transporter cancelled your booking',
            format('%s → %s is open again for other truck owners.%s', l.origin, l.destination,
                   coalesce(' Reason: ' || nullif(trim(p_reason), ''), '')), 'loads');
  else
    update public.loads set status = 'cancelled' where id = b.load_id;
    insert into public.notifications (user_id, title, body, link_view)
    values (b.truck_owner_id, 'The customer cancelled a booking',
            format('%s → %s (request #F24-%s) was cancelled.%s', l.origin, l.destination, l.id,
                   coalesce(' Reason: ' || nullif(trim(p_reason), ''), '')), 'loads');
  end if;
  return b;
end;
$$;
revoke execute on function public.cancel_booking(uuid, text) from public, anon;
grant execute on function public.cancel_booking(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Support replies
-- ---------------------------------------------------------------------------
alter table public.support_tickets add column if not exists admin_reply text;
alter table public.support_tickets add column if not exists replied_at timestamptz;

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
  elsif new.status is distinct from old.status then
    insert into public.notifications (user_id, title, body, link_view)
    values (new.user_id, format('Support query #%s is %s', new.id, lower(new.status::text)), new.subject, 'support');
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Notifications for admins
-- ---------------------------------------------------------------------------
create or replace function public.notify_admins(p_title text, p_body text, p_view text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, title, body, link_view)
  select id, p_title, p_body, p_view from public.profiles where role = 'admin' and account_status = 'active';
$$;
revoke execute on function public.notify_admins(text, text, text) from public, anon, authenticated;

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
  perform public.notify_admins('New KYC submission',
    format('%s (%s) is waiting for verification.', coalesce(nullif(who.business_name, ''), who.email),
           case who.role when 'load_owner' then 'customer' else 'truck owner' end),
    'admin-compliance');
  return new;
end;
$$;
drop trigger if exists kyc_submissions_notify_admins on public.kyc_submissions;
create trigger kyc_submissions_notify_admins after insert on public.kyc_submissions
  for each row execute function public.on_kyc_submitted();

create or replace function public.on_ticket_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.notify_admins(
    case when new.priority = 'Urgent' then 'Urgent support query' else 'New support query' end,
    format('#%s · %s', new.id, new.subject), 'admin-support');
  return new;
end;
$$;
drop trigger if exists support_tickets_notify_admins on public.support_tickets;
create trigger support_tickets_notify_admins after insert on public.support_tickets
  for each row execute function public.on_ticket_created();

-- ---------------------------------------------------------------------------
-- Realtime for trip progress and support replies
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'support_tickets') then
    alter publication supabase_realtime add table public.support_tickets;
  end if;
end $$;

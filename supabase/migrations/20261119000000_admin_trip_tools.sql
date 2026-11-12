-- Fares24x7: admin trip tools.
--  * admin_resolve_trip_issue(): close a reported problem with a note to both sides.
--  * admin_set_trip_status(): correct a trip's stage (picked up / in transit / delivered) or cancel it,
--    with a reason that both sides see. Every change is recorded in the trip history.

create or replace function public.admin_resolve_trip_issue(p_booking_id uuid, p_note text)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bookings;
  l public.loads;
  msg text := nullif(trim(coalesce(p_note, '')), '');
begin
  if not public.is_admin() then raise exception 'Only Fares24x7 admins can do this.' using errcode = '42501'; end if;
  if msg is null then raise exception 'Add a short note for both sides.' using errcode = '22023'; end if;
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'Trip not found' using errcode = 'P0002'; end if;

  update public.bookings
     set disputed_at = null, dispute_note = null, disputed_by = null, reminder_stage = 0, last_reminder_at = null, updated_at = now()
   where id = b.id returning * into b;
  perform public.mark_admin_notifications_handled('booking:' || b.id);

  select * into l from public.loads where id = b.load_id;
  insert into public.notifications (user_id, title, body, link_view)
  select party, 'Fares24x7 support resolved the issue on your trip',
         format('%s → %s (request #F24-%s): %s', l.origin, l.destination, l.id, left(msg, 160)), 'loads'
    from unnest(array[b.load_owner_id, b.truck_owner_id]) as party where party is not null;
  return b;
end;
$$;
revoke execute on function public.admin_resolve_trip_issue(uuid, text) from public, anon;
grant execute on function public.admin_resolve_trip_issue(uuid, text) to authenticated;

create or replace function public.admin_set_trip_status(p_booking_id uuid, p_status public.booking_status, p_note text)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  b public.bookings;
  l public.loads;
  msg text := nullif(trim(coalesce(p_note, '')), '');
  was_delivered boolean;
begin
  if not public.is_admin() then raise exception 'Only Fares24x7 admins can do this.' using errcode = '42501'; end if;
  if msg is null then raise exception 'Add a reason. Both sides will see it.' using errcode = '22023'; end if;
  if p_status = 'confirmed' then raise exception 'Choose picked up, in transit, delivered or cancelled.' using errcode = '22023'; end if;
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'Trip not found' using errcode = 'P0002'; end if;
  if b.status = 'cancelled' then raise exception 'This trip is already cancelled.' using errcode = 'P0001'; end if;
  if b.status = p_status then raise exception 'The trip is already at this stage.' using errcode = 'P0001'; end if;
  was_delivered := b.status = 'delivered';

  if p_status = 'cancelled' then
    update public.bookings set status = 'cancelled', cancelled_reason = 'Cancelled by Fares24x7 support: ' || msg,
           updated_at = now(), status_changed_at = now(), reminder_stage = 0, last_reminder_at = null
     where id = b.id returning * into b;
    insert into public.booking_events (booking_id, status, note, actor_id) values (b.id, 'cancelled', 'Cancelled by Fares24x7 support: ' || msg, caller);
    update public.trucks set status = 'Available' where id = b.truck_id;
    update public.drivers set status = 'Available' where id = b.driver_id;
    -- The customer's request goes back to truck owners.
    update public.loads set status = 'open' where id = b.load_id;
  else
    b := public.apply_booking_step(b, p_status, 'Updated by Fares24x7 support: ' || msg, caller);
    if was_delivered then
      update public.loads set status = 'booked' where id = b.load_id;
    end if;
  end if;
  perform public.mark_admin_notifications_handled('booking:' || b.id);

  select * into l from public.loads where id = b.load_id;
  insert into public.notifications (user_id, title, body, link_view)
  select party,
         case when p_status = 'cancelled' then 'Fares24x7 support cancelled a trip' else 'Fares24x7 support updated your trip' end,
         format('%s → %s (request #F24-%s) is now %s. %s', l.origin, l.destination, l.id, replace(p_status::text, '_', ' '), left(msg, 140)), 'loads'
    from unnest(array[b.load_owner_id, b.truck_owner_id]) as party where party is not null;
  return b;
end;
$$;
revoke execute on function public.admin_set_trip_status(uuid, public.booking_status, text) from public, anon;
grant execute on function public.admin_set_trip_status(uuid, public.booking_status, text) to authenticated;

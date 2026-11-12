-- Fares24x7: ratings after each trip.
--  * Once a trip is delivered, the customer rates the transporter and the transporter rates the customer
--    (1-5 stars, optional comment). One rating per person per trip; it can be changed later.
--  * Each profile keeps an average and a count, shown next to the business name on trips.

create table if not exists public.trip_ratings (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  rater_id uuid not null references public.profiles (id) on delete cascade,
  ratee_id uuid references public.profiles (id) on delete set null,
  stars smallint not null check (stars between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  unique (booking_id, rater_id)
);
create index if not exists trip_ratings_ratee_idx on public.trip_ratings (ratee_id);
alter table public.trip_ratings enable row level security;
drop policy if exists "trip_ratings_select" on public.trip_ratings;
create policy "trip_ratings_select" on public.trip_ratings for select to authenticated using (
  rater_id = (select auth.uid()) or ratee_id = (select auth.uid()) or public.is_admin()
);
-- Writes go through rate_trip() only.

alter table public.profiles add column if not exists rating_avg numeric(3,2);
alter table public.profiles add column if not exists rating_count integer not null default 0;

create or replace function public.rate_trip(p_booking_id uuid, p_stars integer, p_comment text default null)
returns public.trip_ratings
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  b public.bookings;
  l public.loads;
  other uuid;
  result public.trip_ratings;
  note text := nullif(trim(coalesce(p_comment, '')), '');
begin
  if p_stars is null or p_stars < 1 or p_stars > 5 then
    raise exception 'Choose between 1 and 5 stars.' using errcode = '22023';
  end if;
  if note is not null and char_length(note) > 500 then
    raise exception 'Keep the comment under 500 characters.' using errcode = '22023';
  end if;
  select * into b from public.bookings where id = p_booking_id;
  if not found or (b.truck_owner_id is distinct from caller and b.load_owner_id is distinct from caller) then
    raise exception 'Trip not found' using errcode = 'P0002';
  end if;
  if b.status <> 'delivered' then
    raise exception 'You can rate a trip once it has been delivered.' using errcode = 'P0001';
  end if;
  other := case when caller = b.load_owner_id then b.truck_owner_id else b.load_owner_id end;
  if other is null then
    raise exception 'The other party''s account no longer exists.' using errcode = 'P0001';
  end if;

  insert into public.trip_ratings (booking_id, rater_id, ratee_id, stars, comment)
  values (b.id, caller, other, p_stars, note)
  on conflict (booking_id, rater_id) do update set stars = excluded.stars, comment = excluded.comment, created_at = now()
  returning * into result;

  update public.profiles p
     set rating_avg = agg.avg_stars, rating_count = agg.total
    from (select round(avg(stars)::numeric, 2) as avg_stars, count(*)::int as total from public.trip_ratings where ratee_id = other) agg
   where p.id = other;

  select * into l from public.loads where id = b.load_id;
  insert into public.notifications (user_id, title, body, link_view)
  values (other, format('You received a %s-star rating', p_stars),
          format('%s → %s (request #F24-%s)%s', l.origin, l.destination, l.id, coalesce(': “' || left(note, 120) || '”', '')), 'loads');
  return result;
end;
$$;
revoke execute on function public.rate_trip(uuid, integer, text) from public, anon;
grant execute on function public.rate_trip(uuid, integer, text) to authenticated;

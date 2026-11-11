-- Fares24x7 initial schema
-- Roles: load_owner (customer/shipper), truck_owner (transporter), admin (platform staff).
-- Security model: every table has row-level security; privileged transitions
-- (accepting a load, submitting KYC, changing roles) go through SECURITY DEFINER functions.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('load_owner', 'truck_owner', 'admin');
create type public.kyc_status as enum ('not_submitted', 'pending', 'needs_information', 'verified', 'rejected');
create type public.account_status as enum ('active', 'suspended');
create type public.truck_status as enum ('Available', 'In transit', 'Unavailable');
create type public.driver_status as enum ('Available', 'Assigned', 'On trip', 'Inactive');
create type public.load_type as enum ('FTL', 'PTL');
create type public.load_status as enum ('open', 'booked', 'cancelled', 'completed');
create type public.booking_status as enum ('confirmed', 'picked_up', 'in_transit', 'delivered', 'cancelled');
create type public.ticket_status as enum ('Open', 'In review', 'Resolved');
create type public.ticket_priority as enum ('Normal', 'Urgent');
create type public.document_status as enum ('submitted', 'verified', 'rejected');
create type public.document_entity as enum ('kyc', 'truck', 'driver');

-- ---------------------------------------------------------------------------
-- Profiles (one per auth user)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'truck_owner',
  first_name text not null default '',
  last_name text not null default '',
  business_name text not null default '',
  email text not null default '',
  phone text not null default '',
  city text not null default '',
  gstin text,
  details jsonb not null default '{}'::jsonb,
  kyc_status public.kyc_status not null default 'not_submitted',
  account_status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and account_status = 'active'
  );
$$;

create or replace function public.current_role_is(target public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = target and account_status = 'active'
  );
$$;

-- Create a profile whenever someone signs up. Admin can never be self-assigned.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  requested text := meta ->> 'role';
begin
  insert into public.profiles (id, role, first_name, last_name, business_name, email, phone, city, gstin, details)
  values (
    new.id,
    case when requested = 'load_owner' then 'load_owner'::public.app_role else 'truck_owner'::public.app_role end,
    coalesce(meta ->> 'first_name', ''),
    coalesce(meta ->> 'last_name', ''),
    coalesce(meta ->> 'business_name', ''),
    coalesce(new.email, ''),
    coalesce(meta ->> 'phone', new.phone, ''),
    coalesce(meta ->> 'city', ''),
    nullif(meta ->> 'gstin', ''),
    coalesce(meta -> 'details', '{}'::jsonb)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Non-admins may edit their contact details but never their role, KYC or account status.
-- Deliberately NOT security definer: current_user is the caller's role, so API users
-- ('authenticated') are restricted while trusted functions (running as the owner) are not.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    new.role := old.role;
    new.kyc_status := old.kyc_status;
    new.account_status := old.account_status;
  end if;
  new.id := old.id;
  new.updated_at := now();
  return new;
end;
$$;

create trigger protect_profile_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ---------------------------------------------------------------------------
-- Fleet
-- ---------------------------------------------------------------------------
create table public.trucks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  registration text not null,
  vehicle_type text not null,
  capacity_tonnes numeric(6, 2) not null check (capacity_tonnes > 0 and capacity_tonnes <= 60),
  current_city text not null,
  preferred_destination text not null,
  status public.truck_status not null default 'Available',
  engine_number text,
  chassis_number text,
  created_at timestamptz not null default now()
);
create unique index trucks_registration_key on public.trucks (upper(regexp_replace(registration, '\s', '', 'g')));
create index trucks_owner_idx on public.trucks (owner_id);

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null,
  phone text not null,
  licence_number text not null,
  licence_expiry date not null,
  city text not null,
  status public.driver_status not null default 'Available',
  assigned_truck_id uuid references public.trucks (id) on delete set null,
  created_at timestamptz not null default now()
);
create index drivers_owner_idx on public.drivers (owner_id);

-- ---------------------------------------------------------------------------
-- Loads (truck requests) and bookings
-- ---------------------------------------------------------------------------
create table public.loads (
  id bigint generated always as identity (start with 1001) primary key,
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  origin text not null,
  destination text not null,
  material text not null,
  quantity_tonnes numeric(6, 2) not null check (quantity_tonnes > 0 and quantity_tonnes <= 60),
  load_type public.load_type not null default 'FTL',
  pickup_date date not null,
  status public.load_status not null default 'open',
  created_at timestamptz not null default now()
);
create index loads_owner_idx on public.loads (owner_id);
create index loads_open_idx on public.loads (status) where status = 'open';

-- A truck owner saying "not for me" hides the load for them only, not for everyone.
create table public.load_declines (
  load_id bigint not null references public.loads (id) on delete cascade,
  truck_owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (load_id, truck_owner_id)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  load_id bigint not null unique references public.loads (id) on delete cascade,
  truck_id uuid not null references public.trucks (id),
  truck_owner_id uuid not null references public.profiles (id),
  load_owner_id uuid not null references public.profiles (id),
  status public.booking_status not null default 'confirmed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bookings_truck_owner_idx on public.bookings (truck_owner_id);
create index bookings_load_owner_idx on public.bookings (load_owner_id);

-- ---------------------------------------------------------------------------
-- KYC, documents, support, notifications
-- ---------------------------------------------------------------------------
create table public.kyc_submissions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  legal_name text,
  designation text,
  owner_pan text,
  company_pan text,
  gstin text,
  cin text,
  other_registration text,
  billing_address text,
  pincode text,
  submitted_at timestamptz not null default now()
);
create index kyc_submissions_profile_idx on public.kyc_submissions (profile_id, submitted_at desc);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  entity_type public.document_entity not null,
  entity_id uuid,
  kind text not null,
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  status public.document_status not null default 'submitted',
  review_remark text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index documents_owner_idx on public.documents (owner_id);
create index documents_entity_idx on public.documents (entity_type, entity_id);

create table public.support_tickets (
  id bigint generated always as identity (start with 100001) primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  category text not null,
  subject text not null check (char_length(subject) <= 120),
  message text not null,
  priority public.ticket_priority not null default 'Normal',
  status public.ticket_status not null default 'Open',
  contact_email text not null,
  contact_phone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index support_tickets_user_idx on public.support_tickets (user_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null default '',
  link_view text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.trucks enable row level security;
alter table public.drivers enable row level security;
alter table public.loads enable row level security;
alter table public.load_declines enable row level security;
alter table public.bookings enable row level security;
alter table public.kyc_submissions enable row level security;
alter table public.documents enable row level security;
alter table public.support_tickets enable row level security;
alter table public.notifications enable row level security;

-- Profiles: yourself, admins, and the other party of a booking (contact shared after acceptance).
create policy "profiles_select" on public.profiles for select to authenticated using (
  id = (select auth.uid())
  or public.is_admin()
  or exists (
    select 1 from public.bookings b
    where (b.truck_owner_id = (select auth.uid()) and b.load_owner_id = profiles.id)
       or (b.load_owner_id = (select auth.uid()) and b.truck_owner_id = profiles.id)
  )
);
create policy "profiles_update_self" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "profiles_update_admin" on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Trucks
create policy "trucks_select" on public.trucks for select to authenticated using (
  owner_id = (select auth.uid())
  or public.is_admin()
  or exists (select 1 from public.bookings b where b.truck_id = trucks.id and b.load_owner_id = (select auth.uid()))
);
create policy "trucks_insert" on public.trucks for insert to authenticated
  with check (owner_id = (select auth.uid()) and public.current_role_is('truck_owner'));
create policy "trucks_update" on public.trucks for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "trucks_delete" on public.trucks for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Drivers
create policy "drivers_select" on public.drivers for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_admin());
create policy "drivers_insert" on public.drivers for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and public.current_role_is('truck_owner')
    and (assigned_truck_id is null or exists (select 1 from public.trucks t where t.id = assigned_truck_id and t.owner_id = (select auth.uid())))
  );
create policy "drivers_update" on public.drivers for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and (assigned_truck_id is null or exists (select 1 from public.trucks t where t.id = assigned_truck_id and t.owner_id = (select auth.uid())))
  );
create policy "drivers_delete" on public.drivers for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Loads: owners see their own; truck owners see the open marketplace and loads they booked.
create policy "loads_select" on public.loads for select to authenticated using (
  owner_id = (select auth.uid())
  or public.is_admin()
  or (status = 'open' and public.current_role_is('truck_owner'))
  or exists (select 1 from public.bookings b where b.load_id = loads.id and b.truck_owner_id = (select auth.uid()))
);
create policy "loads_insert" on public.loads for insert to authenticated
  with check (owner_id = (select auth.uid()) and status = 'open' and public.current_role_is('load_owner'));
-- Owners may only cancel their own open loads; booking happens through accept_load().
create policy "loads_cancel" on public.loads for update to authenticated
  using (owner_id = (select auth.uid()) and status = 'open')
  with check (owner_id = (select auth.uid()) and status in ('open', 'cancelled'));

create policy "load_declines_select" on public.load_declines for select to authenticated
  using (truck_owner_id = (select auth.uid()) or public.is_admin());
create policy "load_declines_insert" on public.load_declines for insert to authenticated
  with check (truck_owner_id = (select auth.uid()) and public.current_role_is('truck_owner'));
create policy "load_declines_delete" on public.load_declines for delete to authenticated
  using (truck_owner_id = (select auth.uid()));

-- Bookings: visible to both parties and admins. Created only by accept_load().
create policy "bookings_select" on public.bookings for select to authenticated using (
  truck_owner_id = (select auth.uid()) or load_owner_id = (select auth.uid()) or public.is_admin()
);
create policy "bookings_update_transporter" on public.bookings for update to authenticated
  using (truck_owner_id = (select auth.uid()))
  with check (truck_owner_id = (select auth.uid()));

-- KYC submissions: owner can read their own; writes go through submit_kyc().
create policy "kyc_select" on public.kyc_submissions for select to authenticated
  using (profile_id = (select auth.uid()) or public.is_admin());

-- Documents
create policy "documents_select" on public.documents for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_admin());
create policy "documents_insert" on public.documents for insert to authenticated
  with check (owner_id = (select auth.uid()) and storage_path like ((select auth.uid())::text || '/%') and status = 'submitted');
create policy "documents_admin_update" on public.documents for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Support tickets
create policy "tickets_select" on public.support_tickets for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy "tickets_insert" on public.support_tickets for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'Open');
create policy "tickets_admin_update" on public.support_tickets for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Notifications: recipients read and mark as read; rows are created by triggers.
create policy "notifications_select" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "notifications_update" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Business operations
-- ---------------------------------------------------------------------------

-- Accept an open load. Picks the caller's best available truck when none is given.
create or replace function public.accept_load(p_load_id bigint, p_truck_id uuid default null)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  target public.loads;
  chosen public.trucks;
  result public.bookings;
begin
  if not public.current_role_is('truck_owner') then
    raise exception 'Only active truck owners can accept requests' using errcode = '42501';
  end if;

  select * into target from public.loads where id = p_load_id for update;
  if not found then raise exception 'Request not found' using errcode = 'P0002'; end if;
  if target.status <> 'open' then
    raise exception 'This request has already been taken' using errcode = 'P0001';
  end if;

  if p_truck_id is not null then
    select * into chosen from public.trucks
    where id = p_truck_id and owner_id = caller and status = 'Available';
  else
    select * into chosen from public.trucks
    where owner_id = caller and status = 'Available' and capacity_tonnes >= target.quantity_tonnes
    order by (lower(current_city) = lower(target.origin)) desc,
             (lower(preferred_destination) = lower(target.destination)) desc,
             capacity_tonnes asc
    limit 1;
  end if;
  if chosen.id is null then
    raise exception 'You have no available truck with enough capacity for this request' using errcode = 'P0001';
  end if;

  insert into public.bookings (load_id, truck_id, truck_owner_id, load_owner_id)
  values (target.id, chosen.id, caller, target.owner_id)
  returning * into result;

  update public.loads set status = 'booked' where id = target.id;
  delete from public.load_declines where load_id = target.id and truck_owner_id = caller;

  insert into public.notifications (user_id, title, body, link_view)
  values (
    target.owner_id,
    'Your truck request was accepted',
    format('%s → %s will be carried by %s.', target.origin, target.destination, chosen.registration),
    'loads'
  );
  return result;
end;
$$;

-- Submit KYC details and move the account into the admin review queue.
create or replace function public.submit_kyc(p_details jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then raise exception 'Not signed in' using errcode = '42501'; end if;

  insert into public.kyc_submissions (profile_id, legal_name, designation, owner_pan, company_pan, gstin, cin, other_registration, billing_address, pincode)
  values (
    caller,
    p_details ->> 'legalName', p_details ->> 'designation', upper(p_details ->> 'ownerPan'), upper(p_details ->> 'companyPan'),
    upper(p_details ->> 'gstin'), p_details ->> 'cin', p_details ->> 'other', p_details ->> 'address', p_details ->> 'pincode'
  );

  update public.profiles
     set kyc_status = 'pending',
         gstin = coalesce(nullif(upper(p_details ->> 'gstin'), ''), gstin)
   where id = caller and kyc_status in ('not_submitted', 'needs_information', 'pending');
end;
$$;

-- Tell transporters with a nearby available truck about new requests.
create or replace function public.notify_matching_transporters()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, title, body, link_view)
  select distinct t.owner_id,
         'New truck request on your route',
         format('%s → %s · %s tonnes of %s', new.origin, new.destination, new.quantity_tonnes, new.material),
         'loads'
    from public.trucks t
    join public.profiles p on p.id = t.owner_id and p.account_status = 'active'
   where t.status = 'Available'
     and t.capacity_tonnes >= new.quantity_tonnes
     and (lower(t.current_city) = lower(new.origin) or lower(t.preferred_destination) = lower(new.destination));
  return new;
end;
$$;

create trigger loads_notify_transporters
  after insert on public.loads
  for each row execute function public.notify_matching_transporters();

-- Tell users when an admin changes their KYC result.
create or replace function public.notify_kyc_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kyc_status is distinct from old.kyc_status and new.kyc_status in ('verified', 'needs_information', 'rejected') then
    insert into public.notifications (user_id, title, body, link_view)
    values (
      new.id,
      case new.kyc_status
        when 'verified' then 'Your business is verified'
        when 'needs_information' then 'More information needed for KYC'
        else 'Your KYC application was rejected'
      end,
      case new.kyc_status
        when 'verified' then 'You now have full access to Fares24x7.'
        when 'needs_information' then 'Please review your documents and resubmit.'
        else 'Contact support if you believe this is a mistake.'
      end,
      'dashboard'
    );
  end if;
  return new;
end;
$$;

create trigger profiles_notify_kyc
  after update of kyc_status on public.profiles
  for each row execute function public.notify_kyc_change();

-- Tell users when their support ticket moves.
create or replace function public.notify_ticket_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.status is distinct from old.status then
    insert into public.notifications (user_id, title, body, link_view)
    values (new.user_id, format('Support query #%s is %s', new.id, lower(new.status::text)), new.subject, 'dashboard');
  end if;
  return new;
end;
$$;

create trigger support_tickets_notify
  before update on public.support_tickets
  for each row execute function public.notify_ticket_change();

-- Functions are callable only by signed-in users.
revoke execute on function public.accept_load(bigint, uuid) from public, anon;
revoke execute on function public.submit_kyc(jsonb) from public, anon;
grant execute on function public.accept_load(bigint, uuid) to authenticated;
grant execute on function public.submit_kyc(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private bucket, files stored under "<user id>/..."
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "documents_bucket_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "documents_bucket_select" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));
create policy "documents_bucket_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "documents_bucket_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------------
-- Realtime: push request, booking and notification changes to open browsers
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.loads, public.bookings, public.notifications;

-- Fares24x7: data erasure (DPDP Act 2023, s.8(7) and s.12).
--  * Removing a vehicle or driver also removes its document records (files are removed by the app
--    through the Storage API, which Supabase requires for deleting files).
--  * Admins can permanently erase an account. Trip history of the other party is kept with the
--    erased party's details removed. A minimal, non-personal erasure log is kept for accountability.

-- ---------------------------------------------------------------------------
-- Document records follow their vehicle / driver
-- ---------------------------------------------------------------------------
create or replace function public.delete_entity_documents()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.documents where entity_type = tg_argv[0]::public.document_entity and entity_id = old.id;
  return old;
end;
$$;
drop trigger if exists trucks_delete_documents on public.trucks;
create trigger trucks_delete_documents after delete on public.trucks
  for each row execute function public.delete_entity_documents('truck');
drop trigger if exists drivers_delete_documents on public.drivers;
create trigger drivers_delete_documents after delete on public.drivers
  for each row execute function public.delete_entity_documents('driver');

-- A vehicle or driver on an active trip cannot be removed.
create or replace function public.prevent_delete_on_active_trip()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.bookings b
    where (case tg_argv[0] when 'truck' then b.truck_id else b.driver_id end) = old.id
      and b.status in ('confirmed', 'picked_up', 'in_transit')
      -- account erasure is checked separately (admin_delete_account blocks active trips)
  ) then
    raise exception 'This % is on a trip that has not finished. Complete or cancel the trip first.', tg_argv[0] using errcode = 'P0001';
  end if;
  return old;
end;
$$;
drop trigger if exists trucks_prevent_delete_active on public.trucks;
create trigger trucks_prevent_delete_active before delete on public.trucks
  for each row execute function public.prevent_delete_on_active_trip('truck');
drop trigger if exists drivers_prevent_delete_active on public.drivers;
create trigger drivers_prevent_delete_active before delete on public.drivers
  for each row execute function public.prevent_delete_on_active_trip('driver');

drop policy if exists "documents_delete" on public.documents;
create policy "documents_delete" on public.documents for delete to authenticated
  using (owner_id = (select auth.uid()) or public.is_admin());

-- Admins may remove any stored file (needed to erase an account's documents).
drop policy if exists "documents_bucket_delete_admin" on storage.objects;
create policy "documents_bucket_delete_admin" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Keep the other party's trip history when an account is erased
-- ---------------------------------------------------------------------------
alter table public.bookings alter column truck_id drop not null;
alter table public.bookings alter column truck_owner_id drop not null;
alter table public.bookings drop constraint if exists bookings_truck_id_fkey;
alter table public.bookings add constraint bookings_truck_id_fkey foreign key (truck_id) references public.trucks (id) on delete set null;
alter table public.bookings drop constraint if exists bookings_truck_owner_id_fkey;
alter table public.bookings add constraint bookings_truck_owner_id_fkey foreign key (truck_owner_id) references public.profiles (id) on delete set null;
-- A customer's requests are erased with the customer, and their bookings with them.
alter table public.bookings drop constraint if exists bookings_load_owner_id_fkey;
alter table public.bookings add constraint bookings_load_owner_id_fkey foreign key (load_owner_id) references public.profiles (id) on delete cascade;
alter table public.documents drop constraint if exists documents_reviewed_by_fkey;
alter table public.documents add constraint documents_reviewed_by_fkey foreign key (reviewed_by) references public.profiles (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Erasure log (no personal data: only the business name at the time, roles and dates)
-- ---------------------------------------------------------------------------
create table if not exists public.account_erasures (
  id bigint generated always as identity primary key,
  erased_user_id uuid not null,
  business_name text,
  role public.app_role,
  erased_by uuid references public.profiles (id) on delete set null,
  erased_at timestamptz not null default now()
);
alter table public.account_erasures enable row level security;
drop policy if exists "account_erasures_admin" on public.account_erasures;
create policy "account_erasures_admin" on public.account_erasures for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Admin: permanently erase an account
-- ---------------------------------------------------------------------------
create or replace function public.admin_delete_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  target public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Only admins can delete accounts' using errcode = '42501';
  end if;
  if p_user_id = caller then
    raise exception 'You cannot delete your own account' using errcode = 'P0001';
  end if;
  select * into target from public.profiles where id = p_user_id;
  if not found then raise exception 'Account not found' using errcode = 'P0002'; end if;
  if target.role = 'admin' then
    raise exception 'Remove admin rights before deleting an admin account' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.bookings
    where (truck_owner_id = p_user_id or load_owner_id = p_user_id) and status in ('confirmed', 'picked_up', 'in_transit')
  ) then
    raise exception 'This account has trips in progress. Complete or cancel them before deleting the account.' using errcode = 'P0001';
  end if;

  insert into public.account_erasures (erased_user_id, business_name, role, erased_by)
  values (target.id, nullif(target.business_name, ''), target.role, caller);

  -- Cascades to profile, trucks, drivers, requests, KYC, documents records, tickets and notifications.
  delete from auth.users where id = p_user_id;
end;
$$;
revoke execute on function public.admin_delete_account(uuid) from public, anon;
grant execute on function public.admin_delete_account(uuid) to authenticated;

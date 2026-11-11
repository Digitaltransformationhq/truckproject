-- Fares24x7: support Google (OAuth) sign-in.
-- Google sign-ups arrive without a chosen role or business details, so they are marked
-- "not onboarded" and must pick customer / truck owner once before using the workspace.

alter table public.profiles add column if not exists onboarded boolean not null default false;
alter table public.profiles add column if not exists avatar_url text;
update public.profiles set onboarded = true where onboarded = false;

-- Until onboarding is complete, the placeholder role grants no marketplace permissions.
create or replace function public.current_role_is(target public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = target and account_status = 'active' and onboarded
  );
$$;

-- Recreate the sign-up handler: email sign-ups (which send a role) are onboarded immediately;
-- Google sign-ups get their name, email and photo from Google and finish onboarding in the app.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  requested text := meta ->> 'role';
  full_name text := coalesce(meta ->> 'full_name', meta ->> 'name', '');
begin
  insert into public.profiles (id, role, first_name, last_name, business_name, email, phone, city, gstin, details, onboarded, avatar_url)
  values (
    new.id,
    case when requested = 'load_owner' then 'load_owner'::public.app_role else 'truck_owner'::public.app_role end,
    coalesce(meta ->> 'first_name', split_part(full_name, ' ', 1), ''),
    coalesce(meta ->> 'last_name', nullif(trim(substr(full_name, length(split_part(full_name, ' ', 1)) + 1)), ''), ''),
    coalesce(meta ->> 'business_name', ''),
    coalesce(new.email, ''),
    coalesce(meta ->> 'phone', new.phone, ''),
    coalesce(meta ->> 'city', ''),
    nullif(meta ->> 'gstin', ''),
    coalesce(meta -> 'details', '{}'::jsonb),
    coalesce(requested in ('load_owner', 'truck_owner'), false),
    meta ->> 'avatar_url'
  );
  return new;
end;
$$;

-- Users cannot flip their own onboarding flag either (only complete_onboarding() can).
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
    new.onboarded := old.onboarded;
  end if;
  new.id := old.id;
  new.updated_at := now();
  return new;
end;
$$;

-- One-time onboarding for Google sign-ups: choose a role (never admin) and add business details.
create or replace function public.complete_onboarding(p_role text, p_profile jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  if p_role not in ('load_owner', 'truck_owner') then
    raise exception 'Choose customer or truck owner' using errcode = '22023';
  end if;
  if coalesce(trim(p_profile ->> 'business_name'), '') = '' or coalesce(trim(p_profile ->> 'phone'), '') = '' then
    raise exception 'Business name and phone are required' using errcode = '22023';
  end if;

  update public.profiles
     set role = p_role::public.app_role,
         first_name = coalesce(nullif(trim(p_profile ->> 'first_name'), ''), first_name),
         last_name = coalesce(nullif(trim(p_profile ->> 'last_name'), ''), last_name),
         business_name = trim(p_profile ->> 'business_name'),
         phone = trim(p_profile ->> 'phone'),
         city = coalesce(trim(p_profile ->> 'city'), city),
         gstin = coalesce(nullif(upper(trim(p_profile ->> 'gstin')), ''), gstin),
         details = coalesce(p_profile -> 'details', details),
         onboarded = true
   where id = caller and onboarded = false;

  if not found then
    raise exception 'Your account is already set up' using errcode = 'P0001';
  end if;
end;
$$;

revoke execute on function public.complete_onboarding(text, jsonb) from public, anon;
grant execute on function public.complete_onboarding(text, jsonb) to authenticated;

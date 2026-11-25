-- INSIA Phase 1: profiles, businesses, RLS, signup trigger.
-- Apply with the Supabase CLI (`supabase db push`) or paste into the SQL editor.

-- ---------------------------------------------------------------
-- Shared helper: keep updated_at current
-- ---------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------
-- profiles (one row per auth user)
-- ---------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text check (full_name is null or char_length(btrim(full_name)) between 1 and 120),
  preferences jsonb not null default '{}'::jsonb check (jsonb_typeof(preferences) = 'object'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- businesses
-- Phase 1: exactly one business per owner (unique owner_id).
-- Drop the unique index later if multi-business accounts are introduced.
-- ---------------------------------------------------------------
create table public.businesses (
  id                   uuid primary key default gen_random_uuid(),
  owner_id             uuid not null references auth.users (id) on delete cascade,
  business_name        text not null check (char_length(btrim(business_name)) between 1 and 120),
  business_type        text not null check (business_type in (
                         'hotel','restaurant','online_shop','physical_shop','gym','car_rental',
                         'travel_agency','real_estate','beauty_salon','clinic','service_provider','other')),
  custom_business_type text check (custom_business_type is null or char_length(btrim(custom_business_type)) between 1 and 80),
  country              text not null check (char_length(btrim(country)) between 1 and 80),
  city                 text not null check (char_length(btrim(city)) between 1 and 80),
  description          text not null check (char_length(btrim(description)) between 1 and 2000),
  preferred_language   text not null check (char_length(preferred_language) between 2 and 10),
  contact_information  jsonb not null default '{}'::jsonb check (jsonb_typeof(contact_information) = 'object'),
  website              text check (website is null or char_length(website) <= 300),
  onboarding_completed boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  -- a custom category name is required when the type is "other"
  constraint businesses_custom_type_when_other
    check (business_type <> 'other' or custom_business_type is not null)
);

create unique index businesses_owner_id_key on public.businesses (owner_id);

create trigger businesses_set_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- Profile initialisation on signup
-- SECURITY DEFINER so it can write regardless of RLS; search_path pinned.
-- ---------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for users that existed before this migration.
insert into public.profiles (id)
select u.id from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------
alter table public.profiles   enable row level security;
alter table public.businesses enable row level security;

-- profiles: a user can only see and change their own row
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- businesses: owner-only access
create policy "businesses_select_own" on public.businesses
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "businesses_insert_own" on public.businesses
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "businesses_update_own" on public.businesses
  for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "businesses_delete_own" on public.businesses
  for delete to authenticated using (owner_id = (select auth.uid()));

-- No policies for the anon role: unauthenticated clients get no access.
revoke all on public.profiles   from anon;
revoke all on public.businesses from anon;

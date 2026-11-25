-- INSIA Phase 4: website chat widget + live conversations.
-- Run AFTER the Phase 1, 2 and 3 migrations.
--
-- Security model for visitors: browsers never read or write the database directly. The public
-- Edge Functions (widget-config, widget-chat) resolve the business from the widget's public key,
-- verify a per-visitor session token (only its SHA-256 hash is stored), and enforce rate limits.
-- The anon role has no access to any table.

-- ---------------------------------------------------------------
-- widget_settings: one row per business
-- ---------------------------------------------------------------
create table public.widget_settings (
  business_id       uuid primary key references public.businesses (id) on delete cascade,
  public_key        text not null unique default ('wk_' || replace(gen_random_uuid()::text, '-', ''))
                    check (public_key ~ '^wk_[a-f0-9]{32}$'),
  enabled           boolean not null default false,
  primary_color     text not null default '#171A1F' check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  position          text not null default 'bottom-right' check (position in ('bottom-right','bottom-left')),
  bot_name          text check (bot_name is null or char_length(btrim(bot_name)) between 1 and 60),
  welcome_message   text check (welcome_message is null or char_length(welcome_message) <= 300),
  greeting_language text not null default 'auto' check (greeting_language in ('auto','en','fr','ar')),
  starter_questions jsonb not null default '[]'::jsonb
                    check (jsonb_typeof(starter_questions) = 'array' and jsonb_array_length(starter_questions) <= 4),
  logo_url          text check (logo_url is null or (logo_url ~ '^https://' and char_length(logo_url) <= 500)),
  show_status       boolean not null default false,
  status_text       text not null default 'Online' check (char_length(btrim(status_text)) between 1 and 30),
  allowed_domains   jsonb not null default '[]'::jsonb
                    check (jsonb_typeof(allowed_domains) = 'array' and jsonb_array_length(allowed_domains) <= 10),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger widget_settings_set_updated_at before update on public.widget_settings
  for each row execute function public.set_updated_at();

-- A default (unpublished) widget row is created with every business.
create or replace function public.create_default_widget()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.widget_settings (business_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger businesses_create_widget
  after insert on public.businesses
  for each row execute function public.create_default_widget();

insert into public.widget_settings (business_id)
select id from public.businesses
on conflict do nothing;

alter table public.widget_settings enable row level security;
revoke all on public.widget_settings from anon;
create policy "widget_settings_select" on public.widget_settings
  for select to authenticated using (public.has_business_access(business_id));
create policy "widget_settings_insert" on public.widget_settings
  for insert to authenticated with check (public.can_edit_business(business_id));
create policy "widget_settings_update" on public.widget_settings
  for update to authenticated
  using (public.can_edit_business(business_id)) with check (public.can_edit_business(business_id));
create policy "widget_settings_delete" on public.widget_settings
  for delete to authenticated using (public.can_edit_business(business_id));

-- ---------------------------------------------------------------
-- conversations: anonymous visitor session + optional contact details
-- ---------------------------------------------------------------
alter table public.conversations
  add column session_hash    text check (session_hash is null or session_hash ~ '^[a-f0-9]{64}$'),
  add column customer_name   text check (customer_name is null or char_length(customer_name) <= 80),
  add column customer_email  text check (customer_email is null or char_length(customer_email) <= 254),
  add column customer_phone  text check (customer_phone is null or char_length(customer_phone) <= 30),
  add column first_message   text check (first_message is null or char_length(first_message) <= 200),
  add column message_count   integer not null default 0 check (message_count >= 0),
  add column closed_at       timestamptz;

create index conversations_business_status_idx
  on public.conversations (business_id, status, last_message_at desc);
create index conversations_session_idx
  on public.conversations (session_hash) where session_hash is not null;

-- ---------------------------------------------------------------
-- rate limiting (fixed windows). Written only by the Edge Functions via service role.
-- ---------------------------------------------------------------
create table public.rate_limits (
  key          text not null,
  window_start timestamptz not null,
  count        integer not null default 0,
  primary key (key, window_start)
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

create or replace function public.check_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  w timestamptz;
  c integer;
begin
  if p_window_seconds < 1 then raise exception 'invalid window'; end if;
  w := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, w, 1)
  on conflict (key, window_start) do update set count = r.count + 1
  returning r.count into c;
  -- occasional cleanup keeps the table small
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;
  return c <= p_limit;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

-- ---------------------------------------------------------------
-- Storage: public bucket for widget logos. Anyone can view a logo (it is shown on websites);
-- only members who can edit the business may upload or delete files under their business folder.
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('widget-logos', 'widget-logos', true, 524288, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "widget_logos_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'widget-logos'
    and case
      when (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then public.has_business_access(((storage.foldername(name))[1])::uuid)
      else false
    end
  );

create policy "widget_logos_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'widget-logos'
    and case
      when (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then public.can_edit_business(((storage.foldername(name))[1])::uuid)
      else false
    end
  );

create policy "widget_logos_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'widget-logos'
    and case
      when (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then public.can_edit_business(((storage.foldername(name))[1])::uuid)
      else false
    end
  );

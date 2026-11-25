-- INSIA Phase 3: catalog (products, services, rooms...), conversations and messages.
-- Run AFTER the Phase 1 and Phase 2 migrations.
--
-- Design note: one generic catalog_items table (with a `kind`) keeps the engine universal.
-- A hoodie, a hotel room, a menu dish, a gym plan and a rental car are all catalog items.

-- ---------------------------------------------------------------
-- catalog_items
-- ---------------------------------------------------------------
create table public.catalog_items (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses (id) on delete cascade,
  kind          text not null check (kind in ('product','service','room','menu_item','vehicle','plan')),
  name          text not null check (char_length(btrim(name)) between 1 and 120),
  description   text check (description is null or char_length(description) <= 2000),
  price         numeric(12,3) check (price is null or price >= 0),
  currency      text not null default 'TND' check (char_length(btrim(currency)) between 1 and 8),
  price_unit    text check (price_unit is null or char_length(price_unit) <= 40),
  duration_text text check (duration_text is null or char_length(duration_text) <= 60),
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint catalog_items_id_business_key unique (id, business_id)
);
create unique index catalog_items_name_key on public.catalog_items (business_id, kind, lower(name));
create index catalog_items_business_active_idx on public.catalog_items (business_id, active);

create table public.catalog_item_aliases (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  item_id     uuid not null,
  alias       text not null check (char_length(btrim(alias)) between 1 and 120),
  created_at  timestamptz not null default now(),
  constraint catalog_item_aliases_item_fk foreign key (item_id, business_id)
    references public.catalog_items (id, business_id) on delete cascade
);
create unique index catalog_item_aliases_key on public.catalog_item_aliases (item_id, lower(alias));
create index catalog_item_aliases_business_idx on public.catalog_item_aliases (business_id);

-- stock_quantity NULL means "stock is not tracked": the chatbot then refuses to claim availability.
create table public.catalog_variants (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null,
  item_id        uuid not null,
  color          text check (color is null or char_length(btrim(color)) between 1 and 40),
  size           text check (size is null or char_length(btrim(size)) between 1 and 20),
  price          numeric(12,3) check (price is null or price >= 0),
  stock_quantity integer check (stock_quantity is null or stock_quantity >= 0),
  available      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint catalog_variants_item_fk foreign key (item_id, business_id)
    references public.catalog_items (id, business_id) on delete cascade,
  constraint catalog_variants_has_attribute check (color is not null or size is not null)
);
create unique index catalog_variants_key
  on public.catalog_variants (item_id, coalesce(lower(color), ''), coalesce(lower(size), ''));
create index catalog_variants_business_idx on public.catalog_variants (business_id);

-- ---------------------------------------------------------------
-- conversations and messages
-- context holds the small structured state of the engine (last item, pending question).
-- Only the message text needed to run the service is stored: no customer profile data.
-- ---------------------------------------------------------------
create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses (id) on delete cascade,
  channel         text not null default 'dashboard_test'
                  check (channel in ('dashboard_test','website','whatsapp','instagram','messenger','api')),
  status          text not null default 'open' check (status in ('open','closed')),
  context         jsonb not null default '{}'::jsonb check (jsonb_typeof(context) = 'object'),
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  constraint conversations_id_business_key unique (id, business_id)
);
create index conversations_business_recent_idx on public.conversations (business_id, last_message_at desc);

create table public.messages (
  id                 uuid primary key default gen_random_uuid(),
  conversation_id    uuid not null,
  business_id        uuid not null,
  sender_type        text not null check (sender_type in ('customer','bot','owner')),
  original_content   text not null check (char_length(original_content) between 1 and 4000),
  normalized_content text check (normalized_content is null or char_length(normalized_content) <= 4000),
  detected_language  text check (detected_language is null or char_length(detected_language) <= 10),
  response_status    text check (response_status is null or response_status in ('answered','partial','clarification','fallback')),
  metadata           jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at         timestamptz not null default now(),
  constraint messages_conversation_fk foreign key (conversation_id, business_id)
    references public.conversations (id, business_id) on delete cascade
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index messages_business_idx on public.messages (business_id, created_at desc);

-- ---------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------
create trigger catalog_items_set_updated_at before update on public.catalog_items
  for each row execute function public.set_updated_at();
create trigger catalog_variants_set_updated_at before update on public.catalog_variants
  for each row execute function public.set_updated_at();
create trigger conversations_set_updated_at before update on public.conversations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- RLS: same tenant model as Phase 2 (members read, owner/admin/editor write).
-- ---------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'catalog_items','catalog_item_aliases','catalog_variants','conversations','messages'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.has_business_access(business_id))', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.can_edit_business(business_id))', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.can_edit_business(business_id)) with check (public.can_edit_business(business_id))', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.can_edit_business(business_id))', t || '_delete', t);
  end loop;
end;
$$;

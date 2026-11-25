-- INSIA Phase 2: knowledge tables, business_members, tenant-scoped RLS, onboarding step.
-- Run AFTER 20260101000000_phase1_foundation.sql.

-- ---------------------------------------------------------------
-- Onboarding progress marker (the step to show next, 1-5)
-- ---------------------------------------------------------------
alter table public.businesses
  add column onboarding_step smallint not null default 1 check (onboarding_step between 1 and 5);
update public.businesses set onboarding_step = 5 where onboarding_completed;
update public.businesses set onboarding_step = 3 where not onboarding_completed;

-- ---------------------------------------------------------------
-- business_members: who may access a business, and with which role.
-- Clients cannot write this table; membership is created by trigger.
-- ---------------------------------------------------------------
create table public.business_members (
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        text not null default 'owner' check (role in ('owner','admin','editor','viewer')),
  created_at  timestamptz not null default now(),
  primary key (business_id, user_id)
);
create index business_members_user_id_idx on public.business_members (user_id);

create or replace function public.add_owner_as_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.business_members (business_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

create trigger businesses_add_owner_member
  after insert on public.businesses
  for each row execute function public.add_owner_as_member();

insert into public.business_members (business_id, user_id, role)
select id, owner_id, 'owner' from public.businesses
on conflict do nothing;

alter table public.business_members enable row level security;
create policy "members_select_own" on public.business_members
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.business_members from anon;

-- Access helpers. SECURITY DEFINER so policies can read business_members without recursion.
create or replace function public.has_business_access(bid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.business_members m
    where m.business_id = bid and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.can_edit_business(bid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.business_members m
    where m.business_id = bid and m.user_id = (select auth.uid())
      and m.role in ('owner','admin','editor')
  );
$$;

revoke all on function public.has_business_access(uuid) from public, anon;
revoke all on function public.can_edit_business(uuid) from public, anon;
grant execute on function public.has_business_access(uuid) to authenticated;
grant execute on function public.can_edit_business(uuid) to authenticated;

-- ---------------------------------------------------------------
-- business_facts
-- key is set for template facts (e.g. 'address'); null for custom facts.
-- ---------------------------------------------------------------
create table public.business_facts (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  key         text check (key is null or key ~ '^[a-z][a-z0-9_]{0,59}$'),
  label       text not null check (char_length(btrim(label)) between 1 and 120),
  value       text not null check (char_length(btrim(value)) between 1 and 2000),
  verified    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint business_facts_business_key_key unique (business_id, key)
);
create index business_facts_business_id_idx on public.business_facts (business_id);

-- ---------------------------------------------------------------
-- knowledge_questions / answers / aliases
-- ---------------------------------------------------------------
create table public.knowledge_questions (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses (id) on delete cascade,
  question      text not null check (char_length(btrim(question)) between 1 and 500),
  status        text not null default 'active' check (status in ('active','disabled')),
  verification  text not null default 'needs_input' check (verification in ('verified','incomplete','needs_input')),
  template_key  text check (template_key is null or template_key ~ '^[a-z][a-z0-9_]{0,59}$'),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint knowledge_questions_id_business_key unique (id, business_id),
  constraint knowledge_questions_business_template_key unique (business_id, template_key)
);
create index knowledge_questions_business_id_idx on public.knowledge_questions (business_id, status);

-- The composite foreign keys guarantee an answer/alias can never point at
-- a question that belongs to a different business.
create table public.knowledge_answers (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  question_id uuid not null,
  language    text not null default 'any' check (language = 'any' or char_length(language) between 2 and 10),
  answer_text text not null check (char_length(btrim(answer_text)) between 1 and 4000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint knowledge_answers_question_fk foreign key (question_id, business_id)
    references public.knowledge_questions (id, business_id) on delete cascade,
  constraint knowledge_answers_question_language_key unique (question_id, language)
);
create index knowledge_answers_business_id_idx on public.knowledge_answers (business_id);

create table public.knowledge_aliases (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  question_id uuid not null,
  phrase      text not null check (char_length(btrim(phrase)) between 1 and 500),
  created_at  timestamptz not null default now(),
  constraint knowledge_aliases_question_fk foreign key (question_id, business_id)
    references public.knowledge_questions (id, business_id) on delete cascade
);
create unique index knowledge_aliases_question_phrase_key on public.knowledge_aliases (question_id, lower(phrase));
create index knowledge_aliases_business_id_idx on public.knowledge_aliases (business_id);

-- ---------------------------------------------------------------
-- business_instructions / vocabulary_entries
-- ---------------------------------------------------------------
create table public.business_instructions (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  instruction text not null check (char_length(btrim(instruction)) between 1 and 500),
  enabled     boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index business_instructions_business_id_idx on public.business_instructions (business_id);

create table public.vocabulary_entries (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  term        text not null check (char_length(btrim(term)) between 1 and 80),
  meaning     text not null check (char_length(btrim(meaning)) between 1 and 200),
  notes       text check (notes is null or char_length(notes) <= 500),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index vocabulary_entries_unique_key
  on public.vocabulary_entries (business_id, lower(term), lower(meaning));
create index vocabulary_entries_business_id_idx on public.vocabulary_entries (business_id);

-- ---------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------
create trigger business_facts_set_updated_at before update on public.business_facts
  for each row execute function public.set_updated_at();
create trigger knowledge_questions_set_updated_at before update on public.knowledge_questions
  for each row execute function public.set_updated_at();
create trigger knowledge_answers_set_updated_at before update on public.knowledge_answers
  for each row execute function public.set_updated_at();
create trigger business_instructions_set_updated_at before update on public.business_instructions
  for each row execute function public.set_updated_at();
create trigger vocabulary_entries_set_updated_at before update on public.vocabulary_entries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- RLS: every knowledge table is scoped by business_id through membership.
-- Read: any member. Write: owner, admin or editor.
-- ---------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'business_facts','knowledge_questions','knowledge_answers',
    'knowledge_aliases','business_instructions','vocabulary_entries'
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

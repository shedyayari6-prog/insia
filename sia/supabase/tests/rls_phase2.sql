-- Manual RLS check for Phase 2. Run in the Supabase SQL editor.
-- Replace the two UUIDs with real users that each own a business.
-- Every statement marked EXPECT must behave as described.

begin;
select set_config('request.jwt.claims', '{"sub":"<USER_A_UUID>","role":"authenticated"}', true);
set local role authenticated;

select count(*) as a_can_see from public.knowledge_questions;            -- only A's rows
select count(*) as b_rows_visible_to_a
  from public.knowledge_questions where business_id = '<BUSINESS_B_UUID>'; -- EXPECT 0

update public.business_facts set value = 'x'
  where business_id = '<BUSINESS_B_UUID>';                                -- EXPECT UPDATE 0

insert into public.vocabulary_entries (business_id, term, meaning)
  values ('<BUSINESS_B_UUID>', 'x', 'y');                                 -- EXPECT error: row-level security

insert into public.business_members (business_id, user_id, role)
  values ('<BUSINESS_B_UUID>', '<USER_A_UUID>', 'owner');                 -- EXPECT error: no insert policy
rollback;

-- Manual RLS check for Phase 3. Run in the Supabase SQL editor with two real users.
-- Replace the placeholders. Every statement marked EXPECT must behave as described.

begin;
select set_config('request.jwt.claims', '{"sub":"<USER_A_UUID>","role":"authenticated"}', true);
set local role authenticated;

select count(*) from public.catalog_items where business_id = '<BUSINESS_B_UUID>';      -- EXPECT 0
select count(*) from public.conversations where business_id = '<BUSINESS_B_UUID>';      -- EXPECT 0
select count(*) from public.messages where business_id = '<BUSINESS_B_UUID>';           -- EXPECT 0

insert into public.catalog_items (business_id, kind, name)
  values ('<BUSINESS_B_UUID>', 'product', 'x');                                         -- EXPECT error: row-level security

insert into public.conversations (business_id) values ('<BUSINESS_B_UUID>');             -- EXPECT error: row-level security

-- An item cannot be attached to another business's alias row (composite foreign key):
insert into public.catalog_item_aliases (business_id, item_id, alias)
  values ('<BUSINESS_A_UUID>', '<ITEM_OF_BUSINESS_B_UUID>', 'x');                        -- EXPECT error
rollback;

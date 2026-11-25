-- Manual RLS check for Phase 4. Run in the Supabase SQL editor with two real users.
-- Replace the placeholders. Every statement marked EXPECT must behave as described.

-- The anon role (what a website visitor's browser would use) must see nothing.
begin;
set local role anon;
select count(*) from public.widget_settings;   -- EXPECT error: permission denied
rollback;
begin;
set local role anon;
select count(*) from public.conversations;     -- EXPECT error: permission denied
rollback;
begin;
set local role anon;
select count(*) from public.messages;          -- EXPECT error: permission denied
rollback;

-- A signed-in member of ANOTHER business must not see or change this business's widget or conversations.
begin;
select set_config('request.jwt.claims', '{"sub":"<USER_A_UUID>","role":"authenticated"}', true);
set local role authenticated;
select count(*) from public.widget_settings where business_id = '<BUSINESS_B_UUID>';          -- EXPECT 0
update public.widget_settings set enabled = true where business_id = '<BUSINESS_B_UUID>';      -- EXPECT UPDATE 0
select count(*) from public.conversations where business_id = '<BUSINESS_B_UUID>';            -- EXPECT 0
select count(*) from public.rate_limits;                                                       -- EXPECT error: permission denied
select public.check_rate_limit('x', 1, 60);                                                    -- EXPECT error: permission denied
rollback;

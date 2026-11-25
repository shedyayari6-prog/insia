# INSIA — Phases 1, 2 & 3

React + TypeScript + Vite + Tailwind + Supabase (Auth + Postgres).

> **Status: written, not yet run.** The code was written in an environment with no network access,
> so `npm install`, the dev server, `tsc`, ESLint and every Supabase flow have **not** been executed.
> Only a syntax parse of all 41 TypeScript files was run (0 errors). Work through the checklist below
> before treating Phase 1 as complete.

## Setup

1. `npm install`
2. Create a Supabase project. In **Project Settings → API** copy the project URL and the **anon** key.
3. `cp .env.example .env` and fill in:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

   Never use the service-role key in this app.
4. Apply the database migration (see below).
5. In Supabase **Authentication → URL Configuration**, set Site URL to `http://localhost:5173` and add
   `http://localhost:5173/login` and `http://localhost:5173/reset-password` to Redirect URLs
   (add your production URLs too).
6. `npm run dev`

## Database migration

File: `supabase/migrations/20260101000000_phase1_foundation.sql`

- **Supabase CLI:** `supabase link --project-ref <ref>` then `supabase db push`
- **Or:** paste the file into the dashboard **SQL Editor** and run it once.

It creates `profiles` and `businesses` (constraints, indexes, `updated_at` triggers), a trigger that
creates a profile row when a user registers, and RLS policies restricting every row to its owner.
Phase 1 allows one business per owner (unique index on `owner_id`).

## Scripts

`npm run dev` · `npm run build` · `npm run typecheck` · `npm run lint`

## Project structure

```
src/
  components/ layout/ navigation/ ui/ previews/
  pages/ public/ auth/ onboarding/ dashboard/
  contexts/   AuthContext, BusinessContext
  services/   auth, profile, business  (all Supabase calls live here)
  lib/        supabase client, constants, validation, pricing config
  types/
```

Pricing is configured in `src/lib/pricing.ts` (prices are `null` until decided).
The logo is `public/insia-mark-gold.png` (your uploaded Eye of Horus, made transparent and recoloured to #B99A5B).
A vector SVG would be sharper at large sizes; send one when available.

## Verification checklist (run these, then update this file)

**Static:** `npm run typecheck` · `npm run lint` · `npm run build`

**Auth:** register → (confirm email if enabled) → lands in onboarding · log out · log in ·
wrong password shows an error · forgot password email arrives → link opens `/reset-password` →
new password works · `/dashboard` while logged out redirects to `/login`.

**Onboarding:** step 1 saves name · step 2 validation errors show · "Other" requires a custom category ·
close the tab on step 3 and reopen: resumes on step 3 with saved data · edit from the summary ·
"Finish setup" opens the dashboard · `/onboarding` then redirects to `/dashboard`.

**Business Profile / Settings:** edit and save, reload, confirm persistence (also check the row in the
Supabase table editor) · change name, change password (wrong current password is rejected), toggle preference.

**RLS** (SQL editor, replace the UUIDs with two real users):

```sql
-- act as user A
select set_config('request.jwt.claims', '{"sub":"<USER_A_UUID>","role":"authenticated"}', true);
set local role authenticated;
select id, owner_id from public.businesses;                       -- only A's row
update public.businesses set business_name = 'x' where owner_id = '<USER_B_UUID>'; -- 0 rows
insert into public.businesses (owner_id, business_name, business_type, country, city, description, preferred_language)
values ('<USER_B_UUID>', 'x', 'hotel', 'x', 'x', 'x', 'en');      -- must fail (RLS)
```

**Responsive:** check 375px, 768px and 1280px: landing, pricing, auth, onboarding, dashboard drawer.

## Intentionally postponed

Knowledge Center, learning, conversations, customers, channels, developer API, credits and all
chatbot logic (Phase 2+). Those dashboard sections show a "Coming in a later phase" state.
Legal pages are draft placeholders that need real text.


---

# Phase 2: Knowledge

## Apply the Phase 2 migration

Run `supabase/migrations/20260102000000_phase2_knowledge.sql` **after** the Phase 1 migration
(`supabase db push`, or paste it into the SQL Editor). Then `npm install` (adds `vitest`).

It adds: `business_members` (owners are added automatically by trigger; clients cannot write it),
`business_facts`, `knowledge_questions`, `knowledge_answers`, `knowledge_aliases`,
`business_instructions`, `vocabulary_entries`, and `businesses.onboarding_step`.
Every knowledge table has RLS through `has_business_access()` / `can_edit_business()`, and answers and aliases
use composite foreign keys so they cannot reference another business's question.

## What is implemented

- Onboarding is now 5 steps: personal, business, **category-specific details (skippable)**,
  **suggested questions (keep / edit / disable)**, confirmation. Progress resumes from `onboarding_step`.
- Suggested answers are composed **only** from details the owner entered. Missing details are never invented;
  such questions show "Needs your input" or "Incomplete", have no answer and start disabled.
- Knowledge Center (`/dashboard/knowledge`): business facts (category template + custom facts),
  questions & answers (alternative phrasings, verified flag, enable/disable, search, delete),
  instructions, and vocabulary. All data is scoped to the business by RLS.
- Routes now match the master spec: `/dashboard/business`, `/knowledge`, `/learning`, `/developers`.

## Not implemented yet (by design)

- The chatbot engine: saved knowledge, instructions and vocabulary are **not used to answer anyone yet** (Phase 3).
- Products/services tables and linking an answer to a product or category.
- Team invitations (the `business_members` table and roles exist; no invite UI).
- Question text and suggested answers are generated in English only.
- Saving a question, its answer and aliases is several requests, not one transaction. If one fails, save again.

## Tests

`npm test` runs `src/lib/templates.test.ts` (template data integrity for all 12 categories, answer composition,
suggestion status rules, alias parsing). RLS is verified manually with `supabase/tests/rls_phase2.sql`.
Test results are not recorded here: run them and check.

## Phase 2 checklist

`npm run typecheck` · `npm run lint` · `npm test` · `npm run build`

Onboarding: register a new account → steps 3 and 4 appear for your category · leave empty details and confirm
affected questions show "Needs your input" and start disabled · fill address, confirm "Where are you located?"
is answered and verified · close the tab on step 4 and reopen: resumes there with your edits.
Knowledge Center: add/edit/delete a fact, question (with aliases), instruction, vocabulary entry; reload and
confirm persistence; try a duplicate vocabulary entry (should say it already exists); test with a second account
and confirm it cannot see the first account's data (also run the RLS script).
Existing Phase 1 accounts that already finished onboarding skip the new steps and can use the Knowledge Center directly.


---

# Phase 3: Universal chatbot engine

## Apply and deploy

1. Run `supabase/migrations/20260103000000_phase3_engine.sql` (after Phases 1 and 2).
2. Deploy the function: `supabase functions deploy chatbot-process` (CLI linked to your project).
   `SUPABASE_URL` and `SUPABASE_ANON_KEY` are provided to hosted functions automatically. No service-role key is used.
3. `npm install`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run dev`.
4. Dashboard → Knowledge Center → **Products & services** → add items, then open **Test your chatbot**.

## Architecture

The engine is pure TypeScript with no Deno, browser or Supabase imports, in `supabase/functions/_shared/engine/`
(inside the functions folder so the Supabase CLI bundles it). The edge function loads one business's data and calls
`processMessage()`; tests call the same function with fixtures.

```
engine/
  normalization/  normalize.ts (text, Arabic, Arabizi helpers) · language.ts
  tokenization/   tokenize.ts (+ stopwords)
  dictionary/     global.ts (shared EN/FR/AR/Derja data) · index.ts (phrase index, longest match) · vocabulary.ts (private)
  matching/       similarity.ts (edit distance, tiers, thresholds)
  intents/        recognize.ts (all intents, multi-intent)
  entities/       recognize.ts (catalog items, colour, size, date, time, people, facility, place)
  context/        context.ts (TTL, clarification, reference resolution)
  retrieval/      retrieve.ts (one resolver per intent, approved-answer matching)
  response/       templates.ts (en/fr/ar/derja) · build.ts · instructions.ts
  pipeline/       process.ts (the 12 stages)
  __tests__/      fixtures.ts · engine.test.ts
supabase/functions/chatbot-process/index.ts   (auth, validation, membership, data loading, persistence)
```

Entities are recognised before intents (several intents depend on what the customer named). Everything else follows the spec order.

## How it works

- **Normalisation:** NFKC, lower-case, accents removed, Arabic letter variants folded, Arabic-Indic digits to ASCII, apostrophes split
  (`l'ouverture` → `l ouverture`), letter runs shortened (`saleeem`). The original message is always kept. Arabizi digits (3 7 9 5 8) are
  converted only inside Latin words that contain letters, only when comparing with known words.
- **Dictionary:** a *global* dictionary (code, identical for every business) maps aliases to concepts (PRICE, DELIVERY, LOCATION…).
  A business's *private* vocabulary (`vocabulary_entries`: term → meaning) is applied only from that business's rows.
  The Phase 2 vocabulary table has no separate aliases table, so "term → meaning" is the mechanism.
- **Matching tiers:** exact → loose form (hoodie/hudi/hoodies) → Arabizi consonant skeleton (b9addesh ≈ b9dch) → bounded fuzzy
  (words of 4 letters or fewer must match exactly; fuzzy needs 5+ letters, the same first letter and at most 1–2 edits).
  Spelling similarity is reported separately from intent, entity and overall confidence.
- **Intents:** all intents in the message are kept. Entities decide ambiguous cases (price of a room vs. an item, availability vs. facility).
- **Retrieval:** owner-approved answers first (by template key), then verified facts, then catalog items and variants.
  Only **verified** facts and **active** approved answers are ever stated.
- **Context:** the last item, colour, size, intents and any pending clarification are stored per conversation (30-minute expiry).
  A reused item must still exist in the same business's catalog.
- **Responses:** deterministic templates filled with business data; the reply language follows the customer
  (the business's preferred language is used only when the customer's language is unclear).
- **Confidence:** HIGH answers normally; MEDIUM confirms the interpretation ("I understood you mean…") or asks which item;
  LOW gives the safe fallback plus the business's contact details.

## Safety rules enforced in code (and tested)

Never invents prices, stock, availability, hours, addresses or policies · never says a reservation, order or appointment is confirmed ·
room/date availability is always "the business needs to confirm" · a facility that is not listed is "I can't confirm", never "we don't have it" ·
untracked stock (empty) is never described as in stock · discounts are always "no verified information" (no discount data exists) ·
unverified facts are ignored.

## Security

The function forwards the caller's JWT, so RLS decides every read and write (no service-role key). It verifies `business_members`
membership itself, rejects viewers, validates ids and message length (2000), returns generic errors, and returns debug details only
to authenticated members who ask. Conversations and messages are tenant-scoped with composite foreign keys.

## Tests

Run `npm test`. Two suites: `src/lib/templates.test.ts` (Phase 2) and `supabase/functions/_shared/engine/__tests__/engine.test.ts`
(normalisation, matching, dictionary, language, vocabulary privacy, Tests A–J from the spec, context, reply language).
Tenant isolation in the database is verified manually with `supabase/tests/rls_phase3.sql`.

## Known limitations

- Retrieval loads a bounded snapshot per message (up to 500 items, 500 approved questions, 300 facts, 500 vocabulary terms),
  not per-word database searches. Larger catalogs need DB-side search later.
- "Closing time" returns the opening-hours text, because hours are free text.
- Instructions: only two patterns are interpreted (never promise stock; explain delivery before an order). Others are saved and shown as "not interpreted yet".
- Arabic and Derja templates cover the core replies only (others fall back to English) and need native-speaker review.
- Place names for delivery are detected heuristically (capitalised words after a preposition, or after lel/ila/vers).
- Saving an item with its options is several requests, not one transaction.
- Rate limiting and public channel/widget key resolution are not implemented (Phase 6–7). The endpoint is for signed-in dashboard testing only.
- Customer-opportunity detection, automatic learning, billing and integrations are not started (later phases).

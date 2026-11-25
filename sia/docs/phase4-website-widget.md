# INSIA Phase 4: Website chat widget and live conversations

## 1. Install (in this order)

1. **Database.** In the Supabase SQL Editor run `supabase/migrations/20260104000000_phase4_widget.sql`
   (after the Phase 1, 2 and 3 migrations). It creates the widget settings, the visitor-session and contact
   columns on `conversations`, the rate limiter and the `widget-logos` storage bucket.
2. **Small edits to existing files.** From the project root run `node tools/apply-phase4-edits.mjs`.
   It turns the Conversations menu item into a real page, adds "Website Chatbot" to the menu, adds three routes to
   `src/App.tsx` and lets `tsconfig.json` type-check the widget code. It is safe to run twice. If it prints MANUAL, follow its note.
3. **Deploy the three functions** (replace `YOUR_PROJECT_REF`). The two public ones MUST use `--no-verify-jwt`,
   because website visitors do not have an INSIA login:
   ```
   npx supabase@latest functions deploy widget-config  --project-ref YOUR_PROJECT_REF --no-verify-jwt
   npx supabase@latest functions deploy widget-chat    --project-ref YOUR_PROJECT_REF --no-verify-jwt
   npx supabase@latest functions deploy chatbot-process --project-ref YOUR_PROJECT_REF
   ```
   `chatbot-process` (the dashboard test) was updated to share its data loader with the widget, so redeploy it too.
4. `npm run typecheck`, `npm run lint`, `npm test`, `npm run dev`.
5. In the dashboard: **Website Chatbot** → set it up → turn on "Show the chatbot on my website" → **Save changes**.

No new secrets are needed. The service-role key the two public functions use is provided to the function runtime by Supabase
and never reaches the browser.

## 2. How it works

```
Visitor's browser                         Supabase Edge Functions                       Database
┌────────────────┐  GET widget-config?key   ┌───────────────┐                      ┌──────────────────┐
│ insia-widget.js│ ───────────────────────► │ widget-config │ ── key → business ──►│ widget_settings  │
│ (Shadow DOM)   │ ◄── safe config only ─── └───────────────┘                      └──────────────────┘
│                │  POST widget-chat        ┌───────────────┐   same engine as     ┌──────────────────┐
│ public key +   │ ───────────────────────► │  widget-chat  │ ── "Test your    ───►│ conversations    │
│ session token  │ ◄── reply only ───────── └───────────────┘     chatbot" ──────  │ messages         │
└────────────────┘                                                                 └──────────────────┘
```

* The business is always derived from the **public key**. A business id sent by a browser is ignored.
* The chatbot is the **same engine** (`processMessage`) used by "Test your chatbot": no second chatbot.
* Request handling lives in `supabase/functions/_shared/widget/handler.ts` behind a store interface, so the same code runs on
  Supabase, in the unit tests and in the local mock server.
* The widget script is `public/insia-widget.js` (no dependencies, no cookies, Shadow DOM). The dashboard preview loads the same file.

## 3. Security measures

| Risk | Measure |
|---|---|
| Visitor reads another business's data | Business derived from the validated public key; every query filters by that business id; conversations also bound to the session |
| Visitor reads another visitor's conversation | The browser keeps a random 256-bit session token. Only its SHA-256 hash is stored. A conversation answers only to the token that created it (otherwise 404) |
| Database access from the browser | The `anon` role has no access to any table. Visitors only talk to the two functions |
| Secret exposure | Installation code contains only the public key. No service-role or API secret is ever sent to a browser |
| Debug / internal data leaks | Visitors receive `reply`, `status`, `conversation_id`, `language` only. No intents, sources, confidence or debug |
| Abuse and floods | Per-session (20 messages/min), per-address (60/min, address hashed, never stored raw) and per-business (2000/hour) limits; 1000-character messages; 200 messages per conversation; 8 KB request cap |
| Embedding on unwanted sites | Optional allow-list of websites per widget. (Browsers send the Origin header; this stops casual re-use, it is not authentication) |
| Stolen or shared code | "Create a new installation code" replaces the key immediately |
| XSS | The widget writes text with `textContent` only. Owner-written text such as the welcome message is never treated as HTML. Logo URLs must be `https` |
| Config tampering | Colour, position and URLs are re-validated server-side before being sent to browsers |
| Logo uploads | Bucket limited to PNG/JPG/WebP, 512 KB; only members who can edit a business may upload to or delete from its folder |

Visitor privacy: anonymous by default. Name, email and phone are optional, typed by the visitor, validated and stored
only on that conversation. Nothing is guessed or invented.

## 4. Local testing without deploying anything

```
npx tsx tools/mock-widget-server.ts
```
then open `http://localhost:8787/widget-test.html?key=wk_00000000000000000000000000000001&api=http://localhost:8787/functions/v1`
(keys `...01` to `...08` are a clothing shop, hotel, restaurant, gym, a disabled widget, a second shop, a hostile-text welcome message
and a website-restricted widget). The mock runs the real handler and the real engine with in-memory sample data.

Optional real-browser test (needs `npm i -D playwright` and `npx playwright install chromium`): with the mock server running,
`node tools/e2e-widget.cjs`.

## 5. Owner guide (also shown inside the dashboard)

1. Open **Website Chatbot**. Choose a name, colour, position, logo, welcome message and up to 4 suggested questions.
   The live preview updates as you type.
2. Turn on **Show the chatbot on my website** and **Save changes**.
3. Copy the code in **Install on your website** and paste it just before `</body>` (or into your builder's footer / custom-code area:
   WordPress, Shopify, Wix, Squarespace and Webflow steps are listed on the page).
4. Open **Conversations** to read what customers ask. Open one to see the full history, close it, or reopen it.
   Anything the chatbot could not answer is flagged "No verified answer".

INSIA must be published at a public web address before other people's websites can load the widget. While INSIA only runs on your
own computer, use the mock server or the test page to try it.

## 6. Known limitations

* The Supabase store, the Edge Functions, the migration SQL, storage policies and RLS were **not executed** by me (no Supabase here).
  Run `supabase/tests/rls_phase4.sql` and the checklist below.
* The dashboard pages (Website Chatbot, Conversations) were type-checked against stand-in library types and their logic is unit-tested,
  but they were not run in a browser.
* Rate limiting uses fixed one-minute windows (a burst can straddle two windows).
* Closed conversations: if a visitor writes after the owner closed their chat, the widget quietly starts a new conversation.
* The visitor's browser stores the session token in `localStorage`. Clearing site data starts a new conversation.
* The owner cannot reply in a conversation yet (human takeover is a later phase). Reopening only changes its status.
* Live updates use polling (every 10 to 20 seconds), not realtime push.
* The widget interface is available in English, French and Arabic. Replies follow the visitor's own language through the engine.
* The Origin allow-list can be bypassed by non-browser clients; the other limits still apply.
* Saving widget settings, the logo and conversation status are separate requests, not one transaction.

## 7. Manual verification checklist (needs your Supabase)

1. Run the RLS script `supabase/tests/rls_phase4.sql`.
2. Publish a widget, open `/widget-test.html?key=...&api=https://YOUR_REF.supabase.co/functions/v1` and chat.
3. Confirm the conversation appears in **Conversations**, then close and reopen it.
4. Create a second business, publish its widget, and confirm its chat and conversation list are separate.
5. Disable the widget and confirm the chat disappears (within about a minute because of caching).
6. Upload a logo, save, reload, and confirm it still shows in the preview and on the test page.

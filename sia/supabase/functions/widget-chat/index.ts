// POST /functions/v1/widget-chat
// PUBLIC endpoint (deploy with --no-verify-jwt). Body: { action?, public_key, session_token, message?, conversation_id?, contact? }
//  - The business is derived from public_key. A business id sent by the browser is ignored.
//  - A conversation is reachable only with the session token that created it (only its hash is stored).
//  - Rate limited per session, per network address (hashed) and per business.
//  - Messages go through the SAME chatbot engine as the dashboard test. Visitors never receive debug data.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { handleChat } from '../_shared/widget/handler.ts'
import { SupabaseWidgetStore } from '../_shared/widgetStore.ts'
import { PUBLIC_CORS, clientIp, sha256Hex, toResponse } from '../_shared/http.ts'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const deps = { store: new SupabaseWidgetStore(db), hash: sha256Hex, log: (e: unknown) => console.error('widget-chat failed:', e) }

const MAX_BODY_BYTES = 8 * 1024

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: PUBLIC_CORS })
  let body: unknown = null
  if (req.method === 'POST') {
    const text = await req.text()
    if (text.length <= MAX_BODY_BYTES) {
      try { body = JSON.parse(text) } catch { body = null }
    }
  }
  return toResponse(await handleChat({
    method: req.method, query: {}, body, origin: req.headers.get('origin'), ip: clientIp(req),
  }, deps))
})

// GET /functions/v1/widget-config?key=wk_...
// PUBLIC endpoint (deploy with --no-verify-jwt): returns the browser-safe configuration of one widget.
// It never returns business data, the business id, or any secret. See _shared/widget/handler.ts.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { handleConfig } from '../_shared/widget/handler.ts'
import { SupabaseWidgetStore } from '../_shared/widgetStore.ts'
import { PUBLIC_CORS, clientIp, sha256Hex, toResponse } from '../_shared/http.ts'

// The service-role key exists only inside the function runtime.
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const deps = { store: new SupabaseWidgetStore(db), hash: sha256Hex, log: (e: unknown) => console.error('widget-config failed:', e) }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: PUBLIC_CORS })
  const url = new URL(req.url)
  return toResponse(await handleConfig({
    method: req.method, query: Object.fromEntries(url.searchParams), body: null, origin: req.headers.get('origin'), ip: clientIp(req),
  }, deps))
})

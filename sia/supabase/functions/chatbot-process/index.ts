// POST /functions/v1/chatbot-process
// Authenticated dashboard testing endpoint. It runs the SAME engine that future channels will use.
//
// Security model:
//  - The caller's own JWT is forwarded to the database, so Row Level Security decides what is readable.
//    No service-role key is used or needed here.
//  - The business is never trusted from the request: membership is verified against business_members.
//  - Debug details are returned only to authenticated members who ask for them. Public channels
//    (future) must never set `debug`.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { processMessage } from '../_shared/engine/pipeline/process.ts'
import { loadEngineData } from '../_shared/loadEngineData.ts'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_MESSAGE = 2000

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

interface RequestBody { business_id?: unknown; conversation_id?: unknown; message?: unknown; debug?: unknown }

/** Plain-text description of a database or runtime error. Shown only to verified members. */
function describeError(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { message?: string; code?: string; details?: string; hint?: string }
    return [e.code, e.message, e.details, e.hint].filter(Boolean).join(' | ').slice(0, 600)
  }
  return String(err).slice(0, 600)
}

Deno.serve(async (req) => {
  let showDetail = false
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed.' })

  try {
    const auth = req.headers.get('Authorization')
    if (!auth?.startsWith('Bearer ')) throw new HttpError(401, 'Sign in to use this endpoint.')

    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: userData, error: userError } = await client.auth.getUser(auth.slice('Bearer '.length))
    if (userError || !userData.user) throw new HttpError(401, 'Your session has expired. Sign in again.')
    const userId = userData.user.id

    // ---- validate the request
    let body: RequestBody
    try { body = await req.json() } catch { throw new HttpError(400, 'Request body must be JSON.') }
    const businessId = body.business_id
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    const conversationId = body.conversation_id ?? null
    if (typeof businessId !== 'string' || !UUID.test(businessId)) throw new HttpError(400, 'business_id must be a valid id.')
    if (!message) throw new HttpError(400, 'message is required.')
    if (message.length > MAX_MESSAGE) throw new HttpError(400, `message must be ${MAX_MESSAGE} characters or fewer.`)
    if (conversationId !== null && (typeof conversationId !== 'string' || !UUID.test(conversationId))) {
      throw new HttpError(400, 'conversation_id must be a valid id.')
    }

    // ---- verify business access (never trust the id from the client)
    const { data: member, error: memberError } = await client
      .from('business_members').select('role').eq('business_id', businessId).eq('user_id', userId).maybeSingle()
    if (memberError) throw memberError
    if (!member || member.role === 'viewer') throw new HttpError(403, 'You do not have access to this business.')
    showDetail = body.debug === true // dashboard test requests from a verified member only

    // ---- load only this business's data (RLS also enforces this)
    const data = await loadEngineData(client, businessId)

    // ---- conversation
    let convId: string
    let storedContext: unknown = null
    if (conversationId) {
      const { data: conv, error } = await client
        .from('conversations').select('id, context').eq('id', conversationId).eq('business_id', businessId).maybeSingle()
      if (error) throw error
      if (!conv) throw new HttpError(404, 'Conversation not found.')
      convId = conv.id
      storedContext = conv.context
    } else {
      const { data: conv, error } = await client
        .from('conversations').insert({ business_id: businessId, channel: 'dashboard_test', created_by: userId }).select('id').single()
      if (error) throw error
      convId = conv.id
    }

    // ---- run the engine
    const result = processMessage({ message, data, context: storedContext })

    // ---- persist the exchange and the updated context
    const t0 = new Date()
    const t1 = new Date(t0.getTime() + 1)
    const { error: msgError } = await client.from('messages').insert([
      {
        conversation_id: convId, business_id: businessId, sender_type: 'customer', original_content: message,
        normalized_content: result.normalized.slice(0, 4000), detected_language: result.language, metadata: {}, created_at: t0.toISOString(),
      },
      {
        conversation_id: convId, business_id: businessId, sender_type: 'bot', original_content: result.reply,
        detected_language: result.language, response_status: result.status, created_at: t1.toISOString(),
        metadata: { intents: result.intents, confidence: result.confidence, sources: result.sources.map((s) => ({ type: s.type, id: s.id })) },
      },
    ])
    if (msgError) throw msgError
    const { error: ctxError } = await client
      .from('conversations').update({ context: result.context, last_message_at: t1.toISOString() }).eq('id', convId)
    if (ctxError) throw ctxError

    return json(200, {
      reply: result.reply,
      status: result.status,
      conversation_id: convId,
      language: result.language,
      confidence: result.confidence,
      sources: result.sources,
      ...(body.debug === true ? { debug: result.debug } : {}),
    })
  } catch (err) {
    if (err instanceof HttpError) return json(err.status, { error: err.message })
    console.error('chatbot-process failed:', describeError(err))
    return json(500, {
      error: 'The chatbot could not process this message. Try again.',
      ...(showDetail ? { detail: describeError(err) } : {}),
    })
  }
})

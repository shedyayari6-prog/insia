/**
 * Local mock of the two public widget endpoints, for trying the widget WITHOUT deploying anything.
 * It runs the REAL request handler and the REAL chatbot engine, with sample businesses held in memory.
 * It does not touch Supabase.
 *
 *   npx tsx tools/mock-widget-server.ts
 *   open http://localhost:8787/widget-test.html?key=wk_00000000000000000000000000000001&api=http://localhost:8787/functions/v1
 */
import { createServer } from 'node:http'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { handleChat, handleConfig } from '../supabase/functions/_shared/widget/handler.ts'
import { MemoryStore } from '../supabase/functions/_shared/widget/memoryStore.ts'
import type { WidgetSettings } from '../supabase/functions/_shared/widget/types.ts'
import { clothingShop, gym, hotel, otherShop, restaurant } from '../supabase/functions/_shared/engine/__tests__/industries.ts'

const KEY = (n: number) => `wk_${n.toString(16).padStart(32, '0')}`
const widget = (businessId: string, name: string, n: number, over: Partial<WidgetSettings> = {}): WidgetSettings => ({
  business_id: businessId, public_key: KEY(n), enabled: true, primary_color: '#171A1F', position: 'bottom-right', bot_name: null,
  welcome_message: null, greeting_language: 'auto', starter_questions: [], logo_url: null, show_status: false, status_text: 'Online',
  allowed_domains: [], business_name: name, ...over,
})

const widgets: WidgetSettings[] = [
  widget('biz-shop', 'Urban Threads', 1, { starter_questions: ['How much is the hoodie?', 'Where are you located?', 'Do you deliver?'], bot_name: 'Urban Assistant', show_status: true }),
  widget('biz-hotel', 'Hotel Medina', 2, { primary_color: '#B99A5B', position: 'bottom-left', starter_questions: ['Do you have double rooms?', 'What time is check-in?'], show_status: true, status_text: 'Replies instantly' }),
  widget('biz-resto', 'Chez Karim', 3, { primary_color: '#0F5C4D', greeting_language: 'fr', starter_questions: ['Quels sont vos horaires ?'] }),
  widget('biz-gym', 'Iron Gym', 4, { primary_color: '#8A1C1C', greeting_language: 'ar' }),
  widget('biz-shop', 'Urban Threads', 5, { enabled: false }),
  widget('biz-shop2', 'Style Hub', 6, { primary_color: '#2C4A7A' }),
  widget('biz-shop', 'Urban Threads', 7, { welcome_message: '<img src=x onerror="window.__xss=1"> Welcome <b>friend</b>' }),
  widget('biz-shop', 'Urban Threads', 8, { allowed_domains: ['only-this-site.example'] }),
]

const store = new MemoryStore(widgets, { 'biz-shop': clothingShop, 'biz-shop2': otherShop, 'biz-hotel': hotel, 'biz-resto': restaurant, 'biz-gym': gym })
const deps = { store, hash: async (s: string) => createHash('sha256').update(s).digest('hex'), log: (e: unknown) => console.error('handler error:', e) }

const PUBLIC = join(process.cwd(), 'public')
const TYPES: Record<string, string> = { '.js': 'text/javascript', '.html': 'text/html; charset=utf-8' }
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const send = (status: number, body: string, type = 'application/json', headers: Record<string, string> = {}) => {
    res.writeHead(status, { 'Content-Type': type, ...CORS, ...headers })
    res.end(body)
  }
  try {
    if (req.method === 'OPTIONS') return send(204, '')
    const origin = (req.headers.origin as string | undefined) ?? null
    const ip = (req.headers['x-test-ip'] as string | undefined) ?? req.socket.remoteAddress ?? null

    if (url.pathname === '/functions/v1/widget-config') {
      const r = await handleConfig({ method: req.method ?? 'GET', query: Object.fromEntries(url.searchParams), body: null, origin, ip }, deps)
      return send(r.status, JSON.stringify(r.body), 'application/json', r.headers)
    }
    if (url.pathname === '/functions/v1/widget-chat') {
      let body: unknown = null
      const chunks: Buffer[] = []
      for await (const c of req) chunks.push(c as Buffer)
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { body = null }
      const r = await handleChat({ method: req.method ?? 'POST', query: {}, body, origin, ip }, deps)
      return send(r.status, JSON.stringify(r.body), 'application/json', r.headers)
    }
    if (url.pathname === '/__mock/conversations') {
      return send(200, JSON.stringify({ conversations: [...store.conversations.values()], messages: store.messages }))
    }
    // static files from /public (the widget script and the test page only)
    const file = url.pathname === '/' ? '/widget-test.html' : url.pathname
    if (file === '/insia-widget.js' || file === '/widget-test.html') {
      const data = await readFile(normalize(join(PUBLIC, file)))
      return send(200, data.toString('utf8'), TYPES[extname(file)] ?? 'text/plain')
    }
    send(404, JSON.stringify({ error: 'Not found' }))
  } catch (error) {
    console.error(error)
    send(500, JSON.stringify({ error: 'mock server error' }))
  }
}).listen(Number(process.env.PORT ?? 8787), () => console.log(`Mock widget server on http://localhost:${process.env.PORT ?? 8787}`))

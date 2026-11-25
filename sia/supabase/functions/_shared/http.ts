// Small web-standard helpers for the public widget functions (no Deno-only APIs besides what the caller passes in).
import type { WidgetResponse } from './widget/types.ts'

/** Visitors' browsers run on other websites, so the public endpoints must allow any origin.
 *  Access is controlled by the widget key, the optional website allow-list and rate limits instead. */
export const PUBLIC_CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '600',
}

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** First address in x-forwarded-for (set by the platform proxy). Only ever hashed, never stored. */
export function clientIp(req: Request): string | null {
  const forwarded = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')
  const first = forwarded?.split(',')[0]?.trim()
  return first ? first.slice(0, 64) : null
}

export function toResponse(r: WidgetResponse): Response {
  return new Response(JSON.stringify(r.body), {
    status: r.status,
    headers: { ...PUBLIC_CORS, 'Content-Type': 'application/json', ...(r.headers ?? {}) },
  })
}

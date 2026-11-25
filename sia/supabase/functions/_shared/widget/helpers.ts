import type { ContactDetails, GreetingLanguage, PublicWidgetConfig, WidgetPosition, WidgetSettings } from './types.ts'

export const PUBLIC_KEY_RE = /^wk_[a-f0-9]{32}$/
export const SESSION_TOKEN_RE = /^[a-f0-9]{64}$/
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const COLOR_RE = /^#[0-9a-f]{6}$/i
export const DEFAULT_COLOR = '#171A1F'

export const LIMITS = {
  messageLength: 1000,
  perSessionPerMinute: 20,
  perSessionOtherPerMinute: 60,
  perIpPerMinute: 60,
  perBusinessPerHour: 2000,
  maxConversationMessages: 200,
  historyLimit: 200,
} as const

export const isValidPublicKey = (v: unknown): v is string => typeof v === 'string' && PUBLIC_KEY_RE.test(v)
export const isValidSessionToken = (v: unknown): v is string => typeof v === 'string' && SESSION_TOKEN_RE.test(v)
export const isValidId = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v)

/** Hostname of an Origin header or an owner-typed entry ("https://Example.com/path" -> "example.com"). */
export function normalizeHost(value: string): string {
  let v = value.trim().toLowerCase()
  v = v.replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
  v = v.replace(/[/?#].*$/, '')
  v = v.replace(/:\d+$/, '')
  return v.replace(/\.$/, '')
}

/**
 * Optional allow-list of websites that may show the widget. Empty list = any website.
 * Entries match the host exactly, or a whole subdomain family with a leading "*.".
 * Note: the Origin header is set by browsers; it is a guard against casual re-use, not authentication.
 */
export function originAllowed(origin: string | null, allowed: string[]): boolean {
  if (!allowed.length) return true
  if (!origin) return false
  const host = normalizeHost(origin)
  if (!host) return false
  return allowed.some((entry) => {
    const e = normalizeHost(entry)
    if (!e) return false
    if (e.startsWith('*.')) {
      const root = e.slice(2)
      return host === root || host.endsWith(`.${root}`)
    }
    return host === e
  })
}

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g

export function cleanMessage(value: unknown): { ok: true; text: string } | { ok: false; error: string } {
  if (typeof value !== 'string') return { ok: false, error: 'Type a message first.' }
  const text = value.replace(CONTROL, '').replace(/\r\n/g, '\n').trim()
  if (!text) return { ok: false, error: 'Type a message first.' }
  if (text.length > LIMITS.messageLength) return { ok: false, error: `Messages can be up to ${LIMITS.messageLength} characters.` }
  return { ok: true, text }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_RE = /^[+\d][\d\s().-]{5,24}$/

/** Optional contact details. Only what the visitor typed is kept; nothing is invented. */
export function sanitizeContact(input: unknown): { ok: true; contact: ContactDetails } | { ok: false; error: string } {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Add at least one contact detail.' }
  const raw = input as Record<string, unknown>
  const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(CONTROL, '').replace(/\s+/g, ' ').trim().slice(0, max) : '')
  const name = clean(raw.name, 80)
  const email = clean(raw.email, 254)
  const phone = clean(raw.phone, 30)
  if (!name && !email && !phone) return { ok: false, error: 'Add at least one contact detail.' }
  if (email && !EMAIL_RE.test(email)) return { ok: false, error: 'Enter a valid email address.' }
  if (phone && !PHONE_RE.test(phone)) return { ok: false, error: 'Enter a valid phone number.' }
  return { ok: true, contact: { ...(name ? { name } : {}), ...(email ? { email } : {}), ...(phone ? { phone } : {}) } }
}

/** Builds the browser-safe configuration. Anything not listed here never leaves the server. */
export function toPublicConfig(w: WidgetSettings): PublicWidgetConfig {
  const position: WidgetPosition = w.position === 'bottom-left' ? 'bottom-left' : 'bottom-right'
  const language: GreetingLanguage = ['auto', 'en', 'fr', 'ar'].includes(w.greeting_language) ? w.greeting_language : 'auto'
  return {
    display_name: (w.bot_name?.trim() || w.business_name).slice(0, 60),
    business_name: w.business_name.slice(0, 120),
    primary_color: COLOR_RE.test(w.primary_color) ? w.primary_color : DEFAULT_COLOR,
    position,
    welcome_message: w.welcome_message?.trim() ? w.welcome_message.trim().slice(0, 300) : null,
    greeting_language: language,
    starter_questions: w.starter_questions.filter((q) => typeof q === 'string' && q.trim()).map((q) => q.trim().slice(0, 80)).slice(0, 4),
    logo_url: w.logo_url && /^https:\/\//i.test(w.logo_url) ? w.logo_url.slice(0, 500) : null,
    show_status: Boolean(w.show_status),
    status_text: (w.status_text || 'Online').slice(0, 30),
  }
}

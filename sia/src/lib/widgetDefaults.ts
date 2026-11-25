import type { WidgetFormValues, WidgetSettingsRow } from '@/types/widget'

export const DEFAULT_WIDGET_FORM: WidgetFormValues = {
  enabled: false,
  primary_color: '#171A1F',
  position: 'bottom-right',
  bot_name: '',
  welcome_message: '',
  greeting_language: 'auto',
  starter_questions: ['', '', '', ''],
  logo_url: null,
  show_status: false,
  status_text: 'Online',
  allowed_domains: '',
}

const SLOTS = 4
const COLOR_RE = /^#[0-9a-fA-F]{6}$/
const HOST_RE = /^(\*\.)?([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$|^localhost$/

export function toFormValues(row: WidgetSettingsRow): WidgetFormValues {
  const questions = [...row.starter_questions, '', '', '', ''].slice(0, SLOTS)
  return {
    enabled: row.enabled,
    primary_color: row.primary_color,
    position: row.position,
    bot_name: row.bot_name ?? '',
    welcome_message: row.welcome_message ?? '',
    greeting_language: row.greeting_language,
    starter_questions: questions,
    logo_url: row.logo_url,
    show_status: row.show_status,
    status_text: row.status_text,
    allowed_domains: row.allowed_domains.join('\n'),
  }
}

/** One host per line. "https://Shop.Example.com/page" becomes "shop.example.com". */
export function parseDomains(text: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const line of text.split(/\r?\n/)) {
    const host = line.trim().toLowerCase().replace(/^[a-z][a-z0-9+.-]*:\/\//, '').replace(/[/?#].*$/, '').replace(/:\d+$/, '').replace(/\.$/, '')
    if (!host || seen.has(host)) continue
    seen.add(host)
    out.push(host)
  }
  return out
}

export type WidgetErrors = Partial<Record<'primary_color' | 'bot_name' | 'welcome_message' | 'starter_questions' | 'status_text' | 'allowed_domains', string>>

export function validateWidget(v: WidgetFormValues): WidgetErrors {
  const e: WidgetErrors = {}
  if (!COLOR_RE.test(v.primary_color)) e.primary_color = 'Choose a color such as #171A1F.'
  if (v.bot_name.trim().length > 60) e.bot_name = 'Use 60 characters or fewer.'
  if (v.welcome_message.length > 300) e.welcome_message = 'Use 300 characters or fewer.'
  if (v.starter_questions.some((q) => q.trim().length > 80)) e.starter_questions = 'Each question can have up to 80 characters.'
  if (!v.status_text.trim() || v.status_text.trim().length > 30) e.status_text = 'Use 1 to 30 characters.'
  const domains = parseDomains(v.allowed_domains)
  if (domains.length > 10) e.allowed_domains = 'You can list up to 10 websites.'
  else if (domains.some((d) => !HOST_RE.test(d))) e.allowed_domains = 'Enter website addresses such as shop.example.com or *.example.com, one per line.'
  return e
}

/** Database columns for an update. Empty optional text becomes null. */
export function toRowPatch(v: WidgetFormValues) {
  return {
    enabled: v.enabled,
    primary_color: v.primary_color,
    position: v.position,
    bot_name: v.bot_name.trim() || null,
    welcome_message: v.welcome_message.trim() || null,
    greeting_language: v.greeting_language,
    starter_questions: v.starter_questions.map((q) => q.trim()).filter(Boolean).slice(0, SLOTS),
    logo_url: v.logo_url,
    show_status: v.show_status,
    status_text: v.status_text.trim(),
    allowed_domains: parseDomains(v.allowed_domains),
  }
}

/**
 * "Restore defaults" resets the look and wording. It deliberately keeps whether the chatbot is
 * published and the allowed-websites list, so a reset can never silently change who sees the chat.
 */
export function restoreDefaults(current: WidgetFormValues): WidgetFormValues {
  return { ...DEFAULT_WIDGET_FORM, enabled: current.enabled, allowed_domains: current.allowed_domains }
}

export function buildSnippet(appOrigin: string, supabaseUrl: string, publicKey: string): string {
  const api = `${supabaseUrl.replace(/\/+$/, '')}/functions/v1`
  return `<script\n  src="${appOrigin.replace(/\/+$/, '')}/insia-widget.js"\n  data-key="${publicKey}"\n  data-api="${api}"\n  async></script>`
}

export function buildTestPageUrl(appOrigin: string, supabaseUrl: string, publicKey: string): string {
  const api = `${supabaseUrl.replace(/\/+$/, '')}/functions/v1`
  return `${appOrigin.replace(/\/+$/, '')}/widget-test.html?key=${encodeURIComponent(publicKey)}&api=${encodeURIComponent(api)}`
}

export function isLocalOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local')
  } catch {
    return false
  }
}

/** Preview configuration in the shape the widget script expects. */
export function toPreviewConfig(v: WidgetFormValues, businessName: string) {
  return {
    display_name: v.bot_name.trim() || businessName,
    business_name: businessName,
    primary_color: COLOR_RE.test(v.primary_color) ? v.primary_color : DEFAULT_WIDGET_FORM.primary_color,
    position: v.position,
    welcome_message: v.welcome_message.trim() || null,
    greeting_language: v.greeting_language,
    starter_questions: v.starter_questions.map((q) => q.trim()).filter(Boolean),
    logo_url: v.logo_url,
    show_status: v.show_status,
    status_text: v.status_text.trim() || 'Online',
  }
}

export function newPublicKey(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return `wk_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`
}

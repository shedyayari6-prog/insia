import { describe, expect, it } from 'vitest'
import { likePattern } from './search'
import { dayBounds, timeAgo } from './time'
import {
  DEFAULT_WIDGET_FORM, buildSnippet, buildTestPageUrl, isLocalOrigin, newPublicKey, parseDomains, restoreDefaults,
  toFormValues, toPreviewConfig, toRowPatch, validateWidget,
} from './widgetDefaults'
import type { WidgetSettingsRow } from '@/types/widget'

const row: WidgetSettingsRow = {
  business_id: 'b', public_key: 'wk_' + 'a'.repeat(32), enabled: true, primary_color: '#B99A5B', position: 'bottom-left', bot_name: 'Sami',
  welcome_message: 'Hi!', greeting_language: 'fr', starter_questions: ['One', 'Two'], logo_url: 'https://x.example/logo.png', show_status: true,
  status_text: 'Online', allowed_domains: ['shop.example.com'], created_at: '', updated_at: '',
}

describe('widget form', () => {
  it('round-trips a saved row', () => {
    const form = toFormValues(row)
    expect(form.starter_questions).toEqual(['One', 'Two', '', ''])
    expect(form.allowed_domains).toBe('shop.example.com')
    const patch = toRowPatch(form)
    expect(patch.starter_questions).toEqual(['One', 'Two'])
    expect(patch.bot_name).toBe('Sami')
    expect(patch.allowed_domains).toEqual(['shop.example.com'])
  })
  it('turns empty optional text into null', () => {
    const patch = toRowPatch({ ...DEFAULT_WIDGET_FORM, bot_name: '  ', welcome_message: '' })
    expect(patch.bot_name).toBeNull()
    expect(patch.welcome_message).toBeNull()
    expect(patch.starter_questions).toEqual([])
  })
  it('accepts the defaults', () => {
    expect(validateWidget(DEFAULT_WIDGET_FORM)).toEqual({})
  })
  it('rejects bad values', () => {
    const e = validateWidget({
      ...DEFAULT_WIDGET_FORM, primary_color: 'red', bot_name: 'x'.repeat(61), welcome_message: 'x'.repeat(301),
      starter_questions: ['x'.repeat(81), '', '', ''], status_text: '', allowed_domains: 'not a host',
    })
    expect(Object.keys(e).sort()).toEqual(['allowed_domains', 'bot_name', 'primary_color', 'starter_questions', 'status_text', 'welcome_message'])
  })
  it('normalises and validates allowed websites', () => {
    expect(parseDomains('HTTPS://Shop.Example.com/page\nshop.example.com\n\n*.partner.org:8080')).toEqual(['shop.example.com', '*.partner.org'])
    expect(validateWidget({ ...DEFAULT_WIDGET_FORM, allowed_domains: 'shop.example.com\n*.example.org\nlocalhost' }).allowed_domains).toBeUndefined()
    expect(validateWidget({ ...DEFAULT_WIDGET_FORM, allowed_domains: Array.from({ length: 11 }, (_, i) => `s${i}.example.com`).join('\n') }).allowed_domains).toMatch(/up to 10/)
  })
  it('restore defaults keeps the publish state and the website allow-list', () => {
    const restored = restoreDefaults(toFormValues(row))
    expect(restored.primary_color).toBe(DEFAULT_WIDGET_FORM.primary_color)
    expect(restored.logo_url).toBeNull()
    expect(restored.bot_name).toBe('')
    expect(restored.enabled).toBe(true)
    expect(restored.allowed_domains).toBe('shop.example.com')
  })
  it('builds the preview config with safe fallbacks', () => {
    const c = toPreviewConfig({ ...DEFAULT_WIDGET_FORM, primary_color: 'nope', bot_name: '' }, 'Urban Threads')
    expect(c.display_name).toBe('Urban Threads')
    expect(c.primary_color).toBe('#171A1F')
  })
})

describe('installation snippet', () => {
  it('contains only the public key, never a secret', () => {
    const s = buildSnippet('https://app.insia.example/', 'https://abc.supabase.co/', 'wk_' + 'b'.repeat(32))
    expect(s).toContain('src="https://app.insia.example/insia-widget.js"')
    expect(s).toContain('data-key="wk_' + 'b'.repeat(32) + '"')
    expect(s).toContain('data-api="https://abc.supabase.co/functions/v1"')
    expect(s).not.toMatch(/service|secret|anon/i)
  })
  it('builds the test page link', () => {
    const u = buildTestPageUrl('http://localhost:5173', 'https://abc.supabase.co', 'wk_' + 'c'.repeat(32))
    expect(u).toContain('/widget-test.html?key=wk_')
    expect(u).toContain(encodeURIComponent('https://abc.supabase.co/functions/v1'))
  })
  it('detects local origins', () => {
    expect(isLocalOrigin('http://localhost:5173')).toBe(true)
    expect(isLocalOrigin('https://app.insia.example')).toBe(false)
  })
  it('generates unguessable well-formed keys', () => {
    const a = newPublicKey()
    expect(a).toMatch(/^wk_[a-f0-9]{32}$/)
    expect(newPublicKey()).not.toBe(a)
  })
})

describe('search and time helpers', () => {
  it('escapes wildcards and strips filter syntax', () => {
    expect(likePattern('100% off_sale')).toBe('100\\% off\\_sale')
    expect(likePattern('a,b(c)"d"')).toBe('a b c d')
    expect(likePattern('x'.repeat(200)).length).toBe(80)
  })
  it('formats relative time', () => {
    const now = new Date('2026-03-10T12:00:00Z')
    expect(timeAgo('2026-03-10T11:59:50Z', now)).toBe('just now')
    expect(timeAgo('2026-03-10T11:30:00Z', now)).toMatch(/30 minutes ago/)
    expect(timeAgo('2026-03-09T12:00:00Z', now)).toBe('yesterday')
  })
  it('computes local day bounds', () => {
    const b = dayBounds('2026-03-10')
    expect(b).not.toBeNull()
    expect(new Date(b!.end).getTime() - new Date(b!.start).getTime()).toBe(86_399_999)
    expect(dayBounds('10/03/2026')).toBeNull()
  })
})

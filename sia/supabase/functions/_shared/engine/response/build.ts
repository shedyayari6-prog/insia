import type { Lang } from '../types.ts'
import type { Part, Sentence } from '../retrieval/retrieve.ts'
import { fill, template } from './templates.ts'

export function renderSentence(lang: Lang, s: Sentence): string {
  if (s.verbatim !== undefined) return s.verbatim.trim()
  const tpl = template(lang, s.key)
  return tpl ? fill(tpl, s.params).replace(/\s+/g, ' ').trim() : ''
}

export function topicLabel(lang: Lang, intent: string): string {
  return template(lang, `topic.${intent}`) ?? intent
}

/** Joins rendered sentences, skipping duplicates (same sentence from two intents). */
export function joinSentences(sentences: string[]): string {
  const seen = new Set<string>()
  const out: string[] = []
  for (const s of sentences) {
    const t = s.trim()
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out.join(' ')
}

export function partsToText(lang: Lang, parts: Part[]): string[] {
  const seenKeys = new Set<string>()
  const out: string[] = []
  for (const p of parts) {
    if (p.dedupeKey) {
      if (seenKeys.has(p.dedupeKey)) continue
      seenKeys.add(p.dedupeKey)
    }
    for (const s of p.sentences) out.push(renderSentence(lang, s))
  }
  return out
}

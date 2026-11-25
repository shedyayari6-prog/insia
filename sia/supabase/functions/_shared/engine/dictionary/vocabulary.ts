import type { Token, VocabularyExpansion, VocabularyRecord } from '../types.ts'
import { normalizeText } from '../normalization/normalize.ts'
import { matchWord } from '../matching/similarity.ts'
import { tokenize } from '../tokenization/tokenize.ts'

/**
 * Applies the business's PRIVATE vocabulary (term -> meaning) to the token list.
 * Only the records passed in are used, so one business's terms can never affect another.
 * Terms may be multi-word. Matching is exact, or loose/fuzzy for single words of 4+ letters.
 */
export function applyVocabulary(tokens: Token[], vocabulary: VocabularyRecord[]): { tokens: Token[]; expansions: VocabularyExpansion[] } {
  if (!vocabulary.length || !tokens.length) return { tokens, expansions: [] }
  const entries = vocabulary
    .map((v) => ({ term: normalizeText(v.term).split(' ').filter(Boolean), raw: v.term, meaning: normalizeText(v.meaning) }))
    .filter((e) => e.term.length && e.meaning)
    .sort((a, b) => b.term.length - a.term.length)

  const out: Token[] = []
  const expansions: VocabularyExpansion[] = []
  let i = 0
  while (i < tokens.length) {
    let replaced = false
    for (const e of entries) {
      const len = e.term.length
      if (i + len > tokens.length) continue
      const window = tokens.slice(i, i + len).map((t) => t.text)
      const same = window.every((w, k) => {
        const t = e.term[k]!
        if (w === t) return true
        return len === 1 && matchWord(w, t, { allowSkeleton: false }) !== null && t.length >= 4
      })
      if (same) {
        for (const w of tokenize(e.meaning)) out.push({ text: w.text, index: out.length })
        expansions.push({ term: e.raw, meaning: e.meaning, tokenIndex: i })
        i += len
        replaced = true
        break
      }
    }
    if (!replaced) {
      out.push({ text: tokens[i]!.text, index: out.length })
      i++
    }
  }
  return { tokens: out, expansions }
}

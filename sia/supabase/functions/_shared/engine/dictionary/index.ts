import type { ConceptMatch, Token } from '../types.ts'
import { normalizeText, isArabiziToken } from '../normalization/normalize.ts'
import { articleVariants, matchWord } from '../matching/similarity.ts'
import { CONCEPTS } from './global.ts'

interface Entry { concept: string; phrase: string; tokens: string[] }

export interface PhraseIndex {
  byPhrase: Map<string, Entry[]>
  singles: Entry[]
  maxLen: number
}

/** Builds an index from a concept -> aliases map. Aliases are normalised the same way as messages. */
export function buildIndex(source: Record<string, string[]>): PhraseIndex {
  const byPhrase = new Map<string, Entry[]>()
  const singles: Entry[] = []
  let maxLen = 1
  for (const [concept, aliases] of Object.entries(source)) {
    for (const alias of aliases) {
      const phrase = normalizeText(alias)
      if (!phrase) continue
      const entry: Entry = { concept, phrase, tokens: phrase.split(' ') }
      const list = byPhrase.get(phrase) ?? []
      if (!list.some((e) => e.concept === concept)) list.push(entry)
      byPhrase.set(phrase, list)
      if (entry.tokens.length === 1) singles.push(entry)
      maxLen = Math.max(maxLen, entry.tokens.length)
    }
  }
  return { byPhrase, singles, maxLen }
}

// Static, tenant-independent. Safe to cache for the life of the process.
let globalIndex: PhraseIndex | null = null
export function getGlobalIndex(): PhraseIndex {
  globalIndex ??= buildIndex(CONCEPTS)
  return globalIndex
}

/**
 * Finds concept phrases in the token list. Longest phrases win ("how many" beats "how"),
 * tokens are used at most once, and every token is tried exact -> loose -> skeleton -> fuzzy.
 * Fuzzy/skeleton matching only applies to single words.
 */
export function matchConcepts(tokens: Token[], index: PhraseIndex = getGlobalIndex()): ConceptMatch[] {
  const used = new Array<boolean>(tokens.length).fill(false)
  const out: ConceptMatch[] = []

  for (let len = Math.min(index.maxLen, tokens.length); len >= 1; len--) {
    for (let start = 0; start + len <= tokens.length; start++) {
      if (used.slice(start, start + len).some(Boolean)) continue
      const phrase = tokens.slice(start, start + len).map((t) => t.text).join(' ')
      const exact = index.byPhrase.get(phrase)
      if (exact) {
        for (const e of exact) out.push({ concept: e.concept, phrase, tokenStart: start, tokenEnd: start + len, similarity: 1, method: 'exact' })
        for (let k = start; k < start + len; k++) used[k] = true
        continue
      }
      if (len !== 1) continue
      const best = bestSingle(tokens[start]!.text, index)
      if (best) {
        out.push({ concept: best.concept, phrase: best.phrase, tokenStart: start, tokenEnd: start + 1, similarity: best.similarity, method: best.method })
        used[start] = true
      }
    }
  }
  return out.sort((a, b) => a.tokenStart - b.tokenStart)
}

function bestSingle(token: string, index: PhraseIndex): { concept: string; phrase: string; similarity: number; method: ConceptMatch['method'] } | null {
  let best: { concept: string; phrase: string; similarity: number; method: ConceptMatch['method'] } | null = null
  for (const variant of articleVariants(token)) {
    const direct = index.byPhrase.get(variant)
    if (direct && variant !== token) return { concept: direct[0]!.concept, phrase: variant, similarity: 0.95, method: 'loose' }
    for (const e of index.singles) {
      // Skeleton matching is reserved for Arabizi-style spellings on either side.
      const m = matchWord(variant, e.phrase, { allowSkeleton: isArabiziToken(variant) || isArabiziToken(e.phrase) })
      if (m && (!best || m.similarity > best.similarity)) best = { concept: e.concept, phrase: e.phrase, similarity: m.similarity, method: m.method }
    }
  }
  return best
}

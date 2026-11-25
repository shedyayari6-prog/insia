import type { MatchMethod } from '../types.ts'
import { isArabiziToken, isArabicToken, looseForm, skeleton } from '../normalization/normalize.ts'

/** Optimal-string-alignment (Damerau-Levenshtein) distance. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0
  const al = a.length
  const bl = b.length
  if (!al) return bl
  if (!bl) return al
  const d: number[][] = Array.from({ length: al + 1 }, (_, i) => [i, ...new Array<number>(bl).fill(0)])
  for (let j = 0; j <= bl; j++) d[0]![j] = j
  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let v = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2]![j - 2]! + 1)
      d[i]![j] = v
    }
  }
  return d[al]![bl]!
}

/** Maximum edit distance allowed for a word of this (loose-form) length. Words of 4 letters or fewer must match exactly. */
export function allowedDistance(length: number): number {
  if (length <= 4) return 0
  if (length <= 7) return 1
  return 2
}

export interface WordMatch {
  /** Spelling similarity 0..1. This is NOT confidence that the meaning was understood. */
  similarity: number
  method: MatchMethod
}

export interface MatchOptions {
  allowFuzzy?: boolean
  allowSkeleton?: boolean
}

/**
 * Compares a customer word with a known word (alias, catalog name token...).
 * Tiers, strongest first: exact, loose-equal, Arabizi skeleton, bounded fuzzy.
 * Returns null when the words should not be treated as the same.
 */
export function matchWord(token: string, known: string, opts: MatchOptions = {}): WordMatch | null {
  const { allowFuzzy = true, allowSkeleton = true } = opts
  if (!token || !known) return null
  if (token === known) return { similarity: 1, method: 'exact' }
  if (/^\d+$/.test(token) || /^\d+$/.test(known)) return null // numbers match only exactly
  if (isArabicToken(token) || isArabicToken(known)) {
    return looseForm(token) === looseForm(known) && looseForm(token).length >= 2 ? { similarity: 0.95, method: 'loose' } : null
  }
  const lt = looseForm(token)
  const lk = looseForm(known)
  if (lt.length < 3 || lk.length < 3) return null
  if (lt === lk) return { similarity: 0.95, method: 'loose' }
  if (allowSkeleton && (isArabiziToken(token) || isArabiziToken(known))) {
    const st = skeleton(token)
    const sk = skeleton(known)
    if (st.length >= 3 && st === sk) return { similarity: 0.85, method: 'skeleton' }
  }
  if (allowFuzzy && lt.length >= 5 && lk.length >= 5 && lt[0] === lk[0] && Math.abs(lt.length - lk.length) <= 2) {
    const dist = editDistance(lt, lk)
    const max = Math.max(lt.length, lk.length)
    if (dist > 0 && dist <= allowedDistance(Math.min(lt.length, lk.length)) && 1 - dist / max >= 0.75) {
      return { similarity: Number((1 - dist / max).toFixed(2)), method: 'fuzzy' }
    }
  }
  return null
}

/** Variants of a customer word with a leading Latin/Arabic article removed (el hoodie -> hoodie). */
export function articleVariants(token: string): string[] {
  const out = [token]
  if (token.length >= 5) {
    if (token.startsWith('el') || token.startsWith('al')) out.push(token.slice(2))
    else if (token.startsWith('l') && !token.startsWith('li')) out.push(token.slice(1))
  }
  return out
}

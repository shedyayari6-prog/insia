import type { Lang, LanguageResult, Token } from '../types.ts'
import { isArabiziToken, isArabicToken } from './normalize.ts'
import { LANG_HINTS } from '../dictionary/global.ts'
import { normalizeText } from './normalize.ts'

const SETS = {
  en: new Set(LANG_HINTS.en.map(normalizeText)),
  fr: new Set(LANG_HINTS.fr.map(normalizeText)),
  derja: new Set(LANG_HINTS.derja.map(normalizeText)),
}
// Words shared by English and French (or too common) carry no signal.
const AMBIGUOUS = new Set(['a', 'on', 'en', 'ou', 'y', 'el', 'w', 'win', 'me', 'sur', 'des', 'pour'])

/**
 * Scores each language from hint words and script. Mixed-language messages are flagged.
 * Arabic-script text is Arabic unless it contains Derja markers.
 */
export function detectLanguage(tokens: Token[]): LanguageResult {
  const scores: Record<Lang, number> = { en: 0, fr: 0, ar: 0, derja: 0 }
  for (const { text } of tokens) {
    if (isArabicToken(text)) {
      if (SETS.derja.has(text)) scores.derja += 2
      else scores.ar += 1
      continue
    }
    if (AMBIGUOUS.has(text)) {
      if (text === 'win' || text === 'el' || text === 'w') scores.derja += 0.5
      continue
    }
    if (isArabiziToken(text)) scores.derja += 1.5
    if (SETS.derja.has(text)) scores.derja += 1.5
    if (SETS.en.has(text)) scores.en += 1
    if (SETS.fr.has(text)) scores.fr += 1
  }
  const ranked = (Object.entries(scores) as [Lang, number][]).sort((a, b) => b[1] - a[1])
  const [topLang, topScore] = ranked[0]!
  const second = ranked[1]!
  if (topScore === 0) return { language: 'unknown', scores, mixed: false }
  // A tie between languages is not a decision.
  if (second[1] === topScore) return { language: 'unknown', scores, mixed: true }
  return { language: topLang, scores, mixed: second[1] >= topScore * 0.3 }
}

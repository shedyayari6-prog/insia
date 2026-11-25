import type { Script } from '../types.ts'

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩'
const PERSIAN_INDIC = '۰۱۲۳۴۵۶۷۸۹'

/**
 * Normalises customer text for matching. The original message is never modified;
 * callers keep it alongside this result.
 *
 * - Unicode NFKC, lower-casing, Arabic-Indic digits -> ASCII
 * - Latin: accents removed (é -> e), ligatures expanded
 * - Arabic: diacritics and tatweel removed, alef/ya/ta-marbuta variants folded
 * - Punctuation and apostrophes become spaces (l'ouverture -> "l ouverture")
 * - Runs of 3+ identical letters shortened (saleeem -> saleem). Digits are preserved
 *   because they carry meaning in Tunisian Arabizi (9 = ق, 7 = ح ...).
 */
export function normalizeText(input: string): string {
  let s = input.normalize('NFKC')
  s = s.replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC.indexOf(d)))
  s = s.replace(/[۰-۹]/g, (d) => String(PERSIAN_INDIC.indexOf(d)))
  s = s.toLowerCase()
  s = s.replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/ß/g, 'ss')
  // Latin accents: decompose and drop combining marks (does not touch Arabic base letters).
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC')
  // Arabic marks and letter variants.
  s = s.replace(/[\u064B-\u065F\u0670\u0640]/g, '')
  s = s.replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
  s = s.replace(/ک/g, 'ك').replace(/ی/g, 'ي').replace(/گ/g, 'ك').replace(/پ/g, 'ب').replace(/چ/g, 'ج')
  // Punctuation / symbols -> space (keep letters, numbers, whitespace).
  s = s.replace(/[^\p{L}\p{N}\s]/gu, ' ')
  // Shorten letter runs (not digits).
  s = s.replace(/(\p{L})\1{2,}/gu, '$1$1')
  return s.replace(/\s+/g, ' ').trim()
}

export function detectScript(text: string): Script {
  const arabic = (text.match(/\p{Script=Arabic}/gu) ?? []).length
  const latin = (text.match(/\p{Script=Latin}/gu) ?? []).length
  if (!arabic && !latin) return 'none'
  if (arabic && latin) return arabic >= latin * 2 ? 'arabic' : latin >= arabic * 2 ? 'latin' : 'mixed'
  return arabic ? 'arabic' : 'latin'
}

const ARABIC_RE = /\p{Script=Arabic}/u
export const isArabicToken = (t: string): boolean => ARABIC_RE.test(t)

// ---------------------------------------------------------------------------
// Arabizi helpers. Digits are only treated as letters inside a Latin word that
// also contains letters, so prices and quantities ("65", "2") stay numbers.
// ---------------------------------------------------------------------------
const NUMBER_SUFFIX = /^\d+(st|nd|rd|th|eme|e|h|am|pm|kg|g|ml|l|cm|dt|tnd|eur|usd|x|j)$/

export function isArabiziToken(token: string): boolean {
  return /[a-z]/.test(token) && /[2357-9]/.test(token) && !NUMBER_SUFFIX.test(token)
}

const ARABIZI_MAP: Record<string, string> = { '9': 'q', '7': 'h', '5': 'x', '3': 'a', '8': 'g', '2': 'a' }

function arabiziToLetters(token: string): string {
  return token.replace(/[2357-9]/g, (d) => ARABIZI_MAP[d] ?? d)
}

/**
 * Forgiving spelling form used for comparing words across spelling variants.
 * hoodie / hudi / hoodies all become "hudi".
 * Only used to compare a customer word with a *known* alias, never on its own.
 */
export function looseForm(token: string): string {
  if (isArabicToken(token)) return token.replace(/^(?:وال|ال)(?=.{2,})/u, '')
  let s = isArabiziToken(token) ? arabiziToLetters(token) : token
  s = s.replace(/ph/g, 'f').replace(/ck/g, 'k').replace(/qu/g, 'k')
  s = s.replace(/sh|ch/g, 'x').replace(/kh/g, 'x').replace(/gh/g, 'g')
  s = s.replace(/ou|oo|o|u/g, 'u').replace(/ie|ee|ey|ei|e|i|y/g, 'i')
  s = s.replace(/(.)\1+/g, '$1')
  if (s.length > 3 && s.endsWith('s')) s = s.slice(0, -1)
  return s
}

/** Consonant skeleton for Arabizi spelling variants (b9addesh ≈ b9dch). */
export function skeleton(token: string): string {
  const s = isArabiziToken(token) ? arabiziToLetters(token) : token
  return s
    .replace(/sh|ch|kh/g, 'x')
    .replace(/[aeiouy]/g, '')
    .replace(/(.)\1+/g, '$1')
}

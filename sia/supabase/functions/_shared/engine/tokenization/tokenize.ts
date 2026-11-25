import type { Token } from '../types.ts'

/** Splits normalised text on whitespace. Keeps indexes so phrases can be located. */
export function tokenize(normalized: string): Token[] {
  if (!normalized) return []
  return normalized.split(' ').map((text, index) => ({ text, index }))
}

/** Latin function words ignored when matching catalog names (never when matching concepts). */
export const STOPWORDS = new Set([
  'a', 'an', 'the', 'of', 'and', 'or', 'to', 'for', 'in', 'on', 'at', 'with', 'is', 'are', 'do', 'does', 'did',
  'you', 'your', 'yours', 'we', 'i', 'me', 'my', 'it', 'this', 'that', 'there', 'have', 'has', 'can', 'could',
  'please', 'how', 'what', 'where', 'when', 'which', 'much', 'many', 'about', 'any', 'some', 'want', 'would', 'like',
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'd', 'et', 'ou', 'est', 'vous', 'avez', 'je', 'pour', 'en', 'au',
  'aux', 'y', 'il', 'ce', 'cet', 'cette', 'ces', 'que', 'quel', 'quelle', 'quels', 'quelles', 'avec', 'sur', 'votre',
  'el', 'al', 'l', 'w', 'wa', 'fama', 'famma', 'chnowa', 'chnouwa', 'chnia', 'ya', 'fi', 'fil', 'lel', 'ila', 'min',
  'nheb', 'n7eb', 'bch', 'bech', 'ena', 'enti', 'hedha', 'hedhi', 'hetha', 'taw', 'tawa', 'barcha', 'behi', 'm3a',
  'ya3ni', 'mawjoud', 'mawjouda', 'mawjoudin', '3andkom', '3andek', '3ala', 'ala', 'men', 'ch7al', 'ch', 'sh',
  'ماهو', 'ما', 'هل', 'في', 'من', 'على', 'الى', 'عن', 'و', 'يا', 'ممكن',
])

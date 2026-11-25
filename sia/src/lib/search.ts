/**
 * Prepares user text for a PostgREST ilike pattern used inside .or(...).
 * - removes characters that would break the filter syntax (commas, parentheses)
 * - escapes LIKE wildcards so "100%" and "a_b" are searched literally
 */
export function likePattern(input: string): string {
  const cleaned = input.replace(/[(),*"'\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
  return cleaned.replace(/[%_]/g, (c) => `\\${c}`)
}

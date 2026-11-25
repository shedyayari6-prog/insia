import { supabase } from '@/lib/supabase'
import type {
  BusinessFact, BusinessInstruction, KnowledgeQuestion, QuestionStatus, Verification, VocabularyEntry,
} from '@/types'
import { ServiceError } from './auth'

interface DbError { code?: string; message: string }

function check(error: DbError | null, message: string): void {
  if (!error) return
  if (error.code === '23505') throw new ServiceError('That entry already exists.')
  throw new ServiceError(message)
}

// ---------------------------------------------------------------- facts
export async function listFacts(businessId: string): Promise<BusinessFact[]> {
  const { data, error } = await supabase.from('business_facts').select('*').eq('business_id', businessId).order('created_at')
  check(error, 'Could not load your business details.')
  return (data ?? []) as BusinessFact[]
}

export interface TemplateFactEntry { key: string; label: string; value: string }

/** Saves template facts. Filled values are upserted; cleared values are removed. */
export async function saveTemplateFacts(businessId: string, entries: TemplateFactEntry[]): Promise<void> {
  const filled = entries.filter((e) => e.value.trim())
  const cleared = entries.filter((e) => !e.value.trim()).map((e) => e.key)
  if (filled.length) {
    const { error } = await supabase.from('business_facts').upsert(
      filled.map((e) => ({ business_id: businessId, key: e.key, label: e.label, value: e.value.trim(), verified: true })),
      { onConflict: 'business_id,key' },
    )
    check(error, 'Could not save your business details.')
  }
  if (cleared.length) {
    const { error } = await supabase.from('business_facts').delete().eq('business_id', businessId).in('key', cleared)
    check(error, 'Could not save your business details.')
  }
}

export interface CustomFactInput { label: string; value: string; verified: boolean }

export async function createFact(businessId: string, input: CustomFactInput): Promise<void> {
  const { error } = await supabase.from('business_facts').insert({
    business_id: businessId, key: null, label: input.label.trim(), value: input.value.trim(), verified: input.verified,
  })
  check(error, 'Could not add the fact.')
}

export async function updateFact(id: string, input: CustomFactInput): Promise<void> {
  const { error } = await supabase.from('business_facts')
    .update({ label: input.label.trim(), value: input.value.trim(), verified: input.verified }).eq('id', id)
  check(error, 'Could not save the fact.')
}

export async function deleteFact(id: string): Promise<void> {
  const { error } = await supabase.from('business_facts').delete().eq('id', id)
  check(error, 'Could not delete the fact.')
}

// ------------------------------------------------------------ questions
export async function listQuestions(businessId: string): Promise<KnowledgeQuestion[]> {
  const { data, error } = await supabase
    .from('knowledge_questions')
    .select('*, knowledge_answers(*), knowledge_aliases(*)')
    .eq('business_id', businessId)
    .order('created_at')
  check(error, 'Could not load your questions.')
  return (data ?? []) as KnowledgeQuestion[]
}

export interface QuestionInput {
  id?: string
  question: string
  aliases: string[]
  answer: string
  verification: Verification
  status: QuestionStatus
}

/**
 * Saves a question with its answer and aliases. These are separate requests, not one
 * transaction: if a later step fails, reopen the question and save again.
 */
export async function saveQuestion(businessId: string, input: QuestionInput): Promise<void> {
  const answer = input.answer.trim()
  const row = {
    business_id: businessId,
    question: input.question.trim(),
    verification: input.verification,
    status: answer ? input.status : ('disabled' as QuestionStatus),
  }
  let id = input.id
  if (id) {
    const { error } = await supabase.from('knowledge_questions').update(row).eq('id', id)
    check(error, 'Could not save the question.')
  } else {
    const { data, error } = await supabase.from('knowledge_questions').insert(row).select('id').single()
    check(error, 'Could not save the question.')
    id = (data as { id: string }).id
  }
  await writeAnswerAndAliases(businessId, [{ id, answer, aliases: input.aliases }])
}

async function writeAnswerAndAliases(
  businessId: string,
  items: { id: string; answer: string; aliases: string[] }[],
): Promise<void> {
  const ids = items.map((i) => i.id)
  const withAnswer = items.filter((i) => i.answer)
  if (withAnswer.length) {
    const { error } = await supabase.from('knowledge_answers').upsert(
      withAnswer.map((i) => ({ business_id: businessId, question_id: i.id, language: 'any', answer_text: i.answer })),
      { onConflict: 'question_id,language' },
    )
    check(error, 'Could not save the answer.')
  }
  const noAnswer = items.filter((i) => !i.answer).map((i) => i.id)
  if (noAnswer.length) {
    const { error } = await supabase.from('knowledge_answers').delete().in('question_id', noAnswer)
    check(error, 'Could not save the answer.')
  }
  const { error: delErr } = await supabase.from('knowledge_aliases').delete().in('question_id', ids)
  check(delErr, 'Could not save the alternative phrasings.')
  const aliasRows = items.flatMap((i) => i.aliases.map((phrase) => ({ business_id: businessId, question_id: i.id, phrase })))
  if (aliasRows.length) {
    const { error } = await supabase.from('knowledge_aliases').insert(aliasRows)
    check(error, 'Could not save the alternative phrasings.')
  }
}

export interface SuggestedQuestionInput {
  template_key: string
  question: string
  aliases: string[]
  answer: string
  verification: Verification
  enabled: boolean
}

/** Saves the onboarding Q&A review in a handful of requests (idempotent per template_key). */
export async function saveSuggestedQuestions(businessId: string, items: SuggestedQuestionInput[]): Promise<void> {
  if (!items.length) return
  const { data, error } = await supabase
    .from('knowledge_questions')
    .upsert(
      items.map((i) => ({
        business_id: businessId, template_key: i.template_key, question: i.question,
        verification: i.verification, status: i.enabled && i.answer.trim() ? 'active' : 'disabled',
      })),
      { onConflict: 'business_id,template_key' },
    )
    .select('id, template_key')
  check(error, 'Could not save the suggested questions.')
  const idByKey = new Map((data as { id: string; template_key: string }[]).map((r): [string, string] => [r.template_key, r.id]))
  const writes = items.flatMap((i) => {
    const id = idByKey.get(i.template_key)
    return id ? [{ id, answer: i.answer.trim(), aliases: i.aliases }] : []
  })
  await writeAnswerAndAliases(businessId, writes)
}

export async function setQuestionStatus(id: string, status: QuestionStatus): Promise<void> {
  const { error } = await supabase.from('knowledge_questions').update({ status }).eq('id', id)
  check(error, 'Could not update the question.')
}

export async function deleteQuestion(id: string): Promise<void> {
  const { error } = await supabase.from('knowledge_questions').delete().eq('id', id)
  check(error, 'Could not delete the question.')
}

// --------------------------------------------------------- instructions
export async function listInstructions(businessId: string): Promise<BusinessInstruction[]> {
  const { data, error } = await supabase.from('business_instructions').select('*').eq('business_id', businessId).order('created_at')
  check(error, 'Could not load your instructions.')
  return (data ?? []) as BusinessInstruction[]
}

export async function createInstruction(businessId: string, instruction: string): Promise<void> {
  const { error } = await supabase.from('business_instructions').insert({ business_id: businessId, instruction: instruction.trim() })
  check(error, 'Could not add the instruction.')
}

export async function updateInstruction(id: string, changes: { instruction?: string; enabled?: boolean }): Promise<void> {
  const patch = { ...changes, ...(changes.instruction !== undefined ? { instruction: changes.instruction.trim() } : {}) }
  const { error } = await supabase.from('business_instructions').update(patch).eq('id', id)
  check(error, 'Could not save the instruction.')
}

export async function deleteInstruction(id: string): Promise<void> {
  const { error } = await supabase.from('business_instructions').delete().eq('id', id)
  check(error, 'Could not delete the instruction.')
}

// ----------------------------------------------------------- vocabulary
export async function listVocabulary(businessId: string): Promise<VocabularyEntry[]> {
  const { data, error } = await supabase.from('vocabulary_entries').select('*').eq('business_id', businessId).order('term')
  check(error, 'Could not load your vocabulary.')
  return (data ?? []) as VocabularyEntry[]
}

export interface VocabularyInput { term: string; meaning: string; notes: string }

export async function saveVocabulary(businessId: string, input: VocabularyInput, id?: string): Promise<void> {
  const row = { term: input.term.trim(), meaning: input.meaning.trim(), notes: input.notes.trim() || null }
  const { error } = id
    ? await supabase.from('vocabulary_entries').update(row).eq('id', id)
    : await supabase.from('vocabulary_entries').insert({ business_id: businessId, ...row })
  check(error, 'Could not save the vocabulary entry.')
}

export async function deleteVocabulary(id: string): Promise<void> {
  const { error } = await supabase.from('vocabulary_entries').delete().eq('id', id)
  check(error, 'Could not delete the vocabulary entry.')
}

// --------------------------------------------------------------- counts
export async function getKnowledgeCounts(businessId: string): Promise<{ facts: number; questions: number }> {
  const [facts, questions] = await Promise.all([
    supabase.from('business_facts').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
    supabase.from('knowledge_questions').select('id', { count: 'exact', head: true }).eq('business_id', businessId).eq('status', 'active'),
  ])
  check(facts.error, 'Could not load setup progress.')
  check(questions.error, 'Could not load setup progress.')
  return { facts: facts.count ?? 0, questions: questions.count ?? 0 }
}

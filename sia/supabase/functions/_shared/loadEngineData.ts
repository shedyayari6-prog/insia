// Shared by the dashboard test endpoint (chatbot-process, user JWT + RLS) and the public widget
// (widget-chat, service role). The caller decides which Supabase client to pass; every query is
// ALWAYS filtered by the businessId argument, so the data of exactly one business is loaded.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import type { ApprovedAnswer, CatalogItem, EngineData } from './engine/types.ts'

/** Bounded, targeted reads (indexed by business_id). Never reads another business. */
export async function loadEngineData(client: SupabaseClient, businessId: string): Promise<EngineData> {
  const [business, facts, questions, catalog, vocabulary, instructions] = await Promise.all([
    client.from('businesses')
      .select('id, business_name, business_type, custom_business_type, country, city, description, preferred_language, contact_information, website')
      .eq('id', businessId).single(),
    client.from('business_facts').select('id, key, label, value, verified').eq('business_id', businessId).limit(300),
    client.from('knowledge_questions')
      .select('id, question, template_key, verification, knowledge_answers(answer_text, language), knowledge_aliases(phrase)')
      .eq('business_id', businessId).eq('status', 'active').limit(500),
    client.from('catalog_items')
      .select('id, kind, name, description, price, currency, price_unit, duration_text, catalog_item_aliases(alias), catalog_variants(id, color, size, price, stock_quantity, available)')
      .eq('business_id', businessId).eq('active', true).limit(500),
    client.from('vocabulary_entries').select('id, term, meaning').eq('business_id', businessId).limit(500),
    client.from('business_instructions').select('id, instruction').eq('business_id', businessId).eq('enabled', true).limit(50),
  ])
  for (const r of [business, facts, questions, catalog, vocabulary, instructions]) if (r.error) throw r.error

  const answers: ApprovedAnswer[] = (questions.data ?? []).flatMap((q) => {
    const list = (q.knowledge_answers ?? []) as { answer_text: string; language: string }[]
    const a = list.find((x) => x.language === 'any') ?? list[0]
    if (!a?.answer_text?.trim()) return []
    return [{
      question_id: q.id, question: q.question, answer: a.answer_text, template_key: q.template_key, verification: q.verification,
      aliases: ((q.knowledge_aliases ?? []) as { phrase: string }[]).map((x) => x.phrase),
    }]
  })

  const items: CatalogItem[] = (catalog.data ?? []).map((c) => ({
    id: c.id, kind: c.kind, name: c.name, description: c.description,
    price: c.price === null ? null : Number(c.price), currency: c.currency, price_unit: c.price_unit, duration_text: c.duration_text,
    aliases: ((c.catalog_item_aliases ?? []) as { alias: string }[]).map((x) => x.alias),
    variants: ((c.catalog_variants ?? []) as { id: string; color: string | null; size: string | null; price: number | null; stock_quantity: number | null; available: boolean }[])
      .map((v) => ({ ...v, price: v.price === null ? null : Number(v.price) })),
  }))

  return {
    business: business.data,
    facts: (facts.data ?? []).map((f) => ({ id: f.id, key: f.key, label: f.label, value: f.value, verified: f.verified })),
    answers,
    catalog: items,
    vocabulary: vocabulary.data ?? [],
    instructions: instructions.data ?? [],
  }
}

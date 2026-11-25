import { supabase } from '@/lib/supabase'
import type { CatalogItemRow, CatalogKindValue } from '@/types'
import { ServiceError } from './auth'

function check(error: { code?: string; message: string } | null, message: string): void {
  if (!error) return
  if (error.code === '23505') throw new ServiceError('An item or option with that name already exists.')
  throw new ServiceError(message)
}

export async function listCatalog(businessId: string): Promise<CatalogItemRow[]> {
  const { data, error } = await supabase
    .from('catalog_items')
    .select('*, catalog_item_aliases(id, alias), catalog_variants(*)')
    .eq('business_id', businessId)
    .order('kind')
    .order('name')
  check(error, 'Could not load your products and services.')
  return ((data ?? []) as CatalogItemRow[]).map((i) => ({
    ...i,
    price: i.price === null ? null : Number(i.price),
    catalog_variants: i.catalog_variants.map((v) => ({ ...v, price: v.price === null ? null : Number(v.price) })),
  }))
}

export interface CatalogInput {
  id?: string
  kind: CatalogKindValue
  name: string
  description: string
  price: number | null
  currency: string
  price_unit: string
  duration_text: string
  active: boolean
  aliases: string[]
  variants: { color: string; size: string; stock_quantity: number | null; available: boolean }[]
}

/**
 * Saves an item with its aliases and variants. Several requests, not one transaction:
 * if a later step fails, reopen the item and save again.
 */
export async function saveCatalogItem(businessId: string, input: CatalogInput): Promise<void> {
  const row = {
    business_id: businessId,
    kind: input.kind,
    name: input.name.trim(),
    description: input.description.trim() || null,
    price: input.price,
    currency: input.currency.trim() || 'TND',
    price_unit: input.price_unit.trim() || null,
    duration_text: input.duration_text.trim() || null,
    active: input.active,
  }
  let id = input.id
  if (id) {
    const { error } = await supabase.from('catalog_items').update(row).eq('id', id)
    check(error, 'Could not save the item.')
  } else {
    const { data, error } = await supabase.from('catalog_items').insert(row).select('id').single()
    check(error, 'Could not save the item.')
    id = (data as { id: string }).id
  }

  const { error: delAliases } = await supabase.from('catalog_item_aliases').delete().eq('item_id', id)
  check(delAliases, 'Could not save the alternative names.')
  if (input.aliases.length) {
    const { error } = await supabase.from('catalog_item_aliases').insert(input.aliases.map((alias) => ({ business_id: businessId, item_id: id, alias })))
    check(error, 'Could not save the alternative names.')
  }

  const { error: delVariants } = await supabase.from('catalog_variants').delete().eq('item_id', id)
  check(delVariants, 'Could not save the options.')
  if (input.variants.length) {
    const { error } = await supabase.from('catalog_variants').insert(
      input.variants.map((v) => ({
        business_id: businessId, item_id: id, color: v.color.trim() || null, size: v.size.trim() || null,
        stock_quantity: v.stock_quantity, available: v.available,
      })),
    )
    check(error, 'Could not save the options. Each color and size combination can only appear once.')
  }
}

export async function deleteCatalogItem(id: string): Promise<void> {
  const { error } = await supabase.from('catalog_items').delete().eq('id', id)
  check(error, 'Could not delete the item.')
}

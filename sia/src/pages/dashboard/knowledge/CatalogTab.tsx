import { useState, type FormEvent } from 'react'
import { Package, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Alert, EmptyState, Spinner } from '@/components/ui/Feedback'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Field'
import { ConfirmModal, Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { useBusiness } from '@/contexts/BusinessContext'
import { useLoad } from '@/hooks/useLoad'
import { CATALOG_KINDS } from '@/lib/constants'
import { parseAliases } from '@/lib/templates'
import { deleteCatalogItem, listCatalog, saveCatalogItem, type CatalogInput } from '@/services/catalog'
import type { CatalogItemRow, CatalogKindValue } from '@/types'

const kindLabel = (k: CatalogKindValue) => CATALOG_KINDS.find((x) => x.value === k)?.label ?? k
const money = (i: CatalogItemRow) => (i.price === null ? 'No price' : `${i.price} ${i.currency}${i.price_unit ? ` / ${i.price_unit}` : ''}`)

export default function CatalogTab() {
  const { business } = useBusiness()
  const businessId = business!.id
  const { data: items, loading, error, reload } = useLoad(() => listCatalog(businessId))
  const [editing, setEditing] = useState<CatalogItemRow | 'new' | null>(null)
  const [deleting, setDeleting] = useState<CatalogItemRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  async function confirmDelete() {
    if (!deleting) return
    setBusy(true)
    try {
      await deleteCatalogItem(deleting.id)
      await reload()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not delete.')
    } finally { setBusy(false); setDeleting(null) }
  }

  if (loading && !items) return <Spinner label="Loading products and services" />
  if (error) return <Alert tone="error">{error}</Alert>

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-ink-soft">
          Anything customers can ask about by name: products, services, rooms, dishes, vehicles or plans. Prices and stock come from here, so keep them up to date.
        </p>
        <Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" aria-hidden="true" /> Add item</Button>
      </div>
      {actionError && <div className="mb-4"><Alert tone="error">{actionError}</Alert></div>}

      {(items ?? []).length === 0 ? (
        <EmptyState icon={<Package className="h-5 w-5" aria-hidden="true" />} title="No products or services yet" action={<Button onClick={() => setEditing('new')}>Add your first item</Button>}>
          Without items, INSIA can still answer from your business facts, but it cannot answer questions about specific prices or availability.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-sand-light rounded-lg border border-sand bg-white shadow-soft">
          {items!.map((i) => (
            <li key={i.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-4 sm:px-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{i.name}</p>
                  <Badge>{kindLabel(i.kind)}</Badge>
                  {!i.active && <Badge tone="warn">Hidden from chatbot</Badge>}
                </div>
                <p className="mt-1 text-sm text-ink-soft">
                  {money(i)}
                  {i.catalog_variants.length > 0 && ` · ${i.catalog_variants.length} ${i.catalog_variants.length === 1 ? 'option' : 'options'}`}
                  {i.catalog_item_aliases.length > 0 && ` · ${i.catalog_item_aliases.length} alternative ${i.catalog_item_aliases.length === 1 ? 'name' : 'names'}`}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" onClick={() => setEditing(i)}>Edit</Button>
                <Button variant="ghost" onClick={() => setDeleting(i)}>Delete</Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <ItemEditor
          item={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (input) => {
            await saveCatalogItem(businessId, { ...input, id: editing === 'new' ? undefined : editing.id })
            setEditing(null)
            await reload()
          }}
        />
      )}
      {deleting && (
        <ConfirmModal title="Delete this item?" message={`“${deleting.name}” and its options will be removed. The chatbot will stop answering about it.`} confirmLabel="Delete item" busy={busy} onConfirm={() => void confirmDelete()} onClose={() => setDeleting(null)} />
      )}
    </div>
  )
}

interface VariantDraft { color: string; size: string; stock: string; available: boolean }

function ItemEditor({ item, onClose, onSave }: {
  item: CatalogItemRow | null
  onClose: () => void
  onSave: (input: Omit<CatalogInput, 'id'>) => Promise<void>
}) {
  const [kind, setKind] = useState<CatalogKindValue>(item?.kind ?? 'product')
  const [name, setName] = useState(item?.name ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [price, setPrice] = useState(item?.price === null || item?.price === undefined ? '' : String(item.price))
  const [currency, setCurrency] = useState(item?.currency ?? 'TND')
  const [unit, setUnit] = useState(item?.price_unit ?? '')
  const [duration, setDuration] = useState(item?.duration_text ?? '')
  const [aliases, setAliases] = useState(item?.catalog_item_aliases.map((a) => a.alias).join('\n') ?? '')
  const [active, setActive] = useState(item?.active ?? true)
  const [variants, setVariants] = useState<VariantDraft[]>(
    item?.catalog_variants.map((v) => ({ color: v.color ?? '', size: v.size ?? '', stock: v.stock_quantity === null ? '' : String(v.stock_quantity), available: v.available })) ?? [],
  )
  const [errors, setErrors] = useState<{ name?: string; price?: string; variants?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const patchVariant = (i: number, patch: Partial<VariantDraft>) => setVariants((vs) => vs.map((v, k) => (k === i ? { ...v, ...patch } : v)))

  async function submit(e: FormEvent) {
    e.preventDefault()
    const found: typeof errors = {}
    if (!name.trim()) found.name = 'Enter a name.'
    let priceValue: number | null = null
    if (price.trim()) {
      priceValue = Number(price.replace(',', '.'))
      if (!Number.isFinite(priceValue) || priceValue < 0 || priceValue >= 1e9) found.price = 'Enter a valid price, or leave it empty.'
    }
    const parsed: { color: string; size: string; stock_quantity: number | null; available: boolean }[] = []
    for (const v of variants) {
      if (!v.color.trim() && !v.size.trim()) { found.variants = 'Each option needs a color or a size.'; break }
      const stock = v.stock.trim() === '' ? null : Number(v.stock)
      if (stock !== null && (!Number.isInteger(stock) || stock < 0)) { found.variants = 'Stock must be a whole number, or empty if you do not track it.'; break }
      parsed.push({ color: v.color, size: v.size, stock_quantity: stock, available: v.available })
    }
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    setFormError(null)
    try {
      await onSave({
        kind, name, description, price: priceValue, currency, price_unit: unit, duration_text: duration,
        active, aliases: parseAliases(aliases, 20), variants: parsed,
      })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save.')
      setBusy(false)
    }
  }

  return (
    <Modal title={item ? 'Edit item' : 'Add item'} onClose={onClose} wide>
      <form onSubmit={(e) => void submit(e)} noValidate className="space-y-5">
        {formError && <Alert tone="error">{formError}</Alert>}
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField label="Type" value={kind} onChange={(e) => setKind(e.target.value as CatalogKindValue)}>
            {CATALOG_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </SelectField>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} maxLength={120} placeholder="Hoodie" />
        </div>
        <TextAreaField label="Description" optional value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} className="!min-h-[4.5rem]" />
        <div className="grid gap-5 sm:grid-cols-3">
          <TextField label="Price" optional inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} error={errors.price} placeholder="65" />
          <TextField label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} maxLength={8} />
          <TextField label="Per" optional value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={40} placeholder="night, month…" />
        </div>
        <TextField label="Duration" optional value={duration} onChange={(e) => setDuration(e.target.value)} maxLength={60} placeholder="1 hour" hint="For services, for example how long a session takes." />
        <TextAreaField label="Other names customers use" optional value={aliases} onChange={(e) => setAliases(e.target.value)} hint="One per line, in any language or spelling." className="!min-h-[4.5rem]" />

        <fieldset>
          <legend className="text-sm font-medium">Options (colors and sizes)</legend>
          <p className="mt-1 text-sm text-ink-soft">Leave stock empty if you don’t track it. INSIA then won’t claim the item is in stock.</p>
          {errors.variants && <p role="alert" className="mt-2 text-sm text-[#9A3623]">{errors.variants}</p>}
          <ul className="mt-3 space-y-2">
            {variants.map((v, i) => (
              <li key={i} className="grid grid-cols-[1fr_1fr_5rem_auto_auto] items-center gap-2">
                <input aria-label="Color" placeholder="Color" value={v.color} maxLength={40} onChange={(e) => patchVariant(i, { color: e.target.value })} className="h-10 min-w-0 rounded-md border border-sand bg-white px-2.5 text-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold" />
                <input aria-label="Size" placeholder="Size" value={v.size} maxLength={20} onChange={(e) => patchVariant(i, { size: e.target.value })} className="h-10 min-w-0 rounded-md border border-sand bg-white px-2.5 text-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold" />
                <input aria-label="Stock" placeholder="Stock" inputMode="numeric" value={v.stock} onChange={(e) => patchVariant(i, { stock: e.target.value })} className="h-10 min-w-0 rounded-md border border-sand bg-white px-2.5 text-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold" />
                <label className="flex items-center gap-1 text-xs text-ink-soft"><input type="checkbox" className="h-4 w-4 accent-ink" checked={v.available} onChange={(e) => patchVariant(i, { available: e.target.checked })} />On sale</label>
                <button type="button" aria-label="Remove option" onClick={() => setVariants((vs) => vs.filter((_, k) => k !== i))} className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-paper-deep"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
          <Button type="button" variant="secondary" className="mt-3" onClick={() => setVariants((vs) => [...vs, { color: '', size: '', stock: '', available: true }])}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Add option
          </Button>
        </fieldset>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 rounded border-sand accent-ink" checked={active} onChange={(e) => setActive(e.target.checked)} />
          The chatbot may talk about this item
        </label>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" loading={busy}>Save item</Button>
        </div>
      </form>
    </Modal>
  )
}

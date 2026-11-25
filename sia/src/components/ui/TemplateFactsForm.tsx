import { TextAreaField, TextField } from '@/components/ui/Field'
import type { FactField } from '@/lib/templates'

export function TemplateFactsForm({ fields, values, onChange }: {
  fields: FactField[]; values: Record<string, string>; onChange: (next: Record<string, string>) => void
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {fields.map((field) => {
        const common = {
          label: field.label,
          optional: true,
          placeholder: field.placeholder,
          value: values[field.key] ?? '',
        }
        return field.kind === 'longtext' ? (
          <div key={field.key} className="sm:col-span-2">
            <TextAreaField {...common} maxLength={2000} className="!min-h-[5.5rem]" onChange={(e) => onChange({ ...values, [field.key]: e.target.value })} />
          </div>
        ) : (
          <TextField key={field.key} {...common} maxLength={2000} onChange={(e) => onChange({ ...values, [field.key]: e.target.value })} />
        )
      })}
    </div>
  )
}

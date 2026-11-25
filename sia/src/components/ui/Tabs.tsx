export function Tabs<T extends string>({ tabs, value, onChange }: {
  tabs: { id: T; label: string }[]; value: T; onChange: (id: T) => void
}) {
  return (
    <div role="tablist" className="-mx-5 mb-6 flex gap-1 overflow-x-auto border-b border-sand px-5 sm:mx-0 sm:px-0">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          type="button"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={`-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            value === t.id ? 'border-gold text-ink' : 'border-transparent text-ink-soft hover:text-ink'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

import type { ReactNode } from 'react'

export function Panel({ title, description, children, footer }: {
  title?: string; description?: string; children: ReactNode; footer?: ReactNode
}) {
  return (
    <section className="rounded-lg border border-sand bg-white shadow-soft">
      {(title || description) && (
        <header className="border-b border-sand-light px-5 py-4 sm:px-6">
          {title && <h2 className="font-display text-xl font-medium">{title}</h2>}
          {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
        </header>
      )}
      <div className="px-5 py-5 sm:px-6">{children}</div>
      {footer && <footer className="border-t border-sand-light bg-paper/60 px-5 py-3 sm:px-6">{footer}</footer>}
    </section>
  )
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-medium sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-ink-soft">{description}</p>}
      </div>
      {actions}
    </div>
  )
}

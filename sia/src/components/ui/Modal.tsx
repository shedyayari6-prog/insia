import { useEffect, useId, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const titleId = useId()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className={`relative flex max-h-[92vh] w-full flex-col rounded-t-lg bg-white shadow-lift sm:rounded-lg ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}>
        <div className="flex items-center justify-between border-b border-sand-light px-5 py-4">
          <h2 id={titleId} className="font-display text-xl font-medium">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-paper-deep">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  )
}

export function ConfirmModal({ title, message, confirmLabel, busy, onConfirm, onClose }: {
  title: string; message: string; confirmLabel: string; busy?: boolean; onConfirm: () => void; onClose: () => void
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm leading-6 text-ink-soft">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm} loading={busy}>{confirmLabel}</Button>
      </div>
    </Modal>
  )
}

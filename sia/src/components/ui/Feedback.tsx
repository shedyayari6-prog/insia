import type { ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info, Loader2 } from 'lucide-react'

export function Alert({ tone, children }: { tone: 'error' | 'success' | 'info'; children: ReactNode }) {
  const styles = {
    error: { box: 'border-[#E3B5AA] bg-[#FBEFEC] text-[#7E2D1E]', Icon: AlertCircle },
    success: { box: 'border-[#BFD3BC] bg-[#EFF5EE] text-[#2F5A2B]', Icon: CheckCircle2 },
    info: { box: 'border-sand bg-white text-ink-soft', Icon: Info },
  }[tone]
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-md border px-3.5 py-3 text-sm ${styles.box}`}
    >
      <styles.Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  )
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-ink-soft">
      <Loader2 className="h-5 w-5 animate-spin text-gold" aria-hidden="true" />
      <span>{label}…</span>
    </div>
  )
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper">
      <Spinner />
    </div>
  )
}

export function EmptyState({
  icon, title, children, action,
}: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-sand bg-white px-6 py-14 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-paper-deep text-ink-soft">{icon}</div>
      <h2 className="mt-4 font-display text-xl font-medium">{title}</h2>
      {children && <div className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-soft">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

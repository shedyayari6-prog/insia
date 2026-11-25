import type { ReactNode } from 'react'
import { Logo } from '@/components/ui/Logo'

export function AuthLayout({ title, subtitle, children, footer }: {
  title: string; subtitle?: string; children: ReactNode; footer?: ReactNode
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-5 py-8 sm:px-10">
        <Logo />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-medium sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 text-ink-soft">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-sm text-ink-soft">{footer}</div>}
        </div>
      </div>
      <aside className="relative hidden flex-col justify-between bg-ink p-12 text-paper lg:flex" aria-hidden="true">
        <img src="/insia-mark-gold.png" alt="" className="w-40 opacity-90" />
        <p className="max-w-md font-display text-3xl font-normal leading-snug">
          Create a chatbot that understands your business, answers customers and learns from the questions they ask.
        </p>
      </aside>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { ROUTES } from '@/lib/constants'

export function LogoMark({ className = 'h-7 w-auto' }: { className?: string }) {
  return <img src="/insia-mark-gold.png" alt="" aria-hidden="true" className={className} />
}

export function Logo({ to = ROUTES.home, tone = 'dark' }: { to?: string; tone?: 'dark' | 'light' }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2.5" aria-label="INSIA home">
      <LogoMark className="h-6 w-auto" />
      <span
        className={`font-display text-[1.65rem] font-medium leading-none tracking-[0.08em] ${
          tone === 'light' ? 'text-paper' : 'text-ink'
        }`}
      >
        INSIA
      </span>
    </Link>
  )
}

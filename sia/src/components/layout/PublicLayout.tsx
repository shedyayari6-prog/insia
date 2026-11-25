import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { ButtonLink } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { ROUTES } from '@/lib/constants'

const NAV = [
  { to: ROUTES.home, label: 'Home', end: true },
  { to: ROUTES.pricing, label: 'Pricing', end: false },
  { to: ROUTES.about, label: 'About', end: false },
]

export function PublicLayout() {
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  const { pathname } = useLocation()

  useEffect(() => {
    setOpen(false)
    window.scrollTo(0, 0)
  }, [pathname])

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${isActive ? 'text-ink' : 'text-ink-soft hover:text-ink'}`

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-sand/70 bg-paper/95 backdrop-blur-sm">
        <div className="container-page flex h-16 items-center justify-between">
          <Logo />
          <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={linkClass}>{n.label}</NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <ButtonLink to={ROUTES.dashboard}>Open dashboard</ButtonLink>
            ) : (
              <>
                <ButtonLink to={ROUTES.login} variant="ghost">Log in</ButtonLink>
                <ButtonLink to={ROUTES.register}>Get started</ButtonLink>
              </>
            )}
          </div>
          <button
            type="button"
            className="-mr-2 inline-flex h-10 w-10 items-center justify-center rounded-md md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open && (
          <div id="mobile-nav" className="border-t border-sand/70 bg-paper md:hidden">
            <nav className="container-page flex flex-col gap-1 py-4" aria-label="Mobile">
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `rounded-md px-2 py-2.5 text-base font-medium ${isActive ? 'bg-paper-deep' : ''}`}>
                  {n.label}
                </NavLink>
              ))}
              <div className="mt-3 flex gap-2">
                {user ? (
                  <ButtonLink to={ROUTES.dashboard} className="flex-1">Open dashboard</ButtonLink>
                ) : (
                  <>
                    <ButtonLink to={ROUTES.login} variant="secondary" className="flex-1">Log in</ButtonLink>
                    <ButtonLink to={ROUTES.register} className="flex-1">Get started</ButtonLink>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>
      <main className="flex-1"><Outlet /></main>
      <Footer />
    </div>
  )
}

function Footer() {
  return (
    <footer className="bg-ink text-paper">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo tone="light" />
          <p className="mt-4 max-w-xs text-sm leading-6 text-sand">
            Your business. Your knowledge. One smarter way to communicate.
          </p>
        </div>
        <FooterCol title="Product" links={[[ROUTES.pricing, 'Pricing'], [ROUTES.about, 'About'], [ROUTES.register, 'Get started']]} />
        <FooterCol title="Legal" links={[[ROUTES.privacy, 'Privacy policy'], [ROUTES.terms, 'Terms of service'], [ROUTES.login, 'Log in']]} />
      </div>
      <div className="border-t border-white/10">
        <p className="container-page py-5 text-sm text-slate">© {new Date().getFullYear()} INSIA. All rights reserved.</p>
      </div>
    </footer>
  )
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="text-sm font-semibold text-paper">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map(([to, label]) => (
          <li key={to}><Link to={to} className="text-sm text-sand hover:text-paper">{label}</Link></li>
        ))}
      </ul>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BookOpen, Brain, Building2, CreditCard, Code2, FlaskConical, LayoutDashboard, LogOut, Menu, MessageSquare,
  Plug, Settings, Users, X, type LucideIcon, Globe,
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { useAuth } from '@/contexts/AuthContext'
import { useBusiness } from '@/contexts/BusinessContext'
import { signOut } from '@/services/auth'
import { ROUTES } from '@/lib/constants'

interface NavItem { to: string; label: string; icon: LucideIcon; soon?: boolean }

export const DASHBOARD_NAV: NavItem[] = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/dashboard/business', label: 'Business Profile', icon: Building2 },
  { to: '/dashboard/knowledge', label: 'Knowledge Center', icon: BookOpen },
  { to: '/dashboard/test', label: 'Test your chatbot', icon: FlaskConical },
  { to: '/dashboard/learning', label: 'Learning Center', icon: Brain, soon: true },
  { to: '/dashboard/conversations', label: 'Conversations', icon: MessageSquare },
  { to: '/dashboard/customers', label: 'Customers', icon: Users, soon: true },
  { to: '/dashboard/website-chatbot', label: 'Website Chatbot', icon: Globe },
  { to: '/dashboard/channels', label: 'Channels', icon: Plug, soon: true },
  { to: '/dashboard/developers', label: 'Developer Center', icon: Code2, soon: true },
  { to: '/dashboard/credits', label: 'Credits', icon: CreditCard, soon: true },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { business } = useBusiness()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  async function handleLogout() {
    setBusy(true)
    try {
      await signOut()
      navigate(ROUTES.home, { replace: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5"><Logo to={ROUTES.dashboard} /></div>
      <div className="mx-3 mb-3 rounded-md border border-sand bg-white px-3 py-2.5">
        <p className="truncate text-sm font-semibold">{business?.business_name ?? 'Your business'}</p>
        <p className="truncate text-xs text-ink-soft">{user?.email}</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Dashboard">
        <ul className="space-y-0.5">
          {DASHBOARD_NAV.map(({ to, label, icon: Icon, soon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === ROUTES.dashboard}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-md border-l-2 py-2 pl-2.5 pr-2 text-sm font-medium transition-colors ${
                    isActive ? 'border-gold bg-paper-deep text-ink' : 'border-transparent text-ink-soft hover:bg-paper-deep hover:text-ink'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="flex-1 truncate">{label}</span>
                {soon && <span className="rounded bg-sand-light px-1.5 py-0.5 text-[0.65rem] font-medium text-ink-soft">Soon</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-sand p-3">
        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={busy}
          className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium text-ink-soft hover:bg-paper-deep hover:text-ink disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" /> Log out
        </button>
      </div>
    </div>
  )
}

export function DashboardLayout() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen border-r border-sand bg-paper lg:block">
        <SidebarContent />
      </aside>

      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-sand bg-paper/95 px-4 backdrop-blur-sm lg:hidden">
        <Logo to={ROUTES.dashboard} />
        <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-md" aria-label="Open navigation" aria-expanded={open} onClick={() => setOpen(true)}>
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[17.5rem] max-w-[85vw] bg-paper shadow-lift">
            <button type="button" className="absolute right-2 top-3 inline-flex h-10 w-10 items-center justify-center rounded-md" aria-label="Close navigation" onClick={() => setOpen(false)}>
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <main className="min-w-0 px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-4xl"><Outlet /></div>
      </main>
    </div>
  )
}

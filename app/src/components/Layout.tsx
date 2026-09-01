import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BookOpen,
  Boxes,
  CalendarCheck,
  ChefHat,
  ClipboardList,
  FileBarChart,
  Globe,
  HandCoins,
  IndianRupee,
  ListChecks,
  LogOut,
  Menu as MenuIcon,
  Moon,
  Sun,
  UserCog,
  Users,
  Utensils,
  Wallet,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/mock/store'
import { useAuth } from '@/lib/auth-context'
import { useLang } from '@/lib/language-context'
import { LANG_META, type Lang } from '@/lib/i18n'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface NavItem {
  to: string
  i18nKey: string
  icon: typeof BookOpen
  adminOnly?: boolean
}

const NAV: { sectionKey: string; items: NavItem[] }[] = [
  {
    sectionKey: 'nav.section.daily',
    items: [
      { to: '/', i18nKey: 'nav.todaysMeal', icon: ChefHat },
      { to: '/entry', i18nKey: 'nav.transactionEntry', icon: ClipboardList },
      { to: '/counts', i18nKey: 'nav.bhojanshalaCounts', icon: Users },
      { to: '/menu', i18nKey: 'nav.menuPlanner', icon: Utensils },
      { to: '/seva', i18nKey: 'nav.rasoiSeva', icon: HandCoins },
      { to: '/my-entries', i18nKey: 'nav.myEntries', icon: BookOpen },
    ],
  },
  {
    sectionKey: 'nav.section.admin',
    items: [
      { to: '/transactions', i18nKey: 'nav.allTransactions', icon: ListChecks, adminOnly: true },
      { to: '/pending', i18nKey: 'nav.pendingAmounts', icon: IndianRupee, adminOnly: true },
      { to: '/attendance', i18nKey: 'nav.attendance', icon: CalendarCheck, adminOnly: true },
      { to: '/salary', i18nKey: 'nav.salary', icon: Wallet, adminOnly: true },
      { to: '/masters', i18nKey: 'nav.masters', icon: Boxes, adminOnly: true },
      { to: '/users', i18nKey: 'nav.userManagement', icon: UserCog, adminOnly: true },
      { to: '/reports', i18nKey: 'nav.reports', icon: FileBarChart, adminOnly: true },
    ],
  },
]

const LANG_ORDER: Lang[] = ['gu', 'hi', 'en']

export function Layout() {
  const { currentUser, pendingAmounts } = useStore()
  const { logout } = useAuth()
  const { lang, setLang, t } = useLang()

  // sidebarOpen: controls BOTH mobile drawer and desktop sidebar
  const [sidebarOpen, setSidebarOpen] = useState(true)
  // mobileDrawer: on small screens the sidebar is always an overlay drawer
  const [mobileOpen, setMobileOpen] = useState(false)

  const [dark, setDark] = useState(false)
  const [langMenuOpen, setLangMenuOpen] = useState(false)
  const location = useLocation()

  const isAdmin = currentUser.role === 'ADMIN'
  const pending = pendingAmounts().length

  function toggleTheme() {
    setDark((d) => {
      document.documentElement.classList.toggle('dark', !d)
      return !d
    })
  }


  const sections = NAV.map((s) => ({
    ...s,
    items: s.items.filter((i) => !i.adminOnly || isAdmin),
  })).filter((s) => s.items.length > 0)

  /** Full sidebar nav — labels always visible */
  const navFull = (onClickItem?: () => void) => (
    <nav className="space-y-6">
      {sections.map((section) => (
        <div key={section.sectionKey}>
          <p className="px-3 pb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t(section.sectionKey)}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onClickItem}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
                      isActive
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-foreground/75 hover:bg-accent hover:text-foreground',
                    )
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{t(item.i18nKey)}</span>
                  {item.to === '/pending' && pending > 0 && (
                    <Badge variant="warn">{pending}</Badge>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )

  /** Icon-only sidebar for collapsed desktop state */
  const navIconOnly = (
    <nav className="flex flex-col gap-1">
      {sections.flatMap((s) =>
        s.items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            title={t(item.i18nKey)}
            className={({ isActive }) =>
              cn(
                'flex h-10 w-10 items-center justify-center rounded-md text-sm transition-colors mx-auto',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground/60 hover:bg-accent hover:text-foreground',
              )
            }
          >
            <div className="relative">
              <item.icon className="h-5 w-5" />
              {item.to === '/pending' && pending > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">
                  {pending}
                </span>
              )}
            </div>
          </NavLink>
        ))
      )}
    </nav>
  )

  return (
    <div className="min-h-dvh bg-background">
      {/* ── Top bar */}
      <header className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-3 sm:px-5">
          {/* Hamburger — works on ALL screen sizes now */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              // On mobile: toggle overlay drawer
              if (window.innerWidth < 1024) setMobileOpen((o) => !o)
              // On desktop: collapse/expand sidebar
              else setSidebarOpen((o) => !o)
            }}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </Button>

          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ChefHat className="h-4.5 w-4.5" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">{t('app.title')}</p>
              <p className="hidden text-[11px] text-muted-foreground sm:block">{t('app.subtitle')}</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1">
            {/* Language toggle */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLangMenuOpen((o) => !o)}
                aria-label="Change language"
                title="Change language"
                className="relative"
              >
                <Globe className="h-4 w-4" />
                <span className="absolute -bottom-0.5 -right-0.5 rounded bg-primary/15 px-0.5 text-[9px] font-bold text-primary">
                  {LANG_META[lang].label}
                </span>
              </Button>

              {langMenuOpen && (
                <>
                  <button
                    className="fixed inset-0 z-40"
                    onClick={() => setLangMenuOpen(false)}
                    aria-label="Close language menu"
                  />
                  <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-lg border bg-card p-1 shadow-lg animate-in fade-in-0 zoom-in-95">
                    {LANG_ORDER.map((l) => (
                      <button
                        key={l}
                        onClick={() => { setLang(l); setLangMenuOpen(false) }}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent',
                          lang === l && 'bg-primary/10 font-medium text-primary',
                        )}
                      >
                        <span className="text-base">{LANG_META[l].label}</span>
                        <span>{LANG_META[l].nativeName}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Theme">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <div className="hidden flex-col items-end sm:flex">
              <span className="text-sm font-medium leading-none">{currentUser.name}</span>
              <span className="mt-0.5 text-[11px] text-muted-foreground">
                {currentUser.role === 'ADMIN' ? t('role.admin') : t('role.dataEntry')}
              </span>
            </div>

            <Button variant="ghost" size="icon" onClick={() => logout()} aria-label="Logout" title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* ── Desktop sidebar — collapsible */}
        <aside
          className={cn(
            'sticky top-14 hidden h-[calc(100dvh-3.5rem)] shrink-0 overflow-y-auto border-r bg-card/40 transition-all duration-300 lg:block',
            sidebarOpen ? 'w-60 p-3' : 'w-14 py-3 px-2',
          )}
        >
          {sidebarOpen ? navFull() : navIconOnly}
        </aside>

        {/* ── Mobile drawer overlay */}
        {mobileOpen && (
          <>
            <button
              className="fixed inset-0 top-14 z-30 bg-black/40 lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            />
            <aside className="fixed left-0 top-14 z-40 h-[calc(100dvh-3.5rem)] w-64 overflow-y-auto border-r bg-card p-3 shadow-xl lg:hidden">
              {navFull(() => setMobileOpen(false))}
            </aside>
          </>
        )}

        {/* ── Content */}
        <main key={location.pathname} className="min-w-0 flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

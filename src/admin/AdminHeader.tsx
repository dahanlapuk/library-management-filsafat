import { Chevron } from '../components/ui/Chevron'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getCurrentAdmin, logout } from './auth'
import { PeranBadge } from './PeranBadge'
import { getNavCounts } from './nav-counts'
import { Tutorial } from './Tutorial'
import { markTutorialSeen } from './tutorial'
import { AdminClock, AdminClockStrip, SessionCountdown, useSessionGuard } from './SessionClock'

type NavLink = { to: string; label: string; superadminOnly?: boolean }
type NavGroup = { label: string; links: NavLink[]; superadminOnly?: boolean }

const NAV: NavGroup[] = [
  {
    label: 'Peminjaman',
    links: [
      { to: '/admin/loans/requests', label: 'Pengajuan Peminjaman' },
      { to: '/admin/members', label: 'Data Anggota' },
    ],
  },
  {
    label: 'Koleksi',
    links: [
      { to: '/admin/books', label: 'Kelola Buku' },
      { to: '/admin/inventory', label: 'Inventory Check' },
      { to: '/admin/categorize', label: 'Kategorisasi Massal' },
      { to: '/admin/categories', label: 'Kelola Kategori', superadminOnly: true },
    ],
  },
  {
    label: 'Persetujuan',
    superadminOnly: true,
    links: [
      { to: '/admin/books/delete-requests', label: 'Pengajuan Hapus' },
      { to: '/admin/books/category-requests', label: 'Pengajuan Kategori' },
      { to: '/admin/approvals', label: 'Approval Admin' },
    ],
  },
  {
    label: 'Masukan',
    links: [
      { to: '/admin/feedback', label: 'Feedback Publik' },
      { to: '/admin/requests', label: 'Request Fitur' },
    ],
  },
  {
    label: 'Sistem',
    links: [
      { to: '/admin/activity', label: 'Activity Log', superadminOnly: true },
      { to: '/admin/maintenance', label: 'Maintenance' },
    ],
  },
]

const ICONS: Record<string, string> = {
  menu: 'M4 6h16M4 12h16M4 18h16',
  Dashboard: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  Peminjaman: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14z',
  Koleksi: 'M4 3v18M9 3v18M14 5l4 16',
  Persetujuan: 'M20 6 9 17l-5-5',
  Masukan: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  Sistem: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0',
  user: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21a8 8 0 0 1 16 0',
}

function Icon({ name }: { name: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICONS[name] ?? ICONS.Sistem} />
    </svg>
  )
}

const rail = (active: boolean) =>
  `relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    active ? 'bg-[var(--sun)] text-[var(--ink)]' : 'text-[var(--cream)] hover:bg-white/10'
  }`

function Dot({ show }: { show: boolean }) {
  if (!show) return null
  return <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-[var(--sun-bright)]" />
}

function CountBubble({ n, tone }: { n: number; tone: 'ink' | 'sun' }) {
  if (n <= 0) return null
  return (
    <span
      className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs font-semibold leading-5 ${
        tone === 'ink'
          ? 'bg-[var(--ink)] text-[var(--cream)]'
          : 'bg-[var(--sun-bright)] text-[var(--ink)]'
      }`}
    >
      {n > 99 ? '99+' : n}
    </span>
  )
}

function pickActive(pathname: string, tos: string[]) {
  let best: string | null = null
  for (const to of tos) {
    if (pathname === to || pathname.startsWith(to + '/')) {
      if (!best || to.length > best.length) best = to
    }
  }
  return best
}

const pill = (active: boolean) =>
  `rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
    active ? 'bg-[var(--sun)] text-[var(--ink)]' : 'text-[var(--cream)] hover:bg-white/10'
  }`

const item = (active: boolean) =>
  `flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm ${
    active ? 'bg-[var(--pale)] font-semibold' : 'hover:bg-[var(--pale-soft)]'
  }`

const panel =
  'absolute top-full z-10 mt-2 min-w-[220px] rounded-xl border border-[var(--rule)] bg-[var(--white)] p-1.5 text-[var(--ink)] shadow-lg'

export function AdminHeader() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetGroup, setSheetGroup] = useState<string | null>(null)
  const [railOpen, setRailOpen] = useState(false)
  const [railGroup, setRailGroup] = useState<string | null>(null)
  const barRef = useRef<HTMLElement>(null)
  const [tutorial, setTutorial] = useState<null | 'auto' | 'manual'>(null)
  const autoShown = useRef(false)

  const { data: currentAdmin } = useQuery({
    queryKey: ['current-admin'],
    queryFn: () => getCurrentAdmin(),
  })
  const isSuperadmin = !!currentAdmin?.isSuperadmin
  useSessionGuard(!!currentAdmin?.isApproved)

  useEffect(() => {
    if (!currentAdmin?.isApproved || currentAdmin.tutorialSelesaiAt || autoShown.current) return
    autoShown.current = true
    setTutorial('auto')
  }, [currentAdmin])

  const { data: counts = {} as Record<string, number> } = useQuery({
    queryKey: ['nav-counts'],
    queryFn: () => getNavCounts(),
    enabled: !!currentAdmin?.isApproved,
    refetchInterval: 60_000,
  })
  const countOf = (to: string) => counts[to] ?? 0
  const groupCount = (links: { to: string }[]) =>
    links.reduce((sum, l) => sum + countOf(l.to), 0)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setOpenMenu(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  useEffect(() => {
    setOpenMenu(null)
    setSheetOpen(false)
    setRailOpen(false)
    queryClient.invalidateQueries({ queryKey: ['nav-counts'] })
  }, [pathname, queryClient])

  async function closeTutorial() {
    const wasAuto = tutorial === 'auto'
    setTutorial(null)
    setSheetOpen(false)
    if (!wasAuto) return
    try {
      await markTutorialSeen()
      await queryClient.invalidateQueries({ queryKey: ['current-admin'] })
    } catch (e) {
      console.error('Gagal menyimpan status tutorial', e)
    }
  }

  function tourTarget(target: string | null) {
    if (!window.matchMedia('(max-width: 767px)').matches) return
    if (!target) {
      setSheetOpen(false)
      return
    }
    setSheetOpen(true)
    setSheetGroup(target.startsWith('grup-') ? target.slice(5) : null)
  }

  function openTutorial() {
    setOpenMenu(null)
    setSheetOpen(false)
    setRailOpen(false)
    setTutorial('manual')
  }

  async function handleLogout() {
    await logout()
    queryClient.clear()
    navigate({ to: '/admin/login' })
  }

  const groups = NAV.filter((g) => !g.superadminOnly || isSuperadmin)
    .map((g) => ({ ...g, links: g.links.filter((l) => !l.superadminOnly || isSuperadmin) }))
    .filter((g) => g.links.length > 0)
  const activeTo = pickActive(
    pathname,
    groups.flatMap((g) => g.links.map((l) => l.to)),
  )
  const totalCount = groups.reduce((sum, g) => sum + groupCount(g.links), 0)
  const activeGroup = groups.find((g) => g.links.some((l) => l.to === activeTo))?.label ?? null

  return (
    <>
    <header ref={barRef} className="sticky top-0 z-40 bg-[var(--ink)] text-[var(--cream)]">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <div className="flex items-center gap-6">
          <Link to="/admin" title="Dashboard" className="flex shrink-0 items-center gap-2.5">
            <img src="/icon-192.png" alt="" className="h-8 w-8 rounded-lg" />
            <span className="text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
              Biblioteka
            </span>
          </Link>

          <nav data-tour="nav" className="hidden items-center gap-1 xl:flex">
            <Link to="/admin" className={pill(pathname === '/admin')}>
              Dashboard
            </Link>
            {groups.map((group) => {
              if (group.links.length === 1) {
                const link = group.links[0]
                return (
                  <Link key={link.to} to={link.to} data-tour={`grup-${group.label}`} className={pill(activeTo === link.to)}>
                    <span className="inline-flex items-center gap-1.5">
                      {link.label}
                      <CountBubble
                        n={countOf(link.to)}
                        tone={activeTo === link.to ? 'ink' : 'sun'}
                      />
                    </span>
                  </Link>
                )
              }
              const isOpen = openMenu === group.label
              const groupActive = group.links.some((l) => l.to === activeTo)
              return (
                <div key={group.label} className="relative">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenMenu(isOpen ? null : group.label)}
                    data-tour={`grup-${group.label}`}
                    className={pill(groupActive)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {group.label}
                      <CountBubble n={groupCount(group.links)} tone={groupActive ? 'ink' : 'sun'} />
                      <Chevron className="h-3.5 w-3.5" />
                    </span>
                  </button>
                  {isOpen && (
                    <div className={`${panel} left-0`}>
                      {group.links.map((link) => (
                        <Link key={link.to} to={link.to} className={item(activeTo === link.to)}>
                          {link.label}
                          <CountBubble n={countOf(link.to)} tone="ink" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </div>

        <div className="relative ml-auto hidden xl:block">
          <button
            type="button"
            aria-expanded={openMenu === 'user'}
            onClick={() => setOpenMenu(openMenu === 'user' ? null : 'user')}
            data-tour="user"
            className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm hover:bg-white/10"
          >
            <span className="whitespace-nowrap">{currentAdmin?.nama ?? '...'}</span>
            {currentAdmin && <PeranBadge admin={currentAdmin} onDark />}
            <Chevron className="h-3.5 w-3.5" />
          </button>
          {openMenu === 'user' && (
            <div className={`${panel} right-0`}>
              <Link to="/admin/profile" className={item(pathname === '/admin/profile')}>
                Profil Saya
              </Link>
              <button type="button" onClick={openTutorial} className={`${item(false)} w-full text-left`}>
                Tutorial
              </button>
              <button type="button" onClick={handleLogout} className={`${item(false)} w-full text-left`}>
                Keluar
              </button>
            </div>
          )}
        </div>

        <div className="ml-auto mr-3 xl:hidden">
          <AdminClock onDark />
        </div>

        <button
          type="button"
          aria-label="Buka menu"
          data-tour="nav"
          onClick={() => {
            setSheetGroup(activeGroup)
            setSheetOpen(true)
          }}
          className="rounded-full border border-white/30 px-3 py-1.5 text-sm md:hidden"
        >
          <span className="inline-flex items-center gap-1.5">
            Menu
            <CountBubble n={totalCount} tone="sun" />
          </span>
        </button>
      </div>

      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className={`sheet-in relative mt-auto w-full overflow-y-auto rounded-t-2xl bg-[var(--white)] p-5 text-[var(--ink)] ${
              tutorial ? 'max-h-[50vh]' : 'max-h-[85vh]'
            }`}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span className="whitespace-nowrap">{currentAdmin?.nama ?? '...'}</span>
                {currentAdmin && <PeranBadge admin={currentAdmin} />}
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="rounded-full border border-[var(--rule)] px-3 py-1 text-sm"
              >
                Tutup
              </button>
            </div>
            <p className="mb-2 px-3 text-xs">
              <SessionCountdown light className="text-[var(--muted)]" />
            </p>
            <Link to="/admin" className={item(pathname === '/admin')}>
              Dashboard
            </Link>
            {groups.map((group) => {
              if (group.links.length === 1) {
                const link = group.links[0]
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    data-tour={`grup-${group.label}`}
                    className={`${item(activeTo === link.to)} mt-1`}
                  >
                    {link.label}
                    <CountBubble n={countOf(link.to)} tone="ink" />
                  </Link>
                )
              }
              const open = sheetGroup === group.label
              return (
                <div key={group.label} data-tour={`grup-${group.label}`} className="mt-1">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setSheetGroup(open ? null : group.label)}
                    className={`${item(false)} w-full text-left font-semibold`}
                  >
                    <span className="inline-flex items-center gap-2">
                      {group.label}
                      {!open && <CountBubble n={groupCount(group.links)} tone="ink" />}
                    </span>
                    <Chevron className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && (
                    <div className="ml-3 border-l border-[var(--rule)] pl-2">
                      {group.links.map((link) => (
                        <Link key={link.to} to={link.to} className={item(activeTo === link.to)}>
                          {link.label}
                          <CountBubble n={countOf(link.to)} tone="ink" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            <div data-tour="user" className="mt-3 border-t border-[var(--rule)] pt-2">
              <Link to="/admin/profile" className={item(pathname === '/admin/profile')}>
                Profil Saya
              </Link>
              <button type="button" onClick={openTutorial} className={`${item(false)} w-full text-left`}>
                Tutorial
              </button>
              <button type="button" onClick={handleLogout} className={`${item(false)} w-full text-left`}>
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}
      {railOpen && (
        <button
          type="button"
          aria-label="Tutup menu samping"
          onClick={() => setRailOpen(false)}
          className="fixed inset-0 z-20 hidden bg-black/30 md:block xl:hidden"
        />
      )}
      <aside
        className={`fixed bottom-0 left-0 top-14 z-30 hidden flex-col gap-1 overflow-y-auto bg-[var(--ink)] p-2 text-[var(--cream)] transition-[width] duration-200 md:flex xl:hidden ${
          railOpen ? 'w-64 shadow-2xl' : 'w-16'
        }`}
      >
        <button
          type="button"
          aria-label={railOpen ? 'Ciutkan menu' : 'Buka menu'}
          data-tour="nav"
          onClick={() => {
            setRailGroup(activeGroup)
            setRailOpen((o) => !o)
          }}
          className={rail(false)}
        >
          <Icon name="menu" />
          {railOpen && <span>Menu</span>}
        </button>
        <Link to="/admin" title="Dashboard" className={rail(pathname === '/admin')}>
          <Icon name="Dashboard" />
          {railOpen && <span>Dashboard</span>}
        </Link>
        {groups.map((group) => {
          if (group.links.length === 1) {
            const link = group.links[0]
            return (
              <Link
                key={link.to}
                to={link.to}
                title={link.label}
                data-tour={`grup-${group.label}`}
                className={rail(activeTo === link.to)}
              >
                <Icon name={group.label} />
                {railOpen && <span className="flex-1">{link.label}</span>}
                {railOpen ? (
                  <CountBubble n={countOf(link.to)} tone="sun" />
                ) : (
                  <Dot show={countOf(link.to) > 0} />
                )}
              </Link>
            )
          }
          const open = railOpen && railGroup === group.label
          const groupActive = group.links.some((l) => l.to === activeTo)
          return (
            <div key={group.label} data-tour={`grup-${group.label}`}>
              <button
                type="button"
                title={group.label}
                aria-expanded={open}
                onClick={() => {
                  if (!railOpen) {
                    setRailOpen(true)
                    setRailGroup(group.label)
                  } else {
                    setRailGroup(open ? null : group.label)
                  }
                }}
                className={`${rail(groupActive && !open)} w-full text-left`}
              >
                <Icon name={group.label} />
                {railOpen ? (
                  <>
                    <span className="flex-1">{group.label}</span>
                    {!open && <CountBubble n={groupCount(group.links)} tone="sun" />}
                    <Chevron className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </>
                ) : (
                  <Dot show={groupCount(group.links) > 0} />
                )}
              </button>
              {open && (
                <div className="ml-5 border-l border-white/20 pl-2">
                  {group.links.map((link) => (
                    <Link key={link.to} to={link.to} className={rail(activeTo === link.to)}>
                      <span className="flex-1">{link.label}</span>
                      <CountBubble n={countOf(link.to)} tone="sun" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        <div data-tour="user" className="mt-auto border-t border-white/20 pt-2">
          {railOpen ? (
            <>
              <div className="flex items-center gap-2 px-3 pb-2 text-sm">
                <span className="whitespace-nowrap">{currentAdmin?.nama ?? '...'}</span>
                {currentAdmin && <PeranBadge admin={currentAdmin} onDark />}
              </div>
              <Link to="/admin/profile" className={rail(pathname === '/admin/profile')}>
                Profil Saya
              </Link>
              <button type="button" onClick={openTutorial} className={`${rail(false)} w-full text-left`}>
                Tutorial
              </button>
              <button type="button" onClick={handleLogout} className={`${rail(false)} w-full text-left`}>
                Keluar
              </button>
            </>
          ) : (
            <button
              type="button"
              title="Akun"
              onClick={() => {
                setRailGroup(null)
                setRailOpen(true)
              }}
              className={`${rail(false)} w-full`}
            >
              <Icon name="user" />
            </button>
          )}
        </div>
      </aside>
      {tutorial && currentAdmin && (
        <Tutorial
          who={currentAdmin}
          manual={tutorial === 'manual'}
          onClose={closeTutorial}
          onTarget={tourTarget}
        />
      )}
    </header>
    <AdminClockStrip />
    </>
  )
}

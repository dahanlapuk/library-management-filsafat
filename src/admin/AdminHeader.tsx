import { Chevron } from '../components/ui/Chevron'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getCurrentAdmin, logout } from './auth'
import { PeranBadge } from './PeranBadge'
import { getNavCounts } from './nav-counts'

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
  const barRef = useRef<HTMLElement>(null)

  const { data: currentAdmin } = useQuery({
    queryKey: ['current-admin'],
    queryFn: () => getCurrentAdmin(),
  })
  const isSuperadmin = !!currentAdmin?.isSuperadmin

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
    queryClient.invalidateQueries({ queryKey: ['nav-counts'] })
  }, [pathname, queryClient])

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

  return (
    <header ref={barRef} className="sticky top-0 z-40 bg-[var(--ink)] text-[var(--cream)]">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <div className="flex items-center gap-6">
          <Link to="/admin" title="Dashboard" className="flex shrink-0 items-center gap-2.5">
            <img src="/icon-192.png" alt="" className="h-8 w-8 rounded-lg" />
            <span className="text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
              Biblioteka
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <Link to="/admin" className={pill(pathname === '/admin')}>
              Dashboard
            </Link>
            {groups.map((group) => {
              if (group.links.length === 1) {
                const link = group.links[0]
                return (
                  <Link key={link.to} to={link.to} className={pill(activeTo === link.to)}>
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

        <div className="relative hidden md:block">
          <button
            type="button"
            aria-expanded={openMenu === 'user'}
            onClick={() => setOpenMenu(openMenu === 'user' ? null : 'user')}
            className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm hover:bg-white/10"
          >
            <span>{currentAdmin?.nama ?? '...'}</span>
            {currentAdmin && <PeranBadge admin={currentAdmin} onDark />}
            <Chevron className="h-3.5 w-3.5" />
          </button>
          {openMenu === 'user' && (
            <div className={`${panel} right-0`}>
              <Link to="/admin/profile" className={item(pathname === '/admin/profile')}>
                Profil Saya
              </Link>
              <button type="button" onClick={handleLogout} className={`${item(false)} w-full text-left`}>
                Keluar
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          aria-label="Buka menu"
          onClick={() => setSheetOpen(true)}
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
          <div className="sheet-in relative mt-auto max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-[var(--white)] p-5 text-[var(--ink)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span>{currentAdmin?.nama ?? '...'}</span>
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
            <Link to="/admin" className={item(pathname === '/admin')}>
              Dashboard
            </Link>
            {groups.map((group) => (
              <div key={group.label} className="mt-4">
                <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {group.label}
                </p>
                {group.links.map((link) => (
                  <Link key={link.to} to={link.to} className={item(activeTo === link.to)}>
                    {link.label}
                    <CountBubble n={countOf(link.to)} tone="ink" />
                  </Link>
                ))}
              </div>
            ))}
            <div className="mt-4 border-t border-[var(--rule)] pt-3">
              <Link to="/admin/profile" className={item(pathname === '/admin/profile')}>
                Profil Saya
              </Link>
              <button type="button" onClick={handleLogout} className={`${item(false)} w-full text-left`}>
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

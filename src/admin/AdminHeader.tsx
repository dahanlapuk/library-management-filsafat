import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getCurrentAdmin, logout } from './auth'

type NavLink = { to: string; label: string; superadminOnly?: boolean }
type NavGroup = { label: string; links: NavLink[] }

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Buku',
    links: [
      { to: '/admin/books', label: 'Kelola Buku' },
      { to: '/admin/books/category-requests', label: 'Pengajuan Kategori', superadminOnly: true },
      { to: '/admin/books/delete-requests', label: 'Pengajuan Hapus', superadminOnly: true },
    ],
  },
  {
    label: 'Peminjaman',
    links: [
      { to: '/admin/loans/requests', label: 'Pengajuan Peminjaman' },
      { to: '/admin/members', label: 'Data Anggota' },
    ],
  },
  {
    label: 'Kelola',
    links: [
      { to: '/admin/inventory', label: 'Inventory Check' },
      { to: '/admin/approvals', label: 'Approval Admin', superadminOnly: true },
      { to: '/admin/activity', label: 'Activity Log', superadminOnly: true },
    ],
  },
]

export function AdminHeader() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const navRef = useRef<HTMLElement>(null)

  const { data: currentAdmin } = useQuery({
    queryKey: ['current-admin'],
    queryFn: () => getCurrentAdmin(),
  })

  // Tutup dropdown yang lagi kebuka begitu klik di luar area nav, atau
  // begitu pindah halaman (route berubah).
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenGroup(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setOpenGroup(null)
  }, [pathname])

  async function handleLogout() {
    await logout()
    queryClient.clear()
    navigate({ to: '/admin/login' })
  }

  const isSuperadmin = currentAdmin?.isSuperadmin

  return (
    <div className="mb-6 bg-[var(--black)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-5">
          <Link
            to="/admin"
            title="Perpustakaan Departemen Filsafat"
            className="flex shrink-0 items-center"
          >
            <img
              src="/favicon.svg"
              alt="Perpustakaan Departemen Filsafat"
              className="h-8 w-8 rounded"
            />
          </Link>

          <nav ref={navRef} className="flex flex-wrap items-center gap-4">
            <Link
              to="/admin"
              className={`text-xs font-semibold uppercase tracking-wide ${
                pathname === '/admin' ? 'text-[var(--accent)]' : 'text-[var(--white)]'
              }`}
            >
              Dashboard
            </Link>

            {NAV_GROUPS.map((group) => {
              const visibleLinks = group.links.filter(
                (link) => !link.superadminOnly || isSuperadmin,
              )
              if (visibleLinks.length === 0) return null

              if (visibleLinks.length === 1) {
                const link = visibleLinks[0]
                const isActive = pathname.startsWith(link.to)
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`text-xs font-semibold uppercase tracking-wide ${
                      isActive ? 'text-[var(--accent)]' : 'text-[var(--white)]'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              }

              const isGroupActive = visibleLinks.some((link) => pathname.startsWith(link.to))
              const isOpen = openGroup === group.label

              return (
                <div key={group.label} className="relative">
                    <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      setOpenGroup(isOpen ? null : group.label)
                    }}
                    className={`text-xs font-semibold uppercase tracking-wide ${
                      isGroupActive ? 'text-[var(--accent)]' : 'text-[var(--white)]'
                    }`}
                  >
                    {group.label} ▾
                  </a>
                  {isOpen && (
                    <div className="absolute left-0 z-10 mt-2 min-w-[200px] border-2 border-[var(--black)] bg-[var(--white)]">
                      {visibleLinks.map((link) => {
                        const isActive = pathname.startsWith(link.to)
                        return (
                          <Link
                            key={link.to}
                            to={link.to}
                            className={`block px-4 py-2 text-xs font-medium uppercase tracking-wide ${
                              isActive
                                ? 'bg-[var(--accent)] text-[var(--black)]'
                                : 'text-[var(--text-primary)] hover:bg-[var(--gray-100)]'
                            }`}
                          >
                            {link.label}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <Link to="/admin/profile" className="text-[var(--gray-200)] underline">
            {currentAdmin?.nama ?? '...'}
          </Link>
          {isSuperadmin && (
            <span className="inline-block bg-[var(--accent)] px-2 py-0.5 text-xs font-semibold text-[var(--black)]">
              Superadmin
            </span>
          )}
          <button onClick={handleLogout} className="text-[var(--white)] underline">
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}

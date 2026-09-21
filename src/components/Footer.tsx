import { Link, useRouterState } from '@tanstack/react-router'

export function Footer() {
  const year = new Date().getFullYear()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isAdminArea = pathname.startsWith('/admin')

  return (
    <footer className="mt-12 bg-[var(--black)] text-[var(--white)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:flex-row sm:justify-between">
        <div className="max-w-sm">
          <p className="text-sm font-bold uppercase tracking-[0.15em]">
            Perpustakaan Departemen <span className="text-[var(--accent)]">Filsafat</span>
          </p>
          <p className="mt-2 text-xs opacity-70">
            Koleksi buku Departemen Filsafat, Fakultas Ilmu Pengetahuan Budaya,
            Universitas Indonesia.
          </p>
        </div>

        <nav className="flex flex-col gap-2 text-xs">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--accent)]">
            Menu
          </p>
          <Link to="/" className="hover:underline">
            Katalog buku
          </Link>
          {!isAdminArea && (
            <Link to="/admin/login" className="hover:underline">
              Masuk sebagai admin
            </Link>
          )}
        </nav>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span className="opacity-70">
            © {year} Perpustakaan Departemen Filsafat FIB UI
          </span>
          <span>
            Created by{' '}
            <a href="https://www.linkedin.com/in/itbamuhammad/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[var(--accent)] hover:underline"
            >
              Hexadev Technologies
            </a>
          </span>
        </div>
      </div>
    </footer>
  )
}

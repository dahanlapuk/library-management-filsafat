import { Link, useRouterState } from '@tanstack/react-router'

export function Footer() {
  const year = new Date().getFullYear()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isAdminArea = pathname.startsWith('/admin')

  return (
    <footer className="mt-12 rounded-t-3xl bg-[var(--black)] text-[var(--white)]">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-5 py-8 sm:px-8 sm:flex-row sm:justify-between">
        <div className="max-w-sm">
          <p className="font-[var(--font-heading)] text-base font-semibold">
            Biblioteka Departemen <span className="text-[var(--accent)]">Filsafat</span> UI
          </p>
          <p className="mt-2 text-xs opacity-70">
            Koleksi Buku Departemen Filsafat, Fakultas Ilmu Pengetahuan Budaya,
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
          <a
            href="https://filsafatui.app"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Departemen Filsafat UI
          </a>
          <Link to="/informasi" className="hover:underline">
            Informasi Biblioteka Filsafat UI
          </Link>
          <Link to="/feedback" className="hover:underline">
            Kirim feedback
          </Link>
          <Link to="/changelog" className="hover:underline">
            Changelog
          </Link>
          {!isAdminArea && (
            <Link to="/admin/login" className="hover:underline">
              Masuk sebagai admin
            </Link>
          )}
        </nav>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-1 px-5 py-4 sm:px-8 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span className="opacity-70">
            © {year} Biblioteka Departemen Filsafat UI
          </span>
          <span>
            Created by{' '}
            <a
              href="https://crkstudio.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[var(--accent)] hover:underline"
            >
              crkstudio
            </a>
          </span>
        </div>
      </div>
    </footer>
  )
}

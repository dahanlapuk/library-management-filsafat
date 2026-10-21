import type { ReactNode } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { SessionCountdown } from '../admin/SessionClock'

const linkClass = 'block py-1.5 text-[13px] opacity-90 transition-opacity hover:underline hover:opacity-100'

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--accent)]">{title}</p>
      <ul>{children}</ul>
    </div>
  )
}

export function Footer() {
  const year = new Date().getFullYear()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isAdminArea = pathname.startsWith('/admin')

  return (
    <footer
      className={`mt-12 rounded-t-3xl bg-[var(--black)] text-[var(--white)] ${
        isAdminArea ? 'md:pl-16 xl:pl-0' : ''
      }`}
    >
      <div className="mx-auto grid max-w-[1280px] gap-7 px-5 pb-5 pt-7 sm:px-8 sm:pt-8 md:grid-cols-[1.2fr_1fr] md:gap-10">
        <div className="max-w-sm">
          <p className="text-base font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
            Biblioteka Departemen <span className="text-[var(--accent)]">Filsafat</span> UI
          </p>
          <p className="mt-2 text-xs leading-relaxed opacity-70">
            Koleksi buku Departemen Filsafat, Fakultas Ilmu Pengetahuan Budaya, Universitas Indonesia.
          </p>
          <p lang="la" className="mt-4 text-lg text-[var(--accent)]" style={{ fontFamily: 'var(--font-heading)' }}>
            Viva Philosophia!
          </p>
        </div>

        <nav className="grid max-w-md grid-cols-2 gap-x-8 gap-y-5">
          <Group title="Jelajahi">
            <li>
              <Link to="/" className={linkClass}>
                Katalog buku
              </Link>
            </li>
            <li>
              <Link to="/informasi" className={linkClass}>
                Informasi
              </Link>
            </li>
          </Group>
          <Group title="Masukan">
            <li>
              <Link to="/feedback" className={linkClass}>
                Kirim feedback
              </Link>
            </li>
            <li>
              <Link to="/changelog" className={linkClass}>
                Changelog
              </Link>
            </li>
          </Group>
          <Group title="Departemen">
            <li>
              <a
                href="https://filsafatui.app"
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                Situs Departemen
              </a>
            </li>
          </Group>
          <Group title="Admin">
            <li>
              <Link to="/admin/login" className={linkClass}>
                Masuk admin
              </Link>
            </li>
          </Group>
        </nav>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3 sm:px-8">
          <span className="text-[11px] opacity-60">© {year} Departemen Filsafat Universitas Indonesia</span>
          {isAdminArea && (
            <span className="hidden md:inline">
              <SessionCountdown className="text-[11px] opacity-60" />
            </span>
          )}
          <span className="text-[10px] opacity-40">
            Dibuat oleh{' '}
            <a
              href="https://crkstudio.com"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-opacity hover:underline hover:opacity-100"
            >
              crkstudio
            </a>
          </span>
        </div>
      </div>
    </footer>
  )
}

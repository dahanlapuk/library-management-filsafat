import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'

const linkClass = 'block py-1.5 text-[13px] opacity-90 transition-opacity hover:underline hover:opacity-100'

function Group({ title, className = '', children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--accent)]">{title}</p>
      <ul>{children}</ul>
    </div>
  )
}

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-12 rounded-t-3xl bg-[var(--black)] text-[var(--white)]">
      <div className="mx-auto grid max-w-[1280px] gap-7 px-5 pb-5 pt-7 sm:px-8 sm:pt-8 md:grid-cols-[1.3fr_2fr] md:gap-10">
        <div className="max-w-sm">
          <p className="text-base font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
            Biblioteka Departemen <span className="text-[var(--accent)]">Filsafat</span> UI
          </p>
          <p className="mt-2 text-xs leading-relaxed opacity-70">
            Koleksi buku Departemen Filsafat, Fakultas Ilmu Pengetahuan Budaya, Universitas Indonesia.
          </p>
        </div>

        <nav className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
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
          <Group title="Departemen" className="col-span-2 sm:col-span-1">
            <li>
              <a
                href="https://filsafatui.app"
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                Situs Departemen Filsafat UI
              </a>
            </li>
          </Group>
        </nav>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3 text-[11px] sm:px-8">
          <span className="opacity-60">© {year} Departemen Filsafat UI</span>
          <Link to="/admin/login" className="opacity-60 hover:underline hover:opacity-100">
            Masuk admin
          </Link>
          <a
            href="https://crkstudio.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full text-[10px] opacity-40 transition-opacity hover:opacity-80 sm:w-auto"
          >
            Created by crkstudio
          </a>
        </div>
      </div>
    </footer>
  )
}

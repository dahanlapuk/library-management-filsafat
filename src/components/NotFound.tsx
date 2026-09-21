import { Link } from '@tanstack/react-router'

export function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-6xl font-bold text-[var(--accent)]">404</p>
      <h1 className="text-lg font-bold uppercase tracking-[0.15em]">Halaman tidak ditemukan</h1>
      <p className="text-sm">Alamat yang kamu buka tidak ada atau sudah dipindahkan.</p>
      <Link
        to="/"
        className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)] underline"
      >
        Kembali ke katalog
      </Link>
    </div>
  )
}

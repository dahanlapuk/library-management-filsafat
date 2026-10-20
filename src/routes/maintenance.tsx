import { createFileRoute } from '@tanstack/react-router'
import { getMaintenanceMode } from '../lib/maintenance'

export const Route = createFileRoute('/maintenance')({
  loader: () => getMaintenanceMode(),
  component: MaintenancePage,
})

const TEETH = Array.from({ length: 8 }, (_, i) => i * 45)

function Gear({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={className}>
      <g fill="var(--ink)">
        {TEETH.map((deg) => (
          <rect key={deg} x="42" y="4" width="16" height="22" rx="3" transform={`rotate(${deg} 50 50)`} />
        ))}
        <circle cx="50" cy="50" r="34" />
      </g>
      <circle cx="50" cy="50" r="14" fill="var(--sun-bright)" />
    </svg>
  )
}

function MaintenancePage() {
  const mode = Route.useLoaderData()
  const isCatalog = mode === 'catalog'

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--cream)] px-6 py-10 text-center">
      <style>{`
        @keyframes hazard-slide { to { background-position: 56px 0; } }
        .hazard-bar { animation: hazard-slide 2.4s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .hazard-bar { animation: none; } }
      `}</style>
      <div className="w-full max-w-md">
        <div className="relative mx-auto mb-6 h-28 w-40">
          <Gear className="absolute left-2 top-2 h-20 w-20 animate-spin [animation-duration:10s] motion-reduce:animate-none" />
          <Gear className="absolute bottom-0 right-3 h-14 w-14 animate-spin [animation-direction:reverse] [animation-duration:7s] motion-reduce:animate-none" />
        </div>

        <div
          aria-hidden
          className="hazard-bar mb-6 h-3 rounded-full border border-[var(--ink)]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(-45deg, var(--sun-bright) 0 14px, var(--ink) 14px 28px)',
            backgroundSize: '56px 100%',
          }}
        />

        <h1 className="mb-3 text-2xl font-semibold sm:text-3xl" style={{ fontFamily: 'var(--font-heading)' }}>
          {isCatalog ? 'Pembaruan & Perbaikan Data' : 'Pemeliharaan Sistem Berkala'}
        </h1>

        <p className="text-sm text-[var(--muted)]">
          {isCatalog
            ? 'Kami sedang melakukan validasi dan pembaruan data agar informasi yang disajikan selalu akurat dan mutakhir. Akses data akan segera normal kembali dalam beberapa saat. Mohon maaf atas ketidaknyamanannya.'
            : 'Saat ini sistem sedang dalam perbaikan rutin agar dapat memberikan pelayanan yang lebih optimal dan lancar. Akses akan segera dibuka kembali secara bertahap. Mohon maaf atas ketidaknyamanan ini.'}
        </p>
      </div>
    </div>
  )
}

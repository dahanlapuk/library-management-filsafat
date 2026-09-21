import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/maintenance')({
  component: MaintenancePage,
})

function MaintenancePage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-8 text-center">
      <div className="max-w-md">
        <h1 className="mb-2 text-2xl font-semibold">Sedang Pemeliharaan</h1>
        <p className="text-slate-400">
          Katalog perpustakaan sedang dalam pemeliharaan singkat untuk
          perpindahan sistem. Silakan coba lagi dalam beberapa saat.
        </p>
      </div>
    </div>
  )
}

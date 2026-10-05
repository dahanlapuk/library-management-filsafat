import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { AdminHeader } from '../../admin/AdminHeader'
import { getCurrentAdmin } from '../../admin/auth'
import {
  getMaintenanceOverview,
  requestMaintenance,
  approveMaintenanceRequest,
  rejectMaintenanceRequest,
  endMaintenance,
} from '../../admin/maintenance'

export const Route = createFileRoute('/admin/maintenance')({
  component: AdminMaintenancePage,
})

const STATUS_LABEL = {
  pending: 'Menunggu persetujuan',
  active: 'Aktif',
  rejected: 'Ditolak',
  ended: 'Selesai',
} as const

function formatWaktu(value: string | Date | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function AdminMaintenancePage() {
  const queryClient = useQueryClient()
  const [alasan, setAlasan] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const { data: currentAdmin } = useQuery({
    queryKey: ['current-admin'],
    queryFn: () => getCurrentAdmin(),
  })
  const isSuperadmin = !!currentAdmin?.isSuperadmin

  const {
    data,
    isLoading,
    error: loadError,
  } = useQuery({
    queryKey: ['admin-maintenance'],
    queryFn: () => getMaintenanceOverview(),
  })

  const rows = data?.rows ?? []
  const active = rows.find((r) => r.status === 'active')
  const pending = rows.find((r) => r.status === 'pending')

  async function run(action: () => Promise<unknown>, fallback: string) {
    setError('')
    setBusy(true)
    try {
      await action()
      await queryClient.invalidateQueries({ queryKey: ['admin-maintenance'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback)
    } finally {
      setBusy(false)
    }
  }

  async function handleSubmit() {
    if (isSuperadmin && !window.confirm('Katalog publik akan ditutup sekarang. Lanjutkan?')) {
      return
    }
    await run(async () => {
      await requestMaintenance({ data: { alasan } })
      setAlasan('')
    }, 'Gagal mengajukan maintenance.')
  }

  async function handleApprove(id: number) {
    if (!window.confirm('Setujui pengajuan? Katalog publik akan ditutup sekarang.')) return
    await run(() => approveMaintenanceRequest({ data: { id } }), 'Gagal menyetujui pengajuan.')
  }

  async function handleReject(id: number) {
    if (!window.confirm('Tolak pengajuan maintenance ini?')) return
    await run(() => rejectMaintenanceRequest({ data: { id } }), 'Gagal menolak pengajuan.')
  }

  async function handleEnd(id: number) {
    if (!window.confirm('Akhiri maintenance? Katalog publik akan dibuka kembali.')) return
    await run(() => endMaintenance({ data: { id } }), 'Gagal mengakhiri maintenance.')
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] p-5">
      <div className="w-full max-w-6xl mx-auto">
        <AdminHeader />

        <h1 className="mb-6 text-2xl font-semibold tracking-[0.05em] text-[var(--text-primary)]">
          Maintenance Katalog
        </h1>

        {(error || loadError) && (
          <div className="p-3 mb-4 bg-[#fee] border border-[#fcc] text-[#c00]">
            {error || 'Gagal memuat status maintenance.'}
          </div>
        )}

        {data?.envFull && (
          <div className="p-3 mb-4 border-2 border-[#c00] text-[#c00]">
            Mode penuh sedang aktif lewat pengaturan server (MAINTENANCE_MODE). Seluruh
            situs, termasuk halaman admin, ditutup sampai pengaturan itu dimatikan.
          </div>
        )}

        <div className="mb-6 bg-[var(--white)] border-2 border-[var(--black)] p-4">
          {isLoading ? (
            <p>Memuat...</p>
          ) : active ? (
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-[#c00]">
                Katalog publik sedang ditutup
              </span>
              <span className="text-sm text-[var(--gray-600)]">
                Sejak {formatWaktu(active.startedAt)} · diaktifkan oleh{' '}
                {active.reviewedByNama ?? active.requestedByNama ?? '-'}
              </span>
              <span className="text-sm text-[var(--text-primary)]">Alasan: {active.alasan}</span>
              <span className="text-sm text-[var(--gray-600)]">
                Halaman admin tetap bisa dipakai selama mode ini aktif.
              </span>
              {isSuperadmin && (
                <div>
                  <button
                    onClick={() => handleEnd(active.id)}
                    disabled={busy}
                    className="mt-2 px-3 py-2 border-2 border-[var(--black)] text-sm font-medium uppercase tracking-wide disabled:opacity-50"
                  >
                    {busy ? '...' : 'Akhiri maintenance'}
                  </button>
                </div>
              )}
            </div>
          ) : pending ? (
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-[var(--text-primary)]">
                Pengajuan menunggu persetujuan superadmin
              </span>
              <span className="text-sm text-[var(--gray-600)]">
                Diajukan oleh {pending.requestedByNama ?? '-'} · {formatWaktu(pending.createdAt)}
              </span>
              <span className="text-sm text-[var(--text-primary)]">Alasan: {pending.alasan}</span>
              {isSuperadmin && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleApprove(pending.id)}
                    disabled={busy}
                    className="px-3 py-2 border-2 border-[#c00] text-[#c00] text-sm font-medium uppercase tracking-wide hover:bg-[#fee] disabled:opacity-50"
                  >
                    {busy ? '...' : 'Setujui'}
                  </button>
                  <button
                    onClick={() => handleReject(pending.id)}
                    disabled={busy}
                    className="px-3 py-2 border-2 border-[var(--gray-600)] text-[var(--gray-600)] text-sm font-medium uppercase tracking-wide hover:bg-[var(--gray-100)] disabled:opacity-50"
                  >
                    {busy ? '...' : 'Tolak'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <span className="font-semibold text-[var(--text-primary)]">
                Tidak ada maintenance yang aktif
              </span>
              <span className="text-sm text-[var(--gray-600)]">
                {isSuperadmin
                  ? 'Mengaktifkan akan langsung menutup katalog publik. Halaman admin tetap bisa dipakai.'
                  : 'Pengajuanmu perlu disetujui superadmin sebelum katalog publik ditutup.'}
              </span>
              <textarea
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
                placeholder="Alasan (minimal 5 karakter), misalnya: penataan ulang kategori"
                rows={3}
                className="w-full border border-[var(--gray-200)] px-3 py-2 text-sm"
              />
              <div>
                <button
                  onClick={handleSubmit}
                  disabled={busy || alasan.trim().length < 5}
                  className="px-3 py-2 border-2 border-[var(--black)] text-sm font-medium uppercase tracking-wide disabled:opacity-50"
                >
                  {busy ? '...' : isSuperadmin ? 'Aktifkan maintenance katalog' : 'Ajukan maintenance katalog'}
                </button>
              </div>
            </div>
          )}
        </div>

        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--gray-600)]">
          Riwayat
        </h2>
        <div className="bg-[var(--white)] border-2 border-[var(--black)]">
          {rows.length === 0 ? (
            <p className="text-center py-6 text-[var(--gray-600)]">Belum ada riwayat.</p>
          ) : (
            rows.map((r) => (
              <div
                key={r.id}
                className="flex flex-col gap-1 p-4 border-b border-[var(--gray-200)] last:border-b-0"
              >
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {STATUS_LABEL[r.status]} · {r.alasan}
                </span>
                <span className="text-xs text-[var(--gray-600)]">
                  Diajukan {r.requestedByNama ?? '-'} ({formatWaktu(r.createdAt)})
                  {r.reviewedByNama ? ` · ditinjau ${r.reviewedByNama}` : ''}
                  {r.endedAt ? ` · selesai ${formatWaktu(r.endedAt)} oleh ${r.endedByNama ?? '-'}` : ''}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

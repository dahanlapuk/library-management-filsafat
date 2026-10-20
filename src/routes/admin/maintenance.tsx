import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { AdminPage } from '../../components/ui/AdminPage'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Textarea } from '../../components/ui/Field'
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

  const panel =
    'rounded-xl border border-[var(--rule)] bg-[var(--white)] p-4 shadow-[0_1px_2px_rgba(24,22,0,0.05)]'

  return (
    <AdminPage>
      <h1
        className="mb-5 text-2xl font-semibold sm:text-3xl"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        Maintenance Katalog
      </h1>

      {(error || loadError) && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error || 'Gagal memuat status maintenance.'}
        </div>
      )}

      {data?.envFull && (
        <div className="mb-4 rounded-lg border-2 border-red-600 bg-red-50 p-3 text-sm text-red-700">
          Mode penuh sedang aktif lewat pengaturan server (MAINTENANCE_MODE). Seluruh
          situs, termasuk halaman admin, ditutup sampai pengaturan itu dimatikan.
        </div>
      )}

      <div
        className={`mb-8 ${
          active
            ? 'rounded-xl border border-red-200 bg-red-50 p-4'
            : panel
        }`}
      >
        {isLoading ? (
          <p className="text-sm text-[var(--muted)]">Memuat...</p>
        ) : active ? (
          <div className="flex flex-col gap-2">
            <div>
              <Badge tone="solid">Katalog ditutup</Badge>
            </div>
            <span className="text-sm text-[var(--muted)]">
              Sejak {formatWaktu(active.startedAt)} · diaktifkan oleh{' '}
              {active.reviewedByNama ?? active.requestedByNama ?? '-'}
            </span>
            <span className="break-words text-sm">Alasan: {active.alasan}</span>
            <span className="text-xs text-[var(--muted)]">
              Halaman admin tetap bisa dipakai selama mode ini aktif.
            </span>
            {isSuperadmin && (
              <div className="mt-1">
                <Button variant="accent" onClick={() => handleEnd(active.id)} disabled={busy}>
                  {busy ? '...' : 'Akhiri maintenance'}
                </Button>
              </div>
            )}
          </div>
        ) : pending ? (
          <div className="flex flex-col gap-2">
            <div>
              <Badge tone="soft">Menunggu persetujuan superadmin</Badge>
            </div>
            <span className="text-sm text-[var(--muted)]">
              Diajukan oleh {pending.requestedByNama ?? '-'} · {formatWaktu(pending.createdAt)}
            </span>
            <span className="break-words text-sm">Alasan: {pending.alasan}</span>
            {isSuperadmin && (
              <div className="mt-1 flex flex-wrap gap-2">
                <Button
                  variant="danger"
                  onClick={() => handleApprove(pending.id)}
                  disabled={busy}
                >
                  {busy ? '...' : 'Setujui'}
                </Button>
                <Button
                  variant="quiet"
                  onClick={() => handleReject(pending.id)}
                  disabled={busy}
                >
                  {busy ? '...' : 'Tolak'}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <span className="font-semibold">Tidak ada maintenance yang aktif</span>
            <span className="text-sm text-[var(--muted)]">
              {isSuperadmin
                ? 'Mengaktifkan akan langsung menutup katalog publik. Halaman admin tetap bisa dipakai.'
                : 'Pengajuanmu perlu disetujui superadmin sebelum katalog publik ditutup.'}
            </span>
            <Textarea
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder="Alasan (minimal 5 karakter), misalnya: penataan ulang kategori"
              rows={3}
              className="w-full"
            />
            <div>
              <Button
                variant={isSuperadmin ? 'danger' : 'accent'}
                onClick={handleSubmit}
                disabled={busy || alasan.trim().length < 5}
              >
                {busy
                  ? '...'
                  : isSuperadmin
                    ? 'Aktifkan maintenance katalog'
                    : 'Ajukan maintenance katalog'}
              </Button>
            </div>
          </div>
        )}
      </div>

      <h2
        className="mb-3 text-xl font-semibold"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        Riwayat
      </h2>
      <div className="overflow-hidden rounded-xl border border-[var(--rule)] bg-[var(--white)] shadow-[0_1px_2px_rgba(24,22,0,0.05)]">
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">Belum ada riwayat.</p>
        ) : (
          rows.map((r) => (
            <div
              key={r.id}
              className="flex flex-col gap-1.5 border-b border-[var(--rule)] p-4 last:border-b-0"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  tone={r.status === 'active' ? 'solid' : r.status === 'pending' ? 'soft' : 'neutral'}
                >
                  {STATUS_LABEL[r.status]}
                </Badge>
                <span className="break-words text-sm font-medium">{r.alasan}</span>
              </div>
              <span className="break-words text-xs text-[var(--muted)]">
                Diajukan {r.requestedByNama ?? '-'} ({formatWaktu(r.createdAt)})
                {r.reviewedByNama ? ` · ditinjau ${r.reviewedByNama}` : ''}
                {r.endedAt
                  ? ` · selesai ${formatWaktu(r.endedAt)} oleh ${r.endedByNama ?? '-'}`
                  : ''}
              </span>
            </div>
          ))
        )}
      </div>
    </AdminPage>
  )
}

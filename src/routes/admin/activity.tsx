import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { getCurrentAdmin } from '../../admin/auth'
import { getActivityLogs } from '../../admin/activity-log'
import { AdminPage } from '../../components/ui/AdminPage'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { OptionPicker } from '../../components/ui/OptionPicker'
import { errorMessage } from '../../lib/error-message'
import { actionLabel } from '../../admin/action-labels'

// Superadmin-only: guard di sini (bukan cuma di server function) supaya
// admin biasa langsung diarahkan balik, bukan lihat halaman kosong/error.
export const Route = createFileRoute('/admin/activity')({
  beforeLoad: async () => {
    const admin = await getCurrentAdmin()
    if (!admin || !admin.isSuperadmin) {
      throw redirect({ to: '/admin' })
    }
  },
  component: AdminActivityPage,
})

const cellClass = 'px-3 py-2.5 text-xs align-top border-b border-[var(--rule)]'

// created_at Supabase = UTC; render eksplisit ke WIB biar tidak salah baca
// sebagai "sesi/orang lain" (lihat pelajaran timestamp UTC).
function formatWaktu(value: string | Date) {
  return new Date(value).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'medium',
  })
}

function AdminActivityPage() {
  const [page, setPage] = useState(1)
  const [action, setAction] = useState('')

  const { data, isPending, error } = useQuery({
    queryKey: ['activity-logs', page, action],
    queryFn: () => getActivityLogs({ data: { page, action: action || undefined } }),
  })

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  function handleActionChange(value: string) {
    setAction(value)
    setPage(1)
  }

  return (
    <AdminPage>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1
            className="text-2xl font-semibold sm:text-3xl"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Activity Log
          </h1>
          {data && <Badge tone="neutral">{data.total} baris</Badge>}
        </div>
        <OptionPicker
          title="Filter aksi"
          placeholder="Semua aksi"
          value={action}
          onChange={handleActionChange}
          options={[
            { value: '', label: 'Semua aksi' },
            ...(data?.actions ?? []).map((a) => ({ value: a, label: actionLabel(a) })),
          ]}
          className="w-full sm:w-64"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMessage(error, 'Gagal memuat activity log.')}
        </div>
      )}

      {isPending ? (
        <p className="py-10 text-center text-sm text-[var(--muted)]">Memuat...</p>
      ) : (
        <>
          {data?.items.length === 0 && (
            <p className="rounded-xl border border-[var(--rule)] bg-[var(--white)] px-4 py-10 text-center text-sm text-[var(--muted)]">
              Tidak ada log.
            </p>
          )}

          <div className="flex flex-col gap-3 md:hidden">
            {data?.items.map((log) => (
              <div
                key={log.id}
                className="flex flex-col gap-1.5 rounded-xl border border-[var(--rule)] bg-[var(--white)] p-3 shadow-[0_1px_2px_rgba(24,22,0,0.05)]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="soft">{actionLabel(log.action)}</Badge>
                  <span className="text-xs text-[var(--muted)]">
                    {log.createdAt ? formatWaktu(log.createdAt) : '-'}
                  </span>
                </div>
                <p className="break-words text-sm">
                  <span className="font-medium">{log.adminNama}</span>
                </p>
                <p className="break-words text-xs text-[var(--muted)]">
                  {log.entityType ?? '-'}
                  {log.entityName ? ` — ${log.entityName}` : ''}
                  {log.entityId != null ? ` (#${log.entityId})` : ''}
                </p>
                {log.details ? (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-[var(--muted)]">Detail</summary>
                    <pre className="mt-1 whitespace-pre-wrap break-all rounded-lg bg-[var(--pale-soft)] p-2 text-[11px]">
                      {JSON.stringify(log.details)}
                    </pre>
                  </details>
                ) : null}
              </div>
            ))}
          </div>

          {data && data.items.length > 0 && (
            <div className="hidden overflow-x-auto rounded-xl border border-[var(--rule)] bg-[var(--white)] shadow-[0_1px_2px_rgba(24,22,0,0.05)] md:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-[var(--ink)] text-[var(--cream)]">
                    <th className={`${cellClass} font-semibold`}>Waktu (WIB)</th>
                    <th className={`${cellClass} font-semibold`}>Admin</th>
                    <th className={`${cellClass} font-semibold`}>Aksi</th>
                    <th className={`${cellClass} font-semibold`}>Entity</th>
                    <th className={`${cellClass} font-semibold`}>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((log) => (
                    <tr key={log.id} className="hover:bg-[var(--pale-soft)]">
                      <td className={cellClass}>
                        {log.createdAt ? formatWaktu(log.createdAt) : '-'}
                      </td>
                      <td className={cellClass}>{log.adminNama}</td>
                      <td className={cellClass}>{actionLabel(log.action)}</td>
                      <td className={cellClass}>
                        {log.entityType ?? '-'}
                        {log.entityName ? ` — ${log.entityName}` : ''}
                        {log.entityId != null ? ` (#${log.entityId})` : ''}
                      </td>
                      <td className={cellClass}>
                        {log.details ? (
                          <pre className="whitespace-pre-wrap break-all text-[11px]">
                            {JSON.stringify(log.details)}
                          </pre>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex items-center justify-center gap-3">
            <Button
              variant="secondary"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              ← Sebelumnya
            </Button>
            <span className="text-sm text-[var(--muted)]">
              Hal. {page} dari {totalPages}
            </span>
            <Button
              variant="secondary"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Berikutnya →
            </Button>
          </div>
        </>
      )}
    </AdminPage>
  )
}

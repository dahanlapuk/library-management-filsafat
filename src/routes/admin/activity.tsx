import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { getCurrentAdmin } from '../../admin/auth'
import { getActivityLogs } from '../../admin/activity-log'
import { AdminHeader } from '../../admin/AdminHeader'
import { errorMessage } from '../../lib/error-message'

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

const cellClass = 'px-3 py-2 text-xs align-top border-b border-[var(--gray-200)]'

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
    <div className="min-h-screen bg-[var(--bg-page)] p-5">
      <div className="w-full max-w-6xl mx-auto">
        <AdminHeader />
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl font-semibold tracking-[0.05em] text-[var(--text-primary)]">
            Activity Log
          </h1>
          <select
            value={action}
            onChange={(e) => handleActionChange(e.target.value)}
            className="p-2 border-2 border-[var(--gray-200)] text-sm"
          >
            <option value="">Semua aksi</option>
            {data?.actions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="p-3 mb-4 bg-[#fee] border border-[#fcc] text-[#c00]">
            {errorMessage(error, 'Gagal memuat activity log.')}
          </div>
        )}

        {isPending ? (
          <p>Memuat...</p>
        ) : (
          <>
            <div className="bg-[var(--white)] border-2 border-[var(--black)] overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--black)] text-[var(--white)]">
                    <th className={`${cellClass} text-xs font-semibold uppercase`}>Waktu (WIB)</th>
                    <th className={`${cellClass} text-xs font-semibold uppercase`}>Admin</th>
                    <th className={`${cellClass} text-xs font-semibold uppercase`}>Aksi</th>
                    <th className={`${cellClass} text-xs font-semibold uppercase`}>Entity</th>
                    <th className={`${cellClass} text-xs font-semibold uppercase`}>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.length === 0 && (
                    <tr>
                      <td colSpan={5} className={`${cellClass} text-center text-[var(--gray-600)]`}>
                        Tidak ada log.
                      </td>
                    </tr>
                  )}
                  {data?.items.map((log) => (
                    <tr key={log.id}>
                      <td className={cellClass}>{log.createdAt ? formatWaktu(log.createdAt) : '-'}</td>
                      <td className={cellClass}>{log.adminNama}</td>
                      <td className={cellClass}>{log.action}</td>
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

            <div className="flex items-center justify-between mt-4 text-sm">
              <span className="text-[var(--gray-600)]">
                Halaman {page} dari {totalPages} ({data?.total ?? 0} baris)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 border-2 border-[var(--black)] font-semibold uppercase text-xs disabled:opacity-50"
                >
                  Sebelumnya
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 border-2 border-[var(--black)] font-semibold uppercase text-xs disabled:opacity-50"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

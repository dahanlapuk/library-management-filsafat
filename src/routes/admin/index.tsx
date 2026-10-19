import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { getCurrentAdmin } from '../../admin/auth'
import { getDashboardStats } from '../../admin/dashboard'
import { actionLabel } from '../../admin/action-labels'
import { AdminPage } from '../../components/ui/AdminPage'
import { Badge } from '../../components/ui/Badge'
import { Card, StatCard } from '../../components/ui/Card'

export const Route = createFileRoute('/admin/')({
  component: AdminDashboard,
})

function formatWaktu(value: string | Date) {
  return new Date(value).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function Row({ title, meta, right }: { title: string; meta?: string; right?: ReactNode }) {
  return (
    <li className="flex items-start justify-between gap-3 border-b border-[var(--rule)] py-2.5 last:border-b-0">
      <div className="min-w-0">
        <p className="break-words text-sm font-medium">{title}</p>
        {meta && <p className="break-words text-xs text-[var(--muted)]">{meta}</p>}
      </div>
      {right}
    </li>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="py-4 text-sm text-[var(--muted)]">{children}</p>
}

const linkClass = 'text-sm font-medium underline underline-offset-2'

function AdminDashboard() {
  const { data: currentAdmin } = useQuery({
    queryKey: ['current-admin'],
    queryFn: () => getCurrentAdmin(),
  })
  const { data: stats, isError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => getDashboardStats(),
  })

  const v = (n?: number) => (stats ? (n ?? 0) : '…')
  const positif = (n?: number) => (n ?? 0) > 0

  return (
    <AdminPage>
      <h1 className="mb-1 text-2xl font-semibold">Dashboard</h1>
      <p className="mb-6 text-[var(--muted)]">Halo, {currentAdmin?.nama ?? '...'}.</p>

      {isError && (
        <p className="mb-4 text-sm text-red-700">Statistik gagal dimuat. Coba muat ulang halaman.</p>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Pengajuan pinjam menunggu"
          value={v(stats?.pinjaman.menunggu)}
          to="/admin/loans/requests"
          alert={positif(stats?.pinjaman.menunggu)}
        />
        <StatCard
          label="Pinjaman aktif"
          value={v(stats?.pinjaman.aktif)}
          hint={positif(stats?.pinjaman.terlambat) ? `${stats?.pinjaman.terlambat} terlambat` : undefined}
          to="/admin/loans/requests"
          alert={positif(stats?.pinjaman.terlambat)}
        />
        <StatCard
          label="Perlu ditelusuri"
          value={v(stats?.buku.tidakTersedia)}
          hint="belum terverifikasi di rak"
          to="/admin/inventory"
          alert={positif(stats?.buku.tidakTersedia)}
        />
        <StatCard
          label="Feedback belum ditangani"
          value={v(stats?.feedbackBaru)}
          to="/admin/feedback"
          alert={positif(stats?.feedbackBaru)}
        />
        <StatCard
          label="Total judul"
          value={v(stats?.buku.judul)}
          hint={stats ? `${stats.buku.eksemplar} eksemplar` : undefined}
          to="/admin/books"
        />
        {stats?.requestFiturBaru != null && (
          <StatCard
            label="Request fitur baru"
            value={stats.requestFiturBaru}
            to="/admin/requests"
            alert={stats.requestFiturBaru > 0}
          />
        )}
        {stats?.superadmin && (
          <>
            <StatCard
              label="Pengajuan hapus buku"
              value={stats.superadmin.hapus}
              to="/admin/books/delete-requests"
              alert={stats.superadmin.hapus > 0}
            />
            <StatCard
              label="Pengajuan kategori"
              value={stats.superadmin.kategori}
              to="/admin/books/category-requests"
              alert={stats.superadmin.kategori > 0}
            />
            <StatCard
              label="Admin menunggu persetujuan"
              value={stats.superadmin.adminMenunggu}
              to="/admin/approvals"
              alert={stats.superadmin.adminMenunggu > 0}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title="Pengajuan pinjam masuk"
          action={
            <Link to="/admin/loans/requests" className={linkClass}>
              Buka
            </Link>
          }
        >
          {!stats ? (
            <Empty>Memuat...</Empty>
          ) : stats.pengajuanTerbaru.length === 0 ? (
            <Empty>Tidak ada pengajuan yang menunggu.</Empty>
          ) : (
            <ul>
              {stats.pengajuanTerbaru.map((r) => (
                <Row
                  key={r.id}
                  title={r.judul}
                  meta={`${r.nama} · ${r.role}${r.createdAt ? ` · ${formatWaktu(r.createdAt)}` : ''}`}
                />
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Pinjaman aktif"
          action={
            <Link to="/admin/loans/requests" className={linkClass}>
              Buka
            </Link>
          }
        >
          {!stats ? (
            <Empty>Memuat...</Empty>
          ) : stats.pinjamanAktif.length === 0 ? (
            <Empty>Tidak ada buku yang sedang dipinjam.</Empty>
          ) : (
            <ul>
              {stats.pinjamanAktif.map((l) => (
                <Row
                  key={l.id}
                  title={l.judul ?? '(judul tidak tercatat)'}
                  meta={`${l.nama} · ${l.role}${l.dueAt ? ` · tenggat ${formatWaktu(l.dueAt)}` : ''}`}
                  right={l.terlambat ? <Badge tone="solid">Terlambat</Badge> : undefined}
                />
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Perlu ditelusuri"
          action={
            <Link to="/admin/inventory" className={linkClass}>
              Inventory Check
            </Link>
          }
        >
          {!stats ? (
            <Empty>Memuat...</Empty>
          ) : stats.ditelusuri.length === 0 ? (
            <Empty>Semua buku sudah terverifikasi.</Empty>
          ) : (
            <>
              <ul>
                {stats.ditelusuri.map((b) => (
                  <Row
                    key={b.id}
                    title={b.judul}
                    meta={[b.catatan, b.checkedBy && `oleh ${b.checkedBy}`]
                      .filter(Boolean)
                      .join(' · ')}
                  />
                ))}
              </ul>
              {stats.buku.tidakTersedia > stats.ditelusuri.length && (
                <p className="pt-2 text-xs text-[var(--muted)]">
                  dan {stats.buku.tidakTersedia - stats.ditelusuri.length} buku lainnya
                </p>
              )}
            </>
          )}
        </Card>

        {stats?.superadmin && (
          <Card
            title="Aktivitas terakhir"
            action={
              <Link to="/admin/activity" className={linkClass}>
                Semua
              </Link>
            }
          >
            {stats.superadmin.aktivitas.length === 0 ? (
              <Empty>Belum ada aktivitas.</Empty>
            ) : (
              <ul>
                {stats.superadmin.aktivitas.map((a) => (
                  <Row
                    key={a.id}
                    title={`${a.adminNama} · ${actionLabel(a.action)}`}
                    meta={[a.entityName, a.createdAt && formatWaktu(a.createdAt)]
                      .filter(Boolean)
                      .join(' · ')}
                  />
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </AdminPage>
  )
}

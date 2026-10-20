import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { AdminPage } from '../../../components/ui/AdminPage'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { Textarea } from '../../../components/ui/Field'
import { getCurrentAdmin } from '../../../admin/auth'
import {
  getPendingLoanRequests,
  approveLoanRequest,
  rejectLoanRequest,
  markLoanRequestRejectionNotified,
  getActiveLoans,
  markLoanPickupNotified,
  markLoanReturnReminderStarted,
  markLoanReturnNotified,
  returnLoan,
  getLoanHistory,
} from '../../../loans/admin'

export const Route = createFileRoute('/admin/loans/requests')({
  component: LoanRequestsPage,
})

const LIBRARY_ADDRESS = [
  'Biblioteka Departemen Filsafat UI',
  'Gedung VII Anton M. Moeliono, Fakultas Ilmu Pengetahuan Budaya, Universitas Indonesia',
  'Ruang Departemen Filsafat, Lantai 2',
  'Kampus UI Depok, Pondok Cina, Beji, Kota Depok, Jawa Barat 16424',
].join('\n')

// wa.me butuh nomor format internasional polos (tanpa + atau 0 di depan).
function normalizeWhatsapp(whatsapp: string): string {
  const digitsOnly = whatsapp.replace(/[^0-9+]/g, '')
  if (digitsOnly.startsWith('+')) return digitsOnly.slice(1)
  if (digitsOnly.startsWith('0')) return `62${digitsOnly.slice(1)}`
  return digitsOnly
}

function buildWhatsAppLink(whatsapp: string, message: string): string {
  return `https://wa.me/${normalizeWhatsapp(whatsapp)}?text=${encodeURIComponent(message)}`
}

function formatDate(value: string | Date | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleString('id-ID')
}

// Jam tutup beda tiap hari, jadi jam diambil dari dueAt, bukan di-hardcode.
function formatWIBTime(value: string | Date | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  })
}

function formatWIBDateTime(value: string | Date | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleString('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  })
}

type ActiveLoan = Awaited<ReturnType<typeof getActiveLoans>>[number]

function buildPickupMessage(loan: ActiveLoan, adminNama: string): string {
  if (loan.role === 'dosen') {
    return `Yth. Bapak/Ibu ${loan.memberNama},

Peminjaman buku berikut sudah disetujui:
*${loan.bookJudul}*

Silakan ambil di:
${LIBRARY_ADDRESS}
Petugas: ${adminNama}

Dosen boleh membawa pulang buku, dengan masa peminjaman maksimal 14 hari. Batas pengembalian: ${formatWIBDateTime(loan.dueAt)} WIB.

Terima kasih.
Biblioteka Departemen Filsafat UI
Viva Philosophia!`
  }

  return `Halo, ${loan.memberNama}.

Peminjaman buku berikut sudah disetujui:
*${loan.bookJudul}*

Silakan temui petugas untuk mengambil buku:
Petugas: ${adminNama}
${LIBRARY_ADDRESS}

Buku hanya dapat dibaca di tempat dan tidak boleh dibawa pulang. Batas penggunaan: pukul ${formatWIBTime(loan.dueAt)} WIB pada hari peminjaman.

Terima kasih.
Biblioteka Departemen Filsafat UI
Viva Philosophia!`
}

function buildReturnReminderMessage(loan: ActiveLoan, adminNama: string): string {
  if (loan.role === 'dosen') {
    return `Yth. Bapak/Ibu ${loan.memberNama},

Kami mengingatkan bahwa masa peminjaman buku berikut akan segera berakhir:
*${loan.bookJudul}*
Batas pengembalian: ${formatWIBDateTime(loan.dueAt)} WIB (maksimal 14 hari sejak peminjaman).

Mohon kembalikan buku kepada petugas sebelum batas waktu tersebut.
Petugas: ${adminNama}
${LIBRARY_ADDRESS}

Terima kasih.
Biblioteka Departemen Filsafat UI
Viva Philosophia!`
  }

  return `Halo, ${loan.memberNama}.

Waktu penggunaan buku berikut hampir berakhir:
*${loan.bookJudul}*
Batas pengembalian: pukul ${formatWIBTime(loan.dueAt)} WIB.

Mohon kembalikan buku kepada petugas.
Petugas: ${adminNama}

Kalau belum selesai membaca dan ingin melanjutkan di hari berikutnya, sampaikan halaman terakhir yang dibaca kepada petugas untuk dicatat.

Terima kasih.
Biblioteka Departemen Filsafat UI
Viva Philosophia!`
}

// onSent hanya mencatat klik admin, bukan bukti pesan terkirim.
// Klik tombol -> textarea berisi pesan -> admin boleh edit -> "Kirim via WhatsApp"
// membuka wa.me lalu memanggil onSent (menandai waktu di server). Tidak ada
// verifikasi pesan benar-benar terkirim; ini hanya catatan klik admin.
function WhatsAppMessageBox({
  label,
  whatsapp,
  defaultMessage,
  onSent,
  variant = 'default',
}: {
  label: string
  whatsapp: string
  defaultMessage: string
  onSent: () => Promise<void>
  variant?: 'default' | 'muted'
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(defaultMessage)
  const [sending, setSending] = useState(false)

  if (!open) {
    return (
      <Button
        variant={variant === 'muted' ? 'quiet' : 'secondary'}
        onClick={() => {
          setText(defaultMessage)
          setOpen(true)
        }}
      >
        {label}
      </Button>
    )
  }

  return (
    <div className="flex w-full flex-col gap-2 rounded-lg border border-[var(--rule)] bg-[var(--pale-soft)] p-3">
      <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="accent"
          disabled={sending}
          onClick={async () => {
            setSending(true)
            try {
              window.open(buildWhatsAppLink(whatsapp, text), '_blank', 'noopener,noreferrer')
              await onSent()
            } finally {
              setSending(false)
              setOpen(false)
            }
          }}
        >
          {sending ? '...' : 'Kirim via WhatsApp'}
        </Button>
        <Button variant="quiet" onClick={() => setOpen(false)}>
          Batal
        </Button>
      </div>
    </div>
  )
}

// Submit langsung ke server (rejectLoanRequest); WhatsApp baru muncul
// setelah status pengajuan menjadi 'rejected'.
function RejectBox({ onSubmit }: { onSubmit: (alasan: string) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [alasan, setAlasan] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState('')

  if (!open) {
    return (
      <Button variant="quiet" onClick={() => setOpen(true)}>
        Reject
      </Button>
    )
  }

  return (
    <div className="flex w-full flex-col gap-2 rounded-lg border border-[var(--rule)] bg-[var(--pale-soft)] p-3">
      <Textarea
        value={alasan}
        onChange={(e) => setAlasan(e.target.value)}
        placeholder="Alasan penolakan (min. 5 karakter)..."
        rows={2}
      />
      {localError && <span className="text-sm text-red-700">{localError}</span>}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={submitting}
          onClick={async () => {
            if (alasan.trim().length < 5) {
              setLocalError('Alasan minimal 5 karakter.')
              return
            }
            setLocalError('')
            setSubmitting(true)
            try {
              await onSubmit(alasan.trim())
              setOpen(false)
            } catch (err) {
              setLocalError(err instanceof Error ? err.message : 'Gagal menolak pengajuan.')
            } finally {
              setSubmitting(false)
            }
          }}
        >
          {submitting ? '...' : 'Submit Penolakan'}
        </Button>
        <Button variant="quiet" onClick={() => setOpen(false)}>
          Batal
        </Button>
      </div>
    </div>
  )
}

function Panel({ children, scroll = false }: { children: React.ReactNode; scroll?: boolean }) {
  return (
    <div
      className={`rounded-xl border border-[var(--rule)] bg-[var(--white)] shadow-[0_1px_2px_rgba(24,22,0,0.05)] ${
        scroll ? 'overflow-x-auto' : 'overflow-hidden'
      }`}
    >
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
      {children}
    </h2>
  )
}

function LoanRequestsPage() {
  const queryClient = useQueryClient()
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const { data: currentAdmin } = useQuery({
    queryKey: ['current-admin'],
    queryFn: () => getCurrentAdmin(),
  })
  const adminNama = currentAdmin?.nama ?? 'Petugas Biblioteka'

  const {
    data: requests = [],
    isLoading: requestsLoading,
    error: requestsError,
  } = useQuery({
    queryKey: ['pending-loan-requests'],
    queryFn: () => getPendingLoanRequests(),
  })

  const {
    data: activeLoans = [],
    isLoading: activeLoading,
    error: activeError,
  } = useQuery({
    queryKey: ['active-loans'],
    queryFn: () => getActiveLoans(),
  })

  const {
    data: loanHistory = [],
    isLoading: historyLoading,
    error: historyError,
  } = useQuery({
    queryKey: ['loan-history'],
    queryFn: () => getLoanHistory(),
  })

  function invalidateRequests() {
    queryClient.invalidateQueries({ queryKey: ['pending-loan-requests'] })
  }
  function invalidateActive() {
    queryClient.invalidateQueries({ queryKey: ['active-loans'] })
    queryClient.invalidateQueries({ queryKey: ['loan-history'] })
  }

  async function handleApprove(id: number) {
    setError('')
    setProcessingId(id)
    try {
      await approveLoanRequest({ data: { id } })
      invalidateRequests()
      invalidateActive()
      queryClient.invalidateQueries({ queryKey: ['members'] })
      queryClient.invalidateQueries({ queryKey: ['public-catalog'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal approve pengajuan.')
    } finally {
      setProcessingId(null)
    }
  }

  async function handleReject(id: number, alasan: string) {
    await rejectLoanRequest({ data: { id, alasan } })
    invalidateRequests()
  }

  async function handleReturn(id: number) {
    setError('')
    setProcessingId(id)
    try {
      await returnLoan({ data: { id } })
      invalidateActive()
      queryClient.invalidateQueries({ queryKey: ['members'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menandai pengembalian.')
    } finally {
      setProcessingId(null)
    }
  }

  async function handleStartReturnReminder(id: number) {
    setError('')
    setProcessingId(id)
    try {
      await markLoanReturnReminderStarted({ data: { id } })
      invalidateActive()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memulai reminder pengembalian.')
    } finally {
      setProcessingId(null)
    }
  }

  function isOverdue(dueAt: string | Date | null): boolean {
    return dueAt !== null && new Date(dueAt).getTime() < Date.now()
  }

  return (
    <AdminPage className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
          Peminjaman
        </h1>
        <Link
          to="/admin"
          className="text-sm text-[var(--muted)] underline underline-offset-2 hover:text-[var(--ink)]"
        >
          ← Kembali ke dashboard
        </Link>
      </div>

      {(error || requestsError || activeError || historyError) && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error ||
            (requestsError ? 'Gagal memuat pengajuan peminjaman.' : '') ||
            (activeError ? 'Gagal memuat peminjaman aktif.' : '') ||
            (historyError ? 'Gagal memuat riwayat peminjaman.' : '')}
        </div>
      )}

      <section className="flex flex-col gap-3">
        <SectionTitle>Pengajuan Masuk</SectionTitle>
        <Panel>
          {requestsLoading ? (
            <p className="py-10 text-center text-[var(--muted)]">Memuat...</p>
          ) : requests.length === 0 ? (
            <p className="py-10 text-center text-[var(--muted)]">
              Tidak ada pengajuan yang menunggu.
            </p>
          ) : (
            <div className="flex flex-col">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-col gap-3 border-b border-[var(--rule)] p-4 last:border-b-0"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="break-words font-semibold">{req.bookJudul}</span>
                    <span className="break-words text-sm">
                      {req.namaPeminjam} ·{' '}
                      {req.role === 'dosen'
                        ? 'Dosen'
                        : `Mahasiswa ${req.jenjang ?? ''} ${req.angkatan ?? ''}`}
                    </span>
                    <span className="break-words text-sm text-[var(--muted)]">
                      {req.whatsapp}
                      {req.email ? ` · ${req.email}` : ''}
                    </span>
                    {req.keperluan && (
                      <span className="break-words text-sm">Keperluan: {req.keperluan}</span>
                    )}
                    {req.status === 'rejected' && req.rejectionAlasan && (
                      <span className="break-words text-sm text-red-700">
                        Ditolak: {req.rejectionAlasan}
                      </span>
                    )}
                    <span className="text-xs text-[var(--muted)]">{formatDate(req.createdAt)}</span>
                  </div>

                  <div className="flex flex-wrap items-start gap-2">
                    {req.status === 'pending' ? (
                      <>
                        <Button
                          variant="accent"
                          onClick={() => handleApprove(req.id)}
                          disabled={processingId === req.id}
                        >
                          {processingId === req.id ? '...' : 'Approve'}
                        </Button>
                        <RejectBox onSubmit={(alasan) => handleReject(req.id, alasan)} />
                      </>
                    ) : (
                      <WhatsAppMessageBox
                        label="Chat WhatsApp"
                        whatsapp={req.whatsapp}
                        defaultMessage={`Halo ${req.namaPeminjam}, mohon maaf pengajuan peminjaman buku "${req.bookJudul}" belum bisa kami setujui. Alasan: ${req.rejectionAlasan ?? '-'}.`}
                        onSent={async () => {
                          await markLoanRequestRejectionNotified({ data: { id: req.id } })
                          invalidateRequests()
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle>Peminjaman Aktif</SectionTitle>
        <Panel>
          {activeLoading ? (
            <p className="py-10 text-center text-[var(--muted)]">Memuat...</p>
          ) : activeLoans.length === 0 ? (
            <p className="py-10 text-center text-[var(--muted)]">Tidak ada peminjaman aktif.</p>
          ) : (
            <div className="flex flex-col">
              {activeLoans.map((loan) => {
                const overdue = isOverdue(loan.dueAt)
                return (
                  <div
                    key={loan.id}
                    className="flex flex-col gap-3 border-b border-[var(--rule)] p-4 last:border-b-0"
                  >
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="break-words font-semibold">{loan.bookJudul}</span>
                        {overdue && <Badge tone="solid">Terlambat</Badge>}
                      </span>
                      <span className="break-words text-sm">
                        {loan.memberNama} · {loan.role === 'dosen' ? 'Dosen' : 'Mahasiswa'}
                      </span>
                      <span className="text-sm text-[var(--muted)]">
                        Dipinjam: {formatDate(loan.tanggalPinjam)}
                      </span>
                      <span
                        className={`text-sm ${overdue ? 'font-medium text-red-700' : 'text-[var(--muted)]'}`}
                      >
                        Jatuh tempo: {formatDate(loan.dueAt)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-start gap-2">
                      <WhatsAppMessageBox
                        label="Chat WhatsApp - Peminjam"
                        whatsapp={loan.memberWhatsapp ?? ''}
                        defaultMessage={buildPickupMessage(loan, adminNama)}
                        onSent={async () => {
                          await markLoanPickupNotified({ data: { id: loan.id } })
                          invalidateActive()
                        }}
                      />

                      {loan.returnNotifiedAt ? (
                        <Button
                          variant="accent"
                          onClick={() => handleReturn(loan.id)}
                          disabled={processingId === loan.id}
                        >
                          {processingId === loan.id ? '...' : 'Pengembalian'}
                        </Button>
                      ) : loan.returnReminderStartedAt ? (
                        <WhatsAppMessageBox
                          label="Chat WhatsApp - Reminder"
                          whatsapp={loan.memberWhatsapp ?? ''}
                          defaultMessage={buildReturnReminderMessage(loan, adminNama)}
                          variant="muted"
                          onSent={async () => {
                            await markLoanReturnNotified({ data: { id: loan.id } })
                            invalidateActive()
                          }}
                        />
                      ) : (
                        <Button
                          variant="quiet"
                          onClick={() => handleStartReturnReminder(loan.id)}
                          disabled={processingId === loan.id}
                        >
                          {processingId === loan.id ? '...' : 'Konfirmasi Pengembalian'}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Panel>
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle>Riwayat Peminjaman</SectionTitle>
        <p className="-mt-2 text-sm text-[var(--muted)]">
          50 aktivitas peminjaman terbaru (aktif maupun sudah dikembalikan), beserta admin yang
          memprosesnya.
        </p>
        <Panel scroll>
          {historyLoading ? (
            <p className="py-10 text-center text-[var(--muted)]">Memuat...</p>
          ) : loanHistory.length === 0 ? (
            <p className="py-10 text-center text-[var(--muted)]">Belum ada riwayat peminjaman.</p>
          ) : (
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-[var(--rule)] bg-[var(--pale-soft)] text-left text-[var(--muted)]">
                  <th className="p-3 font-medium">Buku</th>
                  <th className="p-3 font-medium">Peminjam</th>
                  <th className="p-3 font-medium">Dipinjam</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Admin</th>
                </tr>
              </thead>
              <tbody>
                {loanHistory.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--rule)] last:border-b-0">
                    <td className="p-3">{row.bookJudul}</td>
                    <td className="p-3">
                      {row.memberNama} · {row.role === 'dosen' ? 'Dosen' : 'Mahasiswa'}
                    </td>
                    <td className="p-3 text-[var(--muted)]">{formatDate(row.tanggalPinjam)}</td>
                    <td className="p-3">
                      {row.tanggalKembali ? (
                        <Badge>Dikembalikan {formatDate(row.tanggalKembali)}</Badge>
                      ) : isOverdue(row.dueAt) ? (
                        <Badge tone="solid">Aktif · Terlambat</Badge>
                      ) : (
                        <Badge tone="soft">Aktif</Badge>
                      )}
                    </td>
                    <td className="p-3 text-[var(--muted)]">{row.dicatatOlehNama ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </section>
    </AdminPage>
  )
}

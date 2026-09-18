import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { AdminHeader } from '../../../admin/AdminHeader'
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

const LIBRARY_ADDRESS =
  'Perpustakaan Departemen Filsafat\nFakultas Ilmu Pengetahuan Budaya Universitas Indonesia\nKampus UI Depok, Pondok Cina, Kecamatan Beji, Kota Depok, Jawa Barat 16424'

// wa.me butuh nomor tanpa +/0 di depan (format internasional polos) --
// normalize dari input bebas yang diisi peminjam/member sendiri.
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

// Jam WIB dari sebuah dueAt -- dipakai di template mahasiswa, karena jam
// tutup beda tiap hari (Kamis 14.00, hari lain 16.00), jadi tidak boleh
// di-hardcode di teks pesan.
function formatWIBTime(value: string | Date | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  })
}

// Tanggal+jam WIB lengkap -- dipakai di template dosen (durasi 14 hari,
// jadi tanggalnya yang penting, bukan cuma jam).
function formatWIBDateTime(value: string | Date | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleString('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  })
}

type ActiveLoan = Awaited<ReturnType<typeof getActiveLoans>>[number]

// ── Template pesan WhatsApp ─────────────────────────────────────
// 4 varian (pickup/reminder x mahasiswa/dosen), disusun dari draft resmi
// perpustakaan. $peminjam/$buku/$admin diisi otomatis; jam/tanggal batas
// waktu diambil dari dueAt asli si loan (bukan angka tetap), supaya tetap
// benar walau jam tutup beda tiap hari.
function buildPickupMessage(loan: ActiveLoan, adminNama: string): string {
  if (loan.role === 'dosen') {
    return `Peminjaman Buku Disetujui

Yth. Bapak/Ibu ${loan.memberNama},
Peminjaman buku "${loan.bookJudul}" telah disetujui oleh Perpustakaan Departemen Filsafat.

Buku dapat diambil melalui:
Admin yang bertugas: ${adminNama}
${LIBRARY_ADDRESS}

Khusus dosen, buku diperbolehkan untuk dibawa pulang dengan masa peminjaman maksimal 14 hari sejak tanggal peminjaman. Mohon memperhatikan batas waktu pengembalian yang telah ditentukan (hingga ${formatWIBDateTime(loan.dueAt)} WIB).

Perpustakaan Departemen Filsafat
Viva Philosophia!`
  }

  return `Halo, ${loan.memberNama}.

Peminjaman buku "${loan.bookJudul}" telah disetujui oleh Perpustakaan Departemen Filsafat.

Silakan mengambil buku tersebut di:
${LIBRARY_ADDRESS}

Admin yang bertugas: ${adminNama}

Mohon menemui admin yang bersangkutan untuk mengambil buku.

Khusus mahasiswa, buku hanya dapat digunakan untuk dibaca di tempat dan tidak diperkenankan dibawa pulang. Batas waktu penggunaan buku adalah pukul ${formatWIBTime(loan.dueAt)} WIB pada hari peminjaman.

Perpustakaan Departemen Filsafat
Viva Philosophia!`
}

function buildReturnReminderMessage(loan: ActiveLoan, adminNama: string): string {
  if (loan.role === 'dosen') {
    return `Pengingat Pengembalian Buku

Yth. Bapak/Ibu ${loan.memberNama},
Kami mengingatkan bahwa masa peminjaman buku "${loan.bookJudul}" di Perpustakaan Departemen Filsafat akan segera berakhir (batas waktu: ${formatWIBDateTime(loan.dueAt)} WIB).

Masa peminjaman buku bagi dosen adalah maksimal 14 hari sejak tanggal peminjaman. Mohon mengembalikan buku kepada admin/petugas perpustakaan sebelum batas waktu peminjaman berakhir.

Admin yang dapat ditemui: ${adminNama}
${LIBRARY_ADDRESS}

Perpustakaan Departemen Filsafat
Viva Philosophia!`
  }

  return `Pengingat Pengembalian Buku

Halo, ${loan.memberNama}.
Waktu penggunaan buku "${loan.bookJudul}" di Perpustakaan Departemen Filsafat hampir berakhir.
Mohon segera mengembalikan buku kepada admin yang bertugas.
Batas akhir pengembalian: pukul ${formatWIBTime(loan.dueAt)} WIB.
Admin yang bertugas: ${adminNama}
Apabila belum selesai membaca dan ingin melanjutkan di hari berikutnya, silakan menyampaikan halaman terakhir yang telah dibaca kepada admin untuk dicatat.

Perpustakaan Departemen Filsafat`
}

// ── Kotak pesan WhatsApp yang bisa diedit ──────────────────────────
// Dipakai untuk semua jenis chat (pickup / reminder pengembalian /
// reject): klik tombol label -> muncul textarea prefilled -> admin
// boleh edit -> "Kirim via WhatsApp" buka wa.me pakai teks final +
// panggil onSent (mark timestamp terkait di server). "Batal" nutup
// kotak tanpa efek apa pun -- TIDAK ada verifikasi WA beneran
// terkirim/dibaca, murni catatan klik di sisi admin.
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

  const borderClass =
    variant === 'muted'
      ? 'border-[var(--gray-600)] text-[var(--gray-600)] hover:bg-[var(--gray-100)]'
      : 'border-[var(--black)] hover:bg-[var(--gray-100)]'

  if (!open) {
    return (
      <button
        onClick={() => {
          setText(defaultMessage)
          setOpen(true)
        }}
        className={`px-3 py-2 border-2 text-sm font-medium uppercase tracking-wide ${borderClass}`}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-3 border-2 border-[var(--black)] bg-[var(--gray-100)] w-full">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        className="w-full p-2 border border-[var(--gray-600)] text-sm bg-[var(--white)] whitespace-pre-wrap"
      />
      <div className="flex gap-2">
        <button
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
          className="px-3 py-2 border-2 border-[var(--accent)] text-[var(--accent)] text-sm font-medium uppercase tracking-wide hover:bg-[var(--accent-soft)] disabled:opacity-50"
        >
          {sending ? '...' : 'Kirim via WhatsApp'}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-3 py-2 border border-[var(--gray-600)] text-[var(--gray-600)] text-sm uppercase tracking-wide hover:bg-[var(--white)]"
        >
          Batal
        </button>
      </div>
    </div>
  )
}

// ── Kotak alasan reject ────────────────────────────────────────────
// Beda dari WhatsAppMessageBox: ini submit LANGSUNG ke server
// (rejectLoanRequest), belum ada WA sama sekali di sini -- WA baru
// muncul setelah status jadi 'rejected' (lihat render di bawah).
function RejectBox({ onSubmit }: { onSubmit: (alasan: string) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [alasan, setAlasan] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState('')

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-2 border-2 border-[var(--gray-600)] text-[var(--gray-600)] text-sm font-medium uppercase tracking-wide hover:bg-[var(--gray-100)]"
      >
        Reject
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-3 border-2 border-[var(--black)] bg-[var(--gray-100)] w-full">
      <textarea
        value={alasan}
        onChange={(e) => setAlasan(e.target.value)}
        placeholder="Alasan penolakan (min. 5 karakter)..."
        rows={2}
        className="w-full p-2 border border-[var(--gray-600)] text-sm bg-[var(--white)]"
      />
      {localError && <span className="text-sm text-[#c00]">{localError}</span>}
      <div className="flex gap-2">
        <button
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
          className="px-3 py-2 border-2 border-[var(--gray-600)] text-[var(--gray-600)] text-sm font-medium uppercase tracking-wide hover:bg-[var(--white)] disabled:opacity-50"
        >
          {submitting ? '...' : 'Submit Penolakan'}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-3 py-2 border border-[var(--gray-600)] text-[var(--gray-600)] text-sm uppercase tracking-wide hover:bg-[var(--white)]"
        >
          Batal
        </button>
      </div>
    </div>
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
  const adminNama = currentAdmin?.nama ?? 'Admin Perpustakaan'

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
    <div className="min-h-screen bg-[var(--bg-page)] p-5">
      <div className="w-full max-w-[900px] mx-auto flex flex-col gap-8">
        <AdminHeader />

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-[0.05em] text-[var(--text-primary)]">
            Peminjaman
          </h1>
          <Link
            to="/admin"
            className="text-sm text-[var(--gray-600)] hover:text-[var(--text-primary)]"
          >
            ← Kembali ke dashboard
          </Link>
        </div>

        {(error || requestsError || activeError || historyError) && (
          <div className="p-3 bg-[#fee] border border-[#fcc] text-[#c00]">
            {error ||
              (requestsError ? 'Gagal memuat pengajuan peminjaman.' : '') ||
              (activeError ? 'Gagal memuat peminjaman aktif.' : '') ||
              (historyError ? 'Gagal memuat riwayat peminjaman.' : '')}
          </div>
        )}

        {/* ── Pengajuan Masuk ── */}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold tracking-wide text-[var(--text-primary)]">
            Pengajuan Masuk
          </h2>
          <div className="bg-[var(--white)] border-2 border-[var(--black)]">
            {requestsLoading ? (
              <p className="text-center py-8">Memuat...</p>
            ) : requests.length === 0 ? (
              <p className="text-center py-8 text-[var(--gray-600)]">
                Tidak ada pengajuan yang menunggu.
              </p>
            ) : (
              <div className="flex flex-col">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-col gap-3 p-4 border-b border-[var(--gray-200)] last:border-b-0"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="font-semibold text-[var(--text-primary)]">
                        {req.bookJudul}
                      </span>
                      <span className="text-sm text-[var(--text-primary)]">
                        {req.namaPeminjam} ·{' '}
                        {req.role === 'dosen'
                          ? 'Dosen'
                          : `Mahasiswa ${req.jenjang ?? ''} ${req.angkatan ?? ''}`}
                      </span>
                      <span className="text-sm text-[var(--gray-600)]">
                        {req.whatsapp}
                        {req.email ? ` · ${req.email}` : ''}
                      </span>
                      {req.keperluan && (
                        <span className="text-sm text-[var(--text-primary)]">
                          Keperluan: {req.keperluan}
                        </span>
                      )}
                      {req.status === 'rejected' && req.rejectionAlasan && (
                        <span className="text-sm text-[#c00]">Ditolak: {req.rejectionAlasan}</span>
                      )}
                      <span className="text-xs text-[var(--gray-600)]">
                        {formatDate(req.createdAt)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-start gap-2">
                      {req.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleApprove(req.id)}
                            disabled={processingId === req.id}
                            className="px-3 py-2 border-2 border-[var(--accent)] text-[var(--accent)] text-sm font-medium uppercase tracking-wide hover:bg-[var(--accent-soft)] disabled:opacity-50"
                          >
                            {processingId === req.id ? '...' : 'Approve'}
                          </button>
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
          </div>
        </section>

        {/* ── Peminjaman Aktif ── */}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold tracking-wide text-[var(--text-primary)]">
            Peminjaman Aktif
          </h2>
          <div className="bg-[var(--white)] border-2 border-[var(--black)]">
            {activeLoading ? (
              <p className="text-center py-8">Memuat...</p>
            ) : activeLoans.length === 0 ? (
              <p className="text-center py-8 text-[var(--gray-600)]">Tidak ada peminjaman aktif.</p>
            ) : (
              <div className="flex flex-col">
                {activeLoans.map((loan) => {
                  const overdue = isOverdue(loan.dueAt)
                  return (
                    <div
                      key={loan.id}
                      className="flex flex-col gap-3 p-4 border-b border-[var(--gray-200)] last:border-b-0"
                    >
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="font-semibold text-[var(--text-primary)]">
                          {loan.bookJudul}
                        </span>
                        <span className="text-sm text-[var(--text-primary)]">
                          {loan.memberNama} · {loan.role === 'dosen' ? 'Dosen' : 'Mahasiswa'}
                        </span>
                        <span className="text-sm text-[var(--gray-600)]">
                          Dipinjam: {formatDate(loan.tanggalPinjam)}
                        </span>
                        <span
                          className={`text-sm font-medium ${overdue ? 'text-[#c00]' : 'text-[var(--gray-600)]'}`}
                        >
                          Jatuh tempo: {formatDate(loan.dueAt)}
                          {overdue ? ' · TERLAMBAT' : ''}
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
                          <button
                            onClick={() => handleReturn(loan.id)}
                            disabled={processingId === loan.id}
                            className="px-3 py-2 border-2 border-[var(--accent)] text-[var(--accent)] text-sm font-medium uppercase tracking-wide hover:bg-[var(--accent-soft)] disabled:opacity-50"
                          >
                            {processingId === loan.id ? '...' : 'Pengembalian'}
                          </button>
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
                          <button
                            onClick={() => handleStartReturnReminder(loan.id)}
                            disabled={processingId === loan.id}
                            className="px-3 py-2 border-2 border-[var(--gray-600)] text-[var(--gray-600)] text-sm font-medium uppercase tracking-wide hover:bg-[var(--gray-100)] disabled:opacity-50"
                          >
                            {processingId === loan.id ? '...' : 'Konfirmasi Pengembalian'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* ── Riwayat Peminjaman ── */}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold tracking-wide text-[var(--text-primary)]">
            Riwayat Peminjaman
          </h2>
          <p className="text-sm text-[var(--gray-600)] -mt-2">
            50 aktivitas peminjaman terbaru (aktif maupun sudah dikembalikan), beserta admin yang
            memprosesnya.
          </p>
          <div className="bg-[var(--white)] border-2 border-[var(--black)] overflow-x-auto">
            {historyLoading ? (
              <p className="text-center py-8">Memuat...</p>
            ) : loanHistory.length === 0 ? (
              <p className="text-center py-8 text-[var(--gray-600)]">Belum ada riwayat peminjaman.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-[var(--black)] text-left">
                    <th className="p-2 font-semibold">Buku</th>
                    <th className="p-2 font-semibold">Peminjam</th>
                    <th className="p-2 font-semibold">Dipinjam</th>
                    <th className="p-2 font-semibold">Status</th>
                    <th className="p-2 font-semibold">Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {loanHistory.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--gray-200)] last:border-b-0">
                      <td className="p-2">{row.bookJudul}</td>
                      <td className="p-2">
                        {row.memberNama} · {row.role === 'dosen' ? 'Dosen' : 'Mahasiswa'}
                      </td>
                      <td className="p-2 text-[var(--gray-600)]">{formatDate(row.tanggalPinjam)}</td>
                      <td className="p-2">
                        {row.tanggalKembali ? (
                          <span className="text-[var(--gray-600)]">
                            Dikembalikan {formatDate(row.tanggalKembali)}
                          </span>
                        ) : isOverdue(row.dueAt) ? (
                          <span className="text-[#c00] font-medium">Aktif · TERLAMBAT</span>
                        ) : (
                          <span className="text-[var(--accent)] font-medium">Aktif</span>
                        )}
                      </td>
                      <td className="p-2 text-[var(--gray-600)]">{row.dicatatOlehNama ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

const FROM = 'Biblioteka Departemen Filsafat UI <biblioteka@mail.filsafatui.app>'
const LOGO_URL = 'https://biblioteka.filsafatui.app/icon-192.png'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildHtml(nama: string, judul: string): string {
  return `<div style="background:#f4f4f5;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px;color:#1f2937;line-height:1.6;">
    <img src="${LOGO_URL}" width="56" height="56" alt="Biblioteka Departemen Filsafat UI" style="display:block;border:0;margin:0 0 8px;">
    <p style="margin:0 0 4px;font-size:13px;letter-spacing:0.5px;color:#6b7280;">BIBLIOTEKA DEPARTEMEN FILSAFAT UI</p>
    <h2 style="margin:0 0 20px;font-size:20px;color:#111827;">Terima kasih sudah meminjam</h2>
    <p style="margin:0 0 16px;">Halo ${esc(nama)},</p>
    <p style="margin:0 0 16px;">Buku yang Anda pinjam sudah kami terima kembali. Terima kasih telah menjaga dan mengembalikannya.</p>
    <p style="margin:0 0 16px;padding:12px 16px;background:#f9fafb;border-left:3px solid #111827;border-radius:4px;font-weight:bold;color:#111827;">${esc(judul)}</p>
    <p style="margin:0 0 16px;">Kami berharap bukunya bermanfaat. Silakan datang kembali kapan pun Anda membutuhkan bacaan lain.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">Email ini dikirim otomatis, mohon tidak membalasnya.</p>
  </div>
</div>`
}

export async function sendThankYouEmail(input: {
  to: string
  nama: string
  judul: string
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.error('RESEND_API_KEY belum diatur, email terima kasih dilewati')
    return false
  }

  const text =
    `Halo ${input.nama},\n\n` +
    `Terima kasih sudah meminjam dan mengembalikan buku "${input.judul}" ` +
    `di Biblioteka Departemen Filsafat UI.\n\n` +
    `Email ini dikirim otomatis dan tidak perlu dibalas.`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [input.to],
        subject: 'Terima kasih sudah meminjam buku',
        text,
        html: buildHtml(input.nama, input.judul),
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      console.error('Resend gagal', res.status)
      return false
    }
    return true
  } catch (err) {
    console.error('Resend error', err instanceof Error ? err.message : err)
    return false
  }
}

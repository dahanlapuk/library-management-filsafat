import { createServerFn } from '@tanstack/react-start'
import { getRequestHost } from '@tanstack/react-start/server'

const OLD_HOST = 'library-management-filsafat.vercel.app'
const CANONICAL_HOST = 'biblioteka.filsafatui.app'

// Server function (bukan langsung di beforeLoad) biar konsisten dengan
// pola isMaintenanceMode -- baca header request cuma boleh di server,
// dan pemanggilan dari client otomatis jadi RPC lewat createServerFn.
//
// SENGAJA cuma cocokkan host DEFAULT Vercel persis (bukan wildcard
// *.vercel.app) -- supaya preview deployment (*-git-main-xxx.vercel.app)
// yang dipakai buat testing TIDAK ikut kepaksa redirect ke production.
export const getCanonicalRedirectHost = createServerFn({
  method: 'GET',
}).handler(async () => {
  const host = getRequestHost()
  return host === OLD_HOST ? CANONICAL_HOST : null
})

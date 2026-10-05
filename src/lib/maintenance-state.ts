import { eq } from 'drizzle-orm'
import { db } from '../db'
import { maintenanceRequests } from '../db/schema'

export type MaintenanceMode = 'off' | 'catalog' | 'full'

// Cache pendek di memori server: root beforeLoad memanggil ini di tiap
// navigasi, jadi tidak perlu query database setiap kali. Instance
// serverless lain baru ikut berubah setelah TTL habis (maks ~5 detik).
const TTL_MS = 5_000
let cache: { mode: MaintenanceMode; expires: number } | null = null

export function invalidateMaintenanceCache() {
  cache = null
}

export async function readMaintenanceMode(): Promise<MaintenanceMode> {
  // Saklar darurat: env var menang atas database dan tidak butuh DB hidup.
  if (process.env.MAINTENANCE_MODE === 'true') return 'full'
  if (cache && cache.expires > Date.now()) return cache.mode
  try {
    const [active] = await db
      .select({ id: maintenanceRequests.id })
      .from(maintenanceRequests)
      .where(eq(maintenanceRequests.status, 'active'))
      .limit(1)
    const mode: MaintenanceMode = active ? 'catalog' : 'off'
    cache = { mode, expires: Date.now() + TTL_MS }
    return mode
  } catch (err) {
    // Gagal baca status jangan sampai menjatuhkan seluruh situs.
    console.error('Gagal membaca status maintenance', err)
    return cache?.mode ?? 'off'
  }
}

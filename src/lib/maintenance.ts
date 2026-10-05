import { createServerFn } from '@tanstack/react-start'
import { readMaintenanceMode } from './maintenance-state'

// Server function supaya status dibaca di server (env var dan database
// tidak ikut ke bundle klien).
export const getMaintenanceMode = createServerFn({ method: 'GET' }).handler(
  async () => readMaintenanceMode(),
)

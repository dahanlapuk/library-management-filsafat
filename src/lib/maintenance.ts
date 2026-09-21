import { createServerFn } from '@tanstack/react-start'

// Server function biar env var MAINTENANCE_MODE dibaca di server,
// bukan ke-bundle ke client.
export const isMaintenanceMode = createServerFn({ method: 'GET' }).handler(
  async () => {
    return process.env.MAINTENANCE_MODE === 'true'
  },
)

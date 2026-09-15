import { defineConfig } from 'vitest/config'

// Config terpisah dari vite.config.ts (yang punya plugin TanStack
// Start/Nitro) -- supaya Vitest cuma jalanin test TypeScript murni,
// tanpa ikut nge-load seluruh app server.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})

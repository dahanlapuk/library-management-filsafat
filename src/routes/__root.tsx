import { Footer } from '../components/Footer'
import { NotFound } from '../components/NotFound'
import { HeadContent, Scripts, createRootRoute, redirect } from '@tanstack/react-router'
import { getMaintenanceMode } from '../lib/maintenance'
import { getCanonicalRedirectHost } from '../lib/canonical-domain'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import appCss from '../styles.css?url'

const queryClient = new QueryClient()

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    // Domain lama (*.vercel.app default) -- 301 permanen ke domain custom,
    // supaya sinyal SEO ikut pindah dan tidak ada duplicate content antara
    // dua domain yang nampilin konten sama persis.
    const canonicalHost = await getCanonicalRedirectHost()
    if (canonicalHost) {
      throw redirect({
        href: `https://${canonicalHost}${location.href}`,
        statusCode: 301,
      })
    }

    // Mode penuh menutup semua rute (admin juga). Mode katalog hanya
    // menutup rute publik; /admin/* tetap terbuka supaya admin bisa kerja.
    const mode = await getMaintenanceMode()
    const blocked =
      mode === 'full' ||
      (mode === 'catalog' && !location.pathname.startsWith('/admin'))
    if (location.pathname === '/maintenance') {
      if (!blocked) throw redirect({ to: '/' })
      return
    }
    if (blocked) throw redirect({ to: '/maintenance' })
  },
  notFoundComponent: NotFound,
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Biblioteka Departemen Filsafat UI',
      },
      { property: 'og:site_name', content: 'Biblioteka Departemen Filsafat UI' },
      { property: 'og:type', content: 'website' },
      { property: 'og:locale', content: 'id_ID' },
      { property: 'og:image', content: 'https://biblioteka.filsafatui.app/og-image.png' },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: 'Logo Perpustakaan Departemen Filsafat FIB UI' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:image', content: 'https://biblioteka.filsafatui.app/og-image.png' },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      { rel: 'icon', href: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
      { rel: 'icon', href: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <div className="flex min-h-screen flex-col">
          <div className="flex-1">{children}</div>
          <div data-nosnippet><Footer /></div>
        </div>
        </QueryClientProvider>
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}

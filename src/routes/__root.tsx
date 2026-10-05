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
        title: 'Biblioteka Departemen Filsafat FIB UI',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        href: '/favicon.svg',
        type: 'image/svg+xml',
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <div className="flex min-h-screen flex-col">
          <div className="flex-1">{children}</div>
          <Footer />
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

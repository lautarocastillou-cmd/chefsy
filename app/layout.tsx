import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ProveedorAuth } from '@/contexto/AuthContexto'
import { ProveedorClienteAuth } from '@/contexto/ClienteAuthContexto'
import { ConfiguracionTiendaProvider } from '@/contexto/ConfiguracionTiendaContexto'
import { ProveedorCatalogo } from '@/contexto/CatalogoContexto'
import { ProveedorTemaNotificacion } from '@/contexto/TemaNotificacionContexto'
import { Bebas_Neue, Montserrat, Inter, Anton } from 'next/font/google'
import GlobalEvents from '@/components/GlobalEvents'
import SmoothScrollProvider from '@/components/SmoothScrollProvider'

const bebas = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
})

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const anton = Anton({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-anton',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  metadataBase: new URL('https://chefsy.xyz'),
  title: 'Chefsy | Tienda Online',
  description: 'Pedí online las mejores burgers, lomos, pizzas y milas en Chefsy. ¡Rápido, fácil y riquísimo!',
  keywords: 'chefsy, hamburguesas, lomos, pizzas, milanesas, delivery, pedir comida, fast food',
  openGraph: {
    title: 'Chefsy | Tienda Online',
    description: 'Pedí online las mejores burgers, lomos, pizzas y milas en Chefsy. ¡Rápido, fácil y riquísimo!',
    url: 'https://chefsy.xyz',
    siteName: 'Chefsy',
    images: [
      {
        url: '/logo.jpg',
        width: 800,
        height: 600,
        alt: 'Chefsy Logo',
      },
    ],
    locale: 'es_AR',
    type: 'website',
  },
  icons: {
    icon: '/logo.jpg',
  },
}

export default function LayoutRaiz({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`font-sans antialiased overflow-x-clip ${bebas.variable} ${montserrat.variable} ${inter.variable} ${anton.variable}`}>
        <ConfiguracionTiendaProvider>
          <ProveedorAuth>
            <ProveedorClienteAuth>
              <ProveedorTemaNotificacion>
                <ProveedorCatalogo>
                  <SmoothScrollProvider>
                    <GlobalEvents />
                    {children}
                  </SmoothScrollProvider>
                </ProveedorCatalogo>
              </ProveedorTemaNotificacion>
            </ProveedorClienteAuth>
          </ProveedorAuth>
        </ConfiguracionTiendaProvider>
      </body>
    </html>
  )
}


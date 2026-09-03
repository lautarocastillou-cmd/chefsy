import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ProveedorAuth } from '@/contexto/AuthContexto'
import { ProveedorClienteAuth } from '@/contexto/ClienteAuthContexto'
import { ConfiguracionTiendaProvider } from '@/contexto/ConfiguracionTiendaContexto'
import { ProveedorPedidos } from '@/contexto/PedidosContexto'
import {
  Bebas_Neue,
  Montserrat,
  Inter,
  Anton,
  Playfair_Display,
  Outfit,
  Plus_Jakarta_Sans,
  Syne,
  Permanent_Marker,
  Cinzel,
} from 'next/font/google'
import GlobalEvents from '@/components/GlobalEvents'
import SmoothScrollProvider from '@/components/SmoothScrollProvider'
import ToasterProvider from '@/components/ui/ToasterProvider'
import ModalHerramientasTesteo from '@/components/dev/ModalHerramientasTesteo'

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

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
})

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
})

const permanentMarker = Permanent_Marker({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-permanent-marker',
  display: 'swap',
})

const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-cinzel',
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
      <body
        className={`font-sans antialiased overflow-x-clip ${bebas.variable} ${montserrat.variable} ${inter.variable} ${anton.variable} ${playfair.variable} ${outfit.variable} ${plusJakarta.variable} ${syne.variable} ${permanentMarker.variable} ${cinzel.variable}`}
      >
        <ConfiguracionTiendaProvider>
          <ProveedorAuth>
            <ProveedorClienteAuth>
              <ProveedorPedidos>
                <SmoothScrollProvider>
                  <GlobalEvents />
                  <ToasterProvider />
                  <ModalHerramientasTesteo />
                  {children}
                </SmoothScrollProvider>
              </ProveedorPedidos>
            </ProveedorClienteAuth>
          </ProveedorAuth>
        </ConfiguracionTiendaProvider>
      </body>
    </html>
  )
}


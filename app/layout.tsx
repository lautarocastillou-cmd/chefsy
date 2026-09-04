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
import JsonLdLocalBusiness from '@/components/seo/JsonLdLocalBusiness'
import SeoFallbackContent from '@/components/seo/SeoFallbackContent'

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
  title: {
    default: 'Chefsy | Hamburguesas, Lomos y Pizzas en Catamarca - Pedí Online',
    template: '%s | Chefsy Catamarca',
  },
  description:
    'Pedí online en Chefsy las mejores hamburguesas artesanales smash, lomitos completos, pizzas y milanesas en San Fernando del Valle de Catamarca. Delivery rápido a tu puerta y retiro en local.',
  applicationName: 'Chefsy',
  authors: [{ name: 'Chefsy Catamarca', url: 'https://chefsy.xyz' }],
  generator: 'Next.js',
  keywords: [
    'chefsy',
    'chefsy catamarca',
    'delivery catamarca',
    'hamburguesas catamarca',
    'lomitos catamarca',
    'lomos catamarca',
    'pizzas catamarca',
    'milanesas catamarca',
    'comida rapida catamarca',
    'pedir comida catamarca',
    'san fernando del valle de catamarca',
    'sandwicheria catamarca',
    'fast food catamarca',
    'delivery de comida catamarca',
  ],
  alternates: {
    canonical: 'https://chefsy.xyz',
  },
  openGraph: {
    title: 'Chefsy | Hamburguesas, Lomos y Pizzas en Catamarca',
    description:
      'Pedí online las mejores hamburguesas, lomitos, pizzas y milanesas en San Fernando del Valle de Catamarca. Delivery rápido a tu puerta.',
    url: 'https://chefsy.xyz',
    siteName: 'Chefsy Catamarca',
    images: [
      {
        url: '/logo.jpg',
        width: 800,
        height: 600,
        alt: 'Chefsy Catamarca - Hamburguesas & Lomos',
      },
    ],
    locale: 'es_AR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chefsy | Hamburguesas, Lomos y Pizzas en Catamarca',
    description:
      'Pedí online las mejores hamburguesas, lomitos y pizzas en Catamarca. Delivery rápido.',
    images: ['/logo.jpg'],
  },
  icons: {
    icon: '/logo.jpg',
    apple: '/logo.jpg',
  },
  other: {
    'geo.region': 'AR-K',
    'geo.placename': 'San Fernando del Valle de Catamarca',
    'geo.position': '-28.462809;-65.778500',
    'ICBM': '-28.462809, -65.778500',
  },
}

export default function LayoutRaiz({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <JsonLdLocalBusiness />
      </head>
      <body
        className={`font-sans antialiased overflow-x-clip ${bebas.variable} ${montserrat.variable} ${inter.variable} ${anton.variable} ${playfair.variable} ${outfit.variable} ${plusJakarta.variable} ${syne.variable} ${permanentMarker.variable} ${cinzel.variable}`}
      >
        <SeoFallbackContent />
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


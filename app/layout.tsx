import type { Metadata } from 'next'
import './globals.css'
import { ProveedorPedidos } from '@/contexto/PedidosContexto'
import { ProveedorAuth } from '@/contexto/AuthContexto'
import { ConfiguracionTiendaProvider } from '@/contexto/ConfiguracionTiendaContexto'
import { Playfair_Display, Bebas_Neue } from 'next/font/google'

const bebas = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Chefsy | Tienda Online',
  description: 'Pedí online las mejores burgers, lomos, pizzas y milas en Chefsy. ¡Rápido, fácil y riquísimo!',
  keywords: 'chefsy, hamburguesas, lomos, pizzas, milanesas, delivery, pedir comida, fast food',
  openGraph: {
    title: 'Chefsy | Tienda Online',
    description: 'Pedí online las mejores burgers, lomos, pizzas y milas en Chefsy. ¡Rápido, fácil y riquísimo!',
    url: 'https://chefsy.com.ar',
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
      <body className={`font-sans antialiased ${playfair.variable} ${bebas.variable}`}>
        <ConfiguracionTiendaProvider>
          <ProveedorAuth>
            <ProveedorPedidos>
              {children}
            </ProveedorPedidos>
          </ProveedorAuth>
        </ConfiguracionTiendaProvider>
      </body>
    </html>
  )
}

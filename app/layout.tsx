import type { Metadata } from 'next'
import './globals.css'
import { ProveedorPedidos } from '@/contexto/PedidosContexto'
import { ProveedorAuth } from '@/contexto/AuthContexto'
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
  title: 'Chefsy',
  description: 'Sistema interno de gestión de pedidos para Chefsy',
  icons: {
    icon: '/logo.jpg',
  },
}

export default function LayoutRaiz({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`font-sans antialiased ${playfair.variable} ${bebas.variable}`}>
        <ProveedorAuth>
          <ProveedorPedidos>
            {children}
          </ProveedorPedidos>
        </ProveedorAuth>
      </body>
    </html>
  )
}

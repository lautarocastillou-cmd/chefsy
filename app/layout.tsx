import type { Metadata } from 'next'
import './globals.css'
import { ProveedorPedidos } from '@/contexto/PedidosContexto'
import { ProveedorAuth } from '@/contexto/AuthContexto'
import { Playfair_Display } from 'next/font/google'

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
      <body className={`font-sans antialiased ${playfair.variable}`}>
        <ProveedorAuth>
          <ProveedorPedidos>
            {children}
          </ProveedorPedidos>
        </ProveedorAuth>
      </body>
    </html>
  )
}

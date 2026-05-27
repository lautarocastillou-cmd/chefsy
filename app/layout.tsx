import type { Metadata } from 'next'
import './globals.css'
import { ProveedorPedidos } from '@/contexto/PedidosContexto'
import { ProveedorAuth } from '@/contexto/AuthContexto'

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
      <body className="font-sans antialiased">
        <ProveedorAuth>
          <ProveedorPedidos>
            {children}
          </ProveedorPedidos>
        </ProveedorAuth>
      </body>
    </html>
  )
}

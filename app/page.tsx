'use client'

import React from 'react'
import { ProveedorCarrito } from '@/contexto/CarritoContexto'
import TiendaDesktop from '@/components/tienda/TiendaDesktop'
import TiendaMobile from '@/components/tienda/TiendaMobile'

export default function PaginaTienda({ isMobileOverride }: { isMobileOverride?: boolean }) {
  if (isMobileOverride === true) {
    return (
      <ProveedorCarrito>
        <TiendaMobile />
      </ProveedorCarrito>
    )
  }

  if (isMobileOverride === false) {
    return (
      <ProveedorCarrito>
        <TiendaDesktop />
      </ProveedorCarrito>
    )
  }

  return (
    <ProveedorCarrito>
      {/* Vista Móvil (pantallas < 768px) */}
      <div className="block md:hidden w-full min-h-screen">
        <TiendaMobile />
      </div>
      {/* Vista Desktop (pantallas >= 768px) */}
      <div className="hidden md:block w-full min-h-screen">
        <TiendaDesktop />
      </div>
    </ProveedorCarrito>
  )
}

'use client'

import React from 'react'
import { ProveedorCarrito } from '@/contexto/CarritoContexto'
import TiendaDesktop from '@/components/tienda/TiendaDesktop'
import TiendaMobile from '@/components/tienda/TiendaMobile'
import { useMediaQuery } from '@/hooks/useMediaQuery'

export default function PaginaTienda({ isMobileOverride }: { isMobileOverride?: boolean }) {
  const isMobileDetected = useMediaQuery('(max-width: 767px)', false)
  const isMobile = isMobileOverride !== undefined ? isMobileOverride : isMobileDetected

  return (
    <ProveedorCarrito>
      {isMobile ? <TiendaMobile /> : <TiendaDesktop />}
    </ProveedorCarrito>
  )
}

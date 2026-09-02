'use client'

import React from 'react'
import { ProveedorCarrito } from '@/contexto/CarritoContexto'
import TiendaV2 from '@/components/tienda-v2/TiendaV2'

export default function PaginaTiendaV2() {
  return (
    <ProveedorCarrito>
      <TiendaV2 />
    </ProveedorCarrito>
  )
}

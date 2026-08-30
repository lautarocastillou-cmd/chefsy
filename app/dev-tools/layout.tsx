'use client'

import React from 'react'
import { ProveedorPedidos } from '@/contexto/PedidosContexto'

export default function DevToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProveedorPedidos>
      {children}
    </ProveedorPedidos>
  )
}

'use client'

import React, { useState, useEffect } from 'react'
import { ProveedorCarrito } from '@/contexto/CarritoContexto'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import TiendaDesktop from '@/components/tienda/TiendaDesktop'
import TiendaMobile from '@/components/tienda/TiendaMobile'

export default function PaginaTienda() {
  const [montado, setMontado] = useState(false)
  const esCelular = useMediaQuery('(max-width: 768px)')

  useEffect(() => {
    setMontado(true)
  }, [])

  // Prevenir desajustes de hidratación (hydration mismatch)
  // renderizando un esqueleto simple o nada hasta montar en cliente
  if (!montado) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center font-sans">
        <div className="w-8 h-8 border-4 border-chefsy border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <ProveedorCarrito>
      {esCelular ? <TiendaMobile /> : <TiendaDesktop />}
    </ProveedorCarrito>
  )
}

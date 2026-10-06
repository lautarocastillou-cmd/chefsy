'use client'

import React, { useState, useEffect } from 'react'
import { ProveedorCarrito } from '@/contexto/CarritoContexto'
import TiendaDesktop from '@/components/tienda/TiendaDesktop'
import TiendaMobile from '@/components/tienda/TiendaMobile'
import { useMediaQuery } from '@/hooks/useMediaQuery'

export default function PaginaTienda({ isMobileOverride }: { isMobileOverride?: boolean }) {
  const [montado, setMontado] = useState(false)
  const isMobileDetected = useMediaQuery('(max-width: 767px)', false)

  useEffect(() => {
    setMontado(true)
  }, [])

  if (isMobileOverride !== undefined) {
    return (
      <ProveedorCarrito>
        {isMobileOverride ? <TiendaMobile /> : <TiendaDesktop />}
      </ProveedorCarrito>
    )
  }

  // Previene el error de hidratación React #418 en dispositivos móviles (TikTok / Instagram / Safari)
  // donde el servidor no conoce el ancho de pantalla antes del montaje del cliente.
  if (!montado) {
    return (
      <ProveedorCarrito>
        <div className="min-h-screen bg-[#080E11] flex flex-col items-center justify-center p-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center animate-pulse shadow-xl">
            <img src="/logo.jpg" alt="Chefsy" className="w-9 h-9 rounded-xl object-cover" />
          </div>
          <span className="mt-4 text-[11px] font-bold tracking-widest text-slate-400 uppercase animate-pulse">
            Cargando Chefsy…
          </span>
        </div>
      </ProveedorCarrito>
    )
  }

  return (
    <ProveedorCarrito>
      {isMobileDetected ? <TiendaMobile /> : <TiendaDesktop />}
    </ProveedorCarrito>
  )
}

'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { ProveedorCarrito } from '@/contexto/CarritoContexto'
import { useMediaQuery } from '@/hooks/useMediaQuery'

function PantallaCargaInicial() {
  return (
    <div className="min-h-screen bg-[#080E11] flex flex-col items-center justify-center p-4">
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center animate-pulse shadow-xl">
        <img src="/logo.jpg" alt="Chefsy" className="w-9 h-9 rounded-xl object-cover" />
      </div>
      <span className="mt-4 text-[11px] font-bold tracking-widest text-slate-400 uppercase animate-pulse">
        Cargando Chefsy…
      </span>
    </div>
  )
}

// Carga 100% Client-Side sin SSR para evitar diferencias de hidratación entre servidor y navegador (React #418 / #423)
const TiendaMobile = dynamic(() => import('@/components/tienda/TiendaMobile'), {
  ssr: false,
  loading: () => <PantallaCargaInicial />,
})

const TiendaDesktop = dynamic(() => import('@/components/tienda/TiendaDesktop'), {
  ssr: false,
  loading: () => <PantallaCargaInicial />,
})

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

  // Previene el error de hidratación React #418 / #423 en dispositivos móviles (TikTok / Instagram / Safari / Chrome)
  // donde el servidor no conoce el ancho de pantalla antes del montaje del cliente.
  if (!montado) {
    return <PantallaCargaInicial />
  }

  return (
    <ProveedorCarrito>
      {isMobileDetected ? <TiendaMobile /> : <TiendaDesktop />}
    </ProveedorCarrito>
  )
}

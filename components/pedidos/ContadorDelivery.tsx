'use client'

import React, { useEffect, useState } from 'react'
import { Timer } from 'lucide-react'

export default function ContadorDelivery({ 
  reparto_at, 
  entregado_at 
}: { 
  reparto_at: string
  entregado_at?: string | null 
}) {
  const [minutos, setMinutos] = useState(0)

  useEffect(() => {
    if (entregado_at) {
      const ms = new Date(entregado_at).getTime() - new Date(reparto_at).getTime()
      setMinutos(Math.max(0, Math.floor(ms / 60000)))
      return
    }

    const calcular = () => {
      const ms = new Date().getTime() - new Date(reparto_at).getTime()
      setMinutos(Math.max(0, Math.floor(ms / 60000)))
    }

    calcular()
    const intervalo = setInterval(calcular, 60000)
    return () => clearInterval(intervalo)
  }, [reparto_at, entregado_at])

  if (entregado_at) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-800">
        <Timer size={12} />
        <span>Viaje: {minutos} min</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 text-[10px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded-md border border-orange-100 dark:border-orange-800 animate-pulse">
      <Timer size={12} />
      <span>En calle: {minutos} min</span>
    </div>
  )
}

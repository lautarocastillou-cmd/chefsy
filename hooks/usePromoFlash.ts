'use client'

import { useCallback, useEffect, useState } from 'react'
import type { EstadoPromoFlash } from '@/lib/promo-flash'

export function usePromoFlash() {
  const [estado, setEstado] = useState<EstadoPromoFlash | null>(null)
  const [cargando, setCargando] = useState(true)

  const refrescar = useCallback(async () => {
    try {
      const res = await fetch(`/api/tienda/promo-flash?t=${Date.now()}`, {
        cache: 'no-store',
      })
      if (!res.ok) return
      const data = await res.json()
      if (data?.ok && data?.estado) {
        setEstado(data.estado as EstadoPromoFlash)
      }
    } catch {
      // Silencioso para no interrumpir la tienda si hay microcorte de red
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void refrescar()

    const intervalo = window.setInterval(() => {
      if (!document.hidden) {
        void refrescar()
      }
    }, 30_000)

    const onVisibility = () => {
      if (!document.hidden) void refrescar()
    }
    const onRefreshEvento = () => {
      void refrescar()
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('chefsy:promo-flash-actualizada', onRefreshEvento)

    return () => {
      window.clearInterval(intervalo)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('chefsy:promo-flash-actualizada', onRefreshEvento)
    }
  }, [refrescar])

  return { estado, cargando, refrescar }
}

'use client'
// ─────────────────────────────────────────────────────
// hooks/useCadetes.ts
// Responsabilidad única: lista dinámica de cadetes y su recarga en tiempo real.
// ─────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { Cadete } from '@/lib/entrega'
import { supabaseAnon } from '@/lib/supabase'

interface UseCadetesProps {
  isAdmin?: boolean
}

function sonCadetesIguales(a: Cadete[], b: Cadete[]): boolean {
  if (a === b) return true
  if (!a || !b || a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    const cadA = a[i]
    const cadB = b[i]
    if (
      cadA.id !== cadB.id ||
      cadA.nombre !== cadB.nombre ||
      cadA.gps_activo !== cadB.gps_activo ||
      cadA.online !== cadB.online ||
      cadA.bateria !== cadB.bateria ||
      cadA.lat !== cadB.lat ||
      cadA.lng !== cadB.lng ||
      cadA.updated_at !== cadB.updated_at
    ) {
      return false
    }
  }
  return true
}

export function useCadetes({ isAdmin = false }: UseCadetesProps = {}) {
  const [cadetes, setCadetes] = useState<Cadete[]>([])

  const refrescarCadetes = async () => {
    if (!isAdmin) return
    if (document.hidden) return
    try {
      const res = await fetch('/api/admin/cadetes')
      if (res.ok) {
        const data: Cadete[] = await res.json()
        setCadetes((prev) => {
          if (sonCadetesIguales(prev, data)) {
            return prev // Mantener la misma referencia evita re-renders innecesarios en todo el árbol
          }
          return data
        })
      }
    } catch (err) {
      console.error('Error cargando cadetes:', err)
    }
  }

  useEffect(() => {
    if (!isAdmin) return

    refrescarCadetes()

    // Suscripción en tiempo real a la tabla cadetes para detectar inicio/fin de turno al instante
    const canal = supabaseAnon
      .channel('cambios-cadetes-turno')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cadetes' }, () => {
        refrescarCadetes()
      })
      .subscribe()

    // Polling de respaldo cada 12 segundos (pausado si la pestaña no está visible)
    const intervalo = setInterval(refrescarCadetes, 12000)

    const handleVisibility = () => {
      if (!document.hidden) refrescarCadetes()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(intervalo)
      document.removeEventListener('visibilitychange', handleVisibility)
      supabaseAnon.removeChannel(canal)
    }
  }, [isAdmin])

  return { cadetes, refrescarCadetes }
}

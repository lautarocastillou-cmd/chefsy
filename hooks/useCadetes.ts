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

export function useCadetes({ isAdmin = false }: UseCadetesProps = {}) {
  const [cadetes, setCadetes] = useState<Cadete[]>([])

  const refrescarCadetes = async () => {
    if (!isAdmin) return
    try {
      const res = await fetch('/api/admin/cadetes')
      if (res.ok) {
        const data = await res.json()
        setCadetes(data)
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

    // Polling de respaldo cada 12 segundos
    const intervalo = setInterval(refrescarCadetes, 12000)

    return () => {
      clearInterval(intervalo)
      supabaseAnon.removeChannel(canal)
    }
  }, [isAdmin])

  return { cadetes, refrescarCadetes }
}

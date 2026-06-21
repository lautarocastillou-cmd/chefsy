'use client'
// ─────────────────────────────────────────────────────
// hooks/useCadetes.ts
// Responsabilidad única: lista dinámica de cadetes y su recarga.
// ─────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { Cadete } from '@/lib/entrega'

export function useCadetes() {
  const [cadetes, setCadetes] = useState<Cadete[]>([])

  const refrescarCadetes = async () => {
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
    refrescarCadetes()
  }, [])

  return { cadetes, refrescarCadetes }
}

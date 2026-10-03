'use client'
// ---------------------------------------------------------------------------
// hooks/useCadetes.ts
// Responsabilidad unica: lista dinamica de cadetes y su recarga en tiempo real.
//
// Los datos SIEMPRE vienen de /api/admin/cadetes (service_role + sesion).
// La tabla `cadetes` esta cerrada a anon por RLS - contiene ubicacion en vivo y
// telefono de cada repartidor - asi que el navegador no puede consultarla
// directamente. Para enterarnos de los cambios usamos un broadcast (senal sin
// datos) que el servidor emite al guardar, y el panel refetchea por la API.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react'
import { Cadete } from '@/lib/entrega'
import { crearClienteEscucha } from '@/lib/realtime-senal'
import { CANAL_CADETES } from '@/lib/cadetes-broadcast'

// Respaldo por si se cae el websocket. Antes sonaba cada 12s ENCIMA del
// realtime, lo que hacia el doble de requests sin ganar nada: el realtime ya
// disparaba el refetch. Con broadcast la senal es best-effort, asi que un poll
// lento es la red de seguridad real.
const INTERVALO_RESPALDO_MS = 60000

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

  const refrescarCadetes = useCallback(async () => {
    if (!isAdmin) return
    if (document.hidden) return
    try {
      const res = await fetch('/api/admin/cadetes')
      if (res.ok) {
        const data: Cadete[] = await res.json()
        setCadetes((prev) => {
          if (sonCadetesIguales(prev, data)) {
            return prev // Mantener la misma referencia evita re-renders innecesarios en todo el arbol
          }
          return data
        })
      }
    } catch (err) {
      console.error('Error cargando cadetes:', err)
    }
  }, [isAdmin])

  useEffect(() => {
    if (!isAdmin) return

    refrescarCadetes()

    // Senal de cambio: el servidor avisa QUE algo cambio (sin decir QUE), y
    // nosotros volvemos a pedir los datos por la API con sesion validada.
    const cliente = crearClienteEscucha()
    const canal = cliente?.channel(CANAL_CADETES).on(
      'broadcast',
      { event: 'cambio' },
      () => { refrescarCadetes() }
    )

    if (canal) {
      canal.subscribe()
    }

    const intervalo = setInterval(refrescarCadetes, INTERVALO_RESPALDO_MS)

    const handleVisibility = () => {
      if (!document.hidden) refrescarCadetes()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(intervalo)
      document.removeEventListener('visibilitychange', handleVisibility)
      if (canal && cliente) cliente.removeChannel(canal)
    }
  }, [isAdmin, refrescarCadetes])

  return { cadetes, refrescarCadetes }
}

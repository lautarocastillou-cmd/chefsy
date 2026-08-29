'use client'
// ─────────────────────────────────────────────────────
// hooks/usePedidosRealtime.ts
// Responsabilidad única: carga inicial de pedidos con SWR
// y suscripción al canal realtime para recibir cambios
// en tiempo real de otros dispositivos, mutando el caché.
// ─────────────────────────────────────────────────────

import { useState, useEffect, MutableRefObject } from 'react'
import useSWR from 'swr'
import { Pedido } from '@/tipos'
import { obtenerPedidosActivos, suscribirAPedidos } from '@/servicios/supabase/pedidos'

type AccionDespachar =
  | { tipo: 'CARGAR_PEDIDOS'; pedidos: Pedido[] }
  | { tipo: 'ELIMINAR_PEDIDO'; id: string }
  | { tipo: 'UPSERT_PEDIDO'; pedido: Pedido }

interface UsePedidosRealtimeProps {
  despachar: (accion: AccionDespachar) => void
  prevPedidosRef: MutableRefObject<Pedido[]>
  cambiosLocalesRef: MutableRefObject<Record<string, number>>
}

const fetcher = async () => {
  const data = await obtenerPedidosActivos(100)
  return (data || []) as Pedido[]
}

export function usePedidosRealtime({
  despachar,
  prevPedidosRef,
  cambiosLocalesRef,
}: UsePedidosRealtimeProps) {
  const [estaListo, setEstaListo] = useState(false)
  const [dbEstado, setDbEstado] = useState<'conectado' | 'desconectado' | 'cargando'>('cargando')

  // 1) Carga inicial y caché con SWR (Stale-While-Revalidate)
  const { data: pedidosSWR, error, mutate } = useSWR('pedidosActivos', fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 0,
    fallbackData: [],
  })

  // Sincronizar SWR con el estado local
  useEffect(() => {
    if (error) {
      console.error('[SWR] Error cargando pedidos:', error)
      setDbEstado('desconectado')
      setEstaListo(true)
      return
    }

    if (pedidosSWR) {
      // Proteger cambios locales recientes: si un pedido fue modificado
      // localmente en los últimos 10 segundos, preservar la versión local
      // en lugar de sobreescribirla con datos potencialmente desactualizados
      // del servidor (ej. SWR revalidateOnFocus tras un swipe en cadetería).
      const ahora = Date.now()
      const idsProtegidos = new Set(
        Object.entries(cambiosLocalesRef.current)
          .filter(([, ts]) => ahora - ts < 10000)
          .map(([id]) => id)
      )

      if (idsProtegidos.size > 0 && prevPedidosRef.current.length > 0) {
        // Merge: tomar la versión local de los pedidos protegidos
        const localesPorId = new Map(
          prevPedidosRef.current
            .filter(p => idsProtegidos.has(p.id))
            .map(p => [p.id, p])
        )
        const idsEnSWR = new Set(pedidosSWR.map(p => p.id))
        const nuevosLocalesFaltantes = Array.from(localesPorId.values()).filter(p => !idsEnSWR.has(p.id))
        const pedidosMerged = [
          ...nuevosLocalesFaltantes,
          ...pedidosSWR.map(p => localesPorId.has(p.id) ? localesPorId.get(p.id)! : p)
        ]
        despachar({ tipo: 'CARGAR_PEDIDOS', pedidos: pedidosMerged })
        prevPedidosRef.current = pedidosMerged
      } else {
        despachar({ tipo: 'CARGAR_PEDIDOS', pedidos: pedidosSWR })
        prevPedidosRef.current = pedidosSWR
      }

      setDbEstado('conectado')
      setEstaListo(true)
    }
  }, [pedidosSWR, error, despachar, prevPedidosRef, cambiosLocalesRef])

  // 2) Suscripción a Supabase Realtime
  useEffect(() => {
    if (!estaListo) return

    const channel = suscribirAPedidos(
      (pedido, archivado) => {
        const ultCambio = cambiosLocalesRef.current[pedido.id] || 0
        if (Date.now() - ultCambio < 10000) return

        if (archivado) {
          despachar({ tipo: 'ELIMINAR_PEDIDO', id: pedido.id })
          mutate((current) => current ? current.filter((p) => p.id !== pedido.id) : [], false)
        } else {
          despachar({ tipo: 'UPSERT_PEDIDO', pedido })
          mutate((current) => {
            if (!current) return [pedido]
            const exists = current.some((p) => p.id === pedido.id)
            return exists 
              ? current.map((p) => p.id === pedido.id ? pedido : p)
              : [pedido, ...current]
          }, false)
        }
      },
      (id) => {
        const ultCambio = cambiosLocalesRef.current[id] || 0
        if (Date.now() - ultCambio < 10000) return
        despachar({ tipo: 'ELIMINAR_PEDIDO', id })
        mutate((current) => current ? current.filter((p) => p.id !== id) : [], false)
      }
    )

    return () => {
      channel.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estaListo])

  return { estaListo, dbEstado, setDbEstado }
}

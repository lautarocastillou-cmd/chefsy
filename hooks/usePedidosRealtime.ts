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
  eliminadosLocalesRef?: MutableRefObject<Record<string, number>>
  habilitado?: boolean
}

const fetcher = async () => {
  const data = await obtenerPedidosActivos(100)
  return (data || []) as Pedido[]
}

export function usePedidosRealtime({
  despachar,
  prevPedidosRef,
  cambiosLocalesRef,
  eliminadosLocalesRef,
  habilitado = true,
}: UsePedidosRealtimeProps) {
  const [estaListo, setEstaListo] = useState(!habilitado)
  const [dbEstado, setDbEstado] = useState<'conectado' | 'desconectado' | 'cargando'>(
    habilitado ? 'cargando' : 'conectado'
  )

  // 1) Carga inicial y caché con SWR (solo se ejecuta si es staff)
  const { data: pedidosSWR, error, mutate } = useSWR(
    habilitado ? 'pedidosActivos' : null,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 0,
      dedupingInterval: 4000,
      fallbackData: [],
    }
  )

  // Sincronizar SWR con el estado local
  useEffect(() => {
    if (!habilitado) {
      setEstaListo(true)
      setDbEstado('conectado')
      return
    }

    if (error) {
      console.error('[SWR] Error cargando pedidos:', error)
      setDbEstado('desconectado')
      setEstaListo(true)
      return
    }

    if (pedidosSWR) {
      const ahora = Date.now()
      const eliminadosMap = eliminadosLocalesRef?.current || {}
      const idsEliminados = new Set(
        Object.entries(eliminadosMap)
          .filter(([, ts]) => ahora - ts < 30000)
          .map(([id]) => id)
      )

      const pedidosSWRFiltrados = pedidosSWR.filter(p => !idsEliminados.has(p.id))

      // Evitar bucle infinito de re-render si los pedidos no cambiaron
      const prev = prevPedidosRef.current || []
      const sonIguales = prev.length === pedidosSWRFiltrados.length &&
        prev.every((p, i) => {
          const s = pedidosSWRFiltrados[i]
          return s && p.id === s.id && p.estado === s.estado && p.hora === s.hora && p.cadete_id === s.cadete_id
        })

      if (!sonIguales) {
        despachar({ tipo: 'CARGAR_PEDIDOS', pedidos: pedidosSWRFiltrados })
        prevPedidosRef.current = pedidosSWRFiltrados
      }
      setDbEstado('conectado')
      setEstaListo(true)
    }
  }, [pedidosSWR, error, despachar, prevPedidosRef, eliminadosLocalesRef, habilitado])

  // 2) Suscripción a Supabase Realtime (solo si está habilitado y autenticado)
  useEffect(() => {
    if (!estaListo || !habilitado) return

    const channel = suscribirAPedidos(
      (pedido, archivado) => {
        // Si el pedido fue eliminado localmente recientemente, ignorar cualquier eco
        if (eliminadosLocalesRef?.current?.[pedido.id]) {
          const tiempoEliminado = Date.now() - eliminadosLocalesRef.current[pedido.id]
          if (tiempoEliminado < 30000) return
        }

        const ultCambio = cambiosLocalesRef.current[pedido.id] || 0
        // Ignorar rebote/eco local durante 3 segundos
        if (Date.now() - ultCambio < 3000) return

        if (archivado) {
          despachar({ tipo: 'ELIMINAR_PEDIDO', id: pedido.id })
          prevPedidosRef.current = prevPedidosRef.current.filter((p) => p.id !== pedido.id)
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
        despachar({ tipo: 'ELIMINAR_PEDIDO', id })
        prevPedidosRef.current = prevPedidosRef.current.filter((p) => p.id !== id)
        mutate((current) => current ? current.filter((p) => p.id !== id) : [], false)
      }
    )

    return () => {
      channel.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estaListo, habilitado])

  return { estaListo, dbEstado, setDbEstado, mutate }
}

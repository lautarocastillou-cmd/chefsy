// Responsabilidad única: carga de pedidos con SWR y reacción a los cambios
// en vivo. Aísla la sincronización de datos de la lógica de negocio.

'use client'

import { useState, useEffect, useRef, MutableRefObject } from 'react'
import useSWR from 'swr'
import { Pedido } from '@/tipos'
import { obtenerPedidosActivos, suscribirAPedidos } from '@/servicios/supabase/pedidos'
import {
  leerColaOffline,
  reconciliarPedidosConEstadoLocal,
  type RegistroCambioLocal,
} from '@/lib/pedidos-reconciliacion'

export type { RegistroCambioLocal }

export type AccionDespachar =
  | { tipo: 'CARGAR_PEDIDOS'; pedidos: Pedido[] }
  | { tipo: 'ELIMINAR_PEDIDO'; id: string }
  | { tipo: 'UPSERT_PEDIDO'; pedido: Pedido }

interface UsePedidosRealtimeProps {
  despachar: (accion: AccionDespachar) => void
  prevPedidosRef?: MutableRefObject<Pedido[]>
  cambiosLocalesRef?: MutableRefObject<Record<string, RegistroCambioLocal>>
  eliminadosLocalesRef?: MutableRefObject<Record<string, number>>
  habilitado?: boolean
}

function sonPedidosIguales(a: Pedido[], b: Pedido[]): boolean {
  if (a === b) return true
  if (!a || !b || a.length !== b.length) return false

  const mapB = new Map<string, Pedido>()
  for (let i = 0; i < b.length; i++) {
    mapB.set(b[i].id, b[i])
  }

  for (let i = 0; i < a.length; i++) {
    const pA = a[i]
    const pB = mapB.get(pA.id)
    if (!pB) return false

    if (
      pA.estado !== pB.estado ||
      pA.cadete_id !== pB.cadete_id ||
      pA.cadete_nombre !== pB.cadete_nombre ||
      pA.metodoPago !== pB.metodoPago ||
      pA.pago_confirmado !== pB.pago_confirmado ||
      pA.montoEfectivo !== pB.montoEfectivo ||
      pA.montoTransferencia !== pB.montoTransferencia ||
      pA.montoTarjeta !== pB.montoTarjeta ||
      pA.orden_entrega !== pB.orden_entrega ||
      pA.total !== pB.total ||
      pA.hora !== pB.hora ||
      pA.fecha !== pB.fecha ||
      pA.observaciones !== pB.observaciones ||
      pA.direccion !== pB.direccion ||
      pA.tipoEntrega !== pB.tipoEntrega ||
      pA.cocina_at !== pB.cocina_at ||
      pA.listo_at !== pB.listo_at ||
      pA.en_camino_at !== pB.en_camino_at ||
      pA.entregado_at !== pB.entregado_at ||
      pA.productos?.length !== pB.productos?.length
    ) {
      return false
    }
  }

  return true
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

  // Ref interna para comparar si la data de SWR cambió, SIN mutar prevPedidosRef del contexto
  const swrPrevRef = useRef<Pedido[]>([])

  // 1) Carga inicial y caché con SWR (solo se ejecuta si es staff)
  const { data: pedidosSWR, error, mutate } = useSWR(
    habilitado ? 'pedidosActivos' : null,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 6000,
      dedupingInterval: 1000,
      fallbackData: [],
    }
  )

  useEffect(() => {
    if (!habilitado) {
      setEstaListo(true)
      setDbEstado('conectado')
      return
    }

    if (error) {
      setDbEstado('desconectado')
      console.error('[SWR] Error cargando pedidos:', error)
    }

    if (pedidosSWR) {
      const ahora = Date.now()
      const colaOffline =
        typeof window !== 'undefined' ? leerColaOffline(window.localStorage, ahora).items : []

      const pedidosSWRFiltrados = reconciliarPedidosConEstadoLocal({
        pedidosServidor: pedidosSWR,
        pedidosLocalesPrevios: prevPedidosRef?.current || swrPrevRef.current,
        cambiosMap: cambiosLocalesRef?.current || {},
        eliminadosMap: eliminadosLocalesRef?.current || {},
        colaOffline,
        ahora,
      })

      // Evitar bucle infinito de re-render si los pedidos no cambiaron
      const prev = swrPrevRef.current
      const sonIguales = sonPedidosIguales(prev, pedidosSWRFiltrados)

      if (!sonIguales) {
        swrPrevRef.current = pedidosSWRFiltrados
        despachar({ tipo: 'CARGAR_PEDIDOS', pedidos: pedidosSWRFiltrados })
      }
      setDbEstado('conectado')
      setEstaListo(true)
    }
  }, [pedidosSWR, error, despachar, eliminadosLocalesRef, prevPedidosRef, cambiosLocalesRef, habilitado])

  // 2) Señal de cambio en vivo (canal broadcast) + poll de SWR como respaldo
  //
  // El canal ya NO entrega el pedido: solo avisa que algo cambió, sin datos.
  // Por eso la reacción correcta es `mutate()` (refetch por el route handler
  // autenticado) y no aplicar el payload. Así no hay forma de que alguien
  // inyecte un pedido falso por el canal, ni de que la PII viaje por Realtime.
  useEffect(() => {
    if (!estaListo || !habilitado) return

    const channel = suscribirAPedidos(() => {
      // Refetch en lugar de aplicar el payload. El canal no trae datos
      // (solo {id, tipo}), y SWR descarta respuestas idénticas por el
      // `sonIguales` del efecto 1, así que no hay riesgo de bucle.
      mutate()
    })

    return () => {
      channel?.unsubscribe()
    }
   
  }, [estaListo, habilitado, mutate])

  // Difundir estado de conexión para herramientas de diagnóstico
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('chefsy:realtime-estado', { detail: dbEstado }))
    }
  }, [dbEstado])

  // Escuchar evento de reconexión forzada desde DevTools
  useEffect(() => {
    const handleReconectar = () => {
      setDbEstado('cargando')
      mutate().then(() => {
        setDbEstado('conectado')
      })
    }
    window.addEventListener('chefsy:forzar-reconexion-realtime', handleReconectar)
    return () => window.removeEventListener('chefsy:forzar-reconexion-realtime', handleReconectar)
  }, [mutate])

  return { estaListo, dbEstado, setDbEstado, mutate }
}

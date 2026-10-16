// Responsabilidad única: carga de pedidos con SWR y reacción a los cambios
// en vivo. Aísla la sincronización de datos de la lógica de negocio.

'use client'

import { useState, useEffect, useRef, MutableRefObject } from 'react'
import useSWR from 'swr'
import { Pedido } from '@/tipos'
import { obtenerPedidosActivos, suscribirAPedidos } from '@/servicios/supabase/pedidos'

export type AccionDespachar =
  | { tipo: 'CARGAR_PEDIDOS'; pedidos: Pedido[] }
  | { tipo: 'ELIMINAR_PEDIDO'; id: string }
  | { tipo: 'UPSERT_PEDIDO'; pedido: Pedido }

interface UsePedidosRealtimeProps {
  despachar: (accion: AccionDespachar) => void
  prevPedidosRef?: MutableRefObject<Pedido[]>
  cambiosLocalesRef?: MutableRefObject<Record<string, number>>
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
      const eliminadosMap = eliminadosLocalesRef?.current || {}
      const idsEliminados = new Set(
        Object.entries(eliminadosMap)
          .filter(([, ts]) => ahora - ts < 30000)
          .map(([id]) => id)
      )

      let pedidosSWRFiltrados = pedidosSWR.filter(p => !idsEliminados.has(p.id))

      // ── Ventana de protección de mutaciones locales recientes (Optimistic Lock) ──
      // Si el usuario modificó recientemente un pedido (hace menos de 5s) y el servidor
      // responde antes de que la DB haya completado la réplica o sirvió caché HTTP,
      // protegemos el cambio local del usuario para no parpadear ni revertir su acción.
      const cambiosMap = cambiosLocalesRef?.current || {}
      const pedidosLocalesActuales = prevPedidosRef?.current || []
      const mapaLocales = new Map(pedidosLocalesActuales.map(p => [p.id, p]))

      pedidosSWRFiltrados = pedidosSWRFiltrados.map((pServidor) => {
        const tsCambio = cambiosMap[pServidor.id]
        if (!tsCambio || ahora - tsCambio >= 5000) {
          return pServidor
        }

        const pLocal = mapaLocales.get(pServidor.id)
        if (!pLocal) return pServidor

        let preservado = { ...pServidor }
        let huboDiferencia = false

        if (pLocal.cadete_id !== pServidor.cadete_id || pLocal.cadete_nombre !== pServidor.cadete_nombre) {
          preservado.cadete_id = pLocal.cadete_id
          preservado.cadete_nombre = pLocal.cadete_nombre
          huboDiferencia = true
        }

        if (pLocal.metodoPago !== pServidor.metodoPago) {
          preservado.metodoPago = pLocal.metodoPago
          preservado.montoEfectivo = pLocal.montoEfectivo
          preservado.montoTransferencia = pLocal.montoTransferencia
          preservado.montoTarjeta = pLocal.montoTarjeta
          huboDiferencia = true
        }

        if (pLocal.pago_confirmado !== pServidor.pago_confirmado) {
          preservado.pago_confirmado = pLocal.pago_confirmado
          huboDiferencia = true
        }

        // Si el servidor ya tiene exactamente los mismos valores, liberamos el lock local
        if (!huboDiferencia) {
          delete cambiosMap[pServidor.id]
        }

        return preservado
      })

      // Un pedido recién creado o editado de forma optimista puede no aparecer aún
      // en una respuesta del servidor que comenzó antes de terminar el POST. Conservarlo
      // temporalmente evita que desaparezca de la pantalla durante ese intervalo.
      const idsRecibidos = new Set(pedidosSWRFiltrados.map((p) => p.id))
      const pedidosLocalesParaAgregar = prevPedidosRef?.current || swrPrevRef.current
      for (const pedidoLocal of pedidosLocalesParaAgregar) {
        const cambioLocalAt = cambiosMap[pedidoLocal.id] || 0
        if (
          !idsRecibidos.has(pedidoLocal.id) &&
          !idsEliminados.has(pedidoLocal.id) &&
          cambioLocalAt > 0 &&
          ahora - cambioLocalAt < 5000
        ) {
          pedidosSWRFiltrados.push(pedidoLocal)
        }
      }

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

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
  // `cambiosLocalesRef` ya no se usa acá: servía para descartar el eco del
  // canal postgres_changes, que entregaba el pedido completo. Con el canal
  // broadcast el refetch reemplaza todo el estado, así que no hay eco que
  // filtrar. Se mantiene en la firma para no romper al llamador.
  cambiosLocalesRef?: MutableRefObject<Record<string, number>>
  eliminadosLocalesRef?: MutableRefObject<Record<string, number>>
  habilitado?: boolean
}

const fetcher = async () => {
  const data = await obtenerPedidosActivos(100)
  return (data || []) as Pedido[]
}

export function usePedidosRealtime({
  despachar,
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
      // Red de contención: si el broadcast se pierde, el panel se actualiza
      // igual. Bajado de 10s a 6s porque ahora cada refresh es un route
      // handler con service_role (más caro que el select directo que había
      // antes), pero a la vez la respuesta trae los datos ya filtrados por
      // servidor. Es el punto de equilibrio entre frescura y carga.
      refreshInterval: 6000,
      dedupingInterval: 3000,
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

      const pedidosSWRFiltrados = pedidosSWR.filter(p => !idsEliminados.has(p.id))

      // Una mutación optimista puede terminar después de que arranque el
      // polling o el refetch disparado por broadcast. Durante esa ventana el
      // servidor todavía puede devolver el estado anterior. No pisar el
      // cambio local reciente evita que una tarjeta desaparezca, retroceda de
      // estado o vuelva a mostrar el cadete anterior durante unos segundos.
      const cambiosLocales = cambiosLocalesRef?.current || {}
      const pedidosConCambiosLocales = pedidosSWRFiltrados.map((pedido) => {
        const cambioLocalAt = cambiosLocales[pedido.id] || 0
        if (cambioLocalAt > 0 && ahora - cambioLocalAt < 5000) {
          const pedidoLocal = swrPrevRef.current.find((p) => p.id === pedido.id)
          if (pedidoLocal) return pedidoLocal
        }
        return pedido
      })

      // Un pedido creado o editado de forma optimista puede no aparecer aún
      // en una respuesta que comenzó antes de terminar el POST. Conservarlo
      // temporalmente también cuando falta por completo en el array evita que
      // desaparezca de /pedidos durante ese intervalo.
      const idsRecibidos = new Set(pedidosConCambiosLocales.map((p) => p.id))
      for (const pedidoLocal of swrPrevRef.current) {
        const cambioLocalAt = cambiosLocales[pedidoLocal.id] || 0
        if (
          !idsRecibidos.has(pedidoLocal.id) &&
          !idsEliminados.has(pedidoLocal.id) &&
          cambioLocalAt > 0 &&
          ahora - cambioLocalAt < 5000
        ) {
          pedidosConCambiosLocales.push(pedidoLocal)
        }
      }

      // Evitar bucle infinito de re-render si los pedidos no cambiaron
      const prev = swrPrevRef.current
      const sonIguales = prev.length === pedidosConCambiosLocales.length &&
        prev.every((p, i) => {
          const s = pedidosConCambiosLocales[i]
          return s && p.id === s.id && p.estado === s.estado && p.hora === s.hora && p.cadete_id === s.cadete_id
        })

      if (!sonIguales) {
        swrPrevRef.current = pedidosConCambiosLocales
        despachar({ tipo: 'CARGAR_PEDIDOS', pedidos: pedidosConCambiosLocales })
      }
      setDbEstado('conectado')
      setEstaListo(true)
    }
  }, [pedidosSWR, error, despachar, eliminadosLocalesRef, habilitado])

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

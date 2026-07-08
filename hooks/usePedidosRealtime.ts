'use client'
// ─────────────────────────────────────────────────────
// hooks/usePedidosRealtime.ts
// Responsabilidad única: carga inicial de pedidos desde
// Supabase (con fallback al caché de localStorage) y
// suscripción al canal realtime para recibir cambios
// en tiempo real de otros dispositivos.
// ─────────────────────────────────────────────────────

import { useState, useEffect, MutableRefObject } from 'react'
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

export function usePedidosRealtime({
  despachar,
  prevPedidosRef,
  cambiosLocalesRef,
}: UsePedidosRealtimeProps) {
  const [estaListo, setEstaListo] = useState(false)
  const [dbEstado, setDbEstado] = useState<'conectado' | 'desconectado' | 'cargando'>('cargando')

  // 1) Carga inicial: Supabase con fallback al caché de localStorage
  useEffect(() => {
    async function cargarInicial() {
      const estaOnline = typeof navigator !== 'undefined' ? navigator.onLine : true

      try {
        if (!estaOnline) {
          throw new Error('Navegador offline')
        }

        // Se eliminó la validación de sesión (race condition) porque ahora se usa supabaseAnon 
        // para la obtención de pedidos, evitando el bug de Web Lock.

        const pedidosGuardados = await obtenerPedidosActivos(100)
        setDbEstado('conectado')

        if (pedidosGuardados) {
          despachar({ tipo: 'CARGAR_PEDIDOS', pedidos: pedidosGuardados as Pedido[] })
          prevPedidosRef.current = pedidosGuardados as Pedido[]
        }
      } catch (error) {
        console.error('[Supabase] Error al cargar pedidos, intentando recuperar del caché:', error)
        setDbEstado('desconectado')

        const cache = localStorage.getItem('chefsy-pedidos-cache-v1')
        if (cache) {
          try {
            const pedidosCache = JSON.parse(cache) as Pedido[]
            // Cargar solo los no archivados del caché
            const noArchivados = pedidosCache.filter((p) => !(p as any).archivado)
            despachar({ tipo: 'CARGAR_PEDIDOS', pedidos: noArchivados })
            prevPedidosRef.current = noArchivados
          } catch (e) {
            console.error('Error al parsear el caché de pedidos:', e)
          }
        }
      } finally {
        setEstaListo(true)
      }
    }
    cargarInicial()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 2) Suscripción a Supabase Realtime — solo cuando la carga inicial terminó
  useEffect(() => {
    if (!estaListo) return

    const channel = suscribirAPedidos(
      (pedido, archivado) => {
        const ultCambio = cambiosLocalesRef.current[pedido.id] || 0
        if (Date.now() - ultCambio < 4000) return

        if (archivado) {
          despachar({ tipo: 'ELIMINAR_PEDIDO', id: pedido.id })
        } else {
          despachar({ tipo: 'UPSERT_PEDIDO', pedido })
        }
      },
      (id) => {
        const ultCambio = cambiosLocalesRef.current[id] || 0
        if (Date.now() - ultCambio < 4000) return
        despachar({ tipo: 'ELIMINAR_PEDIDO', id })
      }
    )

    return () => {
      channel.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estaListo])

  return { estaListo, dbEstado, setDbEstado }
}

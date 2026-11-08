'use client'

import { useEffect, useRef } from 'react'
import { usarPedidos } from '@/contexto/PedidosContexto'
import { gestorImpresora } from '@/lib/impresion/impresoraTermica'
import { encolarComandaAutomatica } from '@/lib/impresion/autoImpresion'
import { notificarError } from '@/lib/notificaciones'

/**
 * Vigila los pedidos nuevos mientras el panel de administración está abierto.
 * No imprime el historial cargado al entrar: toma una línea base y recién
 * después envía a cocina los pedidos que aparezcan.
 */
function obtenerMomentoPedido(pedido: {
  created_at?: string
  fecha?: string
  hora?: string
}): number | null {
  if (pedido.created_at) {
    const momento = new Date(pedido.created_at).getTime()
    if (!Number.isNaN(momento)) return momento
  }

  if (pedido.fecha && pedido.hora) {
    const momento = new Date(`${pedido.fecha}T${pedido.hora}:00`).getTime()
    if (!Number.isNaN(momento)) return momento
  }

  return null
}

export default function AutoImpresionPedidos() {
  const { pedidos, estaListo, cambiarEstado } = usarPedidos()
  const idsConocidosRef = useRef<Set<string> | null>(null)
  const inicioPanelRef = useRef<number | null>(null)

  useEffect(() => {
    if (!estaListo) {
      idsConocidosRef.current = null
      inicioPanelRef.current = null
      return
    }

    if (inicioPanelRef.current === null) {
      inicioPanelRef.current = Date.now()
    }

    const idsActuales = new Set(pedidos.map((pedido) => pedido.id))

    if (idsConocidosRef.current === null) {
      idsConocidosRef.current = idsActuales
      return
    }

    const idsAnteriores = idsConocidosRef.current
    const nuevos = pedidos.filter((pedido) => {
      if (idsAnteriores.has(pedido.id)) return false
      if (pedido.estado === 'cancelado' || pedido.estado === 'entregado') return false

      // Evita imprimir pedidos que ya estaban activos cuando se abrió el panel.
      // Un pedido creado mientras el panel está abierto sí entra en la ventana.
      const momentoPedido = obtenerMomentoPedido(pedido)
      return momentoPedido === null || momentoPedido >= inicioPanelRef.current! - 5000
    })

    idsConocidosRef.current = idsActuales

    if (nuevos.length === 0) return
    if (!gestorImpresora.obtenerConfiguracion().autoImprimirPedidosNuevos) return

    nuevos
      .slice()
      .sort(
        (a, b) =>
          (obtenerMomentoPedido(a) ?? 0) -
          (obtenerMomentoPedido(b) ?? 0)
      )
      .forEach((pedido) => {
        // Mismo comportamiento que la impresión manual: al mandar la comanda
        // a cocina, el pedido deja de estar pendiente de aceptación.
        if (pedido.estado === 'nuevo') {
          void cambiarEstado(pedido.id, 'en_cocina')
        }

        encolarComandaAutomatica(pedido, () => {
          notificarError(`No se pudo imprimir automáticamente la comanda de ${pedido.cliente}.`)
        })
      })
  }, [pedidos, estaListo, cambiarEstado])

  return null
}

'use client'
// ─────────────────────────────────────────────────────
// contexto/PedidosContexto.tsx
// Orquestador principal del dominio de pedidos.
//
// Responsabilidades que quedan acá (solo CRUD y wiring):
//   • Reducer de pedidos (puro, sin side-effects)
//   • Operaciones CRUD: agregar, editar, cambiarEstado,
//     revertirEstado, marcarPago, asignarCadete,
//     cambiarMetodoPago, eliminar, finalizarTurno,
//     obtenerPedidosPorFecha
//   • Configuración operativa
//   • Notificaciones reactivas al cambio de pedidos
//   • Delegación a hooks especializados:
//       usePedidosRealtime, useSincronizacionOffline,
//       useAlertasInactividad, useTurno, useCadetes
//
// La API pública (usarPedidos) es idéntica a la versión
// anterior — ningún componente consumidor necesita cambios.
// ─────────────────────────────────────────────────────

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  ReactNode,
} from 'react'
import { Pedido, EstadoPedido } from '@/tipos'
import { Cadete } from '@/lib/entrega'
import { CategoriaCatalogo, ProductoCatalogo, ModificadorCatalogo } from '@/tipos/catalogo'
import { obtenerPedidosHistoricos } from '@/servicios/supabase/pedidos'
import { usarAuth } from '@/contexto/AuthContexto'
import {
  usarTemaNotificacion,
  ProveedorTemaNotificacion,
  reproducirSonidoNotificacion,
  reproducirSonidoCampanaCocina,
} from './TemaNotificacionContexto'
import { usarCatalogo, ProveedorCatalogo } from './CatalogoContexto'
import configuracionOperativaInicial from '../config/operacion.json'
import { actualizarConfiguracionLocal } from '../lib/problemas'
import { usePathname } from 'next/navigation'

// Hooks especializados
import { usePedidosRealtime } from '@/hooks/usePedidosRealtime'
import { useSincronizacionOffline } from '@/hooks/useSincronizacionOffline'
import { useAlertasInactividad } from '@/hooks/useAlertasInactividad'
import { useTurno } from '@/hooks/useTurno'
import { useCadetes } from '@/hooks/useCadetes'

// Re-exportar interfaz de Notificación para mantener compatibilidad
export type { Notificacion } from './TemaNotificacionContexto'

// ── Acciones del reducer ──────────────────────────────

type AccionPedidos =
  | { tipo: 'CARGAR_PEDIDOS'; pedidos: Pedido[] }
  | { tipo: 'AGREGAR_PEDIDO'; pedido: Pedido }
  | { tipo: 'EDITAR_PEDIDO'; pedido: Pedido }
  | {
      tipo: 'CAMBIAR_ESTADO'
      id: string
      estado: EstadoPedido
      cocina_at: string | null
      listo_at: string | null
      entregado_at: string | null
    }
  | { tipo: 'ELIMINAR_PEDIDO'; id: string }
  | { tipo: 'UPSERT_PEDIDO'; pedido: Pedido }

interface EstadoGlobal {
  pedidos: Pedido[]
}

const estadoInicial: EstadoGlobal = {
  pedidos: [],
}

function reducerPedidos(estado: EstadoGlobal, accion: AccionPedidos): EstadoGlobal {
  switch (accion.tipo) {
    case 'CARGAR_PEDIDOS':
      return { pedidos: accion.pedidos }

    case 'AGREGAR_PEDIDO':
      if (estado.pedidos.some((p) => p.id === accion.pedido.id)) return estado
      return {
        pedidos: [accion.pedido, ...estado.pedidos],
      }

    case 'UPSERT_PEDIDO': {
      const existe = estado.pedidos.some((p) => p.id === accion.pedido.id)
      if (existe) {
        return {
          pedidos: estado.pedidos.map((p) => (p.id === accion.pedido.id ? accion.pedido : p)),
        }
      }
      return {
        pedidos: [accion.pedido, ...estado.pedidos].sort(
          (a, b) =>
            new Date(b.created_at || b.fecha).getTime() -
            new Date(a.created_at || a.fecha).getTime()
        ),
      }
    }

    case 'EDITAR_PEDIDO':
      return {
        pedidos: estado.pedidos.map((p) => (p.id === accion.pedido.id ? accion.pedido : p)),
      }

    case 'CAMBIAR_ESTADO':
      return {
        pedidos: estado.pedidos.map((p) =>
          p.id === accion.id
            ? {
                ...p,
                estado: accion.estado,
                cocina_at: accion.cocina_at,
                listo_at: accion.listo_at,
                entregado_at: accion.entregado_at,
              }
            : p
        ),
      }

    case 'ELIMINAR_PEDIDO':
      return {
        pedidos: estado.pedidos.filter((p) => p.id !== accion.id),
      }

    default:
      return estado
  }
}

// ── Tipos exportados ──────────────────────────────────

export interface EstadoTurno {
  activo: boolean
  cajaInicial: number
  fechaInicio: string | null
}

interface ValorContextoPedidosInterno {
  pedidos: Pedido[]
  cadetes: Cadete[]
  estaListo: boolean
  agregarPedido: (pedido: Pedido) => void
  editarPedido: (pedido: Pedido) => void
  cambiarEstado: (id: string, estado: EstadoPedido, mostrarDeshacer?: boolean) => void
  revertirEstado: (id: string) => void
  marcarPagoConfirmado: (id: string, confirmado: boolean) => void
  asignarCadete: (id: string, cadete_id: string | null, cadete_nombre: string | null) => void
  cambiarMetodoPago: (id: string, metodoPago: string) => void
  eliminarPedido: (id: string) => void
  dbEstado: 'conectado' | 'desconectado' | 'cargando'
  finalizarTurno: () => Promise<void>
  obtenerPedidosPorFecha: (fecha: string) => Promise<Pedido[]>
  configuracionOperativa: typeof configuracionOperativaInicial
  guardarConfiguracionOperativa: (nuevaConfig: typeof configuracionOperativaInicial) => Promise<boolean>
  refrescarCadetes: () => Promise<void>
  estadoTurno: EstadoTurno
  iniciarTurno: (cajaInicial: number) => Promise<boolean>
}

const ContextoPedidosInterno = createContext<ValorContextoPedidosInterno | undefined>(undefined)

// ── Helper de campos de tiempo (exportado para uso externo) ──

export function obtenerCamposDeTiempoParaEstado(
  nuevoEstado: EstadoPedido,
  pedidoActual: Pedido
): {
  estado: EstadoPedido
  cocina_at: string | null
  listo_at: string | null
  entregado_at: string | null
} {
  const ahora = new Date().toISOString()

  let cocina_at = pedidoActual.cocina_at || null
  let listo_at = pedidoActual.listo_at || null
  let entregado_at = pedidoActual.entregado_at || null

  if (nuevoEstado === 'nuevo') {
    cocina_at = null
    listo_at = null
    entregado_at = null
  } else if (nuevoEstado === 'en_cocina') {
    if (!cocina_at) cocina_at = ahora
    listo_at = null
    entregado_at = null
  } else if (nuevoEstado === 'listo') {
    if (!cocina_at) cocina_at = pedidoActual.created_at || ahora
    if (!listo_at) listo_at = ahora
    entregado_at = null
  } else if (nuevoEstado === 'entregado' || nuevoEstado === 'cancelado') {
    if (!cocina_at) cocina_at = pedidoActual.created_at || ahora
    if (!listo_at) listo_at = cocina_at || ahora
    if (!entregado_at) entregado_at = ahora
  }

  return { estado: nuevoEstado, cocina_at, listo_at, entregado_at }
}

// ── Proveedor Interno ─────────────────────────────────

function ProveedorPedidosInterno({ children }: { children: ReactNode }) {
  const [estado, despachar] = useReducer(reducerPedidos, estadoInicial)
  const pathname = usePathname()

  const prevPedidosRef = useRef<Pedido[]>([])
  const esCambioLocalRef = useRef(false)

  const { usuarioActivo } = usarAuth()
  const { agregarNotificacion } = usarTemaNotificacion()
  const isAdmin = usuarioActivo?.rol === 'admin'

  // ── Hooks especializados ──────────────────────────────

  const { estaListo, dbEstado, setDbEstado } = usePedidosRealtime({
    despachar,
    prevPedidosRef,
    esCambioLocalRef,
  })

  useSincronizacionOffline({ setDbEstado, agregarNotificacion, isAdmin })

  const { cadetes, refrescarCadetes } = useCadetes({ isAdmin })

  const { estadoTurno, setEstadoTurno, iniciarTurno } = useTurno({ agregarNotificacion, isAdmin })

  useAlertasInactividad({
    pedidos: estado.pedidos,
    usuarioActivo,
    agregarNotificacion,
  })

  // ── Configuración operativa ───────────────────────────
  const [configuracionOperativa, setConfiguracionOperativa] = React.useState<
    typeof configuracionOperativaInicial
  >(configuracionOperativaInicial)

  useEffect(() => {
    if (!isAdmin) return;
    
    async function cargarConfig() {
      try {
        const res = await fetch('/api/admin/configuracion')
        if (res.ok) {
          const config = await res.json()
          setConfiguracionOperativa(config)
          actualizarConfiguracionLocal(config)
        }
      } catch (err) {
        console.error('Error cargando configuración operativa:', err)
      }
    }
    cargarConfig()
  }, [isAdmin])

  const guardarConfiguracionOperativa = async (
    nuevaConfig: typeof configuracionOperativaInicial
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/configuracion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevaConfig),
      })
      if (res.ok) {
        setConfiguracionOperativa(nuevaConfig)
        actualizarConfiguracionLocal(nuevaConfig)
        agregarNotificacion('Configuración de alertas guardada exitosamente.', 'success')
        return true
      } else {
        const errorData = await res.json().catch(() => ({}))
        agregarNotificacion(
          `Error al guardar la configuración: ${errorData.error || res.statusText}`,
          'warning'
        )
        return false
      }
    } catch (err) {
      console.error('Error guardando configuración operativa:', err)
      agregarNotificacion('Error de red al guardar la configuración.', 'warning')
      return false
    }
  }

  // ── Notificaciones reactivas al cambio de pedidos ─────

  useEffect(() => {
    if (!estaListo) return

    // Diferir el guardado en caché al siguiente tick (no bloquear el hilo de render)
    const timeoutCache = setTimeout(() => {
      localStorage.setItem('chefsy-pedidos-cache-v1', JSON.stringify(estado.pedidos))
    }, 0)

    if (prevPedidosRef.current.length > 0) {
      const esCadete = usuarioActivo?.rol === 'cadete'
      const esVistaCadeteria = pathname?.includes('/cadeteria')

      // Notificar NUEVOS pedidos creados
      const nuevosPedidos = estado.pedidos.filter(
        (nuevo) => !prevPedidosRef.current.some((prev) => prev.id === nuevo.id)
      )
      nuevosPedidos.forEach((nuevo) => {
        if (!esCadete && !esVistaCadeteria) {
          reproducirSonidoCampanaCocina()
          if (!esCambioLocalRef.current) {
            agregarNotificacion(`🔔 ¡Nuevo pedido de ${nuevo.cliente}!`, 'info')
          }
        }
      })

      // Notificar cambios de estado y asignación
      estado.pedidos.forEach((nuevo) => {
        const anterior = prevPedidosRef.current.find((p) => p.id === nuevo.id)
        if (!anterior) return

        // A) Alerta para cuando se le asigna un pedido al cadete logueado
        const seLeAsignoAlCadete =
          esCadete &&
          nuevo.cadete_id === usuarioActivo?.usuario &&
          anterior.cadete_id !== nuevo.cadete_id

        if (seLeAsignoAlCadete && !esCambioLocalRef.current) {
          agregarNotificacion(`🔔 ¡Tenés un nuevo pedido! para ${nuevo.cliente}`, 'info')
          reproducirSonidoNotificacion()
        }

        // B) Cambios de estado en general
        if (anterior.estado !== nuevo.estado) {
          const nombresEstados: Record<EstadoPedido, string> = {
            nuevo: 'Nuevo',
            en_cocina: 'En Cocina',
            listo: 'Listo',
            entregado: 'Entregado',
            cancelado: 'Cancelado',
          }

          const esPedidoPropioDelCadete = esCadete && nuevo.cadete_id === usuarioActivo?.usuario

          if (esPedidoPropioDelCadete && !esCambioLocalRef.current) {
            const estadosPermitidosParaCadete = ['en_cocina', 'listo', 'entregado', 'cancelado']
            if (estadosPermitidosParaCadete.includes(nuevo.estado)) {
              let mensaje = `El pedido de ${nuevo.cliente} cambió a "${nombresEstados[nuevo.estado]}".`
              if (nuevo.estado === 'listo') {
                mensaje = `🛵 ¡El pedido de ${nuevo.cliente} está listo para llevar!`
              }
              agregarNotificacion(mensaje, nuevo.estado === 'entregado' ? 'success' : 'info')
              reproducirSonidoNotificacion()
            }
          }

          if (!esCadete && !esVistaCadeteria) {
            if (nuevo.estado === 'entregado') {
              if (!esCambioLocalRef.current) {
                agregarNotificacion(`¡El pedido de ${nuevo.cliente} fue entregado! 🛵`, 'success')
                reproducirSonidoNotificacion()
              }
            } else {
              if (!esCambioLocalRef.current) {
                agregarNotificacion(
                  `Pedido de ${nuevo.cliente} cambió a "${nombresEstados[nuevo.estado]}".`,
                  'info'
                )
                reproducirSonidoNotificacion()
              }
            }
          }
        }
      })
    }

    const timeoutFlag = setTimeout(() => {
      esCambioLocalRef.current = false
    }, 100)
    prevPedidosRef.current = estado.pedidos

    return () => {
      clearTimeout(timeoutCache)
      clearTimeout(timeoutFlag)
    }
  }, [estado.pedidos, estaListo, usuarioActivo])

  // ── Función auxiliar: enviar acciones al servidor ─────

  const enviarAccionPedido = async (payload: any) => {
    try {
      const respuesta = await fetch('/api/admin/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!respuesta.ok) {
        const errorData = await respuesta.json().catch(() => ({}))
        throw new Error(errorData.error || `Error del servidor: ${respuesta.status}`)
      }
    } catch (e: any) {
      if (!navigator.onLine || (e.message && e.message.includes('Failed to fetch'))) {
        console.warn('[Offline] Petición encolada para sincronizar luego:', payload)
        const queueStr = localStorage.getItem('chefsy-offline-queue')
        const queue = queueStr ? JSON.parse(queueStr) : []
        queue.push({ payload, timestamp: Date.now() })
        localStorage.setItem('chefsy-offline-queue', JSON.stringify(queue))
        agregarNotificacion('Sin conexión. Los cambios se sincronizarán al recuperar la señal.', 'info')
        return
      }
      throw e
    }
  }

  // ── Operaciones CRUD ──────────────────────────────────

  const agregarPedido = async (pedido: Pedido) => {
    esCambioLocalRef.current = true
    despachar({ tipo: 'AGREGAR_PEDIDO', pedido })
    reproducirSonidoCampanaCocina()
    try {
      await enviarAccionPedido({ accion: 'crear', pedido })
    } catch (e: any) {
      console.error('[Servidor/Supabase] Error al crear pedido:', e)
      agregarNotificacion(`Error al guardar el pedido en la nube: ${e.message || 'Error interno'}`, 'warning')
    }
  }

  const editarPedido = async (pedido: Pedido) => {
    esCambioLocalRef.current = true
    despachar({ tipo: 'EDITAR_PEDIDO', pedido })
    try {
      await enviarAccionPedido({ accion: 'editar', id: pedido.id, pedido })
    } catch (e: any) {
      console.error('[Servidor/Supabase] Error al actualizar pedido:', e)
      agregarNotificacion('Error al actualizar el pedido en el servidor.', 'warning')
    }
  }

  const cambiarEstado = async (
    id: string,
    nuevoEstado: EstadoPedido,
    mostrarDeshacer: boolean = true
  ) => {
    const pedido = estado.pedidos.find((p) => p.id === id)
    if (pedido && pedido.estado !== nuevoEstado) {
      const estadoAnterior = pedido.estado
      esCambioLocalRef.current = true

      const updates = obtenerCamposDeTiempoParaEstado(nuevoEstado, pedido)
      despachar({ tipo: 'CAMBIAR_ESTADO', id, ...updates })

      const nombresEstados: Record<EstadoPedido, string> = {
        nuevo: 'Nuevo',
        en_cocina: 'En Cocina',
        listo: 'Listo',
        entregado: 'Entregado',
        cancelado: 'Cancelado',
      }

      agregarNotificacion(
        `Pedido de ${pedido.cliente} cambiado a "${nombresEstados[nuevoEstado]}".`,
        'info',
        mostrarDeshacer
          ? {
              etiqueta: 'Deshacer',
              alHacerClick: async () => {
                if (!pedido) return
                esCambioLocalRef.current = true
                const updatesAnteriores = obtenerCamposDeTiempoParaEstado(estadoAnterior, pedido)
                despachar({ tipo: 'CAMBIAR_ESTADO', id, ...updatesAnteriores })
                try {
                  await enviarAccionPedido({
                    accion: 'actualizar_estado',
                    id,
                    ...updatesAnteriores,
                  })
                } catch (e: any) {
                  // Si falla, volvemos atrás silenciosamente y mostramos error
                  if (e.message && e.message.includes('no existe en la base de datos')) {
                    despachar({ tipo: 'ELIMINAR_PEDIDO', id })
                    agregarNotificacion('Se eliminó un pedido "fantasma" que no existía en la base de datos.', 'info')
                  } else {
                    despachar({ tipo: 'CAMBIAR_ESTADO', id, ...updatesAnteriores })
                    agregarNotificacion(`Error: ${e.message || 'No se pudo cambiar el estado'}`, 'warning')
                  }
                }
              },
            }
          : undefined
      )

      try {
        await enviarAccionPedido({ accion: 'actualizar_estado', id, ...updates })
      } catch (e: any) {
        console.error('[Servidor/Supabase] Error al cambiar estado:', e)
        agregarNotificacion(`Error del servidor: ${e.message}`, 'warning')
      }
    }
  }

  const revertirEstado = async (id: string) => {
    const pedido = estado.pedidos.find((p) => p.id === id)
    if (!pedido) return

    let estadoAnterior: EstadoPedido = 'nuevo'
    const updates: any = {}

    switch (pedido.estado) {
      case 'en_cocina':
        estadoAnterior = 'nuevo'
        updates.cocina_at = null
        break
      case 'listo':
        estadoAnterior = 'en_cocina'
        updates.listo_at = null
        break
      case 'entregado':
        estadoAnterior = 'listo'
        updates.entregado_at = null
        break
      default:
        return
    }

    esCambioLocalRef.current = true
    updates.estado = estadoAnterior
    despachar({ tipo: 'CAMBIAR_ESTADO', id, ...updates })

    try {
      await enviarAccionPedido({ accion: 'actualizar_estado', id, ...updates })
      agregarNotificacion('Se ha revertido el estado del pedido.', 'info')
    } catch (e: any) {
      console.error('Error al revertir estado:', e)
      agregarNotificacion(`Error al revertir: ${e.message}`, 'warning')
    }
  }

  const marcarPagoConfirmado = async (id: string, confirmado: boolean) => {
    esCambioLocalRef.current = true
    const pedido = estado.pedidos.find((p) => p.id === id)
    if (pedido) {
      despachar({ tipo: 'EDITAR_PEDIDO', pedido: { ...pedido, pago_confirmado: confirmado } })
      try {
        await enviarAccionPedido({ accion: 'confirmar_pago', id, pago_confirmado: confirmado })
      } catch (e) {
        console.error('[Servidor/Supabase] Error al marcar pago confirmado', e)
        agregarNotificacion('Error al registrar el pago en el servidor.', 'warning')
      }
    }
  }

  const eliminarPedido = async (id: string) => {
    esCambioLocalRef.current = true
    despachar({ tipo: 'ELIMINAR_PEDIDO', id })
    try {
      await enviarAccionPedido({ accion: 'eliminar', id })
    } catch (e) {
      console.error('[Servidor/Supabase] Error al eliminar', e)
      agregarNotificacion('Error al eliminar el pedido en el servidor.', 'warning')
    }
  }

  const asignarCadete = async (
    id: string,
    cadete_id: string | null,
    cadete_nombre: string | null
  ) => {
    esCambioLocalRef.current = true
    const pedido = estado.pedidos.find((p) => p.id === id)
    if (pedido) {
      despachar({ tipo: 'EDITAR_PEDIDO', pedido: { ...pedido, cadete_id, cadete_nombre } })
      try {
        await enviarAccionPedido({ accion: 'asignar_cadete', id, cadete_id, cadete_nombre })
      } catch (e) {
        console.error('[Servidor/Supabase] Error al asignar cadete', e)
        agregarNotificacion('Error al asignar el cadete en el servidor.', 'warning')
      }
    }
  }

  const cambiarMetodoPago = async (id: string, metodoPago: string) => {
    esCambioLocalRef.current = true
    const pedido = estado.pedidos.find((p) => p.id === id)
    if (pedido) {
      despachar({
        tipo: 'EDITAR_PEDIDO',
        pedido: { ...pedido, metodoPago: metodoPago as any },
      })
      try {
        await enviarAccionPedido({ accion: 'cambiar_metodo_pago', id, metodoPago })
      } catch (e) {
        console.error('[Servidor/Supabase] Error al cambiar método de pago', e)
        agregarNotificacion('Error al actualizar el método de pago en el servidor.', 'warning')
      }
    }
  }

  // ── Finalizar turno ───────────────────────────────────

  const finalizarTurno = async () => {
    try {
      const pedidosActivos = estado.pedidos
      const idsActivos = pedidosActivos.map((p) => p.id)

      if (idsActivos.length > 0) {
        const validos = pedidosActivos.filter((p) => p.estado !== 'cancelado')
        const facturacion_neta = validos.reduce((acc, p) => acc + (p.total - (p.costoEnvio || 0)), 0)

        const obtenerMontoMetodo = (p: Pedido, m: string) => (p.metodoPago === m ? p.total : 0)
        const efectivo_ventas = validos.reduce((acc, p) => acc + obtenerMontoMetodo(p, 'efectivo'), 0)
        const tarjeta_total = validos.reduce((acc, p) => acc + obtenerMontoMetodo(p, 'tarjeta'), 0)
        const transferencia_total = validos.reduce(
          (acc, p) => acc + obtenerMontoMetodo(p, 'transferencia'),
          0
        )

        const caja_inicial = estadoTurno?.cajaInicial || 0
        const efectivo_rendir = caja_inicial + efectivo_ventas
        const total_pedidos = validos.length
        const ticket_promedio = total_pedidos > 0 ? facturacion_neta / total_pedidos : 0

        const total_envios_delivery = validos.filter((p) => p.tipoEntrega === 'delivery').length
        const costo_envios_cadetes = validos
          .filter((p) => p.tipoEntrega === 'delivery')
          .reduce((acc, p) => acc + (p.costoEnvio || 0), 0)
        const total_retiros = validos.filter((p) => p.tipoEntrega === 'retiro').length
        const total_consumo_local = validos.filter((p) => p.tipoEntrega === 'consumo_local').length

        const cancelados = pedidosActivos.filter((p) => p.estado === 'cancelado')
        const pedidos_cancelados = cancelados.length
        const monto_cancelados = cancelados.reduce((acc, p) => acc + p.total, 0)

        await enviarAccionPedido({
          accion: 'finalizar_turno',
          ids: idsActivos,
          snapshot: {
            facturacion_neta,
            efectivo_ventas,
            caja_inicial,
            efectivo_rendir,
            tarjeta_total,
            transferencia_total,
            total_pedidos,
            total_envios_delivery,
            costo_envios_cadetes,
            total_retiros,
            total_consumo_local,
            ticket_promedio,
            pedidos_cancelados,
            monto_cancelados,
          },
        })
      }

      despachar({ tipo: 'CARGAR_PEDIDOS', pedidos: [] })
      prevPedidosRef.current = []
      localStorage.setItem('chefsy-pedidos-cache-v1', JSON.stringify([]))

      const turnoCerrado = { activo: false, cajaInicial: 0, fechaInicio: null }
      await fetch('/api/admin/turno', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(turnoCerrado),
      })
      setEstadoTurno(turnoCerrado)

      agregarNotificacion('Turno finalizado. El panel quedó limpio para el próximo turno.', 'success')
    } catch (err) {
      console.error('[Servidor/Supabase] Error al finalizar turno:', err)
      agregarNotificacion('Error al finalizar el turno en la nube. Intente nuevamente.', 'warning')
    }
  }

  // ── Pedidos históricos ────────────────────────────────

  const obtenerPedidosPorFecha = async (fecha: string): Promise<Pedido[]> => {
    try {
      return await obtenerPedidosHistoricos(fecha)
    } catch (err) {
      console.error('[Supabase] Error al cargar pedidos históricos:', err)
      const cache = localStorage.getItem('chefsy-pedidos-cache-v1')
      if (cache) {
        try {
          const pedidosCache = JSON.parse(cache) as Pedido[]
          return pedidosCache.filter((p) => p.fecha === fecha)
        } catch {}
      }
      return []
    }
  }

  // ── Render ────────────────────────────────────────────

  return (
    <ContextoPedidosInterno.Provider
      value={{
        pedidos: estado.pedidos,
        cadetes,
        estaListo,
        agregarPedido,
        editarPedido,
        cambiarEstado,
        revertirEstado,
        marcarPagoConfirmado,
        asignarCadete,
        cambiarMetodoPago,
        eliminarPedido,
        dbEstado,
        finalizarTurno,
        obtenerPedidosPorFecha,
        configuracionOperativa,
        guardarConfiguracionOperativa,
        refrescarCadetes,
        estadoTurno,
        iniciarTurno,
      }}
    >
      {children}
    </ContextoPedidosInterno.Provider>
  )
}

// ── Proveedor Unificado (Orquestador de Contextos) ─────

export function ProveedorPedidos({ children }: { children: ReactNode }) {
  return (
    <ProveedorTemaNotificacion>
      <ProveedorCatalogo>
        <ProveedorPedidosInterno>{children}</ProveedorPedidosInterno>
      </ProveedorCatalogo>
    </ProveedorTemaNotificacion>
  )
}

// ── Hook de Acceso Global (Fachada / Facade) ───────────

interface ValorContextoPedidos {
  pedidos: Pedido[]
  cadetes: Cadete[]
  categorias: CategoriaCatalogo[]
  productos: ProductoCatalogo[]
  modificadores: ModificadorCatalogo[]
  estaListo: boolean
  agregarPedido: (pedido: Pedido) => void
  editarPedido: (pedido: Pedido) => void
  cambiarEstado: (id: string, estado: EstadoPedido, mostrarDeshacer?: boolean) => void
  revertirEstado: (id: string) => void
  marcarPagoConfirmado: (id: string, confirmado: boolean) => void
  asignarCadete: (id: string, cadete_id: string | null, cadete_nombre: string | null) => void
  cambiarMetodoPago: (id: string, metodoPago: string) => void
  eliminarPedido: (id: string) => void
  actualizarCategorias: (categorias: CategoriaCatalogo[]) => void
  actualizarProductos: (productos: ProductoCatalogo[]) => void
  actualizarModificadores: (modificadores: ModificadorCatalogo[]) => void
  notificaciones: import('./TemaNotificacionContexto').Notificacion[]
  eliminarNotificacion: (id: string) => void
  modoOscuro: boolean
  alternarModoOscuro: () => void
  dbEstado: 'conectado' | 'desconectado' | 'cargando'
  finalizarTurno: () => Promise<void>
  obtenerPedidosPorFecha: (fecha: string) => Promise<Pedido[]>
  configuracionOperativa: typeof configuracionOperativaInicial
  guardarConfiguracionOperativa: (nuevaConfig: typeof configuracionOperativaInicial) => Promise<boolean>
  refrescarCadetes: () => Promise<void>
  estadoTurno: EstadoTurno
  iniciarTurno: (cajaInicial: number) => Promise<boolean>
}

export function usarPedidos(): ValorContextoPedidos {
  const contextoPedidos = useContext(ContextoPedidosInterno)
  const contextoCatalogo = usarCatalogo()
  const contextoUI = usarTemaNotificacion()

  if (!contextoPedidos) {
    throw new Error('usarPedidos debe usarse dentro de un ProveedorPedidos')
  }

  return {
    // Pedidos
    pedidos: contextoPedidos.pedidos,
    cadetes: contextoPedidos.cadetes,
    estaListo: contextoPedidos.estaListo && contextoCatalogo.estaListoCatalogo,
    agregarPedido: contextoPedidos.agregarPedido,
    editarPedido: contextoPedidos.editarPedido,
    cambiarEstado: contextoPedidos.cambiarEstado,
    revertirEstado: contextoPedidos.revertirEstado,
    marcarPagoConfirmado: contextoPedidos.marcarPagoConfirmado,
    asignarCadete: contextoPedidos.asignarCadete,
    cambiarMetodoPago: contextoPedidos.cambiarMetodoPago,
    eliminarPedido: contextoPedidos.eliminarPedido,
    dbEstado: contextoPedidos.dbEstado,
    finalizarTurno: contextoPedidos.finalizarTurno,
    obtenerPedidosPorFecha: contextoPedidos.obtenerPedidosPorFecha,
    configuracionOperativa: contextoPedidos.configuracionOperativa,
    guardarConfiguracionOperativa: contextoPedidos.guardarConfiguracionOperativa,
    refrescarCadetes: contextoPedidos.refrescarCadetes,
    estadoTurno: contextoPedidos.estadoTurno,
    iniciarTurno: contextoPedidos.iniciarTurno,

    // Catálogo
    categorias: contextoCatalogo.categorias,
    productos: contextoCatalogo.productos,
    modificadores: contextoCatalogo.modificadores,
    actualizarCategorias: contextoCatalogo.actualizarCategorias,
    actualizarProductos: contextoCatalogo.actualizarProductos,
    actualizarModificadores: contextoCatalogo.actualizarModificadores,

    // UI & Tema
    notificaciones: contextoUI.notificaciones,
    eliminarNotificacion: contextoUI.eliminarNotificacion,
    modoOscuro: contextoUI.modoOscuro,
    alternarModoOscuro: contextoUI.alternarModoOscuro,
  }
}

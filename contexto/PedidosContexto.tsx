'use client'

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from 'react'
import { Pedido, EstadoPedido } from '@/tipos'
import { CategoriaCatalogo, ProductoCatalogo, ModificadorCatalogo } from '@/tipos/catalogo'
import { 
  obtenerPedidosActivos, 
  obtenerPedidosHistoricos, 
  insertarPedidoLocal, 
  suscribirAPedidos 
} from '@/servicios/supabase/pedidos'
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

// Re-exportar interfaz de Notificación para mantener compatibilidad
export type { Notificacion } from './TemaNotificacionContexto'

// ── Acciones del reducer ──────────────────────────────

type AccionPedidos =
  | { tipo: 'CARGAR_PEDIDOS'; pedidos: Pedido[] }
  | { tipo: 'AGREGAR_PEDIDO'; pedido: Pedido }
  | { tipo: 'EDITAR_PEDIDO'; pedido: Pedido }
  | { 
      tipo: 'CAMBIAR_ESTADO'; 
      id: string; 
      estado: EstadoPedido;
      cocina_at: string | null;
      listo_at: string | null;
      entregado_at: string | null;
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
          (a, b) => new Date(b.created_at || b.fecha).getTime() - new Date(a.created_at || a.fecha).getTime()
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

// ── Interfaz interna de Pedidos ────────────────────────

interface ValorContextoPedidosInterno {
  pedidos: Pedido[]
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
}

const ContextoPedidosInterno = createContext<ValorContextoPedidosInterno | undefined>(undefined)

// ── Helpers de Estado de Tiempos ───────────────────────

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

  return {
    estado: nuevoEstado,
    cocina_at,
    listo_at,
    entregado_at,
  }
}

// ── Proveedor Interno enfocado en Pedidos ──────────────

function ProveedorPedidosInterno({ children }: { children: ReactNode }) {
  const [estado, despachar] = useReducer(reducerPedidos, estadoInicial)
  const [estaListo, setEstaListo] = useState(false)
  const [dbEstado, setDbEstado] = useState<'conectado' | 'desconectado' | 'cargando'>('cargando')
  
  const prevPedidosRef = useRef<Pedido[]>([])
  const esCambioLocalRef = useRef(false)

  // Obtener sesión del usuario activo
  const { usuarioActivo } = usarAuth()

  // Acceder a notificaciones del contexto UI
  const { agregarNotificacion } = usarTemaNotificacion()

  // Estado para la configuración operativa de tiempos
  const [configuracionOperativa, setConfiguracionOperativa] = useState<typeof configuracionOperativaInicial>(configuracionOperativaInicial)

  // Cargar configuración de tiempos al inicializar
  useEffect(() => {
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
  }, [])

  // Guardar la configuración en el servidor y actualizar localmente
  const guardarConfiguracionOperativa = async (nuevaConfig: typeof configuracionOperativaInicial): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/configuracion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nuevaConfig),
      })
      if (res.ok) {
        setConfiguracionOperativa(nuevaConfig)
        actualizarConfiguracionLocal(nuevaConfig)
        agregarNotificacion('Configuración de alertas guardada exitosamente.', 'success')
        return true
      } else {
        const errorData = await res.json().catch(() => ({}))
        agregarNotificacion(`Error al guardar la configuración: ${errorData.error || res.statusText}`, 'warning')
        return false
      }
    } catch (err) {
      console.error('Error guardando configuración operativa:', err)
      agregarNotificacion('Error de conexión al guardar la configuración.', 'warning')
      return false
    }
  }

  // 1) Al montar: Cargar Pedidos de Supabase (no archivados) con fallback local
  useEffect(() => {
    async function cargarInicial() {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      const credencialesValidas = url && key && !url.includes('falta-configurar') && !key.includes('falta-configurar')
      const estaOnline = typeof navigator !== 'undefined' ? navigator.onLine : true

      try {
        if (!credencialesValidas) {
          setDbEstado('desconectado')
          setEstaListo(true)
          return
        }

        if (!estaOnline) {
          throw new Error('Navegador offline')
        }

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
            const noArchivados = pedidosCache.filter(p => !(p as any).archivado)
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
  }, [])

  // 1.b) Escuchar cambios de conectividad en el navegador para actualizar dbEstado y sincronizar
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const syncOfflineQueue = async () => {
      const queueStr = localStorage.getItem('chefsy-offline-queue')
      if (!queueStr) return
      try {
        const queue = JSON.parse(queueStr)
        if (!Array.isArray(queue) || queue.length === 0) return
        
        console.log(`[Offline Sync] Sincronizando ${queue.length} acciones pendientes...`)
        const nuevasEncoladas = []
        let huboExito = false
        
        for (const item of queue) {
          try {
            const respuesta = await fetch('/api/admin/pedidos', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item.payload)
            })
            if (respuesta.ok) {
              huboExito = true
            } else {
              nuevasEncoladas.push(item)
            }
          } catch (err) {
            console.error('[Offline Sync] Fallo al sincronizar acción:', err)
            nuevasEncoladas.push(item)
          }
        }
        
        if (nuevasEncoladas.length === 0) {
          localStorage.removeItem('chefsy-offline-queue')
          if (huboExito) agregarNotificacion('Se sincronizaron los cambios pendientes correctamente.', 'success')
        } else {
          localStorage.setItem('chefsy-offline-queue', JSON.stringify(nuevasEncoladas))
        }
      } catch (e) {
        console.error('Error procesando offline queue:', e)
        localStorage.removeItem('chefsy-offline-queue')
      }
    }

    const handleOnline = () => {
      setDbEstado('conectado')
      syncOfflineQueue()
    }
    const handleOffline = () => {
      setDbEstado('desconectado')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Intentar sincronizar al arrancar si está online
    if (navigator.onLine) {
      syncOfflineQueue()
    }
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [agregarNotificacion])

  // 2) Suscripción a Supabase Realtime para pedidos
  useEffect(() => {
    if (!estaListo) return

    const channel = suscribirAPedidos(
      (pedido, archivado) => {
        if (esCambioLocalRef.current) return
        if (archivado) {
          despachar({ tipo: 'ELIMINAR_PEDIDO', id: pedido.id })
        } else {
          despachar({ tipo: 'UPSERT_PEDIDO', pedido })
        }
      },
      (id) => {
        if (esCambioLocalRef.current) return
        despachar({ tipo: 'ELIMINAR_PEDIDO', id })
      }
    )

    return () => {
      channel.unsubscribe()
    }
  }, [estaListo])

  // 3) Notificaciones de cambios y guardar caché local
  useEffect(() => {
    if (!estaListo) return

    // Guardar copia local de pedidos en caché
    localStorage.setItem('chefsy-pedidos-cache-v1', JSON.stringify(estado.pedidos))

    if (prevPedidosRef.current.length > 0) {
      const esCadete = usuarioActivo?.rol === 'cadete'
      const esVistaCadeteria = typeof window !== 'undefined' && window.location.pathname.includes('/cadeteria')
      
      // Notificar NUEVOS pedidos creados
      const nuevosPedidos = estado.pedidos.filter((nuevo) => !prevPedidosRef.current.some((prev) => prev.id === nuevo.id))
      nuevosPedidos.forEach((nuevo) => {
        // Los cadetes NO reciben notificaciones de pedidos recién ingresados (estado 'nuevo')
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
            cancelado: 'Cancelado'
          }

          const esPedidoPropioDelCadete = esCadete && nuevo.cadete_id === usuarioActivo?.usuario

          if (esPedidoPropioDelCadete && !esCambioLocalRef.current) {
            // Repartidores: solo alertar de cambios desde Cocina en adelante
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

          // Administradores y otros roles (fuera de cadetería)
          if (!esCadete && !esVistaCadeteria) {
            if (nuevo.estado === 'entregado') {
              if (!esCambioLocalRef.current) {
                agregarNotificacion(`¡El pedido de ${nuevo.cliente} fue entregado! 🛵`, 'success')
                reproducirSonidoNotificacion()
              }
            } else {
              if (!esCambioLocalRef.current) {
                agregarNotificacion(`Pedido de ${nuevo.cliente} cambió a "${nombresEstados[nuevo.estado]}".`, 'info')
                reproducirSonidoNotificacion()
              }
            }
          }
        }
      })
    }
    
    setTimeout(() => { esCambioLocalRef.current = false }, 100)
    prevPedidosRef.current = estado.pedidos
  }, [estado.pedidos, estaListo, usuarioActivo])

  // 4) Operaciones CRUD de Pedidos

  const agregarPedido = async (pedido: Pedido) => {
    esCambioLocalRef.current = true
    despachar({ tipo: 'AGREGAR_PEDIDO', pedido })
    reproducirSonidoCampanaCocina()
    
    try {
      const payload: any = { ...pedido, archivado: false }
      await insertarPedidoLocal(payload)
    } catch (e) {
      agregarNotificacion('Error al guardar el pedido en la nube', 'warning')
    }
  }

  const enviarAccionPedido = async (payload: any) => {
    try {
      const respuesta = await fetch('/api/admin/pedidos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
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

  const editarPedido = async (pedido: Pedido) => {
    esCambioLocalRef.current = true
    despachar({ tipo: 'EDITAR_PEDIDO', pedido })
    
    try {
      await enviarAccionPedido({
        accion: 'editar',
        id: pedido.id,
        pedido
      })
    } catch (e: any) {
      console.error('[Servidor/Supabase] Error al actualizar pedido:', e)
      agregarNotificacion('Error al actualizar el pedido en el servidor.', 'warning')
    }
  }

  const cambiarEstado = async (id: string, nuevoEstado: EstadoPedido, mostrarDeshacer: boolean = true) => {
    const pedido = estado.pedidos.find((p) => p.id === id)
    if (pedido && pedido.estado !== nuevoEstado) {
      const estadoAnterior = pedido.estado
      esCambioLocalRef.current = true
      
      const updates = obtenerCamposDeTiempoParaEstado(nuevoEstado, pedido)
      despachar({ tipo: 'CAMBIAR_ESTADO', id, ...updates })
      
      const nombresEstados: Record<EstadoPedido, string> = {
        nuevo: 'Nuevo', en_cocina: 'En Cocina', listo: 'Listo',
        entregado: 'Entregado', cancelado: 'Cancelado'
      }

      agregarNotificacion(
        `Pedido de ${pedido.cliente} cambiado a "${nombresEstados[nuevoEstado]}".`,
        'info',
        mostrarDeshacer ? {
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
                ...updatesAnteriores
              })
            } catch (err) {
              console.error('Error al deshacer cambio de estado:', err)
            }
          }
        } : undefined
      )

      try {
        await enviarAccionPedido({
          accion: 'actualizar_estado',
          id,
          ...updates
        })
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
      await enviarAccionPedido({
        accion: 'actualizar_estado',
        id,
        ...updates
      })
      agregarNotificacion(`Se ha revertido el estado del pedido.`, 'info')
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
        await enviarAccionPedido({
          accion: 'confirmar_pago',
          id,
          pago_confirmado: confirmado
        })
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
      await enviarAccionPedido({
        accion: 'eliminar',
        id
      })
    } catch (e) {
      console.error('[Servidor/Supabase] Error al eliminar', e)
      agregarNotificacion('Error al eliminar el pedido en el servidor.', 'warning')
    }
  }

  const asignarCadete = async (id: string, cadete_id: string | null, cadete_nombre: string | null) => {
    esCambioLocalRef.current = true
    const pedido = estado.pedidos.find((p) => p.id === id)
    if (pedido) {
      despachar({ tipo: 'EDITAR_PEDIDO', pedido: { ...pedido, cadete_id, cadete_nombre } })
      try {
        await enviarAccionPedido({
          accion: 'asignar_cadete',
          id,
          cadete_id,
          cadete_nombre
        })
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
      despachar({ tipo: 'EDITAR_PEDIDO', pedido: { ...pedido, metodoPago: metodoPago as any } })
      try {
        await enviarAccionPedido({
          accion: 'cambiar_metodo_pago',
          id,
          metodoPago
        })
      } catch (e) {
        console.error('[Servidor/Supabase] Error al cambiar método de pago', e)
        agregarNotificacion('Error al actualizar el método de pago en el servidor.', 'warning')
      }
    }
  }

  // 5) Finalizar Turno (Archivar pedidos activos)
  const finalizarTurno = async () => {
    const idsActivos = estado.pedidos.map((p) => p.id)
    if (idsActivos.length === 0) {
      agregarNotificacion('No hay pedidos activos en este turno para finalizar.', 'info')
      return
    }

    try {
      await enviarAccionPedido({
        accion: 'finalizar_turno',
        ids: idsActivos
      })

      despachar({ tipo: 'CARGAR_PEDIDOS', pedidos: [] })
      prevPedidosRef.current = []
      localStorage.setItem('chefsy-pedidos-cache-v1', JSON.stringify([]))

      agregarNotificacion('Turno finalizado. El panel quedó limpio para el próximo turno.', 'success')
    } catch (err) {
      console.error('[Servidor/Supabase] Error al finalizar turno:', err)
      agregarNotificacion('Error al finalizar el turno en la nube. Intente nuevamente.', 'warning')
    }
  }

  // 6) Cargar pedidos históricos de una fecha
  const obtenerPedidosPorFecha = async (fecha: string): Promise<Pedido[]> => {
    try {
      return await obtenerPedidosHistoricos(fecha)
    } catch (err) {
      console.error('[Supabase] Error al cargar pedidos históricos:', err)
      // Fallback: buscar en caché
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

  // Alertas de inactividad de pedidos para administradores
  const alertasEnviadasRef = useRef<Record<string, number>>({})

  useEffect(() => {
    if (usuarioActivo?.rol !== 'admin') return

    const interval = setInterval(() => {
      const ahora = Date.now()

      estado.pedidos.forEach((pedido) => {
        const estadoActual = pedido.estado
        if (!['nuevo', 'en_cocina', 'listo'].includes(estadoActual)) return

        let fechaInicio: string | null | undefined = null
        if (estadoActual === 'nuevo') {
          fechaInicio = pedido.created_at
        } else if (estadoActual === 'en_cocina') {
          fechaInicio = pedido.cocina_at || pedido.created_at
        } else if (estadoActual === 'listo') {
          fechaInicio = pedido.listo_at || pedido.cocina_at || pedido.created_at
        }

        if (!fechaInicio) return
        const startMs = new Date(fechaInicio).getTime()
        const transcurridoMs = ahora - startMs

        let limiteMs = 0
        let repeticionMs: number | null = null
        let msgEstado = ''

        if (estadoActual === 'nuevo') {
          limiteMs = 1 * 60 * 1000
          repeticionMs = 1 * 60 * 1000
          msgEstado = 'nuevo'
        } else if (estadoActual === 'en_cocina') {
          limiteMs = 45 * 60 * 1000
          repeticionMs = null
          msgEstado = 'en cocina'
        } else if (estadoActual === 'listo') {
          limiteMs = 10 * 60 * 1000
          repeticionMs = null
          msgEstado = 'listo'
        }

        if (transcurridoMs >= limiteMs) {
          const key = `${pedido.id}_${estadoActual}`
          const ultimaAlerta = alertasEnviadasRef.current[key]

          let deberiaAlertar = false
          if (!ultimaAlerta) {
            deberiaAlertar = true
          } else if (repeticionMs !== null) {
            deberiaAlertar = (ahora - ultimaAlerta) >= repeticionMs
          }

          if (deberiaAlertar) {
            alertasEnviadasRef.current[key] = ahora
            const tiempoMinutos = Math.round(transcurridoMs / (60 * 1000))
            const msg = `⚠️ El pedido de ${pedido.cliente} lleva ${tiempoMinutos} min en estado "${msgEstado}".`
            
            agregarNotificacion(msg, 'warning')
            reproducirSonidoNotificacion()
          }
        }
      })
    }, 10000)

    return () => clearInterval(interval)
  }, [estado.pedidos, usuarioActivo, agregarNotificacion])

  return (
    <ContextoPedidosInterno.Provider
      value={{
        pedidos: estado.pedidos,
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

// ── Hook de Acceso Global (Fachada / Facade) ──────────

interface ValorContextoPedidos {
  pedidos: Pedido[]
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

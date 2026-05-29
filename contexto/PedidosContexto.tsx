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
import { supabase } from '@/lib/supabase'
import { usarAuth } from '@/contexto/AuthContexto'
import {
  usarTemaNotificacion,
  ProveedorTemaNotificacion,
  reproducirSonidoNotificacion,
  reproducirSonidoCampanaCocina,
} from './TemaNotificacionContexto'
import { usarCatalogo, ProveedorCatalogo } from './CatalogoContexto'

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
      reparto_at: string | null;
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
                reparto_at: accion.reparto_at,
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
  marcarPagoConfirmado: (id: string, confirmado: boolean) => void
  asignarCadete: (id: string, cadete_id: string | null, cadete_nombre: string | null) => void
  cambiarMetodoPago: (id: string, metodoPago: string) => void
  eliminarPedido: (id: string) => void
  dbEstado: 'conectado' | 'desconectado' | 'cargando'
  finalizarTurno: () => Promise<void>
  obtenerPedidosPorFecha: (fecha: string) => Promise<Pedido[]>
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
  reparto_at: string | null
  entregado_at: string | null
} {
  const ahora = new Date().toISOString()
  
  let cocina_at = pedidoActual.cocina_at || null
  let listo_at = pedidoActual.listo_at || null
  let reparto_at = pedidoActual.reparto_at || null
  let entregado_at = pedidoActual.entregado_at || null

  if (nuevoEstado === 'nuevo') {
    cocina_at = null
    listo_at = null
    reparto_at = null
    entregado_at = null
  } else if (nuevoEstado === 'en_cocina') {
    if (!cocina_at) cocina_at = ahora
    listo_at = null
    reparto_at = null
    entregado_at = null
  } else if (nuevoEstado === 'listo' || nuevoEstado === 'en_reparto') {
    if (!cocina_at) cocina_at = pedidoActual.created_at || ahora
    if (!listo_at) listo_at = ahora
    if (nuevoEstado === 'en_reparto' && !reparto_at) reparto_at = ahora
    if (nuevoEstado === 'listo') reparto_at = null
    entregado_at = null
  } else if (nuevoEstado === 'entregado' || nuevoEstado === 'cancelado') {
    if (!cocina_at) cocina_at = pedidoActual.created_at || ahora
    if (!listo_at) listo_at = cocina_at || ahora
    if (!reparto_at && pedidoActual.tipoEntrega === 'delivery') reparto_at = listo_at || ahora
    if (!entregado_at) entregado_at = ahora
  }

  return {
    estado: nuevoEstado,
    cocina_at,
    listo_at,
    reparto_at,
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

  // Acceder a notificaciones del contexto UI
  const { agregarNotificacion } = usarTemaNotificacion()

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

        const { data: pedidosGuardados, error } = await supabase
          .from('pedidos')
          .select('*')
          .eq('archivado', false) // Cargar solo pedidos activos (no archivados)
          .order('created_at', { ascending: false })
          .limit(100)
        
        if (error) throw error

        setDbEstado('conectado')

        if (pedidosGuardados) {
          const pedidosMapeados = pedidosGuardados.map((p: any) => ({
            ...p,
            reparto_at: p.reparto_at || p.ubicacion_cadete || null
          }))
          despachar({ tipo: 'CARGAR_PEDIDOS', pedidos: pedidosMapeados as Pedido[] })
          prevPedidosRef.current = pedidosMapeados as Pedido[]
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

    const channel = supabase
      .channel('tabla-pedidos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        (payload) => {
          if (esCambioLocalRef.current) return

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const pedidoCrudo = payload.new as any
            if (pedidoCrudo.archivado) {
              // Si el pedido fue archivado, lo quitamos de la pantalla local
              despachar({ tipo: 'ELIMINAR_PEDIDO', id: pedidoCrudo.id })
            } else {
              const pedido = {
                ...pedidoCrudo,
                reparto_at: pedidoCrudo.reparto_at || pedidoCrudo.ubicacion_cadete || null
              } as Pedido
              despachar({ tipo: 'UPSERT_PEDIDO', pedido })
            }
          } else if (payload.eventType === 'DELETE') {
            despachar({ tipo: 'ELIMINAR_PEDIDO', id: payload.old.id })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [estaListo])

  // 3) Notificaciones de cambios y guardar caché local
  useEffect(() => {
    if (!estaListo) return

    // Guardar copia local de pedidos en caché
    localStorage.setItem('chefsy-pedidos-cache-v1', JSON.stringify(estado.pedidos))

    if (prevPedidosRef.current.length > 0) {
      const nuevosPedidos = estado.pedidos.filter((nuevo) => !prevPedidosRef.current.some((prev) => prev.id === nuevo.id))
      nuevosPedidos.forEach((nuevo) => {
        reproducirSonidoCampanaCocina()
        if (!esCambioLocalRef.current) {
          agregarNotificacion(`🔔 ¡Nuevo pedido de ${nuevo.cliente}!`, 'info')
        }
      })

      estado.pedidos.forEach((nuevo) => {
        const anterior = prevPedidosRef.current.find((p) => p.id === nuevo.id)
        if (anterior && anterior.estado !== 'entregado' && nuevo.estado === 'entregado') {
          if (!esCambioLocalRef.current) {
            agregarNotificacion(`¡El pedido de ${nuevo.cliente} fue entregado! 🛵`, 'success')
            reproducirSonidoNotificacion()
          }
        }
      })
    }
    
    setTimeout(() => { esCambioLocalRef.current = false }, 100)
    prevPedidosRef.current = estado.pedidos
  }, [estado.pedidos, estaListo])

  // 4) Operaciones CRUD de Pedidos

  const agregarPedido = async (pedido: Pedido) => {
    esCambioLocalRef.current = true
    despachar({ tipo: 'AGREGAR_PEDIDO', pedido })
    reproducirSonidoCampanaCocina()
    
    try {
      const payload: any = { ...pedido, archivado: false }
      if (payload.reparto_at !== undefined) {
        payload.ubicacion_cadete = payload.reparto_at
        delete payload.reparto_at
      }
      
      const { error } = await supabase.from('pedidos').insert(payload)
      if (error) throw error
    } catch (e) {
      console.error('[Supabase] Error al insertar pedido', e)
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
        en_reparto: 'En Reparto', entregado: 'Entregado', cancelado: 'Cancelado'
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
        agregarNotificacion('Error al actualizar el estado en el servidor.', 'warning')
      }
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
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .eq('fecha', fecha)
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data || []).map((p: any) => ({
        ...p,
        reparto_at: p.reparto_at || p.ubicacion_cadete || null
      })) as Pedido[]
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
  const { usuarioActivo } = usarAuth()
  const alertasEnviadasRef = useRef<Record<string, number>>({})

  useEffect(() => {
    if (usuarioActivo?.rol !== 'admin') return

    const interval = setInterval(() => {
      const ahora = Date.now()

      estado.pedidos.forEach((pedido) => {
        const estadoActual = pedido.estado
        if (!['nuevo', 'en_cocina', 'listo', 'en_reparto'].includes(estadoActual)) return

        let fechaInicio: string | null | undefined = null
        if (estadoActual === 'nuevo') {
          fechaInicio = pedido.created_at
        } else if (estadoActual === 'en_cocina') {
          fechaInicio = pedido.cocina_at || pedido.created_at
        } else if (estadoActual === 'listo') {
          fechaInicio = pedido.listo_at || pedido.cocina_at || pedido.created_at
        } else if (estadoActual === 'en_reparto') {
          fechaInicio = pedido.reparto_at || pedido.listo_at || pedido.created_at
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
        } else if (estadoActual === 'en_reparto') {
          limiteMs = 30 * 60 * 1000
          repeticionMs = 2 * 60 * 1000
          msgEstado = 'en reparto'
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
        marcarPagoConfirmado,
        asignarCadete,
        cambiarMetodoPago,
        eliminarPedido,
        dbEstado,
        finalizarTurno,
        obtenerPedidosPorFecha,
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
    marcarPagoConfirmado: contextoPedidos.marcarPagoConfirmado,
    asignarCadete: contextoPedidos.asignarCadete,
    cambiarMetodoPago: contextoPedidos.cambiarMetodoPago,
    eliminarPedido: contextoPedidos.eliminarPedido,
    dbEstado: contextoPedidos.dbEstado,
    finalizarTurno: contextoPedidos.finalizarTurno,
    obtenerPedidosPorFecha: contextoPedidos.obtenerPedidosPorFecha,

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

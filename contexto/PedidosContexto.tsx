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
import { categoriasCatalogo, productosCatalogo, modificadoresCatalogo } from '@/datos/productos'
import { X, CheckCircle2, RotateCcw } from 'lucide-react'
import { supabase } from '@/lib/supabase'

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
  | { tipo: 'UPSERT_PEDIDO'; pedido: Pedido } // Para eventos Realtime

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

export interface Notificacion {
  id: string
  mensaje: string
  tipo: 'info' | 'success' | 'warning'
  accion?: {
    etiqueta: string
    alHacerClick: () => void
  }
}

interface ValorContextoPedidos {
  pedidos: Pedido[]
  categorias: CategoriaCatalogo[]
  productos: ProductoCatalogo[]
  modificadores: ModificadorCatalogo[]
  estaListo: boolean
  agregarPedido: (pedido: Pedido) => void
  editarPedido: (pedido: Pedido) => void
  cambiarEstado: (id: string, estado: EstadoPedido) => void
  eliminarPedido: (id: string) => void
  actualizarCategorias: (categorias: CategoriaCatalogo[]) => void
  actualizarProductos: (productos: ProductoCatalogo[]) => void
  actualizarModificadores: (modificadores: ModificadorCatalogo[]) => void
  notificaciones: Notificacion[]
  eliminarNotificacion: (id: string) => void
  modoOscuro: boolean
  alternarModoOscuro: () => void
}

const ContextoPedidos = createContext<ValorContextoPedidos | undefined>(undefined)

// Sonidos
function reproducirSonidoNotificacion() {
  if (typeof window === 'undefined') return
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, start)
      gain.gain.setValueAtTime(0.12, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + duration)
    }
    const t = ctx.currentTime
    playTone(523.25, t, 0.25)
    playTone(659.25, t + 0.08, 0.35)
  } catch (e) {}
}

function reproducirSonidoCampanaCocina() {
  if (typeof window === 'undefined') return
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const playTone = (freq: number, start: number, duration: number, volume: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, start)
      gain.gain.setValueAtTime(volume, start)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + duration)
    }
    const t = ctx.currentTime
    playTone(1567.98, t, 1.0, 0.15)
    playTone(1975.53, t, 0.8, 0.10)
    playTone(2637.02, t, 0.6, 0.05)
    const t2 = t + 0.12
    playTone(1567.98, t2, 0.8, 0.12)
    playTone(1975.53, t2, 0.6, 0.08)
  } catch (e) {}
}

/**
 * Determina qué marcas de tiempo deben setearse o resetearse según la transición de estado del pedido.
 */
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
  } else if (nuevoEstado === 'listo' || nuevoEstado === 'en_reparto') {
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

export function ProveedorPedidos({ children }: { children: ReactNode }) {
  const [estado, despachar] = useReducer(reducerPedidos, estadoInicial)
  const [categorias, setCategorias] = useState<CategoriaCatalogo[]>([])
  const [productos, setProductos] = useState<ProductoCatalogo[]>([])
  const [modificadores, setModificadores] = useState<ModificadorCatalogo[]>([])
  const [estaListo, setEstaListo] = useState(false)
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [modoOscuro, setModoOscuro] = useState(false)
  
  const prevPedidosRef = useRef<Pedido[]>([])
  const esCambioLocalRef = useRef(false)

  // Cargar tema
  useEffect(() => {
    const temaGuardado = localStorage.getItem('chefsy-tema')
    if (temaGuardado === 'dark') {
      setModoOscuro(true)
      document.documentElement.classList.add('dark')
    } else {
      setModoOscuro(false)
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const alternarModoOscuro = () => {
    setModoOscuro((prev) => {
      const nuevo = !prev
      if (nuevo) {
        document.documentElement.classList.add('dark')
        localStorage.setItem('chefsy-tema', 'dark')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('chefsy-tema', 'light')
      }
      return nuevo
    })
  }

  // 1) Al montar: Cargar Catálogo de LocalStorage y Pedidos de Supabase
  useEffect(() => {
    async function cargarInicial() {
      // Cargar Catálogo (Categorías, Productos, Modificadores) de localStorage temporalmente
      // En una FASE 2, estos también deberían ir a Supabase
      const catsCrud = localStorage.getItem('chefsy-categorias-v1')
      let catsActuales = catsCrud ? JSON.parse(catsCrud) : categoriasCatalogo
      if (!catsActuales.some((c: any) => c.id === 'promos')) {
        catsActuales.push({ id: 'promos', nombre: 'Promos', orden: 9, activa: true })
      }
      setCategorias(catsActuales)

      const prodsCrud = localStorage.getItem('chefsy-productos-v1')
      let prodsActuales = prodsCrud ? JSON.parse(prodsCrud) : productosCatalogo
      setProductos(prodsActuales)

      const modsCrud = localStorage.getItem('chefsy-modificadores-v1')
      setModificadores(modsCrud ? JSON.parse(modsCrud) : modificadoresCatalogo)

      // Cargar Pedidos de Supabase
      try {
        const { data: pedidosGuardados, error } = await supabase
          .from('pedidos')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)
        
        if (error) throw error

        if (pedidosGuardados) {
          despachar({ tipo: 'CARGAR_PEDIDOS', pedidos: pedidosGuardados as Pedido[] })
          prevPedidosRef.current = pedidosGuardados as Pedido[]
        }
      } catch (error) {
        console.error('[Supabase] Error al cargar pedidos:', error)
      } finally {
        setEstaListo(true)
      }
    }
    cargarInicial()
  }, [])

  // 2) Suscripción a Supabase Realtime
  useEffect(() => {
    if (!estaListo) return

    const channel = supabase
      .channel('tabla-pedidos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        (payload) => {
          // No procesar nuestros propios cambios optimistas
          if (esCambioLocalRef.current) return

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const pedido = payload.new as Pedido
            despachar({ tipo: 'UPSERT_PEDIDO', pedido })
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

  // 3) Sincronizar Catálogo entre pestañas
  useEffect(() => {
    if (!estaListo) return
    const sincronizarTabs = (evento: StorageEvent) => {
      if (evento.key === 'chefsy-categorias-v1' && evento.newValue) setCategorias(JSON.parse(evento.newValue))
      if (evento.key === 'chefsy-productos-v1' && evento.newValue) setProductos(JSON.parse(evento.newValue))
      if (evento.key === 'chefsy-modificadores-v1' && evento.newValue) setModificadores(JSON.parse(evento.newValue))
    }
    window.addEventListener('storage', sincronizarTabs)
    return () => window.removeEventListener('storage', sincronizarTabs)
  }, [estaListo])

  // 4) Notificaciones de cambios
  useEffect(() => {
    if (!estaListo) return
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
    
    // Si fue un cambio local o remoto, después de procesar este render, ya no es local.
    // Pequeño timeout para permitir que el Realtime event sea descartado si es local
    setTimeout(() => { esCambioLocalRef.current = false }, 100)
    prevPedidosRef.current = estado.pedidos
  }, [estado.pedidos, estaListo])

  const agregarPedido = async (pedido: Pedido) => {
    esCambioLocalRef.current = true
    despachar({ tipo: 'AGREGAR_PEDIDO', pedido })
    reproducirSonidoCampanaCocina()
    
    // Guardar en Supabase
    try {
      const { error } = await supabase.from('pedidos').insert(pedido)
      if (error) throw error
    } catch (e) {
      console.error('[Supabase] Error al insertar pedido', e)
      agregarNotificacion('Error al guardar el pedido en la nube', 'warning')
    }
  }

  const editarPedido = async (pedido: Pedido) => {
    esCambioLocalRef.current = true
    despachar({ tipo: 'EDITAR_PEDIDO', pedido })
    
    try {
      const { error } = await supabase.from('pedidos').update(pedido).eq('id', pedido.id)
      if (error) throw error
    } catch (e) {
      console.error('[Supabase] Error al actualizar pedido', e)
    }
  }

  const cambiarEstado = async (id: string, nuevoEstado: EstadoPedido) => {
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
        {
          etiqueta: 'Deshacer',
          alHacerClick: async () => {
            if (!pedido) return
            esCambioLocalRef.current = true
            const updatesAnteriores = obtenerCamposDeTiempoParaEstado(estadoAnterior, pedido)
            despachar({ tipo: 'CAMBIAR_ESTADO', id, ...updatesAnteriores })
            await supabase.from('pedidos').update(updatesAnteriores).eq('id', id)
          }
        }
      )

      try {
        const { error } = await supabase.from('pedidos').update(updates).eq('id', id)
        if (error) throw error
      } catch (e) {
        console.error('[Supabase] Error al cambiar estado', e)
      }
    }
  }

  const eliminarPedido = async (id: string) => {
    esCambioLocalRef.current = true
    despachar({ tipo: 'ELIMINAR_PEDIDO', id })
    try {
      await supabase.from('pedidos').delete().eq('id', id)
    } catch (e) {
      console.error('[Supabase] Error al eliminar', e)
    }
  }

  const actualizarCategorias = (nuevasCategorias: CategoriaCatalogo[]) => {
    setCategorias(nuevasCategorias)
    localStorage.setItem('chefsy-categorias-v1', JSON.stringify(nuevasCategorias))
  }

  const actualizarProductos = (nuevosProductos: ProductoCatalogo[]) => {
    setProductos(nuevosProductos)
    localStorage.setItem('chefsy-productos-v1', JSON.stringify(nuevosProductos))
  }

  const actualizarModificadores = (nuevosModificadores: ModificadorCatalogo[]) => {
    setModificadores(nuevosModificadores)
    localStorage.setItem('chefsy-modificadores-v1', JSON.stringify(nuevosModificadores))
  }

  const agregarNotificacion = (mensaje: string, tipo: 'info' | 'success' | 'warning' = 'success', accion?: { etiqueta: string; alHacerClick: () => void }) => {
    const id = Date.now().toString()
    setNotificaciones((prev) => [...prev, { id, mensaje, tipo, accion }])
    setTimeout(() => { setNotificaciones((prev) => prev.filter((n) => n.id !== id)) }, 6000)
  }

  const eliminarNotificacion = (id: string) => {
    setNotificaciones((prev) => prev.filter((n) => n.id !== id))
  }

  const valor: ValorContextoPedidos = {
    pedidos: estado.pedidos, categorias, productos, modificadores, estaListo,
    agregarPedido, editarPedido, cambiarEstado, eliminarPedido,
    actualizarCategorias, actualizarProductos, actualizarModificadores,
    notificaciones, eliminarNotificacion, modoOscuro, alternarModoOscuro,
  }

  return (
    <ContextoPedidos.Provider value={valor}>
      {!estaListo ? (
        <div className="min-h-[40vh] flex items-center justify-center text-sm text-gray-400">
          Cargando pedidos de la nube…
        </div>
      ) : (
        <>
          {children}
          <ContenedorToasts notificaciones={notificaciones} onEliminar={eliminarNotificacion} />
        </>
      )}
    </ContextoPedidos.Provider>
  )
}

function ContenedorToasts({ notificaciones, onEliminar }: { notificaciones: Notificacion[]; onEliminar: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full px-4 sm:px-0">
      <style>{`
        @keyframes slideIn { from { transform: translateY(20px) scale(0.95); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
        .toast-animate { animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
      {notificaciones.map((n) => (
        <div key={n.id} className="toast-animate bg-white border border-slate-100 shadow-2xl rounded-2xl p-4 flex items-start gap-3 relative overflow-hidden" style={{ borderLeft: n.tipo === 'success' ? '4px solid #10B981' : n.tipo === 'warning' ? '4px solid #F59E0B' : '4px solid #3B82F6' }}>
          <div className="text-green-500 shrink-0 mt-0.5">
            {n.tipo === 'success' ? <CheckCircle2 size={18} className="text-green-500" /> : <CheckCircle2 size={18} className="text-blue-500" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sistema de Pedidos</p>
            <p className="text-sm font-semibold text-slate-800 leading-snug mt-1">{n.mensaje}</p>
            {n.accion && (
              <button onClick={() => { n.accion?.alHacerClick(); onEliminar(n.id) }} className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded transition-colors shadow-sm">
                <RotateCcw size={10} /> {n.accion.etiqueta}
              </button>
            )}
          </div>
          <button onClick={() => onEliminar(n.id)} className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 shrink-0">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

export function usarPedidos(): ValorContextoPedidos {
  const contexto = useContext(ContextoPedidos)
  if (!contexto) throw new Error('usarPedidos debe usarse dentro de un ProveedorPedidos')
  return contexto
}

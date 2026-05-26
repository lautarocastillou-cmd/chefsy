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
import {
  cargarPedidosLocales,
  guardarPedidosLocalmente,
  CLAVE_PEDIDOS_LOCAL,
} from '@/lib/pedidosLocal'
import { X, CheckCircle2, RotateCcw } from 'lucide-react'

// ── Acciones del reducer ──────────────────────────────

type AccionPedidos =
  | { tipo: 'CARGAR_PEDIDOS'; pedidos: Pedido[] }
  | { tipo: 'AGREGAR_PEDIDO'; pedido: Pedido }
  | { tipo: 'EDITAR_PEDIDO'; pedido: Pedido }
  | { tipo: 'CAMBIAR_ESTADO'; id: string; estado: EstadoPedido }
  | { tipo: 'ELIMINAR_PEDIDO'; id: string }

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
      return {
        pedidos: [accion.pedido, ...estado.pedidos],
      }

    case 'EDITAR_PEDIDO':
      return {
        pedidos: estado.pedidos.map((p) =>
          p.id === accion.pedido.id ? accion.pedido : p
        ),
      }

    case 'CAMBIAR_ESTADO':
      return {
        pedidos: estado.pedidos.map((p) =>
          p.id === accion.id ? { ...p, estado: accion.estado } : p
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

// Sonido sintético corto para entregas
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
    playTone(523.25, t, 0.25) // C5
    playTone(659.25, t + 0.08, 0.35) // E5
  } catch (error) {
    console.warn('No se pudo reproducir el sonido:', error)
  }
}

// Sonido sintético metálico que imita una campana de cocina de metal ("Ting-Ting")
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
    
    // Armónicos metálicos del primer tañido
    playTone(1567.98, t, 1.0, 0.15) // G6
    playTone(1975.53, t, 0.8, 0.10) // B6
    playTone(2637.02, t, 0.6, 0.05) // E7
    
    // Repique metálico rápido ("Ting-Ting")
    const t2 = t + 0.12
    playTone(1567.98, t2, 0.8, 0.12)
    playTone(1975.53, t2, 0.6, 0.08)
  } catch (error) {
    console.warn('No se pudo reproducir la campana de cocina:', error)
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

  // Cargar tema oscuro al montar
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

  // 1) Al montar en el cliente: cargar pedidos, categorías y productos guardados
  useEffect(() => {
    // Cargar pedidos
    const pedidosGuardados = cargarPedidosLocales()
    despachar({ tipo: 'CARGAR_PEDIDOS', pedidos: pedidosGuardados })
    prevPedidosRef.current = pedidosGuardados

    // Cargar categorías
    const catsCrud = localStorage.getItem('chefsy-categorias-v1')
    let catsActuales: CategoriaCatalogo[] = []
    if (catsCrud) {
      try {
        catsActuales = JSON.parse(catsCrud)
      } catch {
        catsActuales = categoriasCatalogo
      }
    } else {
      catsActuales = categoriasCatalogo
    }
    if (!catsActuales.some((c) => c.id === 'promos')) {
      catsActuales.push({ id: 'promos', nombre: 'Promos', orden: 9, activa: true })
    }
    setCategorias(catsActuales)
    localStorage.setItem('chefsy-categorias-v1', JSON.stringify(catsActuales))

    // Cargar productos
    const prodsCrud = localStorage.getItem('chefsy-productos-v1')
    let prodsActuales: ProductoCatalogo[] = []
    if (prodsCrud) {
      try {
        prodsActuales = JSON.parse(prodsCrud)
      } catch {
        prodsActuales = productosCatalogo
      }
    } else {
      prodsActuales = productosCatalogo
    }
    const defaultPromos = productosCatalogo.filter((p) => p.categoriaId === 'promos')
    defaultPromos.forEach((p) => {
      if (!prodsActuales.some((pa) => pa.id === p.id)) {
        prodsActuales.push(p)
      }
    })
    setProductos(prodsActuales)
    localStorage.setItem('chefsy-productos-v1', JSON.stringify(prodsActuales))

    // Cargar modificadores
    const modsCrud = localStorage.getItem('chefsy-modificadores-v1')
    if (modsCrud) {
      try {
        setModificadores(JSON.parse(modsCrud))
      } catch {
        setModificadores(modificadoresCatalogo)
        localStorage.setItem('chefsy-modificadores-v1', JSON.stringify(modificadoresCatalogo))
      }
    } else {
      setModificadores(modificadoresCatalogo)
      localStorage.setItem('chefsy-modificadores-v1', JSON.stringify(modificadoresCatalogo))
    }

    setEstaListo(true)
  }, [])

  // 2) Guardar en localStorage ante cada cambio de pedidos
  useEffect(() => {
    if (!estaListo) return
    guardarPedidosLocalmente(estado.pedidos)
  }, [estado.pedidos, estaListo])

  // 3) Sincronizar en tiempo real entre pestañas (Storage Event)
  useEffect(() => {
    if (!estaListo) return

    const sincronizarTabs = (evento: StorageEvent) => {
      if (evento.key === CLAVE_PEDIDOS_LOCAL && evento.newValue) {
        try {
          const nuevosPedidos = JSON.parse(evento.newValue)
          despachar({ tipo: 'CARGAR_PEDIDOS', pedidos: nuevosPedidos })
        } catch (e) {
          console.error('[Chefsy] Error de sincronización de pedidos:', e)
        }
      }
      if (evento.key === 'chefsy-categorias-v1' && evento.newValue) {
        try {
          setCategorias(JSON.parse(evento.newValue))
        } catch (e) {
          console.error('[Chefsy] Error de sincronización de categorías:', e)
        }
      }
      if (evento.key === 'chefsy-productos-v1' && evento.newValue) {
        try {
          setProductos(JSON.parse(evento.newValue))
        } catch (e) {
          console.error('[Chefsy] Error de sincronización de productos:', e)
        }
      }
      if (evento.key === 'chefsy-modificadores-v1' && evento.newValue) {
        try {
          setModificadores(JSON.parse(evento.newValue))
        } catch (e) {
          console.error('[Chefsy] Error de sincronización de modificadores:', e)
        }
      }
    }

    window.addEventListener('storage', sincronizarTabs)
    return () => window.removeEventListener('storage', sincronizarTabs)
  }, [estaListo])

  // 4) Monitorear cambios de estado para lanzar notificaciones y sonidos
  useEffect(() => {
    if (!estaListo) return

    if (prevPedidosRef.current.length > 0) {
      // a) Detectar si hay algún pedido nuevo agregado al sistema
      const nuevosPedidos = estado.pedidos.filter(
        (nuevo) => !prevPedidosRef.current.some((prev) => prev.id === nuevo.id)
      )

      nuevosPedidos.forEach((nuevo) => {
        // Reproducir sonido de campana de cocina
        reproducirSonidoCampanaCocina()
        
        // Si el pedido fue cargado desde otra pestaña/dispositivo, mostrar la notificación flotante
        if (!esCambioLocalRef.current) {
          agregarNotificacion(`🔔 ¡Nuevo pedido ingresado de ${nuevo.cliente}!`, 'info')
        }
      })

      // b) Detectar si algún pedido cambió a entregado
      estado.pedidos.forEach((nuevo) => {
        const anterior = prevPedidosRef.current.find((p) => p.id === nuevo.id)
        if (anterior && anterior.estado !== 'entregado' && nuevo.estado === 'entregado') {
          // Solo si es un cambio externo
          if (!esCambioLocalRef.current) {
            agregarNotificacion(`¡El pedido de ${nuevo.cliente} fue entregado! 🛵`, 'success')
            reproducirSonidoNotificacion()
          }
        }
      })
    }
    // Reiniciamos el indicador de cambio local para la próxima actualización
    esCambioLocalRef.current = false
    prevPedidosRef.current = estado.pedidos
  }, [estado.pedidos, estaListo])

  const agregarPedido = (pedido: Pedido) => {
    esCambioLocalRef.current = true
    despachar({ tipo: 'AGREGAR_PEDIDO', pedido })
    // Ejecutar campana de forma local inmediata
    reproducirSonidoCampanaCocina()
  }

  const editarPedido = (pedido: Pedido) => {
    esCambioLocalRef.current = true
    despachar({ tipo: 'EDITAR_PEDIDO', pedido })
  }

  const cambiarEstado = (id: string, nuevoEstado: EstadoPedido) => {
    const pedido = estado.pedidos.find((p) => p.id === id)
    if (pedido) {
      const estadoAnterior = pedido.estado
      if (estadoAnterior !== nuevoEstado) {
        esCambioLocalRef.current = true
        despachar({ tipo: 'CAMBIAR_ESTADO', id, estado: nuevoEstado })
        
        const nombresEstados: Record<EstadoPedido, string> = {
          nuevo: 'Nuevo',
          en_cocina: 'En Cocina',
          listo: 'Listo',
          en_reparto: 'En Reparto',
          entregado: 'Entregado',
          cancelado: 'Cancelado'
        }

        agregarNotificacion(
          `Pedido de ${pedido.cliente} cambiado a "${nombresEstados[nuevoEstado]}".`,
          'info',
          {
            etiqueta: 'Deshacer',
            alHacerClick: () => {
              esCambioLocalRef.current = true
              despachar({ tipo: 'CAMBIAR_ESTADO', id, estado: estadoAnterior })
            }
          }
        )
      }
    }
  }

  const eliminarPedido = (id: string) => {
    despachar({ tipo: 'ELIMINAR_PEDIDO', id })
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

  const agregarNotificacion = (
    mensaje: string,
    tipo: 'info' | 'success' | 'warning' = 'success',
    accion?: { etiqueta: string; alHacerClick: () => void }
  ) => {
    const id = Date.now().toString()
    setNotificaciones((prev) => [...prev, { id, mensaje, tipo, accion }])
    setTimeout(() => {
      setNotificaciones((prev) => prev.filter((n) => n.id !== id))
    }, 6000)
  }

  const eliminarNotificacion = (id: string) => {
    setNotificaciones((prev) => prev.filter((n) => n.id !== id))
  }

  const valor: ValorContextoPedidos = {
    pedidos: estado.pedidos,
    categorias,
    productos,
    modificadores,
    estaListo,
    agregarPedido,
    editarPedido,
    cambiarEstado,
    eliminarPedido,
    actualizarCategorias,
    actualizarProductos,
    actualizarModificadores,
    notificaciones,
    eliminarNotificacion,
    modoOscuro,
    alternarModoOscuro,
  }

  return (
    <ContextoPedidos.Provider value={valor}>
      {!estaListo ? (
        <div className="min-h-[40vh] flex items-center justify-center text-sm text-gray-400">
          Cargando pedidos…
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

function ContenedorToasts({
  notificaciones,
  onEliminar,
}: {
  notificaciones: Notificacion[]
  onEliminar: (id: string) => void
}) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full px-4 sm:px-0">
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateY(20px) scale(0.95);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        .toast-animate {
          animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
      {notificaciones.map((n) => (
        <div
          key={n.id}
          className="toast-animate bg-white border border-slate-100 shadow-2xl rounded-2xl p-4 flex items-start gap-3 relative overflow-hidden"
          style={{
            borderLeft: n.tipo === 'success' ? '4px solid #10B981' : n.tipo === 'warning' ? '4px solid #F59E0B' : '4px solid #3B82F6'
          }}
        >
          <div className="text-green-500 shrink-0 mt-0.5">
            {n.tipo === 'success' ? (
              <CheckCircle2 size={18} className="text-green-500" />
            ) : (
              <CheckCircle2 size={18} className="text-blue-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Sistema de Pedidos
            </p>
            <p className="text-sm font-semibold text-slate-800 leading-snug mt-1">
              {n.mensaje}
            </p>
            {n.accion && (
              <button
                onClick={() => {
                  n.accion?.alHacerClick()
                  onEliminar(n.id)
                }}
                className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded transition-colors shadow-sm"
              >
                <RotateCcw size={10} /> {n.accion.etiqueta}
              </button>
            )}
          </div>
          <button
            onClick={() => onEliminar(n.id)}
            className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

export function usarPedidos(): ValorContextoPedidos {
  const contexto = useContext(ContextoPedidos)
  if (!contexto) {
    throw new Error('usarPedidos debe usarse dentro de un ProveedorPedidos')
  }
  return contexto
}

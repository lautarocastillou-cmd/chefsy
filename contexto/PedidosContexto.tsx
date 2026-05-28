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
import { usarAuth } from '@/contexto/AuthContexto'

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
  cambiarEstado: (id: string, estado: EstadoPedido, mostrarDeshacer?: boolean) => void
  marcarPagoConfirmado: (id: string, confirmado: boolean) => void
  eliminarPedido: (id: string) => void
  actualizarCategorias: (categorias: CategoriaCatalogo[]) => void
  actualizarProductos: (productos: ProductoCatalogo[]) => void
  actualizarModificadores: (modificadores: ModificadorCatalogo[]) => void
  notificaciones: Notificacion[]
  eliminarNotificacion: (id: string) => void
  modoOscuro: boolean
  alternarModoOscuro: () => void
  dbEstado: 'conectado' | 'desconectado' | 'cargando'
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

export function ProveedorPedidos({ children }: { children: ReactNode }) {
  const [estado, despachar] = useReducer(reducerPedidos, estadoInicial)
  const [categorias, setCategorias] = useState<CategoriaCatalogo[]>([])
  const [productos, setProductos] = useState<ProductoCatalogo[]>([])
  const [modificadores, setModificadores] = useState<ModificadorCatalogo[]>([])
  const [estaListo, setEstaListo] = useState(false)
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [modoOscuro, setModoOscuro] = useState(false)
  const [dbEstado, setDbEstado] = useState<'conectado' | 'desconectado' | 'cargando'>('cargando')
  
  const prevPedidosRef = useRef<Pedido[]>([])
  const esCambioLocalRef = useRef(false)

  // Referencias para el catálogo para evitar closures obsoletos en llamadas asíncronas
  const categoriasRef = useRef<CategoriaCatalogo[]>([])
  const productosRef = useRef<ProductoCatalogo[]>([])
  const modificadoresRef = useRef<ModificadorCatalogo[]>([])
  const esCambioCatalogoLocalRef = useRef(false)

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

  // 1) Al montar: Cargar Catálogo (Supabase con fallback de LocalStorage) y Pedidos
  useEffect(() => {
    async function cargarInicial() {
      // 1.a) Primero cargar fallbacks locales desde localStorage o estáticos
      const catsCrud = localStorage.getItem('chefsy-categorias-v1')
      let catsActuales = catsCrud ? JSON.parse(catsCrud) : categoriasCatalogo
      if (!catsActuales.some((c: any) => c.id === 'promos')) {
        catsActuales.push({ id: 'promos', nombre: 'Promos', orden: 9, activa: true })
      }
      setCategorias(catsActuales)
      categoriasRef.current = catsActuales

      const prodsCrud = localStorage.getItem('chefsy-productos-v1')
      let prodsActuales = prodsCrud ? JSON.parse(prodsCrud) : productosCatalogo
      setProductos(prodsActuales)
      productosRef.current = prodsActuales

      const modsCrud = localStorage.getItem('chefsy-modificadores-v1')
      let modsActuales = modsCrud ? JSON.parse(modsCrud) : modificadoresCatalogo
      setModificadores(modsActuales)
      modificadoresRef.current = modsActuales

      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      const credencialesValidas = url && key && !url.includes('falta-configurar') && !key.includes('falta-configurar')

      // 1.b) Intentar cargar catálogo de Supabase si las credenciales existen
      if (credencialesValidas) {
        try {
          const { data: catalogoGuardado, error: catError } = await supabase
            .from('catalogo')
            .select('*')
            .eq('id', 'principal')
            .single()

          if (catError && catError.code === 'PGRST116') {
            // El catálogo principal no existe, crearlo con valores iniciales
            const { error: insError } = await supabase
              .from('catalogo')
              .insert({
                id: 'principal',
                categorias: catsActuales,
                productos: prodsActuales,
                modificadores: modsActuales
              })
            if (insError) {
              console.error('[Supabase] Error al inicializar catálogo:', insError)
            }
          } else if (catError) {
            throw catError
          } else if (catalogoGuardado) {
            const cats = catalogoGuardado.categorias || []
            const prods = catalogoGuardado.productos || []
            const mods = catalogoGuardado.modificadores || []

            setCategorias(cats)
            categoriasRef.current = cats
            localStorage.setItem('chefsy-categorias-v1', JSON.stringify(cats))

            setProductos(prods)
            productosRef.current = prods
            localStorage.setItem('chefsy-productos-v1', JSON.stringify(prods))

            setModificadores(mods)
            modificadoresRef.current = mods
            localStorage.setItem('chefsy-modificadores-v1', JSON.stringify(mods))
          }
        } catch (err) {
          console.error('[Supabase] Error al cargar catálogo remoto:', err)
        }
      }

      // 1.c) Intentar cargar Pedidos desde Supabase
      try {
        if (!credencialesValidas) {
          setDbEstado('desconectado')
          setEstaListo(true)
          return
        }

        const { data: pedidosGuardados, error } = await supabase
          .from('pedidos')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)
        
        if (error) throw error

        setDbEstado('conectado')

        if (pedidosGuardados) {
          // Mapeamos ubicacion_cadete a reparto_at porque usamos la columna existente en Supabase para no romper el esquema
          const pedidosMapeados = pedidosGuardados.map((p: any) => ({
            ...p,
            reparto_at: p.reparto_at || p.ubicacion_cadete || null
          }))
          despachar({ tipo: 'CARGAR_PEDIDOS', pedidos: pedidosMapeados as Pedido[] })
          prevPedidosRef.current = pedidosMapeados as Pedido[]
        }
      } catch (error) {
        console.error('[Supabase] Error al cargar pedidos:', error)
        setDbEstado('desconectado')
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
            const pedidoCrudo = payload.new as any
            const pedido = {
              ...pedidoCrudo,
              reparto_at: pedidoCrudo.reparto_at || pedidoCrudo.ubicacion_cadete || null
            } as Pedido
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

  // 3) Sincronizar Catálogo local entre pestañas (Storage Event)
  useEffect(() => {
    if (!estaListo) return
    const sincronizarTabs = (evento: StorageEvent) => {
      if (evento.key === 'chefsy-categorias-v1' && evento.newValue) {
        const val = JSON.parse(evento.newValue)
        setCategorias(val)
        categoriasRef.current = val
      }
      if (evento.key === 'chefsy-productos-v1' && evento.newValue) {
        const val = JSON.parse(evento.newValue)
        setProductos(val)
        productosRef.current = val
      }
      if (evento.key === 'chefsy-modificadores-v1' && evento.newValue) {
        const val = JSON.parse(evento.newValue)
        setModificadores(val)
        modificadoresRef.current = val
      }
    }
    window.addEventListener('storage', sincronizarTabs)
    return () => window.removeEventListener('storage', sincronizarTabs)
  }, [estaListo])

  // 3.b) Suscripción Realtime para la tabla de catálogo (Supabase)
  useEffect(() => {
    if (!estaListo) return

    const channel = supabase
      .channel('tabla-catalogo')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'catalogo' },
        (payload) => {
          if (esCambioCatalogoLocalRef.current) return

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const catalogoNuevo = payload.new as any
            if (catalogoNuevo && catalogoNuevo.id === 'principal') {
              const cats = catalogoNuevo.categorias || []
              const prods = catalogoNuevo.productos || []
              const mods = catalogoNuevo.modificadores || []

              setCategorias(cats)
              categoriasRef.current = cats
              localStorage.setItem('chefsy-categorias-v1', JSON.stringify(cats))

              setProductos(prods)
              productosRef.current = prods
              localStorage.setItem('chefsy-productos-v1', JSON.stringify(prods))

              setModificadores(mods)
              modificadoresRef.current = mods
              localStorage.setItem('chefsy-modificadores-v1', JSON.stringify(mods))
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
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
      const payload: any = { ...pedido }
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

  const editarPedido = async (pedido: Pedido) => {
    esCambioLocalRef.current = true
    despachar({ tipo: 'EDITAR_PEDIDO', pedido })
    
    try {
      const payload: any = { ...pedido }
      if (payload.reparto_at !== undefined) {
        payload.ubicacion_cadete = payload.reparto_at
        delete payload.reparto_at
      }

      const { error } = await supabase.from('pedidos').update(payload).eq('id', pedido.id)
      if (error) throw error
    } catch (e) {
      console.error('[Supabase] Error al actualizar pedido', e)
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
            
            const payloadDeshacer: any = { ...updatesAnteriores }
            if (payloadDeshacer.reparto_at !== undefined) {
              payloadDeshacer.ubicacion_cadete = payloadDeshacer.reparto_at
              delete payloadDeshacer.reparto_at
            }
            await supabase.from('pedidos').update(payloadDeshacer).eq('id', id)
          }
        } : undefined
      )

      try {
        const payload: any = { ...updates }
        if (payload.reparto_at !== undefined) {
          payload.ubicacion_cadete = payload.reparto_at
          delete payload.reparto_at
        }

        const { error } = await supabase.from('pedidos').update(payload).eq('id', id)
        if (error) throw error
      } catch (e) {
        console.error('[Supabase] Error al cambiar estado', e)
      }
    }
  }

  const marcarPagoConfirmado = async (id: string, confirmado: boolean) => {
    esCambioLocalRef.current = true
    const pedido = estado.pedidos.find((p) => p.id === id)
    if (pedido) {
      despachar({ tipo: 'EDITAR_PEDIDO', pedido: { ...pedido, pago_confirmado: confirmado } })
      try {
        const { error } = await supabase.from('pedidos').update({ pago_confirmado: confirmado }).eq('id', id)
        if (error) throw error
      } catch (e) {
        console.error('[Supabase] Error al marcar pago confirmado', e)
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

  // Guardar catálogo completo en Supabase
  const sincronizarCatalogoCompleto = async () => {
    try {
      esCambioCatalogoLocalRef.current = true
      const { error } = await supabase
        .from('catalogo')
        .upsert({
          id: 'principal',
          categorias: categoriasRef.current,
          productos: productosRef.current,
          modificadores: modificadoresRef.current,
          updated_at: new Date().toISOString()
        })
      if (error) throw error
    } catch (e) {
      console.error('[Supabase] Error al sincronizar catálogo remoto:', e)
    } finally {
      setTimeout(() => {
        esCambioCatalogoLocalRef.current = false
      }, 500)
    }
  }

  const actualizarCategorias = (nuevasCategorias: CategoriaCatalogo[]) => {
    setCategorias(nuevasCategorias)
    categoriasRef.current = nuevasCategorias
    localStorage.setItem('chefsy-categorias-v1', JSON.stringify(nuevasCategorias))
    sincronizarCatalogoCompleto()
  }

  const actualizarProductos = (nuevosProductos: ProductoCatalogo[]) => {
    setProductos(nuevosProductos)
    productosRef.current = nuevosProductos
    localStorage.setItem('chefsy-productos-v1', JSON.stringify(nuevosProductos))
    sincronizarCatalogoCompleto()
  }

  const actualizarModificadores = (nuevosModificadores: ModificadorCatalogo[]) => {
    setModificadores(nuevosModificadores)
    modificadoresRef.current = nuevosModificadores
    localStorage.setItem('chefsy-modificadores-v1', JSON.stringify(nuevosModificadores))
    sincronizarCatalogoCompleto()
  }

  const agregarNotificacion = (mensaje: string, tipo: 'info' | 'success' | 'warning' = 'success', accion?: { etiqueta: string; alHacerClick: () => void }) => {
    const id = Date.now().toString()
    setNotificaciones((prev) => [...prev, { id, mensaje, tipo, accion }])
    setTimeout(() => { setNotificaciones((prev) => prev.filter((n) => n.id !== id)) }, 6000)
  }

  const eliminarNotificacion = (id: string) => {
    setNotificaciones((prev) => prev.filter((n) => n.id !== id))
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
          limiteMs = 1 * 60 * 1000 // 1 minuto
          repeticionMs = 1 * 60 * 1000 // Cada 1 minuto
          msgEstado = 'nuevo'
        } else if (estadoActual === 'en_cocina') {
          limiteMs = 45 * 60 * 1000 // 45 minutos
          repeticionMs = null // Sin repetición
          msgEstado = 'en cocina'
        } else if (estadoActual === 'listo') {
          limiteMs = 10 * 60 * 1000 // 10 minutos
          repeticionMs = null // Sin repetición
          msgEstado = 'listo'
        } else if (estadoActual === 'en_reparto') {
          limiteMs = 30 * 60 * 1000 // 30 minutos
          repeticionMs = 2 * 60 * 1000 // Cada 2 minutos
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
    }, 10000) // Verificar cada 10 segundos

    return () => clearInterval(interval)
  }, [estado.pedidos, usuarioActivo, agregarNotificacion])

  const valor: ValorContextoPedidos = {
    pedidos: estado.pedidos, categorias, productos, modificadores, estaListo,
    agregarPedido, editarPedido, cambiarEstado, marcarPagoConfirmado, eliminarPedido,
    actualizarCategorias, actualizarProductos, actualizarModificadores,
    notificaciones, eliminarNotificacion, modoOscuro, alternarModoOscuro,
    dbEstado,
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

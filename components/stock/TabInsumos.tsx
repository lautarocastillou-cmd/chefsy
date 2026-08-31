'use client'

import { useState, useMemo } from 'react'
import { CategoriaInsumo, Insumo, RecetaProducto, TipoMovimientoStock } from '@/tipos/stock'
import { ProductoCatalogo, CategoriaCatalogo } from '@/tipos/catalogo'
import { usarCatalogo } from '@/contexto/CatalogoContexto'
import toast from 'react-hot-toast'
import { ModalKardexInsumo } from './ModalKardexInsumo'
import { ModalIngresoRemito } from './ModalIngresoRemito'
import {
  Plus,
  Trash2,
  Edit2,
  Save,
  Search,
  Zap,
  ShoppingBag,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  X,
  Package,
  Layers,
  Sparkles,
  ArrowUpRight,
  TrendingDown,
  Eye,
  EyeOff,
  Loader2,
  History,
  Truck,
  ShieldAlert
} from 'lucide-react'

type FiltroEstado = 'todos' | 'criticos' | 'bajo' | 'optimo' | 'ocultos'

export function TabInsumos({
  insumos,
  categorias,
  recetas = [],
  productos = [],
  categoriasCatalogo = [],
  onUpdate
}: {
  insumos: Insumo[]
  categorias: CategoriaInsumo[]
  recetas?: RecetaProducto[]
  productos?: ProductoCatalogo[]
  categoriasCatalogo?: CategoriaCatalogo[]
  onUpdate: () => void
}) {
  const { actualizarProductos, modificadores: modificadoresCatalogo } = usarCatalogo()

  const [nombre, setNombre] = useState('')
  const [categoriaId, setCategoriaId] = useState(categorias[0]?.id || '')
  const [unidad, setUnidad] = useState('unidades')
  const [stock, setStock] = useState<number>(0)
  
  const [editando, setEditando] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)

  // Filtros y búsqueda
  const [busqueda, setBusqueda] = useState('')
  const [filtroCat, setFiltroCat] = useState<string>('todas')
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos')

  // Estado de procesamiento de pausa / reactivación en tienda
  const [procesandoPausa, setProcesandoPausa] = useState<Record<string, boolean>>({})

  // Modal de reposición rápida individual
  const [insumoReposicion, setInsumoReposicion] = useState<Insumo | null>(null)
  const [cantidadDelta, setCantidadDelta] = useState<number>(12)
  const [tipoOperacion, setTipoOperacion] = useState<'sumar' | 'restar'>('sumar')
  const [subtipoMovimiento, setSubtipoMovimiento] = useState<TipoMovimientoStock>('ingreso_mercaderia')
  const [motivoMovimiento, setMotivoMovimiento] = useState('')
  const [autoReactivarTienda, setAutoReactivarTienda] = useState(true)
  const [guardandoReposicion, setGuardandoReposicion] = useState(false)

  // Modal de Kardex individual
  const [insumoKardex, setInsumoKardex] = useState<Insumo | null>(null)

  // Modal de Ingreso Masivo de Remito
  const [modalRemitoAbierto, setModalRemitoAbierto] = useState(false)

  // Modal de lista de compras para proveedor
  const [modalComprasAbierto, setModalComprasAbierto] = useState(false)
  const [copiado, setCopiado] = useState(false)

  // Para actualización rápida de stock inline
  const [stockRapido, setStockRapido] = useState<Record<string, number>>({})
  const [guardandoStockId, setGuardandoStockId] = useState<string | null>(null)

  // ── Helper: Obtener productos del catálogo asociados al insumo ─────────────
  const obtenerProductosAsociados = (insumo: Insumo): ProductoCatalogo[] => {
    const nombreLimpio = insumo.nombre.toLowerCase().trim()
    
    // 1. Coincidencia directa de nombre (ej: "AQUARIUS MANZANA 1.5lts")
    const porNombre = productos.filter(p => p.nombre.toLowerCase().trim() === nombreLimpio)
    
    // 2. Coincidencia por receta (productos cuya receta usa este insumo)
    const porReceta = productos.filter(p =>
      recetas.some(r => r.producto_id === p.id && r.insumos.some(i => i.insumo_id === insumo.id))
    )

    const mapa = new Map<string, ProductoCatalogo>()
    porNombre.forEach(p => mapa.set(p.id, p))
    porReceta.forEach(p => mapa.set(p.id, p))
    return Array.from(mapa.values())
  }

  // ── Helper: Sincronizar visibilidad de productos vinculados ────────────────
  const sincronizarVisibilidadProductos = async (insumo: Insumo, hacerActivos: boolean) => {
    const asociados = obtenerProductosAsociados(insumo)
    if (asociados.length === 0) return

    const idsAfectados = asociados.map(p => p.id)
    const nuevosProductos = productos.map(p =>
      idsAfectados.includes(p.id) ? { ...p, activo: hacerActivos } : p
    )

    const res = await fetch('/api/admin/catalogo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categorias: categoriasCatalogo,
        productos: nuevosProductos,
        modificadores: modificadoresCatalogo
      })
    })

    if (res.ok) {
      actualizarProductos(nuevosProductos)
    }

    // Actualizar estado activo en stock_insumos
    await fetch('/api/admin/stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accion: 'upsert_insumo',
        payload: {
          id: insumo.id,
          nombre: insumo.nombre,
          categoria_id: insumo.categoria_id,
          unidad_medida: insumo.unidad_medida,
          stock_actual: insumo.stock_actual,
          activo: hacerActivos
        }
      })
    })
  }

  // ── Helper: Verificar si un insumo o sus productos están pausados/ocultos ──
  const estaPausadoEnTienda = (insumo: Insumo): boolean => {
    const asociados = obtenerProductosAsociados(insumo)
    if (asociados.length > 0) {
      // Si todos los productos vinculados están desactivados en catálogo
      return asociados.every(p => !p.activo)
    }
    // Si no tiene receta directa, chequear la bandera activo del insumo
    return insumo.activo === false
  }

  // ── Alternar Visibilidad en Tienda (Pausar / Activar con 1 Click) ──────────
  const alternarEstadoEnTienda = async (insumo: Insumo) => {
    const asociados = obtenerProductosAsociados(insumo)
    const pausadoActualmente = estaPausadoEnTienda(insumo)
    const nuevoEstadoActivo = pausadoActualmente // si estaba pausado, lo activamos; si no, lo pausamos

    setProcesandoPausa(prev => ({ ...prev, [insumo.id]: true }))

    try {
      // 1. Actualizar productos asociados en el catálogo (si existen)
      if (asociados.length > 0) {
        const idsAfectados = asociados.map(p => p.id)
        const nuevosProductos = productos.map(p =>
          idsAfectados.includes(p.id) ? { ...p, activo: nuevoEstadoActivo } : p
        )

        const res = await fetch('/api/admin/catalogo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            categorias: categoriasCatalogo,
            productos: nuevosProductos,
            modificadores: modificadoresCatalogo
          })
        })

        if (!res.ok) throw new Error('Error al sincronizar catálogo con la tienda')
        actualizarProductos(nuevosProductos)
      }

      // 2. Actualizar estado del insumo en la tabla stock_insumos
      await fetch('/api/admin/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'upsert_insumo',
          payload: {
            id: insumo.id,
            nombre: insumo.nombre,
            categoria_id: insumo.categoria_id,
            unidad_medida: insumo.unidad_medida,
            stock_actual: insumo.stock_actual,
            activo: nuevoEstadoActivo
          }
        })
      })

      const detalleProds = asociados.length > 0 ? ` (${asociados.map(p => p.nombre).join(', ')})` : ''

      toast.success(
        nuevoEstadoActivo
          ? `"${insumo.nombre}" activado y visible en la tienda online${detalleProds}`
          : `"${insumo.nombre}" ocultado/pausado de la tienda online${detalleProds}`,
        {
          icon: nuevoEstadoActivo ? '👁️' : '⏸️',
          duration: 3500
        }
      )

      onUpdate()
    } catch (error: any) {
      toast.error('Error al cambiar visibilidad: ' + error.message)
    } finally {
      setProcesandoPausa(prev => {
        const next = { ...prev }
        delete next[insumo.id]
        return next
      })
    }
  }

  // ── Estadísticas de Semáforo de Stock ──────────────────────────────────────
  const stats = useMemo(() => {
    const total = insumos.length
    const criticos = insumos.filter(i => i.stock_actual <= 0)
    const bajo = insumos.filter(i => i.stock_actual > 0 && i.stock_actual <= 5)
    const optimo = insumos.filter(i => i.stock_actual > 5)
    const ocultos = insumos.filter(i => estaPausadoEnTienda(i))

    return { total, criticos: criticos.length, bajo: bajo.length, optimo: optimo.length, ocultos: ocultos.length }
  }, [insumos, productos, recetas])

  // ── Filtrado en Tiempo Real ────────────────────────────────────────────────
  const insumosFiltrados = useMemo(() => {
    const filtrados = insumos.filter(i => {
      // 1. Filtro por texto de búsqueda
      const coincideBusqueda = !busqueda.trim() || i.nombre.toLowerCase().includes(busqueda.toLowerCase())

      // 2. Filtro por categoría
      const coincideCat = filtroCat === 'todas' || i.categoria_id === filtroCat

      // 3. Filtro por estado del stock
      let coincideEstado = true
      if (filtroEstado === 'criticos') coincideEstado = i.stock_actual <= 0
      if (filtroEstado === 'bajo') coincideEstado = i.stock_actual > 0 && i.stock_actual <= 5
      if (filtroEstado === 'optimo') coincideEstado = i.stock_actual > 5
      if (filtroEstado === 'ocultos') coincideEstado = estaPausadoEnTienda(i)

      return coincideBusqueda && coincideCat && coincideEstado
    })

    // Ordenar: productos activos/visibles arriba, productos pausados/ocultos al fondo
    return [...filtrados].sort((a, b) => {
      const aPausado = estaPausadoEnTienda(a)
      const bPausado = estaPausadoEnTienda(b)
      if (aPausado !== bPausado) {
        return aPausado ? 1 : -1 // Pausados al fondo
      }
      return a.nombre.localeCompare(b.nombre)
    })
  }, [insumos, busqueda, filtroCat, filtroEstado, productos, recetas])

  // ── Insumos que requieren compra ──────────────────────────────────────────
  const insumosParaComprar = useMemo(() => {
    return insumos.filter(i => i.stock_actual <= 5).sort((a, b) => a.stock_actual - b.stock_actual)
  }, [insumos])

  // Insumos agotados (<=0) que tienen platos vinculados pausados
  const insumosAgotadosConPlatosPausados = useMemo(() => {
    return insumos.filter(ins => {
      if (ins.stock_actual > 0) return false
      const asociados = obtenerProductosAsociados(ins)
      return asociados.length > 0 && asociados.some(p => !p.activo)
    })
  }, [insumos, productos, recetas])

  const totalPlatosPausadosPorAgotamiento = useMemo(() => {
    const ids = new Set<string>()
    insumosAgotadosConPlatosPausados.forEach(ins => {
      const asociados = obtenerProductosAsociados(ins)
      asociados.filter(p => !p.activo).forEach(p => ids.add(p.id))
    })
    return ids.size
  }, [insumosAgotadosConPlatosPausados, productos, recetas])

  // ── Guardar / Crear Insumo ─────────────────────────────────────────────────
  const guardar = async () => {
    if (!nombre.trim() || !categoriaId) return
    setGuardando(true)
    try {
      const payload = {
        id: editando || crypto.randomUUID(),
        nombre: nombre.trim(),
        categoria_id: categoriaId,
        unidad_medida: unidad,
        stock_actual: stock
      }
      const res = await fetch('/api/admin/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'upsert_insumo', payload })
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success(editando ? 'Insumo actualizado' : 'Insumo agregado')
      resetForm()
      onUpdate()
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setGuardando(false)
    }
  }

  const resetForm = () => {
    setNombre('')
    setStock(0)
    setUnidad('unidades')
    setEditando(null)
    setMostrarFormulario(false)
  }

  const eliminar = async (id: string, nombreInsumo: string) => {
    if (!confirm(`¿Seguro que deseas eliminar "${nombreInsumo}"?`)) return
    try {
      const res = await fetch('/api/admin/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'delete_insumo', payload: { id } })
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success('Insumo eliminado')
      onUpdate()
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    }
  }

  const guardarStockRapido = async (id: string) => {
    const nuevoStock = stockRapido[id]
    if (nuevoStock === undefined) return
    setGuardandoStockId(id)
    try {
      const ins = insumos.find(i => i.id === id)
      const res = await fetch('/api/admin/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'update_stock', payload: { id, stock_actual: nuevoStock } })
      })
      if (!res.ok) throw new Error(await res.text())

      // Auto-pausado si el stock llega a 0
      if (ins && nuevoStock <= 0) {
        const asociados = obtenerProductosAsociados(ins)
        if (asociados.length > 0) {
          await sincronizarVisibilidadProductos(ins, false)
          toast.error(
            `🛡️ Auto-Pausado: Se pausaron automáticamente ${asociados.length} plato(s) en la tienda por falta de "${ins.nombre}".`,
            { duration: 4500 }
          )
        }
      }

      toast.success('Stock actualizado', { id: `stock-${id}`, duration: 2000 })
      setStockRapido(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      onUpdate()
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setGuardandoStockId(null)
    }
  }

  // ── Aplicar Reposición Rápida (Modal con Kardex y Auto-Reactivación) ───────
  const aplicarReposicion = async () => {
    if (!insumoReposicion || cantidadDelta <= 0) return
    setGuardandoReposicion(true)
    try {
      const deltaFinal = tipoOperacion === 'sumar' ? Number(cantidadDelta) : -Number(cantidadDelta)
      const nuevoStockCalculado = Math.max(0, insumoReposicion.stock_actual + deltaFinal)

      const res = await fetch('/api/admin/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'update_stock',
          payload: {
            id: insumoReposicion.id,
            delta: deltaFinal,
            tipo_movimiento: subtipoMovimiento,
            motivo: motivoMovimiento.trim() || undefined,
          }
        })
      })
      if (!res.ok) throw new Error(await res.text())

      const asociados = obtenerProductosAsociados(insumoReposicion)

      // Si se sumó stock y se activó la auto-reactivación:
      if (tipoOperacion === 'sumar' && autoReactivarTienda && asociados.length > 0) {
        await sincronizarVisibilidadProductos(insumoReposicion, true)
        toast.success(
          `¡Stock reabastecido (+${cantidadDelta}) y ${asociados.length} plato(s) reactivados en la tienda online!`,
          { icon: '🚀', duration: 4000 }
        )
      } else if (tipoOperacion === 'restar' && nuevoStockCalculado <= 0 && asociados.length > 0) {
        // Auto-Pausado si el stock llegó a 0 al restar
        await sincronizarVisibilidadProductos(insumoReposicion, false)
        toast.error(
          `🛡️ Auto-Pausado: Se pausaron automáticamente ${asociados.length} plato(s) en la tienda por quiebre de stock de "${insumoReposicion.nombre}".`,
          { duration: 5000 }
        )
      } else {
        toast.success(
          tipoOperacion === 'sumar'
            ? `¡Stock reabastecido! (+${cantidadDelta} ${insumoReposicion.unidad_medida})`
            : `Ajuste registrado en Kardex (-${cantidadDelta} ${insumoReposicion.unidad_medida})`
        )
      }

      setInsumoReposicion(null)
      setMotivoMovimiento('')
      onUpdate()
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setGuardandoReposicion(false)
    }
  }

  // ── Copiar Lista de Compras para WhatsApp ──────────────────────────────────
  const generarTextoCompras = () => {
    const hoy = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
    const hoyCap = hoy.charAt(0).toUpperCase() + hoy.slice(1)

    const criticos = insumosParaComprar.filter(i => i.stock_actual <= 0)
    const bajos = insumosParaComprar.filter(i => i.stock_actual > 0)

    let texto = `🛒 *LISTA DE COMPRAS Y REPOSICIÓN - CHEFSY*\n📅 ${hoyCap}\n----------------------------------------\n`

    if (criticos.length > 0) {
      texto += `\n🚨 *URGENTE / AGOTADOS (${criticos.length}):*\n`
      criticos.forEach(i => {
        texto += `• 🔴 *${i.nombre}* (Stock: ${i.stock_actual} ${i.unidad_medida})\n`
      })
    }

    if (bajos.length > 0) {
      texto += `\n⚠️ *POR AGOTARSE / STOCK BAJO (${bajos.length}):*\n`
      bajos.forEach(i => {
        texto += `• 🟡 *${i.nombre}* (Quedan: ${i.stock_actual} ${i.unidad_medida})\n`
      })
    }

    texto += `\n----------------------------------------\n_Generado automáticamente desde Chefsy_`
    return texto
  }

  const copiarListaCompras = () => {
    const texto = generarTextoCompras()
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true)
      toast.success('¡Lista de compras copiada al portapapeles!')
      setTimeout(() => setCopiado(false), 2500)
    }).catch(() => toast.error('Error al copiar'))
  }

  if (categorias.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
        <Package size={40} className="mx-auto text-slate-400 mb-2" />
        <h3 className="font-bold text-slate-700 dark:text-slate-200">No tenés categorías de insumos</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">Primero creá categorías como &quot;Bebidas&quot;, &quot;Panificados&quot;, &quot;Carnes&quot; en la pestaña Categorías.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── 1. TARJETAS DE SEMÁFORO DE STOCK ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        
        {/* Total Insumos */}
        <div 
          onClick={() => setFiltroEstado('todos')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            filtroEstado === 'todos'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-md scale-[1.02]'
              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Total Insumos</span>
            <Layers size={15} className="opacity-70" />
          </div>
          <p className="text-2xl font-black">{stats.total}</p>
          <span className="text-[10px] opacity-70">En catálogo</span>
        </div>

        {/* Agotados / Negativos (Críticos) */}
        <div 
          onClick={() => setFiltroEstado('criticos')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            filtroEstado === 'criticos'
              ? 'bg-rose-600 text-white border-transparent shadow-md shadow-rose-500/20 scale-[1.02]'
              : 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Agotados</span>
            <XCircle size={15} className="text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{stats.criticos}</p>
          <span className="text-[10px] text-rose-600/80 dark:text-rose-400/80 font-semibold">
            {stats.criticos > 0 ? '🔴 Requieren compra' : 'Sin quiebres'}
          </span>
        </div>

        {/* Stock Bajo */}
        <div 
          onClick={() => setFiltroEstado('bajo')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            filtroEstado === 'bajo'
              ? 'bg-amber-500 text-white border-transparent shadow-md shadow-amber-500/20 scale-[1.02]'
              : 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Stock Bajo</span>
            <AlertTriangle size={15} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.bajo}</p>
          <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-semibold">Quedan ≤ 5</span>
        </div>

        {/* En Stock Óptimo */}
        <div 
          onClick={() => setFiltroEstado('optimo')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            filtroEstado === 'optimo'
              ? 'bg-emerald-600 text-white border-transparent shadow-md shadow-emerald-500/20 scale-[1.02]'
              : 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Stock Óptimo</span>
            <CheckCircle2 size={15} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.optimo}</p>
          <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-semibold">&gt; 5 unidades</span>
        </div>

        {/* Ocultos en Tienda */}
        <div 
          onClick={() => setFiltroEstado('ocultos')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            filtroEstado === 'ocultos'
              ? 'bg-slate-700 text-white border-transparent shadow-md scale-[1.02]'
              : 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pausados Tienda</span>
            <EyeOff size={15} className="text-slate-500" />
          </div>
          <p className="text-2xl font-black text-slate-700 dark:text-slate-300">{stats.ocultos}</p>
          <span className="text-[10px] opacity-70">
            {stats.ocultos > 0 ? '⏸️ Ocultos para clientes' : 'Todos visibles'}
          </span>
        </div>

      </div>

      {/* ── BANNER DE AUTO-PAUSADO INTELIGENTE ───────────────────────────────── */}
      {totalPlatosPausadosPorAgotamiento > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/60 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl shrink-0 mt-0.5 sm:mt-0 border border-amber-300/80 dark:border-amber-700/50">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-950 dark:text-amber-200 flex items-center gap-2">
                <span>🛡️ {totalPlatosPausadosPorAgotamiento} plato(s) pausados automáticamente en la tienda</span>
              </h4>
              <p className="text-xs text-amber-900/90 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                Ocultados en la carta online para proteger las ventas debido al quiebre de stock de:{' '}
                <strong className="text-amber-950 dark:text-amber-100 font-black">
                  {insumosAgotadosConPlatosPausados.map(i => i.nombre).slice(0, 3).join(', ')}
                  {insumosAgotadosConPlatosPausados.length > 3 ? ` y +${insumosAgotadosConPlatosPausados.length - 3}` : ''}
                </strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
            <button
              type="button"
              onClick={() => setModalRemitoAbierto(true)}
              className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Truck size={14} />
              <span>Ingresar Mercadería</span>
            </button>
          </div>
        </div>
      )}

      {/* ── 2. BARRA DE HERRAMIENTAS: BUSCADOR, FILTROS Y ACCIONES ───────────── */}
      <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-sm">
        
        {/* Buscador y Filtro Categoría */}
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar insumo (ej: Aquarius, Pan, Carne...)"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all font-medium"
            />
            {busqueda && (
              <button 
                onClick={() => setBusqueda('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <select
            value={filtroCat}
            onChange={(e) => setFiltroCat(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="todas">Todas las categorías</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>

        {/* Botones de Acción */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Botón Ingreso de Remito / Factura Masivo */}
          <button
            onClick={() => setModalRemitoAbierto(true)}
            className="flex-1 sm:flex-initial px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            title="Carga masiva de mercadería recibida por remito o factura de proveedor"
          >
            <Truck size={15} />
            <span>Ingreso de Remito</span>
          </button>

          {/* Botón Lista de Compras */}
          <button
            onClick={() => setModalComprasAbierto(true)}
            className="flex-1 sm:flex-initial px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-amber-400 hover:text-amber-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            title="Genera una lista para copiar y enviar al proveedor"
          >
            <ShoppingBag size={15} className="text-amber-500" />
            <span>Lista de Compras ({insumosParaComprar.length})</span>
          </button>

          {/* Botón Agregar Insumo */}
          <button
            onClick={() => {
              if (editando) resetForm()
              setMostrarFormulario(!mostrarFormulario)
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus size={16} />
            <span>{mostrarFormulario ? 'Ocultar Form' : 'Nuevo Insumo'}</span>
          </button>
        </div>

      </div>

      {/* ── 3. FORMULARIO DE CREACIÓN / EDICIÓN (EXPANDIBLE) ──────────────────── */}
      {(mostrarFormulario || editando) && (
        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border-2 border-emerald-200 dark:border-emerald-800/60 p-5 rounded-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-2">
              {editando ? <Edit2 size={16} /> : <Plus size={16} />}
              {editando ? 'Editar Insumo' : 'Registrar Nuevo Insumo'}
            </h3>
            <button 
              onClick={resetForm}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Nombre del Insumo</label>
              <input
                type="text"
                placeholder="Ej: Pan de Lomo, Aquarius Manzana 1.5L..."
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Categoría</label>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Stock</label>
                <input
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-slate-100 font-semibold text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Unidad</label>
                <select
                  value={unidad}
                  onChange={(e) => setUnidad(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="unidades">Unidades</option>
                  <option value="litros">Litros</option>
                  <option value="kg">Kg</option>
                  <option value="gr">Gramos</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={guardar}
                disabled={guardando || !nombre.trim()}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white p-2.5 rounded-xl font-bold text-sm shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {guardando ? 'Guardando...' : editando ? 'Guardar Cambios' : 'Confirmar Insumo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. TABLA PRINCIPAL DE INSUMOS CON SEMÁFORO ────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        
        {/* Cabecera de resultados */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Mostrando <strong>{insumosFiltrados.length}</strong> de {insumos.length} insumos</span>
          {filtroEstado !== 'todos' && (
            <button 
              onClick={() => setFiltroEstado('todos')}
              className="text-emerald-600 font-bold hover:underline"
            >
              Ver todos los insumos
            </button>
          )}
        </div>

        {/* ── TABLA DESKTOP (PRESERVADA 100% PARA PANTALLAS MEDIANAS Y GRANDES) ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="px-4 py-3">Insumo</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Estado / Nivel</th>
                <th className="px-4 py-3">Stock Actual</th>
                <th className="px-4 py-3 text-right">Acciones Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-sm">
              {insumosFiltrados.map(ins => {
                const cat = categorias.find(c => c.id === ins.categoria_id)
                const stockEdit = stockRapido[ins.id] ?? ins.stock_actual
                const isModified = stockEdit !== ins.stock_actual

                const esCritico = ins.stock_actual <= 0
                const esBajo = ins.stock_actual > 0 && ins.stock_actual <= 5
                const estaPausado = estaPausadoEnTienda(ins)
                const asociados = obtenerProductosAsociados(ins)

                return (
                  <tr 
                    key={ins.id} 
                    className={`transition-colors ${
                      estaPausado
                        ? 'bg-slate-100/70 dark:bg-slate-800/20 opacity-85 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                        : esCritico
                        ? 'bg-rose-50/40 dark:bg-rose-950/10 hover:bg-rose-50 dark:hover:bg-rose-950/20'
                        : esBajo
                        ? 'bg-amber-50/30 dark:bg-amber-950/10 hover:bg-amber-50 dark:hover:bg-amber-950/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    {/* Nombre del Insumo */}
                    <td className="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-100">
                      <div className="flex items-center gap-2">
                        {estaPausado ? (
                          <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0"></span>
                        ) : esCritico ? (
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0"></span>
                        ) : esBajo ? (
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                        )}
                        <span className={estaPausado ? 'line-through text-slate-400 dark:text-slate-500' : ''}>
                          {ins.nombre}
                        </span>
                        {estaPausado && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            Oculto en Tienda
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Categoría */}
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {cat?.nombre || '---'}
                      </span>
                    </td>

                    {/* Badge de Estado Semáforo */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {estaPausado ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600">
                            <EyeOff size={13} />
                            Pausado ({ins.stock_actual})
                          </span>
                        ) : esCritico ? (
                          <span className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                            <XCircle size={13} />
                            {ins.stock_actual < 0 ? `Quiebre (${ins.stock_actual})` : 'Agotado (0)'}
                          </span>
                        ) : esBajo ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            <AlertTriangle size={13} />
                            Stock Bajo ({ins.stock_actual})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 size={13} />
                            En Stock ({ins.stock_actual})
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Stock Actual y Edición Inline */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <input 
                            type="number"
                            className={`w-20 rounded-xl p-1.5 text-center font-black text-sm border transition-all ${
                              esCritico
                                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-700 dark:text-rose-300'
                                : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-emerald-500'
                            }`}
                            value={stockEdit}
                            onChange={(e) => setStockRapido({ ...stockRapido, [ins.id]: Number(e.target.value) })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur()
                                guardarStockRapido(ins.id)
                              }
                            }}
                            onBlur={() => {
                              if (isModified) {
                                guardarStockRapido(ins.id)
                              }
                            }}
                            title="Modificá el número y presioná Enter para guardar"
                          />
                          {guardandoStockId === ins.id && (
                            <div className="absolute right-1 top-1/2 -translate-y-1/2">
                              <Loader2 size={12} className="animate-spin text-emerald-500" />
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 font-medium">{ins.unidad_medida}</span>

                        {isModified && guardandoStockId !== ins.id && (
                          <button 
                            onClick={() => guardarStockRapido(ins.id)} 
                            className="text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 p-1.5 hover:bg-emerald-200 rounded-xl transition-all shadow-sm flex items-center gap-1 font-bold text-xs"
                            title="Guardar nuevo valor (o presioná Enter)"
                          >
                            <Save size={13} />
                            <span>Guardar</span>
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Acciones Rápidas */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Botón Ocultar/Pausar en Tienda Online */}
                        <button
                          onClick={() => alternarEstadoEnTienda(ins)}
                          disabled={procesandoPausa[ins.id]}
                          className={`p-2 rounded-xl transition-all flex items-center gap-1 text-xs font-bold ${
                            estaPausado
                              ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/20'
                              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                          title={
                            estaPausado
                              ? `Pausado en tienda${asociados.length ? ` (${asociados.map(p => p.nombre).join(', ')})` : ''}. Hacé click para reactivarlo y mostrarlo en la tienda.`
                              : `Hacé click para pausar y ocultar rápidamente de la tienda online (no visible para clientes).`
                          }
                        >
                          {procesandoPausa[ins.id] ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : estaPausado ? (
                            <>
                              <EyeOff size={15} />
                              <span className="hidden sm:inline">Pausado</span>
                            </>
                          ) : (
                            <>
                              <Eye size={15} />
                              <span className="hidden sm:inline">Ocultar</span>
                            </>
                          )}
                        </button>

                        {/* Botón Kardex / Historial */}
                        <button
                          onClick={() => setInsumoKardex(ins)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                          title="Ver historial de movimientos y Kardex inmutable de este insumo"
                        >
                          <History size={13} />
                          <span className="hidden sm:inline">Kardex</span>
                        </button>

                        {/* Botón Reponer Mercadería */}
                        <button
                          onClick={() => {
                            setInsumoReposicion(ins)
                            setTipoOperacion('sumar')
                            setSubtipoMovimiento('ingreso_mercaderia')
                            setMotivoMovimiento('')
                            setCantidadDelta(12)
                          }}
                          className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                          title="Sumar stock rápido de mercadería ingresada"
                        >
                          <Zap size={13} />
                          <span className="hidden sm:inline">Reabastecer</span>
                        </button>

                        {/* Botón Editar */}
                        <button
                          onClick={() => {
                            setEditando(ins.id)
                            setNombre(ins.nombre)
                            setCategoriaId(ins.categoria_id)
                            setStock(ins.stock_actual)
                            setUnidad(ins.unidad_medida)
                            setMostrarFormulario(true)
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="Editar detalles del insumo"
                        >
                          <Edit2 size={15} />
                        </button>

                        {/* Botón Eliminar */}
                        <button
                          onClick={() => eliminar(ins.id, ins.nombre)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                          title="Eliminar insumo"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {insumosFiltrados.length === 0 && (
            <div className="text-center text-slate-500 py-12">
              <Package size={36} className="mx-auto text-slate-400 mb-2 opacity-50" />
              <p className="font-bold">No se encontraron insumos</p>
              <p className="text-xs text-slate-400 mt-1">Probá cambiando el filtro o término de búsqueda.</p>
            </div>
          )}
        </div>

        {/* ── VISTA MOBILE DE INSUMOS (TARJETAS TÁCTILES 100% ADAPTADAS, SIN DESLIZAR A LOS COSTADOS) ── */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
          {insumosFiltrados.map((ins) => {
            const cat = categorias.find((c) => c.id === ins.categoria_id)
            const stockEdit = stockRapido[ins.id] ?? ins.stock_actual
            const isModified = stockEdit !== ins.stock_actual

            const esCritico = ins.stock_actual <= 0
            const esBajo = ins.stock_actual > 0 && ins.stock_actual <= 5
            const estaPausado = estaPausadoEnTienda(ins)
            const asociados = obtenerProductosAsociados(ins)

            return (
              <div
                key={ins.id}
                className={`p-3.5 transition-colors space-y-3 ${
                  estaPausado
                    ? 'bg-slate-100/70 dark:bg-slate-900/70'
                    : esCritico
                    ? 'bg-rose-50/40 dark:bg-rose-950/20'
                    : esBajo
                    ? 'bg-amber-50/30 dark:bg-amber-950/15'
                    : 'bg-white dark:bg-slate-900'
                }`}
              >
                {/* Cabecera de la Card: Insumo, Categoría y Badge de Estado */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          estaPausado
                            ? 'bg-slate-400'
                            : esCritico
                            ? 'bg-rose-500 animate-pulse'
                            : esBajo
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                      />
                      <h4 className={`font-black text-sm text-slate-900 dark:text-slate-100 truncate ${estaPausado ? 'line-through opacity-70' : ''}`}>
                        {ins.nombre}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        {cat?.nombre || 'General'}
                      </span>
                      {asociados.length > 0 && (
                        <span className="text-[10px] text-slate-400 truncate max-w-[190px]" title={asociados.map(a => a.nombre).join(', ')}>
                          Platos: {asociados.map(a => a.nombre).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Badge Semáforo */}
                  <div className="shrink-0">
                    {estaPausado ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600">
                        <EyeOff size={11} /> Pausado
                      </span>
                    ) : esCritico ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                        <XCircle size={11} /> {ins.stock_actual < 0 ? `Quiebre (${ins.stock_actual})` : 'Agotado (0)'}
                      </span>
                    ) : esBajo ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                        <AlertTriangle size={11} /> Bajo ({ins.stock_actual})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        <CheckCircle2 size={11} /> Stock ({ins.stock_actual})
                      </span>
                    )}
                  </div>
                </div>

                {/* Control Táctil de Stock [-] Input [+] */}
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Stock:</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const nuevo = Math.max(0, (stockRapido[ins.id] ?? ins.stock_actual) - 1)
                          setStockRapido({ ...stockRapido, [ins.id]: nuevo })
                        }}
                        className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-200 font-black text-sm flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                        title="Restar 1"
                      >
                        -
                      </button>

                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={stockEdit}
                        onChange={(e) => setStockRapido({ ...stockRapido, [ins.id]: Number(e.target.value) })}
                        onBlur={() => {
                          if (isModified) guardarStockRapido(ins.id)
                        }}
                        className={`w-16 rounded-lg py-1.5 text-center font-black text-sm border outline-none ${
                          esCritico
                            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-700 dark:text-rose-300'
                            : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                        }`}
                      />

                      <button
                        type="button"
                        onClick={() => {
                          const nuevo = (stockRapido[ins.id] ?? ins.stock_actual) + 1
                          setStockRapido({ ...stockRapido, [ins.id]: nuevo })
                        }}
                        className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-200 font-black text-sm flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                        title="Sumar 1"
                      >
                        +
                      </button>

                      <span className="text-[11px] text-slate-500 font-medium ml-1">
                        {ins.unidad_medida}
                      </span>
                    </div>
                  </div>

                  {isModified && (
                    <button
                      type="button"
                      onClick={() => guardarStockRapido(ins.id)}
                      disabled={guardandoStockId === ins.id}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                    >
                      {guardandoStockId === ins.id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                      <span>Guardar</span>
                    </button>
                  )}
                </div>

                {/* Acciones Rápidas Táctiles */}
                <div className="flex items-center justify-between gap-1.5 pt-1">
                  <div className="flex items-center gap-1.5 flex-1">
                    {/* Toggle Pausar/Mostrar en Tienda */}
                    <button
                      type="button"
                      onClick={() => alternarEstadoEnTienda(ins)}
                      disabled={procesandoPausa[ins.id]}
                      className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-xs cursor-pointer ${
                        estaPausado
                          ? 'bg-amber-500 hover:bg-amber-600 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {procesandoPausa[ins.id] ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : estaPausado ? (
                        <>
                          <EyeOff size={13} />
                          <span>Pausado</span>
                        </>
                      ) : (
                        <>
                          <Eye size={13} />
                          <span>Visible</span>
                        </>
                      )}
                    </button>

                    {/* Reabastecer Rápido */}
                    <button
                      type="button"
                      onClick={() => {
                        setInsumoReposicion(ins)
                        setTipoOperacion('sumar')
                        setSubtipoMovimiento('ingreso_mercaderia')
                        setMotivoMovimiento('')
                        setCantidadDelta(12)
                      }}
                      className="py-1.5 px-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Zap size={13} />
                      <span>+Pack</span>
                    </button>

                    {/* Kardex */}
                    <button
                      type="button"
                      onClick={() => setInsumoKardex(ins)}
                      className="py-1.5 px-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <History size={13} />
                      <span>Kardex</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Editar */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditando(ins.id)
                        setNombre(ins.nombre)
                        setCategoriaId(ins.categoria_id)
                        setStock(ins.stock_actual)
                        setUnidad(ins.unidad_medida)
                        setMostrarFormulario(true)
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                      className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Edit2 size={13} />
                    </button>

                    {/* Eliminar */}
                    <button
                      type="button"
                      onClick={() => eliminar(ins.id, ins.nombre)}
                      className="p-2 text-rose-500 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {insumosFiltrados.length === 0 && (
            <div className="text-center text-slate-500 py-12">
              <Package size={36} className="mx-auto text-slate-400 mb-2 opacity-50" />
              <p className="font-bold">No se encontraron insumos</p>
              <p className="text-xs text-slate-400 mt-1">Probá cambiando el filtro o término de búsqueda.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── 5. MODAL DE REPOSICIÓN RÁPIDA (1-CLICK PACKS) ────────────────────── */}
      {insumoReposicion && (
        <div 
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setInsumoReposicion(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                  <Zap size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">Reabastecer Stock</h3>
                  <p className="text-xs text-slate-400">{insumoReposicion.nombre}</p>
                </div>
              </div>
              <button 
                onClick={() => setInsumoReposicion(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Selector de Operación (Ingreso / Merma) */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => {
                  setTipoOperacion('sumar')
                  setSubtipoMovimiento('ingreso_mercaderia')
                }}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  tipoOperacion === 'sumar'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Plus size={14} />
                <span>Ingreso de Mercadería (+)</span>
              </button>
              <button
                onClick={() => {
                  setTipoOperacion('restar')
                  setSubtipoMovimiento('merma_rotura')
                }}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  tipoOperacion === 'restar'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <TrendingDown size={14} />
                <span>Merma / Descarte (-)</span>
              </button>
            </div>

            {/* Clasificación de Causa / Subtipo para el Kardex */}
            <div>
              <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1.5">
                Motivo / Clasificación en Kardex:
              </label>
              {tipoOperacion === 'sumar' ? (
                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setSubtipoMovimiento('ingreso_mercaderia')}
                    className={`py-2 px-3 rounded-xl border text-left transition-all ${
                      subtipoMovimiento === 'ingreso_mercaderia'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    📦 Compra a Proveedor
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubtipoMovimiento('ajuste_inventario')}
                    className={`py-2 px-3 rounded-xl border text-left transition-all ${
                      subtipoMovimiento === 'ajuste_inventario'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    🔍 Ajuste / Conteo Físico (+)
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setSubtipoMovimiento('merma_rotura')}
                    className={`py-2 px-2.5 rounded-xl border text-left transition-all ${
                      subtipoMovimiento === 'merma_rotura'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    💥 Rotura / Caída
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubtipoMovimiento('merma_vencimiento')}
                    className={`py-2 px-2.5 rounded-xl border text-left transition-all ${
                      subtipoMovimiento === 'merma_vencimiento'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    ⏳ Vencimiento
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubtipoMovimiento('merma_cocina')}
                    className={`py-2 px-2.5 rounded-xl border text-left transition-all ${
                      subtipoMovimiento === 'merma_cocina'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    🍳 Error de Cocina
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubtipoMovimiento('ajuste_inventario')}
                    className={`py-2 px-2.5 rounded-xl border text-left transition-all ${
                      subtipoMovimiento === 'ajuste_inventario'
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    🔍 Ajuste de Conteo (-)
                  </button>
                </div>
              )}
            </div>

            {/* Input de Nota / Comprobante */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Comprobante / Nota Opcional:
              </label>
              <input
                type="text"
                placeholder={tipoOperacion === 'sumar' ? "Ej: Factura Distribuidora Quilmes #892" : "Ej: Botella quebrada en depósito"}
                value={motivoMovimiento}
                onChange={(e) => setMotivoMovimiento(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Botones de Packs Rápidos */}
            {tipoOperacion === 'sumar' && (
              <div>
                <label className="text-[11px] font-bold uppercase text-slate-400 block mb-2">Packs Rápidos de Proveedor:</label>
                <div className="grid grid-cols-4 gap-2">
                  {[6, 12, 24, 50].map(val => (
                    <button
                      key={val}
                      onClick={() => setCantidadDelta(val)}
                      className={`py-2 px-1 rounded-xl text-xs font-black border transition-all ${
                        cantidadDelta === val
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-300 scale-105 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      +{val}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input de cantidad personalizada */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Cantidad a {tipoOperacion === 'sumar' ? 'ingresar' : 'descontar'}:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={cantidadDelta}
                  onChange={(e) => setCantidadDelta(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-lg font-black text-center text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-sm font-bold text-slate-500">{insumoReposicion.unidad_medida}</span>
              </div>
            </div>

            {/* Vista previa del resultado */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Stock Actual:</span>
                <strong className={insumoReposicion.stock_actual <= 0 ? 'text-rose-500 text-sm' : 'text-slate-800 dark:text-white text-sm'}>
                  {insumoReposicion.stock_actual}
                </strong>
              </div>

              <div className="text-slate-400 font-bold text-base">➔</div>

              <div className="text-right">
                <span className="text-slate-400 block font-medium">Nuevo Stock Final:</span>
                <strong className="text-emerald-600 dark:text-emerald-400 text-base font-black">
                  {tipoOperacion === 'sumar'
                    ? insumoReposicion.stock_actual + cantidadDelta
                    : insumoReposicion.stock_actual - cantidadDelta} {insumoReposicion.unidad_medida}
                </strong>
              </div>
            </div>

            {/* Switch de Auto-Reactivación en Tienda Online */}
            {tipoOperacion === 'sumar' && (() => {
              const asociados = obtenerProductosAsociados(insumoReposicion)
              if (asociados.length === 0) return null
              return (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-center gap-2.5 text-xs">
                    <span className="text-lg">🚀</span>
                    <div>
                      <strong className="text-emerald-400 block font-bold">Reactivar platos en la tienda online</strong>
                      <span className="text-[11px] text-slate-400">
                        Habilitar: {asociados.map(p => p.nombre).slice(0, 2).join(', ')}
                        {asociados.length > 2 ? ` y +${asociados.length - 2} más` : ''}
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoReactivarTienda}
                    onChange={e => setAutoReactivarTienda(e.target.checked)}
                    className="w-5 h-5 rounded-lg text-emerald-600 bg-slate-900 border-slate-700 focus:ring-emerald-500 cursor-pointer shrink-0"
                  />
                </div>
              )
            })()}

            {/* Botones de acción */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setInsumoReposicion(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={aplicarReposicion}
                disabled={guardandoReposicion || cantidadDelta <= 0}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {guardandoReposicion ? 'Guardando...' : 'Confirmar en Kardex'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── 6. MODAL DE LISTA DE COMPRAS PARA WHATSAPP ────────────────────────── */}
      {modalComprasAbierto && (
        <div 
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setModalComprasAbierto(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">Lista de Compras para Proveedor</h3>
                  <p className="text-xs text-slate-400">{insumosParaComprar.length} artículos necesitan reposición</p>
                </div>
              </div>
              <button 
                onClick={() => setModalComprasAbierto(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Vista previa del mensaje formateado */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 font-mono text-xs max-h-[300px] overflow-y-auto whitespace-pre-wrap text-slate-800 dark:text-slate-200 select-all">
              {generarTextoCompras()}
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setModalComprasAbierto(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-all cursor-pointer"
              >
                Cerrar
              </button>
              <button
                onClick={copiarListaCompras}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiado ? <Check size={18} /> : <Copy size={18} />}
                <span>{copiado ? '¡Copiado!' : 'Copiar para WhatsApp'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── 7. MODAL DE INGRESO MASIVO DE REMITO / FACTURA ────────────────────── */}
      {modalRemitoAbierto && (
        <ModalIngresoRemito
          insumos={insumos}
          categorias={categorias}
          onCerrar={() => setModalRemitoAbierto(false)}
          onCompletado={onUpdate}
        />
      )}

      {/* ── 8. MODAL DE KARDEX Y TRAZABILIDAD POR INSUMO ──────────────────────── */}
      {insumoKardex && (
        <ModalKardexInsumo
          insumo={insumoKardex}
          onCerrar={() => setInsumoKardex(null)}
        />
      )}

    </div>
  )
}


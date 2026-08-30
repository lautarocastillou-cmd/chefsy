'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Coffee,
  X,
  Plus,
  Minus,
  Search,
  Check,
  DollarSign,
  User,
  ShoppingBag,
  Clock,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  ChevronDown
} from 'lucide-react'
import { cn, formatearPrecio } from '@/lib/utils'
import { usarCatalogo } from '@/contexto/CatalogoContexto'
import { usarConsumosPersonal } from '@/contexto/ConsumosPersonalContexto'
import { usarPedidos } from '@/contexto/PedidosContexto'
import { ProductoCatalogo } from '@/tipos/catalogo'

export default function ConsumoPersonalFlotante() {
  const [abierto, setAbierto] = useState(false)
  const [tab, setTab] = useState<'nuevo' | 'registro'>('nuevo')

  // Datos de catálogo y consumos
  const { productos, categorias } = usarCatalogo()
  const {
    consumos,
    registrarConsumo,
    marcarSaldado,
    saldarPersona,
    eliminarConsumo,
    totalDeudaPendiente,
    totalPagadoMomento,
    deudasPorPersona,
  } = usarConsumosPersonal()

  const { cadetes } = usarPedidos()

  // Estados del Formulario
  const [productoId, setProductoId] = useState('')
  const [busquedaProducto, setBusquedaProducto] = useState('')
  const [desplegableAbierto, setDesplegableAbierto] = useState(false)
  const [precio, setPrecio] = useState<string>('')
  const [cantidad, setCantidad] = useState<number>(1)
  const [personaNombre, setPersonaNombre] = useState('')
  const [tipoPago, setTipoPago] = useState<'anotado' | 'pagado'>('anotado')
  const [descontarStock, setDescontarStock] = useState(true)
  const [guardando, setGuardando] = useState(false)

  // Filtros del Registro
  const [filtroPersona, setFiltroPersona] = useState('todos')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendientes' | 'saldados'>('pendientes')

  const selectorRef = useRef<HTMLDivElement>(null)

  // Nombres sugeridos (cadetes + nombres frecuentes en consumos)
  const nombresSugeridos = useMemo(() => {
    const setNombres = new Set<string>()
    cadetes.forEach((c) => {
      if (c.nombre) setNombres.add(c.nombre.trim())
    })
    consumos.forEach((c) => {
      if (c.persona_nombre) setNombres.add(c.persona_nombre.trim())
    })
    return Array.from(setNombres).slice(0, 8)
  }, [cadetes, consumos])

  // Producto seleccionado actualmente
  const productoSeleccionado = useMemo(() => {
    return productos.find((p) => p.id === productoId)
  }, [productos, productoId])

  // Lista de productos filtrados para el selector
  const productosFiltrados = useMemo(() => {
    const q = busquedaProducto.toLowerCase().trim()
    const activos = productos.filter((p) => p.activo)
    if (!q) return activos
    return activos.filter((p) => {
      const cat = categorias.find((c) => c.id === p.categoriaId)?.nombre.toLowerCase() || ''
      return p.nombre.toLowerCase().includes(q) || cat.includes(q)
    })
  }, [productos, categorias, busquedaProducto])

  // Cerrar selector al hacer clic afuera
  useEffect(() => {
    const handleClickAfuera = (e: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
        setDesplegableAbierto(false)
      }
    }
    document.addEventListener('mousedown', handleClickAfuera)
    return () => document.removeEventListener('mousedown', handleClickAfuera)
  }, [])

  // Al seleccionar producto, autocompletar precio si está vacío o coincidía con el anterior
  const seleccionarProducto = (prod: ProductoCatalogo) => {
    setProductoId(prod.id)
    setPrecio(prod.precio.toString())
    setDesplegableAbierto(false)
    setBusquedaProducto('')
  }

  // Manejar envío del formulario
  const handleRegistrar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productoSeleccionado) {
      alert('Por favor seleccioná un producto de la lista.')
      return
    }
    if (!personaNombre.trim()) {
      alert('Por favor ingresá el nombre de la persona que consumió.')
      return
    }
    const precioNum = parseFloat(precio) || 0
    if (precioNum < 0) {
      alert('El precio no puede ser negativo.')
      return
    }

    setGuardando(true)
    try {
      const catNombre = categorias.find((c) => c.id === productoSeleccionado.categoriaId)?.nombre
      const ok = await registrarConsumo({
        producto_id: productoSeleccionado.id,
        producto_nombre: productoSeleccionado.nombre,
        categoria_nombre: catNombre,
        precio: precioNum,
        cantidad: Math.max(1, cantidad),
        persona_nombre: personaNombre.trim(),
        tipo_pago: tipoPago,
        descontar_stock: descontarStock,
      })

      if (ok) {
        // Reset formulario
        setProductoId('')
        setPrecio('')
        setCantidad(1)
        setBusquedaProducto('')
      }
    } finally {
      setGuardando(false)
    }
  }

  // Consumos filtrados en la pestaña de Registro
  const consumosFiltrados = useMemo(() => {
    return consumos.filter((c) => {
      const coincidePersona =
        filtroPersona === 'todos' ||
        c.persona_nombre.toLowerCase() === filtroPersona.toLowerCase()

      const coincideEstado =
        filtroEstado === 'todos'
          ? true
          : filtroEstado === 'pendientes'
          ? c.tipo_pago === 'anotado' && !c.saldado
          : (c.tipo_pago === 'anotado' && c.saldado) || c.tipo_pago === 'pagado'

      return coincidePersona && coincideEstado
    })
  }, [consumos, filtroPersona, filtroEstado])

  return (
    <>
      {/* ── BOTÓN FLOTANTE (Ubicado arriba de la calculadora) ── */}
      <button
        onClick={() => setAbierto((v) => !v)}
        className={cn(
          'fixed bottom-[12.5rem] right-6 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer',
          abierto
            ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/40 ring-2 ring-white/20'
            : 'bg-gradient-to-tr from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-rose-600/30'
        )}
        title="Consumo de Personal / Bebidas y Comidas"
      >
        <Coffee size={21} />
        {totalDeudaPendiente > 0 && !abierto && (
          <span className="absolute -top-1 -right-1 bg-amber-400 text-zinc-900 font-black text-[9px] px-1.5 py-0.5 rounded-full border-2 border-zinc-900 shadow-sm animate-pulse">
            ${Math.round(totalDeudaPendiente / 1000)}k
          </span>
        )}
      </button>

      {/* ── MODAL DE CONSUMOS INTERNOS ── */}
      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 animate-in fade-in duration-150">
          <div
            className="bg-white dark:bg-[#1f1f1f] border border-slate-200 dark:border-[#333] w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-[#282828] border-b border-slate-200 dark:border-[#333] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl">
                  <Coffee size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-base leading-tight">
                    Consumo del Personal
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Bebidas y comidas consumidas (independiente de ventas)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAbierto(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-[#383838] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Pestañas de Navegación */}
            <div className="flex border-b border-slate-200 dark:border-[#333] bg-slate-100/70 dark:bg-[#242424] px-6 pt-2 gap-2">
              <button
                type="button"
                onClick={() => setTab('nuevo')}
                className={cn(
                  'px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 cursor-pointer',
                  tab === 'nuevo'
                    ? 'bg-white dark:bg-[#1f1f1f] text-rose-600 dark:text-rose-400 border-rose-500 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                <Plus size={14} />
                <span>Nuevo Consumo</span>
              </button>

              <button
                type="button"
                onClick={() => setTab('registro')}
                className={cn(
                  'px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 cursor-pointer',
                  tab === 'registro'
                    ? 'bg-white dark:bg-[#1f1f1f] text-rose-600 dark:text-rose-400 border-rose-500 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                <Clock size={14} />
                <span>Registro & Deudas</span>
                {totalDeudaPendiente > 0 && (
                  <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                    ${totalDeudaPendiente.toLocaleString('es-AR')}
                  </span>
                )}
              </button>
            </div>

            {/* Contenido de Pestañas */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {tab === 'nuevo' ? (
                /* ── FORMULARIO: NUEVO CONSUMO ── */
                <form onSubmit={handleRegistrar} className="space-y-4">
                  {/* 1. Casilla: Selector de Producto */}
                  <div className="space-y-1.5" ref={selectorRef}>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>1. Producto Consumido:</span>
                      {productoSeleccionado && typeof productoSeleccionado.stock === 'number' && (
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          Stock actual: <strong>{productoSeleccionado.stock} un.</strong>
                        </span>
                      )}
                    </label>

                    <div className="relative">
                      <div
                        onClick={() => setDesplegableAbierto((v) => !v)}
                        className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-300 dark:border-[#3d3d3d] bg-white dark:bg-[#282828] text-slate-800 dark:text-slate-100 cursor-pointer hover:border-slate-400 transition-colors shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0 truncate">
                          <ShoppingBag size={16} className="text-rose-500 shrink-0" />
                          <span className="text-sm font-semibold truncate">
                            {productoSeleccionado
                              ? productoSeleccionado.nombre
                              : 'Seleccionar producto del catálogo...'}
                          </span>
                        </div>
                        <ChevronDown
                          size={16}
                          className={cn('text-slate-400 transition-transform', desplegableAbierto && 'rotate-180')}
                        />
                      </div>

                      {/* Dropdown con buscador */}
                      {desplegableAbierto && (
                        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-[#282828] border border-slate-200 dark:border-[#3d3d3d] rounded-2xl shadow-xl z-50 p-2 space-y-2 max-h-64 overflow-y-auto animate-in fade-in duration-100">
                          <div className="relative">
                            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                            <input
                              type="text"
                              autoFocus
                              placeholder="Buscar por nombre o categoría..."
                              value={busquedaProducto}
                              onChange={(e) => setBusquedaProducto(e.target.value)}
                              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-[#1e1e1e] border-none outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                            />
                          </div>

                          <div className="space-y-1">
                            {productosFiltrados.length === 0 ? (
                              <p className="text-center py-4 text-xs text-slate-400">
                                No se encontraron productos.
                              </p>
                            ) : (
                              productosFiltrados.map((p) => {
                                const cat = categorias.find((c) => c.id === p.categoriaId)?.nombre
                                return (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => seleccionarProducto(p)}
                                    className={cn(
                                      'w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer',
                                      p.id === productoId
                                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold'
                                        : 'hover:bg-slate-100 dark:hover:bg-[#333] text-slate-700 dark:text-slate-200'
                                    )}
                                  >
                                    <div className="min-w-0 truncate">
                                      <span className="font-semibold block truncate">{p.nombre}</span>
                                      <span className="text-[10px] text-slate-400">{cat || 'Catálogo'}</span>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className="font-bold text-slate-800 dark:text-slate-100">
                                        {formatearPrecio(p.precio)}
                                      </span>
                                      {typeof p.stock === 'number' && (
                                        <span className="block text-[10px] text-slate-400">
                                          Stock: {p.stock}
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                )
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Fila: Cantidad y Precio */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Cantidad */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Cantidad:
                      </label>
                      <div className="flex items-center border border-slate-300 dark:border-[#3d3d3d] rounded-xl bg-white dark:bg-[#282828] overflow-hidden p-1">
                        <button
                          type="button"
                          onClick={() => setCantidad((prev) => Math.max(1, prev - 1))}
                          className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#333] rounded-lg transition-colors cursor-pointer"
                        >
                          <Minus size={14} />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={cantidad}
                          onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full text-center bg-transparent border-none outline-none font-extrabold text-sm text-slate-800 dark:text-slate-100"
                        />
                        <button
                          type="button"
                          onClick={() => setCantidad((prev) => prev + 1)}
                          className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#333] rounded-lg transition-colors cursor-pointer"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Precio Unitario */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Precio Unitario ($):
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-slate-400 font-bold text-sm">$</span>
                        <input
                          type="number"
                          step="any"
                          placeholder="0"
                          value={precio}
                          onChange={(e) => setPrecio(e.target.value)}
                          className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-[#3d3d3d] bg-white dark:bg-[#282828] text-slate-800 dark:text-slate-100 text-sm font-bold outline-none focus:border-rose-500 shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. Casilla: Nombre de la Persona */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      ¿Quién consumió? (Nombre):
                    </label>
                    <div className="relative flex items-center">
                      <User size={15} className="absolute left-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Ej: Leonel, Lautaro, Cocinero, etc."
                        value={personaNombre}
                        onChange={(e) => setPersonaNombre(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-[#3d3d3d] bg-white dark:bg-[#282828] text-slate-800 dark:text-slate-100 text-sm font-semibold outline-none focus:border-rose-500 shadow-2xs"
                      />
                    </div>

                    {/* Sugerencias Rápidas */}
                    {nombresSugeridos.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="text-[10px] text-slate-400 self-center">Rápido:</span>
                        {nombresSugeridos.map((nom) => (
                          <button
                            key={nom}
                            type="button"
                            onClick={() => setPersonaNombre(nom)}
                            className={cn(
                              'px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                              personaNombre.toLowerCase() === nom.toLowerCase()
                                ? 'bg-rose-500 text-white shadow-xs scale-105'
                                : 'bg-slate-100 dark:bg-[#2a2a2a] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#333]'
                            )}
                          >
                            {nom}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 4. Casilla: Tipo de Cobro / Descuento */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Estado de Pago:
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setTipoPago('anotado')}
                        className={cn(
                          'p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col gap-1',
                          tipoPago === 'anotado'
                            ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200'
                            : 'border-slate-200 dark:border-[#333] hover:border-slate-300 dark:hover:border-[#444] text-slate-600 dark:text-slate-400'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-wider">📝 Anotado</span>
                          {tipoPago === 'anotado' && <Check size={14} className="text-amber-600 dark:text-amber-400" />}
                        </div>
                        <span className="text-[10.5px] opacity-80 leading-tight">
                          Descontar del sueldo en la liquidación.
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTipoPago('pagado')}
                        className={cn(
                          'p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col gap-1',
                          tipoPago === 'pagado'
                            ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200'
                            : 'border-slate-200 dark:border-[#333] hover:border-slate-300 dark:hover:border-[#444] text-slate-600 dark:text-slate-400'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-wider">💵 Pagado en el acto</span>
                          {tipoPago === 'pagado' && <Check size={14} className="text-emerald-600 dark:text-emerald-400" />}
                        </div>
                        <span className="text-[10.5px] opacity-80 leading-tight">
                          Abonado al momento en efectivo o transferencia.
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* 5. Switch: Descontar Stock */}
                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#252525] border border-slate-200 dark:border-[#333] cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Package size={16} className="text-slate-500 dark:text-slate-400" />
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          Descontar del stock disponible
                        </span>
                        <span className="text-[10.5px] text-slate-400">
                          Resta automáticamente {cantidad} {cantidad === 1 ? 'unidad' : 'unidades'} del inventario.
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={descontarStock}
                      onChange={(e) => setDescontarStock(e.target.checked)}
                      className="w-4 h-4 accent-rose-600 rounded cursor-pointer"
                    />
                  </label>

                  {/* Resumen y Botón Registrar */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={guardando || !productoSeleccionado}
                      className="w-full py-3.5 px-4 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 disabled:opacity-50 text-white font-extrabold text-sm rounded-2xl shadow-md shadow-rose-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Plus size={16} />
                      <span>
                        Registrar Consumo ({formatearPrecio((parseFloat(precio) || 0) * cantidad)})
                      </span>
                    </button>
                  </div>
                </form>
              ) : (
                /* ── PESTAÑA: REGISTRO Y DEUDAS DE SUELDO ── */
                <div className="space-y-5">
                  {/* Tarjetas de Resumen Superior */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 block mb-0.5">
                        Deuda Total (Anotada)
                      </span>
                      <span className="text-xl font-extrabold text-amber-900 dark:text-amber-100">
                        {formatearPrecio(totalDeudaPendiente)}
                      </span>
                      <span className="block text-[10px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                        Por descontar en sueldos
                      </span>
                    </div>

                    <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block mb-0.5">
                        Pagado en el Acto
                      </span>
                      <span className="text-xl font-extrabold text-emerald-900 dark:text-emerald-100">
                        {formatearPrecio(totalPagadoMomento)}
                      </span>
                      <span className="block text-[10px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                        Cobrado en caja/momento
                      </span>
                    </div>
                  </div>

                  {/* Deudas por Persona (Acción rápida de liquidación) */}
                  {deudasPorPersona.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
                        <span>Deudas Pendientes por Empleado:</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {deudasPorPersona.map((d) => (
                          <div
                            key={d.persona}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-[#252525] border border-slate-200 dark:border-[#333] flex items-center justify-between gap-2"
                          >
                            <div>
                              <span className="font-extrabold text-slate-800 dark:text-slate-100 text-xs block">
                                {d.persona}
                              </span>
                              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                                {formatearPrecio(d.deuda)}{' '}
                                <span className="text-[10px] text-slate-400 font-normal">
                                  ({d.cantidadConsumos} {d.cantidadConsumos === 1 ? 'item' : 'items'})
                                </span>
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  confirm(
                                    `¿Saldar todos los consumos anotados de ${d.persona} (${formatearPrecio(d.deuda)})? Usar cuando se le descuente en el sueldo.`
                                  )
                                ) {
                                  saldarPersona(d.persona)
                                }
                              }}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                            >
                              Saldar Sueldo
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Filtros de la Lista */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-[#333] flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-400">Ver:</span>
                      <div className="flex bg-slate-100 dark:bg-[#252525] p-0.5 rounded-lg text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() => setFiltroEstado('pendientes')}
                          className={cn(
                            'px-2 py-1 rounded-md transition-all cursor-pointer',
                            filtroEstado === 'pendientes'
                              ? 'bg-white dark:bg-[#333] text-amber-600 dark:text-amber-400 shadow-xs'
                              : 'text-slate-500'
                          )}
                        >
                          Pendientes
                        </button>
                        <button
                          type="button"
                          onClick={() => setFiltroEstado('saldados')}
                          className={cn(
                            'px-2 py-1 rounded-md transition-all cursor-pointer',
                            filtroEstado === 'saldados'
                              ? 'bg-white dark:bg-[#333] text-emerald-600 dark:text-emerald-400 shadow-xs'
                              : 'text-slate-500'
                          )}
                        >
                          Saldados
                        </button>
                        <button
                          type="button"
                          onClick={() => setFiltroEstado('todos')}
                          className={cn(
                            'px-2 py-1 rounded-md transition-all cursor-pointer',
                            filtroEstado === 'todos'
                              ? 'bg-white dark:bg-[#333] text-slate-800 dark:text-slate-200 shadow-xs'
                              : 'text-slate-500'
                          )}
                        >
                          Todos
                        </button>
                      </div>
                    </div>

                    {/* Filtro por Persona */}
                    <select
                      value={filtroPersona}
                      onChange={(e) => setFiltroPersona(e.target.value)}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 dark:border-[#333] bg-white dark:bg-[#252525] text-slate-700 dark:text-slate-300 outline-none"
                    >
                      <option value="todos">Todos los empleados</option>
                      {nombresSugeridos.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Lista de Consumos Registrados */}
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {consumosFiltrados.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-xs">
                        No hay consumos registrados con los filtros seleccionados.
                      </div>
                    ) : (
                      consumosFiltrados.map((c) => {
                        const fechaFormateada = new Date(c.fecha).toLocaleString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })

                        return (
                          <div
                            key={c.id}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-[#252525] border border-slate-200 dark:border-[#333] flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-slate-800 dark:text-slate-100">
                                  {c.persona_nombre}
                                </span>
                                <span className="text-[10px] text-slate-400">{fechaFormateada}</span>
                                {c.tipo_pago === 'anotado' ? (
                                  <span
                                    className={cn(
                                      'text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full',
                                      c.saldado
                                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                        : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                                    )}
                                  >
                                    {c.saldado ? 'Saldado en Sueldo' : 'Anotado (Pendiente)'}
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                    Pagado en el acto
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                                {c.cantidad}x <strong>{c.producto_nombre}</strong> (${c.precio.toLocaleString('es-AR')} c/u)
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-black text-slate-800 dark:text-slate-100 text-sm">
                                {formatearPrecio(c.total || c.precio * c.cantidad)}
                              </span>

                              {c.tipo_pago === 'anotado' && (
                                <button
                                  type="button"
                                  onClick={() => marcarSaldado(c.id, !c.saldado)}
                                  className={cn(
                                    'p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                                    c.saldado
                                      ? 'text-slate-400 hover:text-amber-500'
                                      : 'text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60'
                                  )}
                                  title={c.saldado ? 'Desmarcar saldado' : 'Marcar como saldado'}
                                >
                                  <CheckCircle2 size={16} />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm('¿Eliminar este registro de consumo?')) {
                                    eliminarConsumo(c.id)
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                                title="Eliminar registro"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

'use client'

import { useState, useMemo } from 'react'
import { Insumo, CategoriaInsumo } from '@/tipos/stock'
import toast from 'react-hot-toast'
import {
  X,
  FileSpreadsheet,
  Search,
  Plus,
  ArrowRight,
  Package,
  Layers,
  Sparkles,
  CheckCircle2,
  Loader2,
  Receipt,
  Truck,
  Check,
} from 'lucide-react'

export function ModalIngresoRemito({
  insumos = [],
  categorias = [],
  onCerrar,
  onCompletado,
}: {
  insumos: Insumo[]
  categorias: CategoriaInsumo[]
  onCerrar: () => void
  onCompletado: () => void
}) {
  const [numeroRemito, setNumeroRemito] = useState('')
  const [proveedor, setProveedor] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas')
  const [busqueda, setBusqueda] = useState('')
  
  // Mapa de cantidades a ingresar por insumoId: { [insumoId]: number }
  const [cantidades, setCantidades] = useState<Record<string, number>>({})
  const [guardando, setGuardando] = useState(false)

  // Insumos filtrados para la grilla
  const insumosDisponibles = useMemo(() => {
    return insumos.filter(ins => {
      const matchCat = filtroCategoria === 'todas' || ins.categoria_id === filtroCategoria
      const matchQuery =
        !busqueda.trim() ||
        ins.nombre.toLowerCase().includes(busqueda.toLowerCase().trim())
      return matchCat && matchQuery
    })
  }, [insumos, filtroCategoria, busqueda])

  // Artículos con cantidad cargada (> 0)
  const itemsACargar = useMemo(() => {
    return Object.entries(cantidades)
      .filter(([_, cant]) => Number(cant) > 0)
      .map(([id, cant]) => {
        const ins = insumos.find(i => i.id === id)
        return {
          id,
          nombre: ins?.nombre || id,
          unidad: ins?.unidad_medida || 'unidades',
          stockActual: ins?.stock_actual || 0,
          delta: Number(cant),
          nuevoStock: (ins?.stock_actual || 0) + Number(cant),
        }
      })
  }, [cantidades, insumos])

  const totalUnidades = useMemo(() => {
    return itemsACargar.reduce((acc, item) => acc + item.delta, 0)
  }, [itemsACargar])

  const actualizarCantidad = (id: string, delta: number) => {
    const actual = cantidades[id] || 0
    const nueva = Math.max(0, actual + delta)
    setCantidades(prev => ({ ...prev, [id]: nueva }))
  }

  const setearCantidadDirecta = (id: string, valor: number) => {
    const val = isNaN(valor) ? 0 : Math.max(0, valor)
    setCantidades(prev => ({ ...prev, [id]: val }))
  }

  const procesarIngresoRemito = async () => {
    if (itemsACargar.length === 0) {
      toast.error('Cargá al menos una cantidad mayor a 0 para ingresar.')
      return
    }

    setGuardando(true)
    try {
      const motivoGeneral = numeroRemito.trim()
        ? `Remito/Factura: ${numeroRemito.trim()}${proveedor.trim() ? ` (${proveedor.trim()})` : ''}`
        : proveedor.trim()
        ? `Ingreso Proveedor: ${proveedor.trim()}`
        : 'Ingreso masivo de remito de mercadería'

      const movimientos = itemsACargar.map(item => ({
        id: item.id,
        delta: item.delta,
        tipo_movimiento: 'ingreso_mercaderia',
        motivo: motivoGeneral,
      }))

      const res = await fetch('/api/admin/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'registrar_movimiento_masivo',
          payload: {
            movimientos,
            motivoGeneral,
          },
        }),
      })

      if (!res.ok) throw new Error(await res.text())

      toast.success(`¡Ingreso registrado! +${totalUnidades} unidades en ${itemsACargar.length} insumos.`, {
        icon: '📦',
        duration: 4000,
      })

      onCompletado()
      onCerrar()
    } catch (err: any) {
      toast.error('Error al procesar remito: ' + err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Header del Remito */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Truck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white">Ingreso de Remito / Factura de Proveedor</h2>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black px-2 py-0.5 rounded-lg">
                  Lote Masivo
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Cargá las cantidades de mercadería que llegaron del camión en una sola grilla compacta.
              </p>
            </div>
          </div>

          <button
            onClick={onCerrar}
            className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Datos de Cabecera del Comprobante */}
        <div className="p-5 bg-slate-950/70 border-b border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Nº de Remito o Factura
            </label>
            <div className="relative">
              <Receipt className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
              <input
                type="text"
                placeholder="Ej: Remito #004-9821"
                value={numeroRemito}
                onChange={e => setNumeroRemito(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Nombre de Proveedor / Distribuidor
            </label>
            <div className="relative">
              <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
              <input
                type="text"
                placeholder="Ej: Distribuidora Quilmes, Frigorífico..."
                value={proveedor}
                onChange={e => setProveedor(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="flex items-end">
            <div className="w-full bg-slate-900 border border-emerald-500/20 p-2.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block">Artículos a Ingresar:</span>
                <strong className="text-sm font-black text-white">{itemsACargar.length} seleccionados</strong>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-emerald-400 block">Total Unidades:</span>
                <strong className="text-base font-black text-emerald-400">+{totalUnidades}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de Filtro y Búsqueda de Insumos */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
            <input
              type="text"
              placeholder="Buscar insumo a cargar (ej: Aquarius, Pan, Carne, Cerveza)..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500"
            />
          </div>

          <select
            value={filtroCategoria}
            onChange={e => setFiltroCategoria(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="todas">Todas las Categorías ({insumos.length})</option>
            {categorias.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Grilla Compacta de Insumos */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-2">
          {insumosDisponibles.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs font-bold">
              No se encontraron insumos con los filtros seleccionados.
            </div>
          ) : (
            <div className="space-y-2">
              {insumosDisponibles.map(ins => {
                const cat = categorias.find(c => c.id === ins.categoria_id)
                const cantidadCargada = cantidades[ins.id] || 0
                const tieneCarga = cantidadCargada > 0
                const nuevoStock = ins.stock_actual + cantidadCargada

                return (
                  <div
                    key={ins.id}
                    className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      tieneCarga
                        ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm'
                        : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Nombre y Categoría */}
                    <div className="flex items-center gap-3 min-w-[240px]">
                      <div className={`w-3 h-3 rounded-full shrink-0 ${
                        tieneCarga ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-700'
                      }`} />
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white">{ins.nombre}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-semibold text-slate-400">
                            {cat?.nombre || 'General'}
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-[10px] text-slate-400">
                            Stock actual: <strong className="text-slate-200">{ins.stock_actual} {ins.unidad_medida}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Chips de Incremento Rápido */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {[6, 12, 24, 48].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => actualizarCantidad(ins.id, val)}
                          className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-400 rounded-lg text-[10px] font-black transition-all cursor-pointer"
                        >
                          +{val}
                        </button>
                      ))}
                    </div>

                    {/* Input y Vista Previa del Stock */}
                    <div className="flex items-center gap-3 justify-between sm:justify-end shrink-0">
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] font-bold text-slate-400">Ingresar:</label>
                        <input
                          type="number"
                          min="0"
                          value={cantidadCargada || ''}
                          placeholder="0"
                          onChange={e => setearCantidadDirecta(ins.id, parseInt(e.target.value) || 0)}
                          className={`w-20 py-1.5 px-2 text-center rounded-xl font-black text-sm outline-none border transition-all ${
                            tieneCarga
                              ? 'bg-emerald-900/30 border-emerald-500 text-emerald-300'
                              : 'bg-slate-900 border-slate-700 text-white focus:border-emerald-500'
                          }`}
                        />
                        <span className="text-xs text-slate-400 font-bold">{ins.unidad_medida}</span>
                      </div>

                      {/* Stock final preview */}
                      <div className="flex items-center gap-1 text-xs bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800 min-w-[100px] justify-center">
                        <span className="text-slate-400">{ins.stock_actual}</span>
                        <ArrowRight size={10} className="text-slate-600" />
                        <strong className={tieneCarga ? 'text-emerald-400 font-black' : 'text-white'}>
                          {nuevoStock}
                        </strong>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer con Resumen y Confirmación */}
        <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="text-xs text-slate-400 text-center sm:text-left">
            {itemsACargar.length > 0 ? (
              <span>
                Se registrará un ingreso de <strong className="text-emerald-400">+{totalUnidades} unidades</strong> en{' '}
                <strong className="text-white">{itemsACargar.length} insumos</strong> con asiento en el Kardex.
              </span>
            ) : (
              <span>Seleccioná o tipea las cantidades de los insumos que llegaron del proveedor.</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onCerrar}
              className="flex-1 sm:flex-initial px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={procesarIngresoRemito}
              disabled={guardando || itemsACargar.length === 0}
              className="flex-1 sm:flex-initial px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              {guardando ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Procesando Remito...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Confirmar e Ingresar Remito (+{totalUnidades})</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

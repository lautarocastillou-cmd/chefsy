'use client'

import { useState } from 'react'
import { Insumo, RecetaProducto, RecetaInsumo } from '@/tipos/stock'
import { ProductoCatalogo } from '@/tipos/catalogo'
import toast from 'react-hot-toast'
import { ChevronRight, Save, Trash2, Plus } from 'lucide-react'

export function TabRecetas({
  recetas,
  insumos,
  productos,
  onUpdate
}: {
  recetas: RecetaProducto[]
  insumos: Insumo[]
  productos: ProductoCatalogo[]
  onUpdate: () => void
}) {
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoCatalogo | null>(null)
  const [recetaEdit, setRecetaEdit] = useState<RecetaInsumo[]>([])
  const [guardando, setGuardando] = useState(false)

  const seleccionarProducto = (prod: ProductoCatalogo) => {
    setProductoSeleccionado(prod)
    const recetaExistente = recetas.find(r => r.producto_id === prod.id)
    setRecetaEdit(recetaExistente ? [...recetaExistente.insumos] : [])
  }

  const agregarInsumo = (insumoId: string) => {
    if (!insumoId) return
    if (recetaEdit.find(r => r.insumo_id === insumoId)) return
    setRecetaEdit([...recetaEdit, { insumo_id: insumoId, cantidad: 1 }])
  }

  const removerInsumo = (insumoId: string) => {
    setRecetaEdit(recetaEdit.filter(r => r.insumo_id !== insumoId))
  }

  const cambiarCantidad = (insumoId: string, cant: number) => {
    if (cant < 0) return
    setRecetaEdit(recetaEdit.map(r => r.insumo_id === insumoId ? { ...r, cantidad: cant } : r))
  }

  const guardar = async () => {
    if (!productoSeleccionado) return
    setGuardando(true)
    try {
      const res = await fetch('/api/admin/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'upsert_receta',
          payload: { producto_id: productoSeleccionado.id, insumos: recetaEdit }
        })
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success('Receta actualizada')
      onUpdate()
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Columna Izquierda: Productos */}
      <div className="w-full md:w-1/3 border-r border-slate-200 dark:border-slate-800 pr-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Menú / Combos</h3>
        <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-2">
          {productos.map(p => {
            const tieneReceta = recetas.some(r => r.producto_id === p.id)
            const seleccionado = productoSeleccionado?.id === p.id
            return (
              <button
                key={p.id}
                onClick={() => seleccionarProducto(p)}
                className={`flex justify-between items-center p-3 rounded-xl border text-left transition-all ${
                  seleccionado 
                    ? 'border-chefsy bg-chefsy-50 dark:bg-chefsy-900/20 shadow-sm' 
                    : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="text-slate-800 dark:text-slate-100 font-bold">{p.nombre}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    {tieneReceta ? '✅ Receta asignada' : '⚠️ Sin receta'}
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-400" />
              </button>
            )
          })}
        </div>
      </div>

      {/* Columna Derecha: Editor de Receta */}
      <div className="w-full md:w-2/3">
        {!productoSeleccionado ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-center min-h-[300px] bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8">
            Seleccioná un producto del catálogo para configurar qué insumos debe descontar al venderse.
          </div>
        ) : (
          <div className="animate-[slideIn_0.2s_ease-out]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{productoSeleccionado.nombre}</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">Receta / Composición de Insumos</p>
              </div>
              <button
                onClick={guardar}
                disabled={guardando}
                className="bg-chefsy hover:bg-chefsy-600 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
              >
                <Save size={18} />
                {guardando ? 'Guardando...' : 'Guardar Receta'}
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-6 shadow-sm">
              <div className="flex gap-2 mb-2">
                <select id="insumo-select" className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-chefsy-400 focus:ring-1 focus:ring-chefsy-400 transition-colors">
                  <option value="">Seleccionar Insumo a agregar...</option>
                  {insumos.map(i => <option key={i.id} value={i.id}>{i.nombre} ({i.unidad_medida})</option>)}
                </select>
                <button
                  onClick={() => {
                    const select = document.getElementById('insumo-select') as HTMLSelectElement
                    agregarInsumo(select.value)
                    select.value = ''
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-sm transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 min-h-[300px] shadow-inner">
              {recetaEdit.length === 0 ? (
                <div className="text-center text-slate-500 py-16 flex flex-col items-center justify-center">
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-full shadow-sm mb-4">
                    <Plus size={32} className="text-slate-400" />
                  </div>
                  <span className="font-medium text-base text-slate-700 dark:text-slate-300">No hay insumos asignados a este producto.</span>
                  <span className="text-sm mt-1 opacity-80">(Si se vende, no descontará nada de stock)</span>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {recetaEdit.map(item => {
                    const insumo = insumos.find(i => i.id === item.insumo_id)
                    return (
                      <div key={item.insumo_id} className="flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-sm">
                        <div className="text-slate-800 dark:text-slate-100 font-bold text-lg">{insumo?.nombre || 'Insumo Eliminado'}</div>
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 dark:text-slate-500 text-sm font-semibold uppercase tracking-wide">Resta:</span>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              className="w-24 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-slate-900 dark:text-slate-100 text-center font-bold focus:outline-none focus:border-chefsy-400 focus:ring-1 focus:ring-chefsy-400 transition-all text-lg"
                              value={item.cantidad}
                              onChange={(e) => cambiarCantidad(item.insumo_id, Number(e.target.value))}
                            />
                            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium w-16">{insumo?.unidad_medida}</span>
                          </div>
                          <button
                            onClick={() => removerInsumo(item.insumo_id)}
                            className="text-red-500 hover:text-red-600 p-2.5 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-800/50 rounded-lg transition-colors"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

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
      <div className="w-full md:w-1/3 border-r border-gray-800 pr-4">
        <h3 className="text-lg font-bold text-white mb-4">Menú / Combos</h3>
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
                    ? 'border-orange-500 bg-orange-500/10' 
                    : 'border-gray-800 bg-gray-900 hover:bg-gray-800 hover:border-gray-700'
                }`}
              >
                <div>
                  <div className="text-white font-medium">{p.nombre}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {tieneReceta ? '✅ Receta asignada' : '⚠️ Sin receta'}
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-500" />
              </button>
            )
          })}
        </div>
      </div>

      {/* Columna Derecha: Editor de Receta */}
      <div className="w-full md:w-2/3">
        {!productoSeleccionado ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-center min-h-[300px]">
            Seleccioná un producto del catálogo para configurar qué insumos debe descontar al venderse.
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">{productoSeleccionado.nombre}</h2>
                <p className="text-gray-400 text-sm mt-1">Receta / Composición de Insumos</p>
              </div>
              <button
                onClick={guardar}
                disabled={guardando}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
              >
                <Save size={18} />
                {guardando ? 'Guardando...' : 'Guardar Receta'}
              </button>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6">
              <div className="flex gap-2 mb-2">
                <select id="insumo-select" className="flex-1 bg-gray-900 border border-gray-700 rounded-lg p-2 text-white">
                  <option value="">Seleccionar Insumo a agregar...</option>
                  {insumos.map(i => <option key={i.id} value={i.id}>{i.nombre} ({i.unidad_medida})</option>)}
                </select>
                <button
                  onClick={() => {
                    const select = document.getElementById('insumo-select') as HTMLSelectElement
                    agregarInsumo(select.value)
                    select.value = ''
                  }}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl border border-gray-800 p-2 min-h-[300px]">
              {recetaEdit.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  No hay insumos asignados a este producto. <br/>
                  (Si se vende, no descontará nada de stock)
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {recetaEdit.map(item => {
                    const insumo = insumos.find(i => i.id === item.insumo_id)
                    return (
                      <div key={item.insumo_id} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                        <div className="text-white font-medium">{insumo?.nombre || 'Insumo Eliminado'}</div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 text-sm">Resta:</span>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              className="w-20 bg-gray-900 border border-gray-700 rounded p-1 text-white text-center"
                              value={item.cantidad}
                              onChange={(e) => cambiarCantidad(item.insumo_id, Number(e.target.value))}
                            />
                            <span className="text-gray-500 text-sm w-16">{insumo?.unidad_medida}</span>
                          </div>
                          <button
                            onClick={() => removerInsumo(item.insumo_id)}
                            className="text-red-400 hover:text-red-300 p-2"
                          >
                            <Trash2 size={18} />
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

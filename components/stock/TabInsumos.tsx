'use client'

import { useState } from 'react'
import { CategoriaInsumo, Insumo } from '@/tipos/stock'
import toast from 'react-hot-toast'
import { Plus, Trash2, Edit2, Save } from 'lucide-react'

export function TabInsumos({ insumos, categorias, onUpdate }: { insumos: Insumo[], categorias: CategoriaInsumo[], onUpdate: () => void }) {
  const [nombre, setNombre] = useState('')
  const [categoriaId, setCategoriaId] = useState(categorias[0]?.id || '')
  const [unidad, setUnidad] = useState('unidades')
  const [stock, setStock] = useState<number>(0)
  
  const [editando, setEditando] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  // Para actualizar rápido el stock
  const [stockRapido, setStockRapido] = useState<Record<string, number>>({})

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
      toast.success('Insumo guardado')
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
  }

  const eliminar = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este insumo?')) return
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
    try {
      const res = await fetch('/api/admin/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'update_stock', payload: { id, stock_actual: nuevoStock } })
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success('Stock actualizado')
      onUpdate()
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    }
  }

  if (categorias.length === 0) {
    return <div className="text-gray-400">Primero debés crear al menos una categoría de insumos.</div>
  }

  return (
    <div>
      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl mb-6 grid grid-cols-1 md:grid-cols-5 gap-4 items-end border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Nombre Insumo</label>
          <input
            type="text"
            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-chefsy-400 focus:ring-1 focus:ring-chefsy-400 transition-colors"
            placeholder="Ej: Pan de Lomo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Categoría</label>
          <select
            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-chefsy-400 focus:ring-1 focus:ring-chefsy-400 transition-colors"
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
          >
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
           <div>
             <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Stock</label>
             <input
               type="number"
               className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-chefsy-400 focus:ring-1 focus:ring-chefsy-400 transition-colors"
               value={stock}
               onChange={(e) => setStock(Number(e.target.value))}
             />
           </div>
           <div>
             <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Unidad</label>
             <select
               className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-chefsy-400 focus:ring-1 focus:ring-chefsy-400 transition-colors"
               value={unidad}
               onChange={(e) => setUnidad(e.target.value)}
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
            className="w-full bg-chefsy hover:bg-chefsy-600 text-white px-4 py-2.5 rounded-lg font-bold flex justify-center items-center gap-2 disabled:opacity-50 shadow-sm transition-colors"
          >
            {editando ? <Edit2 size={18} /> : <Plus size={18} />}
            {editando ? 'Guardar' : 'Agregar'}
          </button>
          {editando && (
            <button
              onClick={resetForm}
              className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 px-4 py-2.5 rounded-lg font-bold transition-colors"
            >
              x
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-sm">
              <th className="p-3 font-semibold uppercase tracking-wider">Insumo</th>
              <th className="p-3 font-semibold uppercase tracking-wider">Categoría</th>
              <th className="p-3 font-semibold uppercase tracking-wider">Stock Actual</th>
              <th className="p-3 font-semibold text-right uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {insumos.map(ins => {
              const cat = categorias.find(c => c.id === ins.categoria_id)
              const stockEdit = stockRapido[ins.id] ?? ins.stock_actual
              const isModified = stockEdit !== ins.stock_actual

              return (
                <tr key={ins.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 text-slate-800 dark:text-slate-100 font-bold">{ins.nombre}</td>
                  <td className="p-3 text-slate-500 dark:text-slate-400 font-medium">{cat?.nombre || '---'}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <input 
                        type="number"
                        className="w-20 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-1 text-slate-900 dark:text-slate-100 text-center focus:outline-none focus:border-chefsy-400"
                        value={stockEdit}
                        onChange={(e) => setStockRapido({ ...stockRapido, [ins.id]: Number(e.target.value) })}
                      />
                      <span className="text-slate-500 text-sm font-medium">{ins.unidad_medida}</span>
                      {isModified && (
                        <button onClick={() => guardarStockRapido(ins.id)} className="text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-800/50 rounded transition-colors ml-1 shadow-sm">
                          <Save size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => {
                        setEditando(ins.id)
                        setNombre(ins.nombre)
                        setCategoriaId(ins.categoria_id)
                        setStock(ins.stock_actual)
                        setUnidad(ins.unidad_medida)
                      }}
                      className="text-blue-500 hover:text-blue-600 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors mr-1"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => eliminar(ins.id)}
                      className="text-red-500 hover:text-red-600 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {insumos.length === 0 && (
          <div className="text-center text-slate-500 py-10 bg-white dark:bg-slate-900">
            No hay insumos registrados.
          </div>
        )}
      </div>
    </div>
  )
}

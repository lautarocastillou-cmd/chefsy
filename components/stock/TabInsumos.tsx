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
      <div className="bg-gray-800 p-4 rounded-xl mb-6 grid grid-cols-1 md:grid-cols-5 gap-4 items-end border border-gray-700">
        <div className="md:col-span-2">
          <label className="text-sm text-gray-400 mb-1 block">Nombre Insumo</label>
          <input
            type="text"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white"
            placeholder="Ej: Pan de Lomo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Categoría</label>
          <select
            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white"
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
          >
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
           <div>
             <label className="text-sm text-gray-400 mb-1 block">Stock</label>
             <input
               type="number"
               className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white"
               value={stock}
               onChange={(e) => setStock(Number(e.target.value))}
             />
           </div>
           <div>
             <label className="text-sm text-gray-400 mb-1 block">Unidad</label>
             <select
               className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white"
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
            className="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-bold flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {editando ? <Edit2 size={18} /> : <Plus size={18} />}
            {editando ? 'Guardar' : 'Agregar'}
          </button>
          {editando && (
            <button
              onClick={resetForm}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
            >
              x
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400">
              <th className="p-3 font-medium">Insumo</th>
              <th className="p-3 font-medium">Categoría</th>
              <th className="p-3 font-medium">Stock Actual</th>
              <th className="p-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {insumos.map(ins => {
              const cat = categorias.find(c => c.id === ins.categoria_id)
              const stockEdit = stockRapido[ins.id] ?? ins.stock_actual
              const isModified = stockEdit !== ins.stock_actual

              return (
                <tr key={ins.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="p-3 text-white font-medium">{ins.nombre}</td>
                  <td className="p-3 text-gray-400">{cat?.nombre || '---'}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <input 
                        type="number"
                        className="w-20 bg-gray-900 border border-gray-700 rounded p-1 text-white text-center"
                        value={stockEdit}
                        onChange={(e) => setStockRapido({ ...stockRapido, [ins.id]: Number(e.target.value) })}
                      />
                      <span className="text-gray-500 text-sm">{ins.unidad_medida}</span>
                      {isModified && (
                        <button onClick={() => guardarStockRapido(ins.id)} className="text-green-400 p-1 hover:bg-green-400/20 rounded">
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
                      className="text-blue-400 hover:text-blue-300 p-2"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => eliminar(ins.id)}
                      className="text-red-400 hover:text-red-300 p-2"
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
          <div className="text-center text-gray-500 py-8">
            No hay insumos registrados.
          </div>
        )}
      </div>
    </div>
  )
}

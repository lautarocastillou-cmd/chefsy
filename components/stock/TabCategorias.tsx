'use client'

import { useState } from 'react'
import { CategoriaInsumo } from '@/tipos/stock'
import toast from 'react-hot-toast'
import { Plus, Trash2, Edit2 } from 'lucide-react'

export function TabCategorias({ categorias, onUpdate }: { categorias: CategoriaInsumo[], onUpdate: () => void }) {
  const [nombre, setNombre] = useState('')
  const [editando, setEditando] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const guardar = async () => {
    if (!nombre.trim()) return
    setGuardando(true)
    try {
      const payload = {
        id: editando || crypto.randomUUID(),
        nombre: nombre.trim()
      }
      const res = await fetch('/api/admin/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'upsert_categoria', payload })
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success('Categoría guardada')
      setNombre('')
      setEditando(null)
      onUpdate()
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta categoría? Se borrarán los insumos asociados.')) return
    try {
      const res = await fetch('/api/admin/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'delete_categoria', payload: { id } })
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success('Categoría eliminada')
      onUpdate()
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    }
  }

  return (
    <div>
      <div className="flex gap-2 items-end mb-6">
        <div className="flex-1">
          <label className="text-sm text-gray-400 mb-1 block">Nombre de Categoría</label>
          <input
            type="text"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
            placeholder="Ej: Panificados, Bebidas, Envases..."
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>
        <button
          onClick={guardar}
          disabled={guardando || !nombre.trim()}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
        >
          {editando ? <Edit2 size={18} /> : <Plus size={18} />}
          {editando ? 'Actualizar' : 'Agregar'}
        </button>
        {editando && (
          <button
            onClick={() => { setEditando(null); setNombre(''); }}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
          >
            Cancelar
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categorias.map(cat => (
          <div key={cat.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex justify-between items-center">
            <span className="text-white font-medium">{cat.nombre}</span>
            <div className="flex gap-2">
              <button
                onClick={() => { setEditando(cat.id); setNombre(cat.nombre); }}
                className="text-blue-400 hover:text-blue-300 p-2"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => eliminar(cat.id)}
                className="text-red-400 hover:text-red-300 p-2"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {categorias.length === 0 && (
          <div className="col-span-full text-center text-gray-500 py-8">
            No hay categorías de insumos creadas.
          </div>
        )}
      </div>
    </div>
  )
}

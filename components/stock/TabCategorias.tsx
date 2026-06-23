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
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Nombre de Categoría</label>
          <input
            type="text"
            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-chefsy-400 focus:ring-1 focus:ring-chefsy-400 transition-colors"
            placeholder="Ej: Panificados, Bebidas, Envases..."
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>
        <button
          onClick={guardar}
          disabled={guardando || !nombre.trim()}
          className="bg-chefsy hover:bg-chefsy-600 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 transition-colors shadow-sm"
        >
          {editando ? <Edit2 size={18} /> : <Plus size={18} />}
          {editando ? 'Actualizar' : 'Agregar'}
        </button>
        {editando && (
          <button
            onClick={() => { setEditando(null); setNombre(''); }}
            className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-5 py-2.5 rounded-lg font-semibold transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categorias.map(cat => (
          <div key={cat.id} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex justify-between items-center shadow-sm">
            <span className="text-slate-800 dark:text-slate-100 font-bold">{cat.nombre}</span>
            <div className="flex gap-2">
              <button
                onClick={() => { setEditando(cat.id); setNombre(cat.nombre); }}
                className="text-blue-500 hover:text-blue-600 bg-blue-50 dark:bg-blue-900/30 p-2 rounded-md transition-colors"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => eliminar(cat.id)}
                className="text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-900/30 p-2 rounded-md transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {categorias.length === 0 && (
          <div className="col-span-full text-center text-slate-500 py-10 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
            No hay categorías de insumos creadas.
          </div>
        )}
      </div>
    </div>
  )
}

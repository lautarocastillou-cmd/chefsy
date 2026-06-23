'use client'

import { useState, useEffect } from 'react'
import { obtenerStockCategorias, obtenerStockInsumos, obtenerStockRecetas } from '@/servicios/supabase/stock'
import { CategoriaInsumo, Insumo, RecetaProducto } from '@/tipos/stock'
import { usarCatalogo } from '@/contexto/CatalogoContexto'
import toast from 'react-hot-toast'
import { TabCategorias } from '@/components/stock/TabCategorias'
import { TabInsumos } from '@/components/stock/TabInsumos'
import { TabRecetas } from '@/components/stock/TabRecetas'

type TabType = 'categorias' | 'insumos' | 'recetas'

export default function PaginaStock() {
  const [tabActivo, setTabActivo] = useState<TabType>('insumos')
  const [categorias, setCategorias] = useState<CategoriaInsumo[]>([])
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [recetas, setRecetas] = useState<RecetaProducto[]>([])
  const [cargando, setCargando] = useState(true)

  const { productos: productosCatalogo, categorias: categoriasCatalogo } = usarCatalogo()

  const cargarDatos = async () => {
    try {
      setCargando(true)
      const [cats, ins, rec] = await Promise.all([
        obtenerStockCategorias(),
        obtenerStockInsumos(),
        obtenerStockRecetas()
      ])
      setCategorias(cats)
      setInsumos(ins)
      setRecetas(rec)
    } catch (error: any) {
      toast.error('Error al cargar datos de stock: ' + error.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  if (cargando) {
    return <div className="p-8 text-center text-gray-400">Cargando sistema de stock...</div>
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">Control de Stock Inteligente</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Gestioná tus insumos y asigná recetas a tus productos para que se descuenten automáticamente.
        </p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-xl w-fit">
        <button
          onClick={() => setTabActivo('categorias')}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
            tabActivo === 'categorias' ? 'bg-chefsy text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/50'
          }`}
        >
          Categorías
        </button>
        <button
          onClick={() => setTabActivo('insumos')}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
            tabActivo === 'insumos' ? 'bg-chefsy text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/50'
          }`}
        >
          Insumos y Stock
        </button>
        <button
          onClick={() => setTabActivo('recetas')}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
            tabActivo === 'recetas' ? 'bg-chefsy text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/50'
          }`}
        >
          Asignar Recetas
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 min-h-[500px] shadow-sm">
        {tabActivo === 'categorias' && (
          <TabCategorias categorias={categorias} onUpdate={cargarDatos} />
        )}
        {tabActivo === 'insumos' && (
          <TabInsumos insumos={insumos} categorias={categorias} onUpdate={cargarDatos} />
        )}
        {tabActivo === 'recetas' && (
          <TabRecetas recetas={recetas} insumos={insumos} productos={productosCatalogo || []} categorias={categoriasCatalogo || []} onUpdate={cargarDatos} />
        )}
      </div>
    </div>
  )
}

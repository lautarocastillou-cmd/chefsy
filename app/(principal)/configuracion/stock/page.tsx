'use client'

import { useState, useEffect } from 'react'
import { obtenerStockCategorias, obtenerStockInsumos, obtenerStockRecetas } from '@/servicios/supabase/stock'
import { CategoriaInsumo, Insumo, RecetaProducto } from '@/tipos/stock'
import { usarCatalogo } from '@/contexto/CatalogoContexto'
import toast from 'react-hot-toast'
import { TabCategorias } from '@/components/stock/TabCategorias'
import { TabInsumos } from '@/components/stock/TabInsumos'
import { TabRecetas } from '@/components/stock/TabRecetas'
import { TabKardexAuditoria } from '@/components/stock/TabKardexAuditoria'
import { CheckCircle, History } from 'lucide-react'

type TabType = 'insumos' | 'recetas' | 'categorias' | 'kardex'

export default function PaginaStock() {
  const [tabActivo, setTabActivo] = useState<TabType>('insumos')
  const [categorias, setCategorias] = useState<CategoriaInsumo[]>([])
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [recetas, setRecetas] = useState<RecetaProducto[]>([])
  const [cargandoInicial, setCargandoInicial] = useState(true)

  const { productos: productosCatalogo, categorias: categoriasCatalogo } = usarCatalogo()

  const cargarDatos = async () => {
    try {
      const [cats, ins, rec] = await Promise.all([
        obtenerStockCategorias(),
        obtenerStockInsumos(),
        obtenerStockRecetas(),
      ])
      setCategorias(cats)
      setInsumos(ins)
      setRecetas(rec)
    } catch (error: any) {
      toast.error('Error al cargar datos de stock: ' + error.message)
    } finally {
      setCargandoInicial(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  const verificarRecetas = () => {
    if (!productosCatalogo || !recetas) return

    const productosActivos = productosCatalogo.filter(p => p.activo)
    const sinReceta = productosActivos.filter(p => !recetas.some(r => r.producto_id === p.id))

    if (sinReceta.length === 0) {
      toast.success('¡Todo en orden! Todos los productos activos tienen receta asignada.', {
        icon: '✅',
        duration: 4000,
      })
    } else {
      toast.error(`Atención: Hay ${sinReceta.length} producto(s) activo(s) sin receta asignada.`, {
        icon: '⚠️',
        duration: 5000,
      })
      console.warn('Productos sin receta:', sinReceta.map(p => p.nombre).join(', '))
    }
  }

  if (cargandoInicial && insumos.length === 0 && categorias.length === 0) {
    return <div className="p-8 text-center text-gray-400">Cargando sistema de stock...</div>
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">Control de Stock Inteligente</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Gestioná tus insumos, asigná recetas a tus productos y auditá todos los movimientos en el Kardex inmutable.
        </p>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div className="flex gap-2 overflow-x-auto bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl w-full md:w-fit shrink-0 border border-slate-200 dark:border-slate-700/60">
          <button
            onClick={() => setTabActivo('insumos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              tabActivo === 'insumos'
                ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20 scale-[1.02]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            📦 Insumos y Stock
          </button>
          <button
            onClick={() => setTabActivo('recetas')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              tabActivo === 'recetas'
                ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20 scale-[1.02]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            📋 Asignar Recetas
          </button>
          <button
            onClick={() => setTabActivo('categorias')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              tabActivo === 'categorias'
                ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20 scale-[1.02]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            🏷️ Categorías
          </button>
          <button
            onClick={() => setTabActivo('kardex')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              tabActivo === 'kardex'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 scale-[1.02]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <History size={14} />
            <span>📜 Kardex y Auditoría</span>
          </button>
        </div>

        <button
          onClick={verificarRecetas}
          className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm shrink-0 cursor-pointer"
          title="Analiza si a tus productos activos les falta configuración de receta"
        >
          <CheckCircle size={16} className="text-emerald-500" />
          <span>Verificar Integridad de Recetas</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 min-h-[500px] shadow-sm">
        {tabActivo === 'categorias' && (
          <TabCategorias categorias={categorias} onUpdate={cargarDatos} />
        )}
        {tabActivo === 'insumos' && (
          <TabInsumos
            insumos={insumos}
            categorias={categorias}
            recetas={recetas}
            productos={productosCatalogo || []}
            categoriasCatalogo={categoriasCatalogo || []}
            onUpdate={cargarDatos}
          />
        )}
        {tabActivo === 'recetas' && (
          <TabRecetas
            recetas={recetas}
            insumos={insumos}
            productos={productosCatalogo || []}
            categorias={categoriasCatalogo || []}
            onUpdate={cargarDatos}
          />
        )}
        {tabActivo === 'kardex' && (
          <TabKardexAuditoria insumos={insumos} />
        )}
      </div>
    </div>
  )
}

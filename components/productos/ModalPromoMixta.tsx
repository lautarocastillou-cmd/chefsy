'use client'

import { useState, useMemo } from 'react'
import { ProductoCatalogo, CategoriaCatalogo, FilaProductoPedido } from '@/tipos/catalogo'
import { generarIdProducto, formatearPrecio } from '@/lib/utils'
import { Sparkles, X, Plus, Check, Utensils, Zap } from 'lucide-react'
import toast from 'react-hot-toast'

interface PropsModalPromoMixta {
  abierto: boolean
  onClose: () => void
  onInsertarPromo: (filasNuevas: FilaProductoPedido[]) => void
  productos: ProductoCatalogo[]
  categorias: CategoriaCatalogo[]
}

interface PlantillaPromo {
  nombre: string
  precioSugerido: number
  descripcion: string
}

const PLANTILLAS: PlantillaPromo[] = [
  {
    nombre: '2 Lomos / Milas',
    precioSugerido: 23000,
    descripcion: 'Combiná 1 Lomo y 1 Mila (o 2 iguales) a precio promo.',
  },
  {
    nombre: '2 Zapping',
    precioSugerido: 18000,
    descripcion: '2 Sándwiches Zapping a precio combo.',
  },
  {
    nombre: '2 Burgers / Patys',
    precioSugerido: 16000,
    descripcion: '2 Hamburguesas o Patys combinados.',
  },
  {
    nombre: 'Personalizado',
    precioSugerido: 23000,
    descripcion: 'Elegí cualquier combinación de 2 productos y el precio total.',
  }
]

export default function ModalPromoMixta({
  abierto,
  onClose,
  onInsertarPromo,
  productos,
  categorias
}: PropsModalPromoMixta) {
  const productosActivos = useMemo(() => productos.filter(p => p.activo), [productos])

  // Buscar defaults inteligentes
  const lomoDefault = useMemo(() => {
    return productosActivos.find(p => p.nombre.toLowerCase().includes('lomo especial')) ||
           productosActivos.find(p => p.nombre.toLowerCase().includes('lomo')) ||
           productosActivos[0]
  }, [productosActivos])

  const milaDefault = useMemo(() => {
    return productosActivos.find(p => p.nombre.toLowerCase().includes('mila especial')) ||
           productosActivos.find(p => p.nombre.toLowerCase().includes('mila')) ||
           productosActivos[1] || productosActivos[0]
  }, [productosActivos])

  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<string>('2 Lomos / Milas')
  const [producto1Id, setProducto1Id] = useState<string>(lomoDefault?.id || '')
  const [producto2Id, setProducto2Id] = useState<string>(milaDefault?.id || '')
  const [precioTotalPromo, setPrecioTotalPromo] = useState<number>(23000)

  if (!abierto) return null

  const prod1 = productosActivos.find(p => p.id === (producto1Id || lomoDefault?.id)) || lomoDefault
  const prod2 = productosActivos.find(p => p.id === (producto2Id || milaDefault?.id)) || milaDefault

  const seleccionarPlantilla = (p: PlantillaPromo) => {
    setPlantillaSeleccionada(p.nombre)
    setPrecioTotalPromo(p.precioSugerido)
  }

  const insertar = () => {
    if (!prod1 || !prod2) {
      toast.error('Seleccioná ambos productos del combo.')
      return
    }

    const cat1 = categorias.find(c => c.id === prod1.categoriaId)
    const cat2 = categorias.find(c => c.id === prod2.categoriaId)

    // Dividir el precio total de forma equitativa
    const precioUnitario1 = Math.round(precioTotalPromo / 2)
    const precioUnitario2 = precioTotalPromo - precioUnitario1

    const fila1: FilaProductoPedido = {
      id: generarIdProducto(),
      idCategoria: prod1.categoriaId,
      idProductoCatalogo: prod1.id,
      nombreProducto: prod1.nombre,
      nombreCategoria: cat1?.nombre,
      cantidad: 1,
      precio: precioUnitario1,
      modificadoresSeleccionadosIds: []
    }

    const fila2: FilaProductoPedido = {
      id: generarIdProducto(),
      idCategoria: prod2.categoriaId,
      idProductoCatalogo: prod2.id,
      nombreProducto: prod2.nombre,
      nombreCategoria: cat2?.nombre,
      cantidad: 1,
      precio: precioUnitario2,
      modificadoresSeleccionadosIds: []
    }

    onInsertarPromo([fila1, fila2])
    toast.success(`Promo cargada: ${prod1.nombre} + ${prod2.nombre} ($${precioTotalPromo.toLocaleString('es-AR')})`, {
      icon: '🎁',
      duration: 3500
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
              <Sparkles size={22} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base">Armar Promo / Combo Mixto</h3>
              <p className="text-xs text-slate-400">Descuenta el stock individual de cada producto automáticamente</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Plantillas Rápidas */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
            1. Elegí la Promo
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PLANTILLAS.map(p => (
              <button
                key={p.nombre}
                type="button"
                onClick={() => seleccionarPlantilla(p)}
                className={`p-2.5 rounded-2xl border text-left transition-all ${
                  plantillaSeleccionada === p.nombre
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-black text-xs">{p.nombre}</span>
                  <span className="text-[11px] font-black text-amber-600 dark:text-amber-400">
                    {formatearPrecio(p.precioSugerido)}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{p.descripcion}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Selección de Productos que componen la promo */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/70 space-y-3.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
            2. Selección de Productos del Combo
          </label>

          {/* Item 1 */}
          <div>
            <span className="text-[11px] font-bold text-slate-500 mb-1 block">Primer Producto (Item 1)</span>
            <select
              value={prod1?.id || ''}
              onChange={(e) => setProducto1Id(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {productosActivos.map(p => (
                <option key={p.id} value={p.id}>
                  {categorias.find(c => c.id === p.categoriaId)?.nombre || 'Prod'} - {p.nombre} (Lista: {formatearPrecio(p.precio)})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-center">
            <span className="text-xs font-black text-slate-400 bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
              +
            </span>
          </div>

          {/* Item 2 */}
          <div>
            <span className="text-[11px] font-bold text-slate-500 mb-1 block">Segundo Producto (Item 2)</span>
            <select
              value={prod2?.id || ''}
              onChange={(e) => setProducto2Id(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {productosActivos.map(p => (
                <option key={p.id} value={p.id}>
                  {categorias.find(c => c.id === p.categoriaId)?.nombre || 'Prod'} - {p.nombre} (Lista: {formatearPrecio(p.precio)})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Precio Final de la Promo */}
        <div className="flex items-center justify-between bg-amber-50/60 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/60">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 block">
              Precio Total del Combo
            </span>
            <span className="text-[11px] text-amber-700/80 dark:text-amber-400">
              Se prorratea en {formatearPrecio(Math.round(precioTotalPromo / 2))} c/u
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-black text-lg text-amber-700 dark:text-amber-400">$</span>
            <input
              type="number"
              value={precioTotalPromo}
              step={500}
              onChange={(e) => setPrecioTotalPromo(Number(e.target.value))}
              className="w-28 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl p-2 text-right font-black text-base text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
            />
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-sm transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={insertar}
            className="flex-2 w-full py-3 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white rounded-2xl font-black text-sm transition-all shadow-md shadow-amber-500/25 flex items-center justify-center gap-2"
          >
            <Zap size={18} />
            <span>Insertar Promo al Pedido ({formatearPrecio(precioTotalPromo)})</span>
          </button>
        </div>

      </div>
    </div>
  )
}

'use client'

// ─────────────────────────────────────────────────────
// components/productos/SelectorProducto.tsx
// Selector de producto con buscador integrado en tiempo real.
// Permite buscar por texto o elegir desde el desplegable.
// ─────────────────────────────────────────────────────

import { useState, useRef, useEffect, useMemo } from 'react'
import { usarPedidos } from '@/contexto/PedidosContexto'
import { formatearPrecio } from '@/lib/utils'
import { Search, ChevronDown, X } from 'lucide-react'

interface PropsSelectorProducto {
  idCategoria: string
  valor: string
  onCambio: (idProducto: string, categoriaIdOpt?: string) => void
  claseSelect?: string
}

export default function SelectorProducto({
  idCategoria,
  valor,
  onCambio,
}: PropsSelectorProducto) {
  const { productos, categorias } = usarPedidos()
  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [indiceFoco, setIndiceFoco] = useState(-1)
  const contenedorRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Producto actualmente seleccionado
  const productoSeleccionado = useMemo(() => {
    return productos.find((p) => p.id === valor)
  }, [productos, valor])

  // Lista de productos filtrados
  const productosDisponibles = useMemo(() => {
    let prods = productos.filter((p) => p.activo)

    // Si hay categoría seleccionada y no se está buscando globalmente
    if (idCategoria && busqueda.trim() === '') {
      prods = prods.filter((p) => p.categoriaId === idCategoria)
    }

    if (busqueda.trim() !== '') {
      const q = busqueda.toLowerCase().trim()
      prods = prods.filter((p) => {
        const nombreMatch = p.nombre.toLowerCase().includes(q)
        const catNombre = categorias.find((c) => c.id === p.categoriaId)?.nombre.toLowerCase() || ''
        return nombreMatch || catNombre.includes(q)
      })
    }

    return prods
  }, [productos, categorias, idCategoria, busqueda])

  // Cerrar al hacer clic afuera
  useEffect(() => {
    const handleClickAfuera = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false)
        setBusqueda('')
        setIndiceFoco(-1)
      }
    }
    document.addEventListener('mousedown', handleClickAfuera)
    return () => document.removeEventListener('mousedown', handleClickAfuera)
  }, [])

  const seleccionarProducto = (idProd: string, catId?: string) => {
    onCambio(idProd, catId)
    setAbierto(false)
    setBusqueda('')
    setIndiceFoco(-1)
  }

  const limpiar = (e: React.MouseEvent) => {
    e.stopPropagation()
    onCambio('')
    setBusqueda('')
    if (inputRef.current) inputRef.current.focus()
  }

  const manejarKeyDown = (e: React.KeyboardEvent) => {
    if (!abierto) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault()
        setAbierto(true)
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndiceFoco((prev) => (prev < productosDisponibles.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndiceFoco((prev) => (prev > 0 ? prev - 1 : productosDisponibles.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (indiceFoco >= 0 && indiceFoco < productosDisponibles.length) {
        const prod = productosDisponibles[indiceFoco]
        seleccionarProducto(prod.id, prod.categoriaId)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setAbierto(false)
      setBusqueda('')
    }
  }

  return (
    <div ref={contenedorRef} className="relative w-full">
      <div
        className="relative flex items-center w-full border border-gray-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-sm focus-within:ring-2 focus-within:ring-chefsy focus-within:border-transparent transition-all shadow-2xs"
      >
        <Search size={14} className="ml-2.5 text-gray-400 dark:text-slate-500 shrink-0" />
        
        <input
          ref={inputRef}
          type="text"
          value={abierto ? busqueda : productoSeleccionado ? productoSeleccionado.nombre : ''}
          onChange={(e) => {
            setBusqueda(e.target.value)
            if (!abierto) setAbierto(true)
            setIndiceFoco(0)
          }}
          onFocus={() => {
            setAbierto(true)
            setBusqueda('')
          }}
          onKeyDown={manejarKeyDown}
          placeholder={productoSeleccionado ? productoSeleccionado.nombre : "🔍 Buscar producto..."}
          className="w-full px-2 py-2 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder:text-gray-400 outline-none truncate"
        />

        {productoSeleccionado && !abierto && (
          <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 mr-2 shrink-0">
            {formatearPrecio(productoSeleccionado.precio)}
          </span>
        )}

        {valor && (
          <button
            type="button"
            onClick={limpiar}
            className="p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 mr-1 shrink-0 transition-colors"
            title="Limpiar producto"
          >
            <X size={13} />
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setAbierto(!abierto)
            if (!abierto && inputRef.current) inputRef.current.focus()
          }}
          className="pr-2 pl-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 shrink-0"
          tabIndex={-1}
        >
          <ChevronDown size={14} className={`transition-transform duration-150 ${abierto ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Menú Desplegable con Resultados */}
      {abierto && (
        <div className="absolute left-0 top-full mt-1 w-full min-w-[280px] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto py-1 text-sm animate-in fade-in zoom-in-95 duration-100">
          {productosDisponibles.length === 0 ? (
            <div className="px-4 py-3 text-center text-xs text-gray-400">
              No se encontraron productos.
            </div>
          ) : (
            productosDisponibles.map((prod, idx) => {
              const catNombre = categorias.find((c) => c.id === prod.categoriaId)?.nombre
              const esSeleccionado = prod.id === valor
              const esFoco = idx === indiceFoco

              return (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => seleccionarProducto(prod.id, prod.categoriaId)}
                  onMouseEnter={() => setIndiceFoco(idx)}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    esFoco
                      ? 'bg-chefsy-50 dark:bg-chefsy/10 text-chefsy-800 dark:text-chefsy-300'
                      : esSeleccionado
                      ? 'bg-gray-50 dark:bg-slate-700/50 font-semibold'
                      : 'hover:bg-gray-50 dark:hover:bg-slate-700/30 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 truncate">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 shrink-0">
                      {catNombre || 'Prod'}
                    </span>
                    <span className="truncate text-xs font-medium">{prod.nombre}</span>
                  </div>
                  <span className="text-xs font-bold text-gray-600 dark:text-slate-300 shrink-0">
                    {formatearPrecio(prod.precio)}
                  </span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

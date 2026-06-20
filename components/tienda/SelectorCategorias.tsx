'use client'

import React, { useEffect } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { CategoriaCatalogo } from '@/tipos/catalogo'

interface SelectorCategoriasProps {
  categoriasActivas: CategoriaCatalogo[]
  categoriaSeleccionada: string | null
  selectorAbierto: boolean
  onToggleSelector: () => void
  onSeleccionarCategoria: (id: string | null) => void
}

export default function SelectorCategorias({
  categoriasActivas,
  categoriaSeleccionada,
  selectorAbierto,
  onToggleSelector,
  onSeleccionarCategoria,
}: SelectorCategoriasProps) {
  useEffect(() => {
    if (selectorAbierto) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [selectorAbierto])

  return (
    <div className="relative group w-[50%] z-50">
      <button
        type="button"
        onClick={onToggleSelector}
        className="w-full flex items-center justify-between bg-white/5 backdrop-blur-xl border border-white/20 hover:border-white/40 text-white py-4 px-4 sm:px-6 rounded-2xl outline-none focus:border-white/60 transition-all cursor-pointer font-medium tracking-wide shadow-2xl"
      >
        <span className={`truncate mr-2 ${categoriaSeleccionada ? 'text-white' : 'text-slate-300'}`}>
          {categoriaSeleccionada === 'todos' 
            ? 'Ver todo el menú' 
            : categoriasActivas.find(c => c.id === categoriaSeleccionada)?.nombre || 'APRETÁ ACÁ'}
        </span>
        <ChevronDown 
          size={20} 
          className={`text-chefsy-300 shrink-0 transition-transform duration-300 ${selectorAbierto ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Backdrop — CSS transition via pointer-events + opacity */}
      <div
        onClick={onToggleSelector}
        className={`fixed inset-0 bg-black/70 z-[100] transition-opacity duration-200 ${
          selectorAbierto ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Wrapper de centrado */}
      <div className="fixed inset-0 z-[101] flex items-end sm:items-center justify-center pointer-events-none">
        {/* Panel modal — CSS transition translateY */}
        <div
          className={`selector-panel pointer-events-auto w-full sm:w-96 bg-[#111827] border border-white/10 sm:rounded-3xl rounded-t-[2rem] shadow-2xl flex flex-col max-h-[80vh] overflow-hidden transition-all duration-300 ease-out ${
            selectorAbierto
              ? 'translate-y-0 opacity-100'
              : 'translate-y-10 opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex justify-center pt-4 pb-2 sm:hidden cursor-grab active:cursor-grabbing" onClick={onToggleSelector}>
            <div className="w-12 h-1.5 bg-white/20 rounded-full" />
          </div>
          <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
            <h3 className="text-white font-bebas tracking-wide text-2xl">¿QUÉ PINTA HOY?</h3>
            <button onClick={onToggleSelector} className="text-white/50 hover:text-white p-2 bg-white/5 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5">
            <button
              type="button"
              onClick={() => {
                onToggleSelector()
                setTimeout(() => onSeleccionarCategoria('todos'), 200)
              }}
              className={`w-full text-left px-6 py-4 rounded-2xl transition-all font-medium border border-transparent ${categoriaSeleccionada === 'todos' || !categoriaSeleccionada ? 'bg-chefsy/20 border-chefsy/50 text-chefsy-200' : 'text-white bg-white/5 hover:bg-white/10'}`}
            >
              Ver todo el menú
            </button>
            {categoriasActivas.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  onToggleSelector()
                  setTimeout(() => onSeleccionarCategoria(cat.id), 200)
                }}
                className={`w-full text-left px-6 py-4 rounded-2xl transition-all font-medium border border-transparent ${categoriaSeleccionada === cat.id ? 'bg-chefsy/20 border-chefsy/50 text-chefsy-200' : 'text-white bg-white/5 hover:bg-white/10'}`}
              >
                {cat.nombre}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

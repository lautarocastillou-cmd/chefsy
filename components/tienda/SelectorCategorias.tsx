import React, { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
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
  const [montado, setMontado] = useState(false)
  const [translateY, setTranslateY] = useState(0)
  const touchStartY = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return
    const diff = e.touches[0].clientY - touchStartY.current
    if (diff > 0) {
      setTranslateY(diff)
    }
  }

  const handleTouchEnd = () => {
    if (translateY > 75) {
      onToggleSelector()
    }
    setTranslateY(0)
    touchStartY.current = null
  }

  useEffect(() => {
    setMontado(true)
  }, [])

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
    <div className="relative group w-full sm:w-[50%] z-50">
      <button
        type="button"
        onClick={onToggleSelector}
        className="w-full flex items-center justify-between bg-white/5 backdrop-blur-xl border border-white/20 hover:border-white/40 text-white py-4 px-4 sm:px-6 rounded-2xl outline-none focus:border-white/60 transition-all cursor-pointer font-medium tracking-wide shadow-2xl"
      >
        <span className={`truncate mr-2 ${categoriaSeleccionada ? 'text-white' : 'text-slate-300'}`}>
          {categoriaSeleccionada === 'todos' 
            ? 'Ver todo el menú' 
            : (() => {
                const cat = categoriasActivas.find(c => c.id === categoriaSeleccionada)
                if (!cat) return 'APRETÁ ACÁ'
                const idBurgers = categoriasActivas.find(c => c.nombre.toLowerCase().includes('burger'))?.id
                const idPatys = categoriasActivas.find(c => c.nombre.toLowerCase().trim() === 'patys')?.id
                if (cat.id === idBurgers || cat.id === idPatys) return 'Burgers / Patys'
                return cat.nombre
              })()}
        </span>
        <ChevronDown 
          size={20} 
          className={`text-chefsy-300 shrink-0 transition-transform duration-300 ${selectorAbierto ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Renderizar el modal en un Portal para escapar del transform CSS del contenedor padre que rompía el fixed */}
      {montado && createPortal(
        <>
          {/* Backdrop — CSS transition via pointer-events + opacity */}
          <div
            onClick={onToggleSelector}
            className={`fixed inset-0 bg-black/70 z-[100] transition-opacity duration-200 ${
              selectorAbierto ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          />

          {/* Wrapper de centrado */}
          <div className={`fixed inset-0 z-[101] flex items-end sm:items-center justify-center pointer-events-none transition-all duration-300 ${selectorAbierto ? 'opacity-100' : 'opacity-0 delay-300'}`}>
            {/* Panel modal — CSS transition translateY */}
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{ transform: translateY > 0 ? `translateY(${translateY}px)` : undefined }}
              className={`selector-panel w-full sm:w-96 bg-[#0a0a0a] border border-chefsy-500/20 sm:rounded-3xl rounded-t-[2rem] shadow-2xl flex flex-col max-h-[80vh] overflow-hidden transition-all duration-300 ease-out ${
                selectorAbierto && translateY === 0
                  ? 'translate-y-0 opacity-100 pointer-events-auto'
                  : selectorAbierto && translateY > 0
                  ? 'opacity-100 pointer-events-auto'
                  : 'translate-y-10 opacity-0 pointer-events-none'
              }`}
            >
              <div className="flex justify-center pt-4 pb-2 sm:hidden cursor-grab active:cursor-grabbing" onClick={onToggleSelector}>
                <div className="w-12 h-1.5 bg-white/20 rounded-full" />
              </div>
              <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
                <h3 className="text-chefsy font-bebas tracking-wide text-2xl drop-shadow-[0_0_8px_rgba(54,101,74,0.5)]">¿QUÉ PINTA HOY?</h3>
                <button onClick={onToggleSelector} className="text-white/50 hover:text-white p-2 bg-white/5 hover:bg-chefsy-500/20 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5 overscroll-y-contain" data-lenis-prevent="true">
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
                {(() => {
                  const idPatys = categoriasActivas.find(c => c.nombre.toLowerCase().trim() === 'patys')?.id
                  const idBurgers = categoriasActivas.find(c => c.nombre.toLowerCase().includes('burger'))?.id
                  const burgersExiste = categoriasActivas.some(c => c.id === idBurgers)
                  
                  return categoriasActivas
                    .filter(c => {
                      if (burgersExiste && c.id === idPatys) return false
                      return true
                    })
                    .map(cat => {
                      const esNavBurgers = (burgersExiste && cat.id === idBurgers) || (!burgersExiste && cat.id === idPatys)
                      const nombreMostrar = esNavBurgers ? 'Burgers / Patys' : cat.nombre
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            onToggleSelector()
                            setTimeout(() => onSeleccionarCategoria(cat.id), 200)
                          }}
                          className={`w-full text-left px-6 py-4 rounded-2xl transition-all font-medium border border-transparent ${categoriaSeleccionada === cat.id || (esNavBurgers && categoriaSeleccionada === idPatys) ? 'bg-chefsy/20 border-chefsy/50 text-chefsy-200' : 'text-white bg-white/5 hover:bg-white/10'}`}
                        >
                          {nombreMostrar}
                        </button>
                      )
                    })
                })()}
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

import React, { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, X, LayoutGrid } from 'lucide-react'
import { CategoriaCatalogo } from '@/tipos/catalogo'

interface SelectorCategoriasProps {
  categoriasActivas: CategoriaCatalogo[]
  categoriaSeleccionada: string | null
  selectorAbierto: boolean
  onToggleSelector: () => void
  onSeleccionarCategoria: (id: string | null) => void
  soloModal?: boolean
}

export default function SelectorCategorias({
  categoriasActivas,
  categoriaSeleccionada,
  selectorAbierto,
  onToggleSelector,
  onSeleccionarCategoria,
  soloModal = false,
}: SelectorCategoriasProps) {
  const [montado, setMontado] = useState(false)

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
    <>
      {!soloModal && (
        <div className="relative w-full sm:w-[50%] z-40">
          <button
            type="button"
            onClick={onToggleSelector}
            className="w-full flex items-center justify-between bg-[#121814] border border-chefsy-500/40 hover:border-chefsy-400 text-white py-3 px-5 sm:px-6 rounded-2xl outline-none focus:border-chefsy-400 transition-colors cursor-pointer shadow-lg active:scale-98"
          >
            <div className="flex flex-col text-left mr-2 truncate">
              <span className="text-xs font-bold tracking-wider text-chefsy-400 uppercase flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-chefsy-400 animate-pulse"></span>
                CATEGORÍAS
              </span>
              <span className="font-bebas text-2xl sm:text-3xl text-white tracking-wide truncate leading-none mt-1">
                {(() => {
                  if (!categoriaSeleccionada || categoriaSeleccionada === 'todos') return 'MENÚ COMPLETO'
                  const cat = categoriasActivas.find(c => c.id === categoriaSeleccionada)
                  if (!cat) return 'MENÚ COMPLETO'
                  const idBurgers = categoriasActivas.find(c => c.nombre.toLowerCase().includes('burger'))?.id
                  const idPatys = categoriasActivas.find(c => c.nombre.toLowerCase().trim() === 'patys')?.id
                  if (cat.id === idBurgers || cat.id === idPatys) return 'BURGERS / PATYS'
                  return cat.nombre.toUpperCase()
                })()}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-chefsy-500/20 flex items-center justify-center border border-chefsy-500/30 shrink-0">
              <ChevronDown 
                size={22} 
                className={`text-chefsy-300 transition-transform duration-200 ${selectorAbierto ? 'rotate-180' : ''}`} 
              />
            </div>
          </button>
        </div>
      )}

      {/* Modal Directo en Portal */}
      {montado && createPortal(
        <>
          {/* Backdrop */}
          <div
            onClick={onToggleSelector}
            className={`fixed inset-0 bg-black/80 z-[200] transition-opacity duration-200 ${
              selectorAbierto ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          />

          {/* Panel Modal */}
          <div className={`fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none transition-opacity duration-200 ${selectorAbierto ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`}>
            <div
              className={`w-full max-w-sm bg-[#121212] border border-white/15 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden ${
                selectorAbierto ? 'scale-100' : 'scale-95'
              } transition-transform duration-200`}
            >
              <div className="px-5 py-4 border-b border-white/10 flex justify-between items-center bg-[#181818]">
                <h3 className="text-emerald-400 font-bebas tracking-wide text-2xl">¿QUÉ VAS A PEDIR?</h3>
                <button
                  type="button"
                  onClick={onToggleSelector}
                  className="text-slate-400 hover:text-white p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
                <button
                  type="button"
                  onClick={() => {
                    onSeleccionarCategoria('todos')
                    onToggleSelector()
                  }}
                  className={`w-full text-left px-4 py-3.5 rounded-xl font-bold text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    categoriaSeleccionada === 'todos' || !categoriaSeleccionada
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-300 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <LayoutGrid size={18} className="shrink-0" />
                    <span>Ver todo el menú</span>
                  </div>
                  {(!categoriaSeleccionada || categoriaSeleccionada === 'todos') && (
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  )}
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
                      const seleccionada = categoriaSeleccionada === cat.id || (esNavBurgers && categoriaSeleccionada === idPatys)

                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            onSeleccionarCategoria(cat.id)
                            onToggleSelector()
                          }}
                          className={`w-full text-left px-4 py-3.5 rounded-xl font-bold text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            seleccionada
                              ? 'bg-emerald-600 text-white shadow-md'
                              : 'text-slate-300 bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <span>{nombreMostrar}</span>
                          {seleccionada && (
                            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                          )}
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
    </>
  )
}

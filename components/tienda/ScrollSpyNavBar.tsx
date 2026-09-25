'use client'

import React, { useState, useRef } from 'react'
import { scrollHaciaCategoria } from '@/lib/tienda-helpers'

export function ScrollSpyNavBar({ categoriasActivas, productosFiltrados }: { categoriasActivas: any[], productosFiltrados: any[] }) {
  const [categoriaPresionada, setCategoriaPresionada] = useState<string | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const handlePress = (id: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setCategoriaPresionada(id)
    scrollHaciaCategoria(id)
    timerRef.current = setTimeout(() => {
      setCategoriaPresionada(null)
    }, 850)
  }

  return (
    <div className="relative z-30 bg-[#0d0d0d] mb-8">
      {/* Indicador de scroll */}
      <div className="flex justify-end px-4 pt-2 pb-1">
        <span className="text-[10px] font-black text-slate-500/70 uppercase tracking-widest flex items-center gap-1 select-none pointer-events-none">
          &lt; DESLIZA PARA LA IZQUIERDA
        </span>
      </div>
      <div className="py-2 border-b border-white/5 overflow-x-auto no-scrollbar flex gap-2 px-2 overscroll-x-contain">
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
            const tieneProductos = productosFiltrados.some(p => p.categoriaId === cat.id || (cat.id === idBurgers && p.categoriaId === idPatys))
            if (!tieneProductos) return null
            
            const esNavBurgers = (burgersExiste && cat.id === idBurgers) || (!burgersExiste && cat.id === idPatys)
            const nombreMostrar = esNavBurgers ? 'Burgers / Patys' : cat.nombre
            const estaPresionado = categoriaPresionada === cat.id || (esNavBurgers && categoriaPresionada === idPatys)
            
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handlePress(cat.id)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full font-bold text-sm outline-none select-none transition-all duration-500 ease-out cursor-pointer active:scale-95 ${
                  estaPresionado
                    ? 'bg-chefsy text-white shadow-lg shadow-chefsy/30 scale-95 ring-2 ring-chefsy/50'
                    : 'bg-white/5 text-slate-400 active:bg-chefsy active:text-white [@media(hover:hover)]:hover:bg-white/10 [@media(hover:hover)]:hover:text-white'
                }`}
              >
                {nombreMostrar}
              </button>
            )
          })
      })()}
      </div>
    </div>
  )
}

export default React.memo(ScrollSpyNavBar)

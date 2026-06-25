'use client'

import React, { useState, useEffect } from 'react'

export function ScrollSpyNavBar({ categoriasActivas, productosFiltrados }: { categoriasActivas: any[], productosFiltrados: any[] }) {
  const [categoriaVisible, setCategoriaVisible] = useState<string>('')

  useEffect(() => {
    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (entrada.isIntersecting) {
            setCategoriaVisible(entrada.target.id)
          }
        })
      },
      { rootMargin: '-20% 0px -70% 0px' }
    )

    const secciones = document.querySelectorAll('section[id]')
    secciones.forEach((seccion) => observador.observe(seccion))

    return () => observador.disconnect()
  }, [productosFiltrados])

  return (
    <div className="relative z-30 bg-[#0d0d0d] mb-8">
      {/* Indicador de scroll */}
      <div className="flex justify-end px-4 pt-2 pb-1">
        <span className="text-[10px] font-black text-slate-500/70 uppercase tracking-widest flex items-center gap-1">
          &lt; DESLIZA PARA LA IZQUIERDA
        </span>
      </div>
      <div className="py-2 border-b border-white/5 overflow-x-auto no-scrollbar flex gap-2 px-2">
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
            
            return (
              <button
                key={cat.id}
                onClick={() => {
                  document.getElementById(cat.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full font-bold text-sm transition-all ${
                  categoriaVisible === cat.id || (esNavBurgers && categoriaVisible === idPatys) ? 'bg-chefsy text-white shadow-lg shadow-chefsy/30' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
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

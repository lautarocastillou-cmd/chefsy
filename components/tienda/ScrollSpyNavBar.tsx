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
    <div className="relative z-30 bg-[#0d0d0d] py-3 border-b border-white/5 overflow-x-auto no-scrollbar flex gap-2 mb-8">
      {categoriasActivas.map(cat => {
        const tieneProductos = productosFiltrados.some(p => p.categoriaId === cat.id)
        if (!tieneProductos) return null
        return (
          <button
            key={cat.id}
            onClick={() => {
              document.getElementById(cat.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full font-bold text-sm transition-all ${
              categoriaVisible === cat.id ? 'bg-chefsy text-white shadow-lg shadow-chefsy/30' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {cat.nombre}
          </button>
        )
      })}
    </div>
  )
}

export default React.memo(ScrollSpyNavBar)

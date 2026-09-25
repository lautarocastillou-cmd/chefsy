'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { ImagenLoopHero, IMAGENES_LOOP_DEFAULT } from '@/servicios/supabase/configuracion'

interface Props {
  imagenesLoop?: ImagenLoopHero[]
  className?: string
}

export default function MarcoHistoriaInstagram({
  imagenesLoop = IMAGENES_LOOP_DEFAULT,
  className = '',
}: Props) {
  const [indiceActual, setIndiceActual] = useState(0)
  const lista = (imagenesLoop && imagenesLoop.length > 0) ? imagenesLoop : IMAGENES_LOOP_DEFAULT

  useEffect(() => {
    if (lista.length <= 1) return

    const itemActual = lista[indiceActual] || lista[0]
    const duracionMs = Math.max((itemActual.duracionSegundos || 4) * 1000, 1000)

    const timer = setTimeout(() => {
      setIndiceActual((prev) => (prev + 1) % lista.length)
    }, duracionMs)

    return () => clearTimeout(timer)
  }, [indiceActual, lista])

  return (
    <div className={`relative select-none ${className}`}>
      {/* Marco simple proporción 9:16 (tamaño historia de Instagram) */}
      <div className="relative w-[260px] sm:w-[280px] lg:w-[300px] xl:w-[320px] aspect-[9/16] rounded-2xl overflow-hidden bg-black/40 border border-white/10 shadow-2xl shadow-black/80">
        {lista.map((item, idx) => {
          const esActiva = idx === indiceActual
          return (
            <div
              key={item.id || `${item.url}-${idx}`}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                esActiva ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <Image
                src={item.url}
                alt="Plato Chefsy"
                fill
                priority={idx === 0}
                className="object-cover"
                sizes="(max-width: 768px) 280px, 320px"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

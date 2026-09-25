'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'

const IMAGENES_DEFAULT = [
  '/historias/historia-1.jpg',
  '/burger-hero.png',
  '/historias/historia-2.jpg',
  '/historias/historia-3.jpg',
  '/historias/historia-4.jpg',
]

const INTERVALO_MS = 3500

interface Props {
  imagenes?: string[]
  className?: string
}

export default function MarcoHistoriaInstagram({
  imagenes = IMAGENES_DEFAULT,
  className = '',
}: Props) {
  const [indiceActual, setIndiceActual] = useState(0)
  const lista = imagenes.length > 0 ? imagenes : IMAGENES_DEFAULT

  useEffect(() => {
    if (lista.length <= 1) return

    const timer = setInterval(() => {
      setIndiceActual((prev) => (prev + 1) % lista.length)
    }, INTERVALO_MS)

    return () => clearInterval(timer)
  }, [lista.length])

  return (
    <div className={`relative select-none ${className}`}>
      {/* Marco simple proporción 9:16 (tamaño historia de Instagram) */}
      <div className="relative w-[260px] sm:w-[280px] lg:w-[300px] xl:w-[320px] aspect-[9/16] rounded-2xl overflow-hidden bg-black/40 border border-white/10 shadow-2xl shadow-black/80">
        {lista.map((imgUrl, idx) => {
          const esActiva = idx === indiceActual
          return (
            <div
              key={`${imgUrl}-${idx}`}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                esActiva ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <Image
                src={imgUrl}
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

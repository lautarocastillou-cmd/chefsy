'use client'

import React, { useState, useRef, useCallback } from 'react'
import Image from 'next/image'

interface HeroParallax3DProps {
  heroImageUrl: string
  heroLinea1: string
  heroLinea2: string
  heroScale?: number
  heroPosX?: number
  heroPosY?: number
  isVideoBg?: boolean
  bgImage?: string
  onExplorarClick?: () => void
}

export default function HeroParallax3D({
  heroImageUrl,
  heroLinea1,
  heroLinea2,
  heroScale = 100,
  heroPosX = 50,
  heroPosY = 50,
  isVideoBg = false,
  bgImage,
  onExplorarClick
}: HeroParallax3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [imgError, setImgError] = useState(false)

  // Manejo del parallax 3D con cursor / touch
  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    // Normalizar de -1 a 1
    const percentX = (clientX - centerX) / (rect.width / 2)
    const percentY = (clientY - centerY) / (rect.height / 2)
    
    // Máxima inclinación 16 grados
    setRotateX(-percentY * 16)
    setRotateY(percentX * 16)
  }, [])

  const handleMouseMove = (e: React.MouseEvent) => {
    // Solo aplicar inclinación 3D en pantallas de escritorio con ratón
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      setIsHovered(true)
      handleMove(e.clientX, e.clientY)
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setRotateX(0)
    setRotateY(0)
  }

  const imgSrc = imgError ? '/burger-loca.webp' : (heroImageUrl?.split('|')[0] || '/burger-loca.webp')

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden px-4 pt-6 pb-4 md:py-10 flex items-center justify-center select-none cursor-pointer ${
        (isVideoBg || bgImage) ? 'bg-transparent' : 'bg-[#0d0d0d]'
      }`}
    >
      {/* Estilo de levitación ligera para la imagen */}
      <style jsx>{`
        @keyframes floatLevitate {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
          100% { transform: translateY(0px); }
        }
        .anim-float {
          animation: floatLevitate 5s ease-in-out infinite;
        }
      `}</style>

      <div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center justify-center py-2">
        
        {/* Contenedor de la Imagen del Producto */}
        <div 
          className="relative w-full max-w-[240px] sm:max-w-[270px] aspect-square mx-auto my-2 transition-transform duration-200 ease-out"
          style={{
            transform: isHovered ? `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.03)` : 'none'
          }}
        >
          {/* Imagen principal con levitación sobria y rápida */}
          <div className="w-full h-full relative anim-float">
            <Image
              src={imgSrc}
              alt="Plato Estrella Chefsy"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 320px"
              onError={() => setImgError(true)}
              className="object-contain"
              style={{
                objectPosition: `${heroPosX}% ${heroPosY}%`,
                transform: `scale(${heroScale / 100})`
              }}
            />
          </div>
        </div>

        {/* Textos Limpios Sin Neón */}
        <div className="text-center w-full z-20 relative mt-3 mb-2">
          <h1 className="font-bebas text-5xl sm:text-6xl tracking-wider uppercase leading-none text-white">
            {heroLinea1 || 'POCAS PALABRAS.'}
          </h1>
          <h2 className="font-bebas text-5xl sm:text-6xl tracking-wider uppercase leading-none mt-1 text-amber-400">
            {heroLinea2 || 'MUCHO CHEDDAR.'}
          </h2>
        </div>

        {/* Botón / Indicador de Explorar Menú */}
        {onExplorarClick && (
          <button
            onClick={onExplorarClick}
            className="mt-3 group bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 px-5 py-2.5 rounded-full text-xs font-bold text-white transition-all flex items-center gap-2 shadow-md cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>EXPLORAR MENÚ COMPLETO</span>
            <span className="group-hover:translate-y-0.5 transition-transform">↓</span>
          </button>
        )}

      </div>
    </div>
  )
}

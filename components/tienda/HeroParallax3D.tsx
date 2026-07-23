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
    setIsHovered(true)
    handleMove(e.clientX, e.clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      setIsHovered(true)
      handleMove(e.touches[0].clientX, e.touches[0].clientY)
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
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseLeave}
      className={`relative overflow-hidden px-4 py-8 md:py-12 border-b border-white/10 shadow-2xl flex items-center justify-center select-none cursor-pointer ${
        (isVideoBg || bgImage) ? 'bg-transparent' : 'bg-gradient-to-b from-[#141414] via-[#101010] to-[#0c0c0c]'
      }`}
      style={{ perspective: '1000px' }}
    >
      {/* Estilos de animación embebidos */}
      <style jsx>{`
        @keyframes floatLevitate {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(1deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.75; transform: scale(1.12); }
        }
        @keyframes badgeFloat1 {
          0%, 100% { transform: translateY(0px) rotate(-2deg); }
          50% { transform: translateY(-6px) rotate(1deg); }
        }
        @keyframes badgeFloat2 {
          0%, 100% { transform: translateY(0px) rotate(3deg); }
          50% { transform: translateY(-8px) rotate(-1deg); }
        }
        @keyframes badgeFloat3 {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50% { transform: translateY(-7px) rotate(2deg); }
        }
        @keyframes textShimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .anim-float {
          animation: floatLevitate 4.5s ease-in-out infinite;
        }
        .anim-glow {
          animation: pulseGlow 3.5s ease-in-out infinite;
        }
        .badge-1 { animation: badgeFloat1 3.8s ease-in-out infinite; }
        .badge-2 { animation: badgeFloat2 4.2s ease-in-out infinite 0.6s; }
        .badge-3 { animation: badgeFloat3 4.0s ease-in-out infinite 1.2s; }
        .text-gradient-neon {
          background: linear-gradient(90deg, #f59e0b, #fbbf24, #10b981, #f59e0b);
          background-size: 300% 100%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: textShimmer 6s ease infinite;
        }
      `}</style>

      {/* Aura de fondo neón ambiental */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] md:w-[450px] md:h-[450px] bg-amber-500/15 rounded-full blur-[90px] pointer-events-none anim-glow"
        style={{
          transform: `translate(-50%, -50%) translate3d(${rotateY * -1.5}px, ${rotateX * -1.5}px, 0)`
        }}
      />

      <div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center justify-center py-2">
        
        {/* Contenedor 3D de la Imagen + Badges */}
        <div 
          className="relative w-full max-w-[260px] sm:max-w-[290px] aspect-square mx-auto my-2 transition-transform duration-200 ease-out"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${isHovered ? 1.04 : 1})`
          }}
        >
          {/* Resplandor trasero directo del producto */}
          <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-amber-500/30 via-emerald-500/20 to-chefsy-500/30 blur-2xl -z-10" />

          {/* Imagen principal con levitación */}
          <div className="w-full h-full relative anim-float">
            <Image
              src={imgSrc}
              alt="Plato Estrella Chefsy"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 320px"
              onError={() => setImgError(true)}
              className="object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.65)]"
              style={{
                objectPosition: `${heroPosX}% ${heroPosY}%`,
                transform: `scale(${heroScale / 100})`
              }}
            />
          </div>

          {/* Badge 1: Top-Left */}
          <div 
            className="absolute top-2 -left-2 z-30 badge-1 pointer-events-none"
            style={{ transform: 'translateZ(40px)' }}
          >
            <div className="bg-slate-950/80 backdrop-blur-md border border-amber-500/40 text-amber-300 px-3 py-1.5 rounded-full text-[11px] font-bold shadow-xl flex items-center gap-1.5 tracking-wide ring-1 ring-amber-500/20">
              <span className="text-sm">🧀</span>
              <span>+Cheddar Extra</span>
            </div>
          </div>

          {/* Badge 2: Top-Right */}
          <div 
            className="absolute top-8 -right-3 z-30 badge-2 pointer-events-none"
            style={{ transform: 'translateZ(50px)' }}
          >
            <div className="bg-slate-950/80 backdrop-blur-md border border-orange-500/40 text-orange-400 px-3 py-1.5 rounded-full text-[11px] font-bold shadow-xl flex items-center gap-1.5 tracking-wide ring-1 ring-orange-500/20">
              <span className="text-sm">🔥</span>
              <span>100% Recién Hecho</span>
            </div>
          </div>

          {/* Badge 3: Bottom-Right */}
          <div 
            className="absolute bottom-2 -right-1 z-30 badge-3 pointer-events-none"
            style={{ transform: 'translateZ(35px)' }}
          >
            <div className="bg-slate-950/80 backdrop-blur-md border border-emerald-500/40 text-emerald-300 px-3 py-1.5 rounded-full text-[11px] font-bold shadow-xl flex items-center gap-1.5 tracking-wide ring-1 ring-emerald-500/20">
              <span className="text-sm">⚡</span>
              <span>Envío Rápido 25m</span>
            </div>
          </div>
        </div>

        {/* Textos Neón Animados */}
        <div className="text-center w-full z-20 relative mt-4 mb-2">
          <h1 
            className="font-bebas text-5xl sm:text-6xl tracking-wider uppercase leading-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] text-white"
          >
            {heroLinea1 || 'POCAS PALABRAS.'}
          </h1>
          <h2 
            className="font-bebas text-5xl sm:text-6xl tracking-wider uppercase leading-none drop-shadow-[0_4px_16px_rgba(245,158,11,0.3)] mt-0.5 text-gradient-neon"
          >
            {heroLinea2 || 'MUCHO CHEDDAR.'}
          </h2>
        </div>

        {/* Botón / Indicador de Explorar Menú */}
        {onExplorarClick && (
          <button
            onClick={onExplorarClick}
            className="mt-3 group bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 hover:border-amber-400/40 px-5 py-2 rounded-full text-xs font-bold text-white transition-all flex items-center gap-2 shadow-lg cursor-pointer backdrop-blur-sm"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>EXPORAR MENÚ COMPLETO</span>
            <span className="group-hover:translate-y-0.5 transition-transform">↓</span>
          </button>
        )}

      </div>
    </div>
  )
}

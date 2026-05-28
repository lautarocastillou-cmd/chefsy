'use client'

// ─────────────────────────────────────────────────────
// modules/malu/componentes/WelcomeScreen.tsx
// Animación de bienvenida cinematográfica estilo "Luxury Boutique".
// ─────────────────────────────────────────────────────

import { useState, useEffect } from 'react'

interface Props {
  onCompletado: () => void
}

export default function WelcomeScreen({ onCompletado }: Props) {
  // fases: 
  // 0: Negro absoluto inicial
  // 1: ¡Hola, Abril! (Fade In)
  // 2: ¡Hola, Abril! (Fade Out)
  // 3: Preparando tu boutique... (Fade In)
  // 4: Preparando tu boutique... (Fade Out)
  // 5: Desvanecer pantalla completa (Exit)
  const [fase, setFase] = useState(0)

  useEffect(() => {
    // 1. Mostrar saludo
    const t1 = setTimeout(() => setFase(1), 300)
    
    // 2. Desvanecer saludo
    const t2 = setTimeout(() => setFase(2), 2600)
    
    // 3. Mostrar preparación
    const t3 = setTimeout(() => setFase(3), 3600)
    
    // 4. Desvanecer preparación
    const t4 = setTimeout(() => setFase(4), 5400)
    
    // 5. Salida de pantalla
    const t5 = setTimeout(() => setFase(5), 6200)
    
    // 6. Completado
    const t6 = setTimeout(() => onCompletado(), 7000)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
      clearTimeout(t5)
      clearTimeout(t6)
    }
  }, [onCompletado])

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center select-none overflow-hidden transition-all duration-1000 ${
        fase === 5 ? 'opacity-0 pointer-events-none scale-105' : 'opacity-100'
      }`}
      style={{ background: '#070707' }}
    >
      {/* Estilos CSS de animación para renderizado fluido a 60fps con GPU */}
      <style>{`
        @keyframes fadeInCinematic {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.99);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes fadeOutCinematic {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(-8px);
          }
        }
        .anim-in {
          animation: fadeInCinematic 1.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        .anim-out {
          animation: fadeOutCinematic 1.0s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
      `}</style>

      {/* Contenedor principal de textos */}
      <div className="text-center px-6 relative z-10 flex flex-col items-center justify-center">
        {/* Orbe dorado central súper difuminado */}
        <div 
          className="absolute w-[200px] h-[200px] rounded-full opacity-[0.04] pointer-events-none blur-[40px]"
          style={{ background: 'radial-gradient(circle, #E5D3B3, transparent 70%)' }}
        />

        {/* Fase 1 y 2: ¡Hola, Abril! */}
        {(fase === 1 || fase === 2) && (
          <h1
            className={`text-3xl sm:text-4xl font-serif-elegant italic tracking-wide ${
              fase === 1 ? 'anim-in' : 'anim-out'
            }`}
            style={{
              color: '#E5D3B3',
              textShadow: '0 0 15px rgba(229, 211, 179, 0.35), 0 0 3px rgba(229, 211, 179, 0.1)',
            }}
          >
            ¡Hola, Abril! 👋
          </h1>
        )}

        {/* Fase 3 y 4: Preparando tu boutique... */}
        {(fase === 3 || fase === 4) && (
          <p
            className={`text-sm sm:text-base font-serif-elegant italic tracking-widest text-[#E5D3B3]/75 ${
              fase === 3 ? 'anim-in' : 'anim-out'
            }`}
            style={{
              textShadow: '0 0 10px rgba(229, 211, 179, 0.2)',
            }}
          >
            Preparando tu boutique...
          </p>
        )}
      </div>
    </div>
  )
}

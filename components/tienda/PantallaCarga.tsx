'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function PantallaCarga() {
  const [visible, setVisible] = useState(false)
  const [verificando, setVerificando] = useState(true)

  useEffect(() => {
    // Verificar si ya se mostró en esta sesión de navegación
    const yaVisto = sessionStorage.getItem('animacionVista') === 'true'
    
    if (yaVisto) {
      setVerificando(false)
      return
    }

    // Si es la primera vez en la sesión, la mostramos
    setVerificando(false)
    setVisible(true)
    document.body.style.overflow = 'hidden'

    const timer = setTimeout(() => {
      setVisible(false)
      sessionStorage.setItem('animacionVista', 'true')
      document.body.style.overflow = 'auto'
    }, 2500)

    return () => {
      clearTimeout(timer)
      document.body.style.overflow = 'auto'
    }
  }, [])

  // Mientras verifica en el cliente si hay que mostrarla o no, no renderizamos nada
  if (verificando) return null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ y: 0 }}
          exit={{ 
            y: '-100%', 
            transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] } // Easing tipo "cubic-bezier" premium
          }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-chefsy overflow-hidden"
        >
          {/* Contenedor del logo con latido constante y rotación */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ 
              scale: [0.8, 1.1, 1],
              opacity: 1
            }}
            transition={{ 
              duration: 1.5, 
              ease: "easeOut"
            }}
            className="relative"
          >
            {/* Resplandor detrás del logo */}
            <motion.div 
              animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 bg-white/20 blur-2xl rounded-full"
            />
            
            <img 
              src="/logo.jpg" 
              alt="Chefsy Logo" 
              className="w-32 h-32 md:w-40 md:h-40 rounded-3xl shadow-2xl relative z-10 bg-white p-1"
            />
          </motion.div>

          {/* Texto o Slogan animado */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mt-8 text-center"
          >
            <h1 className="text-white text-3xl md:text-5xl font-black tracking-tighter uppercase mb-2">
              Chefsy
            </h1>
            <p className="text-chefsy-200 text-sm md:text-base font-semibold tracking-widest uppercase">
              Cargando Sabor...
            </p>
          </motion.div>

          {/* Barra de progreso visual */}
          <motion.div 
            className="absolute bottom-16 md:bottom-20 w-48 h-1 bg-chefsy-800 rounded-full overflow-hidden"
          >
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: '0%' }}
              transition={{ duration: 2, ease: "easeInOut" }}
              className="w-full h-full bg-white rounded-full"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Home, Search, User, ShoppingCart } from 'lucide-react'
import { usarCarrito } from '@/contexto/CarritoContexto'
import { formatearPrecio } from '@/lib/utils'

interface BottomNavProps {
  onNavClick: (tab: 'home' | 'search' | 'profile' | 'cart') => void
  activeTab: 'home' | 'search' | 'profile' | 'cart'
}

export default function BottomNav({ onNavClick, activeTab }: BottomNavProps) {
  const { totalProductosCarrito, subtotalCarrito } = usarCarrito()
  const [esGrande, setEsGrande] = useState(true)
  const [popAnimado, setPopAnimado] = useState(false)
  const prevTotalRef = useRef(totalProductosCarrito)

  // Micro-pop al añadir productos al carrito
  useEffect(() => {
    if (totalProductosCarrito > prevTotalRef.current) {
      setPopAnimado(true)
      const t = setTimeout(() => setPopAnimado(false), 600)
      prevTotalRef.current = totalProductosCarrito
      return () => clearTimeout(t)
    }
    prevTotalRef.current = totalProductosCarrito
  }, [totalProductosCarrito])

  // Escuchar impacto del vuelo del producto al carrito
  useEffect(() => {
    let t: NodeJS.Timeout | null = null
    const handleCartPop = () => {
      setPopAnimado(true)
      if (t) clearTimeout(t)
      t = setTimeout(() => setPopAnimado(false), 650)
    }
    window.addEventListener('chefsy:cart-pop', handleCartPop)
    return () => {
      window.removeEventListener('chefsy:cart-pop', handleCartPop)
      if (t) clearTimeout(t)
    }
  }, [])

  useEffect(() => {
    let ultimoScrollY = window.scrollY
    let scrollTimeout: NodeJS.Timeout | null = null

    const handleScroll = () => {
      const actualScrollY = window.scrollY
      if (actualScrollY < 30) {
        setEsGrande(true)
        if (scrollTimeout) clearTimeout(scrollTimeout)
        return
      }

      if (actualScrollY > ultimoScrollY + 5) {
        // Scrolleando hacia abajo -> achicar suavemente
        setEsGrande(false)
      } else if (actualScrollY < ultimoScrollY - 5) {
        // Scrolleando hacia arriba -> agrandar suavemente
        setEsGrande(true)
      }
      ultimoScrollY = actualScrollY

      // Cuando la pantalla queda quieta (idle por 250ms), volver a agrandar nuevamente
      if (scrollTimeout) clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        setEsGrande(true)
      }, 250)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollTimeout) clearTimeout(scrollTimeout)
    }
  }, [])

  return (
    <div className="fixed bottom-4 left-0 right-0 z-40 flex justify-center pointer-events-none px-4 transition-all duration-300">
      <div className={`pointer-events-auto bg-[#161616] border border-white/15 rounded-full shadow-[0_10px_35px_rgba(0,0,0,0.85)] transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1) flex items-center justify-around ${
        esGrande 
          ? 'w-full max-w-[280px] py-2 px-3 sm:px-4 scale-100' 
          : 'w-full max-w-[220px] py-1.5 px-2.5 sm:px-3 scale-95 opacity-90 bg-[#121212] border-white/20'
      }`}>
        <button 
          onClick={() => onNavClick('home')}
          className={`flex flex-col items-center gap-0.5 transition-all duration-300 cursor-pointer group ${activeTab === 'home' ? 'text-chefsy-400 scale-105' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Home size={esGrande ? 19 : 17} className="transition-all duration-300 group-active:scale-90" />
          <span className={`text-[9px] font-extrabold tracking-wide transition-all duration-300 ${esGrande ? 'opacity-100 max-h-3 mt-0.5' : 'opacity-0 max-h-0 overflow-hidden mt-0'}`}>Inicio</span>
        </button>

        <button 
          onClick={() => onNavClick('search')}
          className={`flex flex-col items-center gap-0.5 transition-all duration-300 cursor-pointer group ${activeTab === 'search' ? 'text-chefsy-400 scale-105' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Search size={esGrande ? 19 : 17} className="transition-all duration-300 group-active:scale-90" />
          <span className={`text-[9px] font-extrabold tracking-wide transition-all duration-300 ${esGrande ? 'opacity-100 max-h-3 mt-0.5' : 'opacity-0 max-h-0 overflow-hidden mt-0'}`}>Buscar</span>
        </button>

        <button 
          onClick={() => {
            import('react-hot-toast').then(mod => {
              mod.toast('Próximamente disponible', { icon: '🚀' })
            })
          }}
          className={`flex flex-col items-center gap-0.5 transition-all duration-300 cursor-pointer group ${activeTab === 'profile' ? 'text-chefsy-400 scale-105' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <User size={esGrande ? 19 : 17} className="transition-all duration-300 group-active:scale-90" />
          <span className={`text-[9px] font-extrabold tracking-wide transition-all duration-300 ${esGrande ? 'opacity-100 max-h-3 mt-0.5' : 'opacity-0 max-h-0 overflow-hidden mt-0'}`}>Perfil</span>
        </button>

        <button 
          id="cart-button-mobile"
          onClick={() => onNavClick('cart')}
          className={`relative flex flex-col items-center gap-0.5 transition-all duration-300 cursor-pointer group ${activeTab === 'cart' ? 'text-chefsy-400 scale-105' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <div className="relative">
            <ShoppingCart size={esGrande ? 19 : 17} className="transition-all duration-300 group-active:scale-90" />
            {totalProductosCarrito > 0 && (
              <span className={`absolute -top-1.5 -right-2 bg-emerald-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-[#161616] shadow-sm transition-transform duration-300 ${
                popAnimado ? 'scale-135 bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)] animate-bounce' : 'scale-100'
              }`}>
                {totalProductosCarrito}
              </span>
            )}
          </div>
          <span className={`text-[9px] font-extrabold tracking-wide transition-all duration-300 ${esGrande ? 'opacity-100 max-h-3 mt-0.5' : 'opacity-0 max-h-0 overflow-hidden mt-0'}`}>
            {totalProductosCarrito > 0 ? formatearPrecio(subtotalCarrito) : 'Carrito'}
          </span>
        </button>
      </div>
    </div>
  )
}

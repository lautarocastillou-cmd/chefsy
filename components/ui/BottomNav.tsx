'use client'

import React, { useState, useEffect } from 'react'
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
  const [ultimoScrollY, setUltimoScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const actualScrollY = window.scrollY
      if (actualScrollY < 30) {
        setEsGrande(true)
      } else if (actualScrollY > ultimoScrollY + 8) {
        // Scrolleo hacia abajo -> achicar suavemente
        setEsGrande(false)
      } else if (actualScrollY < ultimoScrollY - 8) {
        // Scrolleo hacia arriba -> agrandar suavemente
        setEsGrande(true)
      }
      setUltimoScrollY(actualScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [ultimoScrollY])

  return (
    <div className="fixed bottom-5 left-0 right-0 z-40 flex justify-center pointer-events-none px-4 transition-all duration-300">
      <div className={`pointer-events-auto bg-[#161616]/90 backdrop-blur-2xl border border-white/15 rounded-full shadow-[0_10px_35px_rgba(0,0,0,0.85)] transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1) flex items-center justify-between ${
        esGrande 
          ? 'w-full max-w-[350px] py-3 px-7 scale-100' 
          : 'w-full max-w-[285px] py-2 px-5 scale-95 opacity-90 bg-[#121212]/95 border-white/20'
      }`}>
        <button 
          onClick={() => onNavClick('home')}
          className={`flex flex-col items-center gap-1 transition-all duration-300 cursor-pointer group ${activeTab === 'home' ? 'text-chefsy-400 scale-105' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Home size={esGrande ? 22 : 20} className="transition-all duration-300 group-active:scale-90" />
          <span className={`text-[10px] font-extrabold tracking-wide transition-all duration-300 ${esGrande ? 'opacity-100 max-h-4 mt-0.5' : 'opacity-0 max-h-0 overflow-hidden mt-0'}`}>Inicio</span>
        </button>

        <button 
          onClick={() => onNavClick('search')}
          className={`flex flex-col items-center gap-1 transition-all duration-300 cursor-pointer group ${activeTab === 'search' ? 'text-chefsy-400 scale-105' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Search size={esGrande ? 22 : 20} className="transition-all duration-300 group-active:scale-90" />
          <span className={`text-[10px] font-extrabold tracking-wide transition-all duration-300 ${esGrande ? 'opacity-100 max-h-4 mt-0.5' : 'opacity-0 max-h-0 overflow-hidden mt-0'}`}>Buscar</span>
        </button>

        <button 
          onClick={() => onNavClick('profile')}
          className={`flex flex-col items-center gap-1 transition-all duration-300 cursor-pointer group ${activeTab === 'profile' ? 'text-chefsy-400 scale-105' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <User size={esGrande ? 22 : 20} className="transition-all duration-300 group-active:scale-90" />
          <span className={`text-[10px] font-extrabold tracking-wide transition-all duration-300 ${esGrande ? 'opacity-100 max-h-4 mt-0.5' : 'opacity-0 max-h-0 overflow-hidden mt-0'}`}>Perfil</span>
        </button>

        <button 
          onClick={() => onNavClick('cart')}
          className={`relative flex flex-col items-center gap-1 transition-all duration-300 cursor-pointer group ${activeTab === 'cart' ? 'text-chefsy-400 scale-105' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <div className="relative">
            <ShoppingCart size={esGrande ? 22 : 20} className="transition-all duration-300 group-active:scale-90" />
            {totalProductosCarrito > 0 && (
              <span className="absolute -top-2 -right-2 bg-chefsy-500 text-white text-[9px] font-black w-4.5 h-4.5 flex items-center justify-center rounded-full border-2 border-[#161616] shadow-sm animate-pulse">
                {totalProductosCarrito}
              </span>
            )}
          </div>
          <span className={`text-[10px] font-extrabold tracking-wide transition-all duration-300 ${esGrande ? 'opacity-100 max-h-4 mt-0.5' : 'opacity-0 max-h-0 overflow-hidden mt-0'}`}>
            {totalProductosCarrito > 0 ? formatearPrecio(subtotalCarrito) : 'Carrito'}
          </span>
        </button>
      </div>
    </div>
  )
}

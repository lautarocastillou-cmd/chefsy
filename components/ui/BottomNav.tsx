'use client'

import React from 'react'
import { Home, Search, User, ShoppingCart } from 'lucide-react'
import { usarCarrito } from '@/contexto/CarritoContexto'
import { formatearPrecio } from '@/lib/utils'

interface BottomNavProps {
  onNavClick: (tab: 'home' | 'search' | 'profile' | 'cart') => void
  activeTab: 'home' | 'search' | 'profile' | 'cart'
}

export default function BottomNav({ onNavClick, activeTab }: BottomNavProps) {
  const { totalProductosCarrito, subtotalCarrito } = usarCarrito()

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#0B0F19]/95 backdrop-blur-xl border-t border-white/10 z-[9999] px-6 py-3 pb-safe">
      <div className="flex justify-between items-center max-w-md mx-auto">
        <button 
          onClick={() => onNavClick('home')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'home' ? 'text-chefsy-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <Home size={24} className={activeTab === 'home' ? 'fill-chefsy-400/20' : ''} />
          <span className="text-[10px] font-bold">Inicio</span>
        </button>

        <button 
          onClick={() => onNavClick('search')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'search' ? 'text-chefsy-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <Search size={24} />
          <span className="text-[10px] font-bold">Buscar</span>
        </button>

        <button 
          onClick={() => onNavClick('profile')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'profile' ? 'text-chefsy-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <User size={24} />
          <span className="text-[10px] font-bold">Perfil</span>
        </button>

        <button 
          onClick={() => onNavClick('cart')}
          className={`relative flex flex-col items-center gap-1 transition-colors ${activeTab === 'cart' ? 'text-chefsy-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <div className="relative">
            <ShoppingCart size={24} className={activeTab === 'cart' ? 'fill-chefsy-400/20' : ''} />
            {totalProductosCarrito > 0 && (
              <span className="absolute -top-2 -right-2 bg-chefsy-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#0B0F19]">
                {totalProductosCarrito}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold">
            {totalProductosCarrito > 0 ? formatearPrecio(subtotalCarrito) : 'Carrito'}
          </span>
        </button>
      </div>
    </div>
  )
}

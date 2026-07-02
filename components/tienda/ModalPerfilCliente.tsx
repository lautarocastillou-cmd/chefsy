'use client'

import React from 'react'
import { X } from 'lucide-react'
import { usarClienteAuth } from '@/contexto/ClienteAuthContexto'

interface Props {
  abierto: boolean
  onCerrar: () => void
  onAbrirHistorial: () => void
  onCanjear?: () => void
}

export default function ModalPerfilCliente({ abierto, onCerrar, onAbrirHistorial, onCanjear }: Props) {
  const { perfil } = usarClienteAuth()

  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-[#141414] border border-white/10 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative overflow-hidden text-center text-white font-sans flex flex-col items-center animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        <button
          onClick={onCerrar}
          className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white p-2 rounded-full transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Avatar */}
        <div className="w-20 h-20 bg-chefsy/20 rounded-full flex items-center justify-center mb-4 border border-chefsy/30 shadow-lg mt-2">
          <span className="text-3xl text-chefsy-400 font-bebas">
            {perfil?.nombre?.charAt(0)?.toUpperCase() || 'C'}
          </span>
        </div>

        {/* Saludo */}
        <h2 className="text-2xl md:text-3xl font-bebas text-white tracking-wider mb-1">
          ¡HOLA, {perfil?.nombre?.toUpperCase() || 'CLIENTE'}!
        </h2>
        <p className="text-slate-400 text-sm mb-6">
          Acá podés ver tus Chefsitos acumulados.
        </p>

        {/* Tarjeta de Chefsitos */}
        <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-5 w-full shadow-xl flex flex-col items-center relative overflow-hidden mb-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-chefsy/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
          <span className="text-xs text-slate-400 font-bold tracking-widest uppercase mb-1 relative z-10">TUS CHEFSITOS</span>
          <span className="text-5xl font-bebas text-chefsy-400 relative z-10 drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]">
            {perfil?.puntos_actuales || 0}
          </span>
        </div>

        {/* Botones de Acción */}
        <div className="w-full space-y-3">
          <button
            onClick={() => {
              onCerrar()
              if (onCanjear) {
                onCanjear()
              } else {
                const catElement = document.getElementById('catalogo-productos')
                if (catElement) {
                  catElement.scrollIntoView({ behavior: 'smooth' })
                }
              }
            }}
            className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-slate-950 font-black py-3.5 px-6 rounded-2xl shadow-xl shadow-yellow-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 text-lg font-bebas tracking-wide cursor-pointer"
          >
            <span className="text-2xl">🪙</span>
            <span>Canjear Chefsitos en Tienda</span>
          </button>

          <button
            onClick={() => {
              onCerrar()
              onAbrirHistorial()
            }}
            className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold py-3.5 px-6 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3 text-base tracking-wide cursor-pointer"
          >
            <span className="text-xl">📜</span>
            <span>Historial de pedidos</span>
          </button>
        </div>
      </div>
    </div>
  )
}

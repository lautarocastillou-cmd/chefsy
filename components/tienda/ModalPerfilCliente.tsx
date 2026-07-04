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

export default function ModalPerfilCliente({ abierto, onCerrar, onAbrirHistorial }: Props) {
  const { perfil } = usarClienteAuth()

  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 transition-opacity duration-200 will-change-opacity animate-in fade-in" onClick={onCerrar}>
      <div 
        className="bg-[#141414] border border-white/10 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative overflow-hidden text-center text-white font-sans flex flex-col items-center animate-in zoom-in-95 duration-200 will-change-transform"
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
          Bienvenido a tu perfil de Chefsy.
        </p>

        {/* Botón Historial */}
        <div className="w-full">
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

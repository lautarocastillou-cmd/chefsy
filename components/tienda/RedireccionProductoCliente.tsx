'use client'

import React, { useEffect } from 'react'

interface RedireccionProductoClienteProps {
  destino: string
  nombreProducto?: string
  imagen?: string
  precioFormateado?: string
}

export default function RedireccionProductoCliente({
  destino,
  nombreProducto,
  imagen,
  precioFormateado,
}: RedireccionProductoClienteProps) {
  useEffect(() => {
    // Redirección inmediata al montar en el cliente
    window.location.replace(destino)
  }, [destino])

  return (
    <div className="min-h-screen bg-[#080E11] text-white flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center animate-pulse shadow-2xl">
          <img src="/logo.jpg" alt="Chefsy" className="w-14 h-14 rounded-xl object-cover" />
        </div>
      </div>

      {nombreProducto && (
        <div className="max-w-xs mb-4">
          <p className="text-[10px] tracking-widest uppercase text-amber-400 font-bold mb-1">
            Abriendo en Chefsy
          </p>
          <h1 className="font-bebas text-3xl tracking-wide text-white leading-none">
            {nombreProducto}
          </h1>
          {precioFormateado && (
            <p className="font-bold text-amber-400 text-lg mt-1">
              {precioFormateado}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
        <span>Cargando tienda oficial...</span>
      </div>

      <a
        href={destino}
        className="mt-6 text-xs text-slate-400 underline hover:text-white transition-colors py-2 px-4 rounded-lg bg-white/5 hover:bg-white/10"
      >
        ¿No redirige automáticamente? Tocá acá
      </a>
    </div>
  )
}

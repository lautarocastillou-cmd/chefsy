'use client'

import React, { useEffect } from 'react'
import { AlertCircle, RefreshCw, ShoppingBag } from 'lucide-react'
import { reportarErrorManualmente } from '@/lib/logger'

export default function ErrorTienda({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    reportarErrorManualmente(error, 'Error en Tienda Online (app/tienda/error.tsx)', {
      digest: error.digest,
    })
  }, [error])

  return (
    <div className="min-h-screen bg-[#121212] text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#1a1a1a] border border-[#2d2d2d] rounded-3xl p-6 sm:p-8 shadow-2xl text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5 text-amber-400">
          <ShoppingBag className="w-8 h-8 stroke-[2.2]" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
          ¡Ups! Hubo un problema al cargar la tienda
        </h1>

        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          No te preocupes, tus datos no se perdieron. Podés intentar recargar el catálogo tocando el botón de abajo.
        </p>

        <button
          type="button"
          onClick={() => reset()}
          className="w-full inline-flex items-center justify-center gap-2 bg-[#ff5e00] hover:bg-[#e05300] text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-lg active:scale-95 cursor-pointer text-base"
        >
          <RefreshCw className="w-4 h-4 stroke-[2.2]" />
          <span>Volver a cargar menú</span>
        </button>
      </div>
    </div>
  )
}

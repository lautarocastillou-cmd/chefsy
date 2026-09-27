'use client'

import React, { useEffect } from 'react'
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'
import { reportarErrorManualmente } from '@/lib/logger'

export default function ErrorPrincipalLayout({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    reportarErrorManualmente(error, 'Error de Ruta en Panel Principal (app/(principal)/error.tsx)', {
      digest: error.digest,
    })
  }, [error])

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-8 min-h-[60vh]">
      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center flex flex-col items-center backdrop-blur-xl">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400">
          <AlertTriangle className="w-7 h-7 stroke-[2.2]" />
        </div>

        <h2 className="text-xl font-bold tracking-tight text-white mb-2">
          Interrupción en esta sección
        </h2>

        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          Ocurrió un problema inesperado al cargar la vista. Podés reintentar la operación o volver a la pantalla de pedidos.
        </p>

        {error.message && (
          <div className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 mb-6 text-left">
            <p className="text-[11px] font-mono text-slate-400 break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reintentar</span>
          </button>

          <Link
            href="/pedidos"
            className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-3 px-4 rounded-xl transition-all active:scale-95"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Ver Pedidos</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

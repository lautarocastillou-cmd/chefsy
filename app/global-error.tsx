'use client'

import React, { useEffect } from 'react'
import { AlertOctagon, RefreshCw } from 'lucide-react'
import { reportarErrorManualmente } from '@/lib/logger'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    reportarErrorManualmente(error, 'Global Root Error (app/global-error.tsx)', {
      digest: error.digest,
    })
  }, [error])

  return (
    <html lang="es">
      <body className="bg-slate-950 text-slate-100 flex items-center justify-center min-h-screen p-4 m-0 font-sans">
        <main className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5 text-red-400">
            <AlertOctagon className="w-8 h-8 stroke-[2.2]" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
            Interrupción Crítica del Sistema
          </h1>

          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            Se produjo un error a nivel principal de la aplicación. La incidencia{' '}
            <span className="text-emerald-400 font-semibold">ha sido reportada a soporte técnico</span> de inmediato.
          </p>

          <button
            type="button"
            onClick={() => reset()}
            className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 stroke-[2.2]" />
            <span>Recargar Aplicación</span>
          </button>
        </main>
      </body>
    </html>
  )
}

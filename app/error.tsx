'use client'

import React, { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { reportarErrorManualmente } from '@/lib/logger'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Notifica de forma inmediata y silenciosa al bot de Telegram
    reportarErrorManualmente(error, 'Error Boundary (app/error.tsx)', {
      digest: error.digest,
    })
  }, [error])

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5 text-amber-400">
          <AlertTriangle className="w-8 h-8 stroke-[2.2]" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
          Algo no salió como esperábamos
        </h1>

        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          Ocurrió un problema inesperado. No te preocupes, el error{' '}
          <span className="text-emerald-400 font-semibold">ya fue notificado automáticamente</span> al equipo técnico para solucionarlo.
        </p>

        {error.digest && (
          <span className="text-[11px] font-mono text-slate-500 bg-slate-950 px-3 py-1 rounded-full mb-6 border border-slate-800">
            Código: {error.digest}
          </span>
        )}

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 stroke-[2.2]" />
            <span>Reintentar</span>
          </button>

          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-3 px-4 rounded-xl transition-all active:scale-95"
          >
            <Home className="w-4 h-4" />
            <span>Inicio</span>
          </a>
        </div>
      </div>
    </main>
  )
}

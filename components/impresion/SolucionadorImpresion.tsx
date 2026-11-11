'use client'

// ─────────────────────────────────────────────────────
// components/impresion/SolucionadorImpresion.tsx
// Solucionador de problemas estilo Windows para la impresión:
// corre el protocolo de verificación con reintentos, muestra
// cada chequeo con detalle y permite reintentar, copiar el
// informe o mandar un ticket de prueba.
// ─────────────────────────────────────────────────────

import React, { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ClipboardCopy,
  Loader2,
  Printer,
  RefreshCw,
  ShieldCheck,
  Wrench,
  X,
  XCircle,
} from 'lucide-react'
import {
  CheckDiagnostico,
  ejecutarDiagnostico,
  ResultadoDiagnostico,
} from '@/lib/impresion/diagnostico'
import { gestorImpresora } from '@/lib/impresion/impresoraTermica'
import { solicitarPermisoRedLocal } from '@/lib/impresion/permisoRedLocal'

interface Props {
  abierto: boolean
  onCerrar: () => void
}

export default function SolucionadorImpresion({ abierto, onCerrar }: Props) {
  const [montado, setMontado] = useState(false)
  const [ejecutando, setEjecutando] = useState(false)
  const [paso, setPaso] = useState('')
  const [checks, setChecks] = useState<CheckDiagnostico[]>([])
  const [resultado, setResultado] = useState<ResultadoDiagnostico | null>(null)
  const [probando, setProbando] = useState(false)
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [detalleAbierto, setDetalleAbierto] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setMontado(true)
  }, [])

  const ejecutar = useCallback(async () => {
    setEjecutando(true)
    setChecks([])
    setResultado(null)
    setFeedback(null)
    setPaso('Iniciando diagnóstico…')

    try {
      const respuesta = await ejecutarDiagnostico((parciales, actual) => {
        setChecks(parciales)
        setPaso(actual)
      })
      setChecks(respuesta.checks)
      setResultado(respuesta)
    } catch (error) {
      console.error('[Solucionador] Error ejecutando diagnóstico:', error)
      setFeedback({ tipo: 'error', texto: 'El diagnóstico no se pudo completar. Volvé a intentarlo.' })
    } finally {
      setEjecutando(false)
      setPaso('')
    }
  }, [])

  useEffect(() => {
    if (abierto && montado) {
      void ejecutar()
    }
  }, [abierto, montado, ejecutar])

  if (!abierto || !montado || typeof document === 'undefined') return null

  const errores = checks.filter((check) => check.estado === 'error').length
  const avisos = checks.filter((check) => check.estado === 'aviso').length

  const copiarInforme = async () => {
    const informe =
      resultado?.informe ||
      checks
        .map((check) => `[${check.estado.toUpperCase()}] ${check.titulo}: ${check.detalle}`)
        .join('\n')

    try {
      await navigator.clipboard.writeText(informe)
      setFeedback({ tipo: 'ok', texto: 'Informe copiado al portapapeles.' })
    } catch {
      setFeedback({ tipo: 'error', texto: 'No se pudo copiar. Seleccioná el texto y copialo a mano.' })
    }
  }

  const imprimirPrueba = async () => {
    setProbando(true)
    setFeedback(null)
    try {
      await gestorImpresora.imprimirPrueba()
      setFeedback({ tipo: 'ok', texto: 'Ticket de prueba enviado. Revisá la comandera.' })
    } catch (error: any) {
      setFeedback({
        tipo: 'error',
        texto: error?.message || 'No se pudo enviar el ticket de prueba.',
      })
    } finally {
      setProbando(false)
    }
  }

  const alternarDetalle = (id: string) => {
    setDetalleAbierto((previo) => ({ ...previo, [id]: !previo[id] }))
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] bg-black/80 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onCerrar}
      role="dialog"
      aria-modal="true"
      aria-label="Solucionador de problemas de impresión"
    >
      <div
        className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(evento) => evento.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-3 bg-slate-900 shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
              <Wrench size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">Solucionar problemas de impresión</h2>
              <p className="text-xs text-slate-400">
                Verifica el navegador, el agente local y la comandera de Windows.
              </p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Resumen */}
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
          {ejecutando ? (
            <span className="inline-flex items-center gap-1.5 font-bold text-sky-300">
              <Loader2 size={13} className="animate-spin" />
              {paso || 'Verificando…'}
            </span>
          ) : resultado ? (
            resultado.ok ? (
              <span className="inline-flex items-center gap-1.5 font-bold text-emerald-400">
                <CheckCircle2 size={14} />
                Sin problemas críticos
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-bold text-rose-400">
                <XCircle size={14} />
                {errores} error{errores === 1 ? '' : 'es'} · {avisos} aviso{avisos === 1 ? '' : 's'}
              </span>
            )
          ) : (
            <span className="font-bold text-slate-400">Listo para diagnosticar</span>
          )}

          {resultado?.contexto.versionAgente && (
            <span className="text-slate-500">Agente v{resultado.contexto.versionAgente}</span>
          )}
          {resultado?.contexto.urlUsada && (
            <span className="text-slate-500 font-mono">{resultado.contexto.urlUsada}</span>
          )}
          {resultado?.contexto.latenciaMs !== undefined && (
            <span className="text-slate-500">{resultado.contexto.latenciaMs} ms</span>
          )}
        </div>

        {/* Chequeos */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-2">
          {checks.length === 0 && ejecutando && (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((indice) => (
                <div
                  key={indice}
                  className="h-14 rounded-2xl border border-slate-800 bg-slate-950/40 animate-pulse"
                />
              ))}
            </div>
          )}

          {checks.map((check) => (
            <div
              key={check.id}
              className={`rounded-2xl border p-3 transition-colors ${
                check.estado === 'ok'
                  ? 'border-emerald-900/60 bg-emerald-950/20'
                  : check.estado === 'aviso'
                    ? 'border-amber-900/60 bg-amber-950/20'
                    : 'border-rose-900/60 bg-rose-950/20'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span className="shrink-0 mt-0.5">
                  {check.estado === 'ok' ? (
                    <CheckCircle2 size={17} className="text-emerald-400" />
                  ) : check.estado === 'aviso' ? (
                    <AlertTriangle size={17} className="text-amber-400" />
                  ) : (
                    <XCircle size={17} className="text-rose-400" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-white leading-snug">{check.titulo}</p>
                    <span
                      className={`shrink-0 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        check.estado === 'ok'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : check.estado === 'aviso'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {check.estado === 'ok' ? 'OK' : check.estado === 'aviso' ? 'Aviso' : 'Error'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300/90 leading-relaxed mt-1 break-words">
                    {check.detalle}
                  </p>

                  {check.sugerencia && (
                    <button
                      type="button"
                      onClick={() => alternarDetalle(check.id)}
                      className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-sky-300 hover:text-sky-200 cursor-pointer"
                    >
                      <ChevronDown
                        size={12}
                        className={`transition-transform ${detalleAbierto[check.id] ? 'rotate-180' : ''}`}
                      />
                      {detalleAbierto[check.id] ? 'Ocultar solución' : 'Ver solución'}
                    </button>
                  )}

                  {check.sugerencia && detalleAbierto[check.id] && (
                    <div className="mt-1.5 space-y-2">
                      <p className="text-[11px] leading-relaxed text-slate-200 bg-slate-950/60 border border-slate-800 rounded-xl px-2.5 py-2 whitespace-pre-line">
                        {check.sugerencia}
                      </p>
                      {(check.id === 'permiso_red_local' || check.id === 'conexion') && check.estado !== 'ok' && (
                        <button
                          type="button"
                          onClick={async () => {
                            await solicitarPermisoRedLocal()
                            void ejecutar()
                          }}
                          className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black px-3 py-1.5 rounded-xl transition-transform active:scale-95 cursor-pointer"
                        >
                          <ShieldCheck size={13} />
                          Solicitar permiso al navegador
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {feedback && (
            <div
              className={`flex items-start gap-2 p-3 rounded-xl border text-[11px] font-bold ${
                feedback.tipo === 'ok'
                  ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-900/50 text-rose-300'
              }`}
            >
              {feedback.tipo === 'ok' ? (
                <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              )}
              <span>{feedback.texto}</span>
            </div>
          )}

          {resultado && !resultado.ok && (
            <p className="text-[10px] text-slate-500 leading-relaxed pt-1">
              Si el problema persiste, reinstalá el agente con{' '}
              <code className="font-mono text-slate-400">agente-impresion/Instalar-AgenteImpresion.ps1</code>{' '}
              (conserva el token y el puerto) y volvé a ejecutar este diagnóstico.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 shrink-0 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={copiarInforme}
            disabled={checks.length === 0}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white px-3 py-2.5 rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <ClipboardCopy size={14} />
            Copiar informe
          </button>
          <button
            type="button"
            onClick={imprimirPrueba}
            disabled={probando || ejecutando}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white px-3 py-2.5 rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-40 cursor-pointer"
          >
            {probando ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
            Imprimir prueba
          </button>
          <button
            type="button"
            onClick={() => void ejecutar()}
            disabled={ejecutando}
            className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl transition-colors active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {ejecutando ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {ejecutando ? 'Diagnosticando…' : 'Reintentar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

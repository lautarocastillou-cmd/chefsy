'use client'

// ─────────────────────────────────────────────────────
// components/impresion/ActualizadorAgente.tsx
// Muestra la versión del agente local contra la publicada en
// /agente/version.json y dispara la autoactualización.
// El agente descarga desde su origen fijo y verifica SHA-256.
// ─────────────────────────────────────────────────────

import React, { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowUpCircle,
  CheckCircle2,
  DownloadCloud,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { EVENTO_CONFIG_IMPRESORA, gestorImpresora } from '@/lib/impresion/impresoraTermica'
import {
  compararVersiones,
  ManifiestoAgente,
  obtenerManifiestoAgente,
} from '@/lib/impresion/actualizacionAgente'

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export default function ActualizadorAgente() {
  const [versionActual, setVersionActual] = useState<string | null>(null)
  const [origen, setOrigen] = useState<string | null>(null)
  const [manifiesto, setManifiesto] = useState<ManifiestoAgente | null>(null)
  const [errorRedLocal, setErrorRedLocal] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [confirmando, setConfirmando] = useState(false)
  const [actualizando, setActualizando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error' | 'info'; texto: string } | null>(null)

  const cargar = useCallback(async () => {
    if (!gestorImpresora.tieneAgenteConfigurado()) {
      setVersionActual(null)
      setManifiesto(null)
      setCargando(false)
      return
    }

    setCargando(true)
    const [salud, remoto] = await Promise.all([
      gestorImpresora.obtenerEstadoAgente(),
      obtenerManifiestoAgente(),
    ])

    setVersionActual(
      salud.ok && typeof salud.datos?.version === 'string' ? salud.datos.version : null
    )
    setOrigen(
      salud.ok && typeof salud.datos?.origenActualizacion === 'string'
        ? salud.datos.origenActualizacion
        : null
    )
    setErrorRedLocal(Boolean((salud as any).bloqueadoPorRedLocal))
    setManifiesto(remoto)
    setCargando(false)
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  useEffect(() => {
    const alCambiarConfig = () => {
      void cargar()
    }
    window.addEventListener(EVENTO_CONFIG_IMPRESORA, alCambiarConfig)
    return () => window.removeEventListener(EVENTO_CONFIG_IMPRESORA, alCambiarConfig)
  }, [cargar])

  const actualizar = async () => {
    if (!manifiesto) return

    setConfirmando(false)
    setActualizando(true)
    setMensaje({ tipo: 'info', texto: 'Descargando y verificando la actualización…' })

    try {
      const resultado = await gestorImpresora.actualizarAgente(manifiesto.version)

      if (!resultado.ok) {
        if (resultado.status === 404) {
          setMensaje({
            tipo: 'error',
            texto:
              'Esta versión del agente no soporta actualización web. Instalá la v1.3.0 una vez con Instalar-AgenteImpresion.ps1; desde ahí se actualiza sola.',
          })
        } else {
          setMensaje({
            tipo: 'error',
            texto: resultado.error || 'No se pudo iniciar la actualización.',
          })
        }
        return
      }

      setMensaje({ tipo: 'info', texto: 'Agente reiniciando…' })

      for (let intento = 0; intento < 30; intento++) {
        await esperar(1000)
        const salud = await gestorImpresora.obtenerEstadoAgente()
        if (salud.ok && salud.datos?.version === manifiesto.version) {
          setVersionActual(manifiesto.version)
          setMensaje({ tipo: 'ok', texto: `Agente actualizado a v${manifiesto.version}.` })
          void cargar()
          return
        }
      }

      setMensaje({
        tipo: 'error',
        texto:
          'La actualización se envió pero el agente no respondió con la versión nueva. Revisá agent.log o restaurá ChefsyPrintAgent.exe.bak.',
      })
    } finally {
      setActualizando(false)
    }
  }

  if (!gestorImpresora.tieneAgenteConfigurado()) return null

  const hayActualizacion =
    Boolean(manifiesto && versionActual) &&
    compararVersiones(manifiesto!.version, versionActual!) > 0

  return (
    <div
      id="actualizador-agente"
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-3 space-y-2"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <DownloadCloud size={12} />
          Actualizaciones
        </span>
        <button
          type="button"
          onClick={() => void cargar()}
          disabled={cargando || actualizando}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 cursor-pointer"
          aria-label="Buscar actualizaciones"
          title="Buscar actualizaciones"
        >
          {cargando ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
        </button>
      </div>

      {cargando ? (
        <p className="text-[11px] text-slate-400">Consultando versión del agente…</p>
      ) : !versionActual ? (
        <p className="text-[11px] text-amber-600 dark:text-amber-400">
          {errorRedLocal
            ? 'El navegador bloqueó la consulta de versión (permiso de red local requerido en chefsy.xyz).'
            : 'No se pudo leer la versión del agente. Revisá URL, token o el permiso de red local en el navegador.'}
        </p>
      ) : hayActualizacion && manifiesto ? (
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <ArrowUpCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                v{manifiesto.version} disponible (tenés v{versionActual})
              </p>
              {manifiesto.notas && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                  {manifiesto.notas}
                </p>
              )}
            </div>
          </div>

          {confirmando ? (
            <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-2.5 space-y-2">
              <p className="text-[10px] text-amber-800 dark:text-amber-300 leading-snug">
                Se descarga desde {origen || 'el origen configurado'}, se verifica con SHA-256 y el
                agente se reinicia (~10 s). No se pierde la configuración.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void actualizar()}
                  className="bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-extrabold px-3 py-1.5 rounded-lg transition-colors active:scale-95 cursor-pointer"
                >
                  Actualizar ahora
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmando(false)}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 px-2 py-1.5 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              disabled={actualizando}
              className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-[11px] font-extrabold px-3 py-2 rounded-lg transition-colors active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <ArrowUpCircle size={13} />
              Actualizar a v{manifiesto.version}
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={13} />
          <span>
            Agente al día{manifiesto ? ` · v${manifiesto.version}` : versionActual ? ` · v${versionActual}` : ''}
          </span>
        </div>
      )}

      {actualizando && (
        <div className="flex items-center gap-1.5 text-[11px] text-sky-600 dark:text-sky-400">
          <Loader2 size={13} className="animate-spin" />
          <span>Aplicando actualización… no cierres esta pestaña.</span>
        </div>
      )}

      {mensaje && (
        <div
          className={`flex items-start gap-1.5 text-[10px] font-bold leading-snug ${
            mensaje.tipo === 'ok'
              ? 'text-emerald-600 dark:text-emerald-400'
              : mensaje.tipo === 'error'
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-sky-600 dark:text-sky-400'
          }`}
        >
          {mensaje.tipo === 'ok' ? (
            <CheckCircle2 size={12} className="shrink-0 mt-0.5" />
          ) : mensaje.tipo === 'error' ? (
            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
          ) : (
            <Loader2 size={12} className="shrink-0 mt-0.5 animate-spin" />
          )}
          <span>{mensaje.texto}</span>
        </div>
      )}

      <p className="flex items-center gap-1 text-[9px] text-slate-400 dark:text-slate-500">
        <ShieldCheck size={10} />
        Origen fijo + SHA-256 + backup automático.
      </p>
    </div>
  )
}

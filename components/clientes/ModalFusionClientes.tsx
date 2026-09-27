'use client'

import React, { useState, useEffect } from 'react'
import {
  X,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Phone,
  MapPin,
  ShoppingBag,
  Loader2,
  EyeOff,
  RotateCcw
} from 'lucide-react'
import { GrupoDuplicado } from '@/lib/motor-clientes'
import { formatearTelefonoArgentino } from '@/lib/motor-clientes'
import { notificarExito, notificarError } from '@/lib/notificaciones'

interface PropsModalFusionClientes {
  isOpen: boolean
  onClose: () => void
  grupos: GrupoDuplicado[]
  onFusionCompletada: () => void
  onOmitir?: (grupo: GrupoDuplicado) => void
  totalOmitidos?: number
  onRestablecerOmitidos?: () => void
}

export default function ModalFusionClientes({
  isOpen,
  onClose,
  grupos,
  onFusionCompletada,
  onOmitir,
  totalOmitidos = 0,
  onRestablecerOmitidos
}: PropsModalFusionClientes) {
  const [grupoSeleccionadoIdx, setGrupoSeleccionadoIdx] = useState(0)
  const [nombreElegido, setNombreElegido] = useState<string>('')
  const [telefonoElegido, setTelefonoElegido] = useState<string>('')
  const [direccionElegida, setDireccionElegida] = useState<string>('')
  const [procesando, setProcesando] = useState(false)

  // Mantener el índice dentro de los límites válidos
  const safeIdx = Math.min(grupoSeleccionadoIdx, Math.max(0, grupos.length - 1))
  const grupoActual = grupos[safeIdx]

  // Sincronizar selección de campos por defecto al cambiar de grupo o lista
  useEffect(() => {
    if (grupoActual && grupoActual.clientes.length > 0) {
      const ordenados = [...grupoActual.clientes].sort((a, b) => b.totalPedidos - a.totalPedidos)
      const principal = ordenados[0]
      setNombreElegido(principal.nombre)
      setTelefonoElegido(principal.telefono || '')
      setDireccionElegida(principal.direccion || '')
    } else {
      setNombreElegido('')
      setTelefonoElegido('')
      setDireccionElegida('')
    }
  }, [safeIdx, grupoActual])

  if (!isOpen) return null

  const inicializarSeleccion = (idx: number) => {
    setGrupoSeleccionadoIdx(idx)
    const g = grupos[idx]
    if (g && g.clientes.length > 0) {
      const ordenados = [...g.clientes].sort((a, b) => b.totalPedidos - a.totalPedidos)
      const principal = ordenados[0]
      setNombreElegido(principal.nombre)
      setTelefonoElegido(principal.telefono || '')
      setDireccionElegida(principal.direccion || '')
    }
  }

  const manejarOmitir = () => {
    if (!grupoActual) return
    onOmitir?.(grupoActual)
    notificarExito('Caso omitido: se considerarán personas distintas.')

    if (grupoSeleccionadoIdx >= grupos.length - 1) {
      setGrupoSeleccionadoIdx(Math.max(0, grupos.length - 2))
    }
  }

  const ejecutarFusion = async () => {
    if (!grupoActual || !nombreElegido) return
    setProcesando(true)

    try {
      const secundarios = grupoActual.clientes
        .filter(c => c.nombre.trim().toLowerCase() !== nombreElegido.trim().toLowerCase())
        .map(c => c.nombre)

      const telefonosSecundarios = grupoActual.clientes
        .filter(c => c.telefono && c.telefono !== telefonoElegido)
        .map(c => c.telefono)

      const res = await fetch('/api/admin/clientes-fusion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombrePrincipal: nombreElegido,
          telefonoPrincipal: telefonoElegido,
          direccionPrincipal: direccionElegida,
          nombresSecundarios: secundarios,
          telefonosSecundarios: telefonosSecundarios,
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error al fusionar clientes')
      }

      notificarExito(data.mensaje || '¡Clientes fusionados con éxito!')
      onFusionCompletada()

      if (grupos.length > 1) {
        if (grupoSeleccionadoIdx >= grupos.length - 1) {
          setGrupoSeleccionadoIdx(Math.max(0, grupos.length - 2))
        }
      } else {
        onClose()
      }
    } catch (err: any) {
      console.error('[ModalFusion] Error:', err)
      notificarError(err.message || 'No se pudo completar la fusión')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Detección Inteligente de Duplicados
              </h2>
              <p className="text-xs text-slate-400">
                {grupos.length > 0
                  ? `El motor encontró ${grupos.length} ${grupos.length === 1 ? 'grupo' : 'grupos'} con probabilidad de ser la misma persona`
                  : 'Revisión de duplicados completada'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {totalOmitidos > 0 && onRestablecerOmitidos && (
              <button
                type="button"
                onClick={() => {
                  onRestablecerOmitidos()
                  notificarExito('Casos omitidos restablecidos para revisión.')
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Volver a analizar clientes que marcaste como omitidos"
              >
                <RotateCcw size={11} />
                <span>{totalOmitidos} omitidos</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Selector de Grupos si hay más de 1 */}
        {grupos.length > 1 && (
          <div className="flex gap-2 px-6 pt-3 pb-2 overflow-x-auto border-b border-slate-100 dark:border-slate-800 shrink-0">
            {grupos.map((g, idx) => (
              <button
                key={g.idGrupo}
                type="button"
                onClick={() => inicializarSeleccion(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  idx === safeIdx
                    ? 'bg-chefsy-500 text-slate-950 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Caso #{idx + 1}: {g.clientes[0]?.nombre || 'Cliente'} ({g.confianza}% match)
              </button>
            ))}
          </div>
        )}

        {/* Contenido del Caso */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {grupoActual ? (
            <>
              {/* Banner de Motivo y Acción Rápida de Omitir */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs gap-3">
                <div className="flex items-center gap-2 font-medium min-w-0">
                  <AlertTriangle size={16} className="shrink-0 text-amber-500" />
                  <span className="truncate">
                    {grupoActual.motivo === 'mismo_telefono'
                      ? 'Mismo número telefónico detectado con variaciones de nombre.'
                      : 'Nombres similares o idénticos detectados (mismo nombre o sin teléfono).'}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-black px-2 py-0.5 rounded-lg bg-amber-500/20">
                    {grupoActual.confianza}% Match
                  </span>
                  <button
                    type="button"
                    onClick={manejarOmitir}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 transition-colors cursor-pointer"
                    title="No son la misma persona: omitir caso"
                  >
                    <EyeOff size={12} />
                    <span>Omitir</span>
                  </button>
                </div>
              </div>

              {/* Selector de Datos Principales */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                  Seleccioná los datos canónicos que prevalecerán:
                </h4>

                <div className="space-y-3">
                  {grupoActual.clientes.map((c, i) => {
                    const esSeleccionado = nombreElegido === c.nombre
                    return (
                      <div
                        key={`${c.nombre}-${i}`}
                        onClick={() => {
                          setNombreElegido(c.nombre)
                          if (c.telefono) setTelefonoElegido(c.telefono)
                          if (c.direccion) setDireccionElegida(c.direccion)
                        }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                          esSeleccionado
                            ? 'bg-chefsy-50/50 dark:bg-chefsy-950/20 border-chefsy-400 dark:border-chefsy-800 shadow-sm'
                            : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                              esSeleccionado
                                ? 'border-chefsy-500 bg-chefsy-500 text-slate-950'
                                : 'border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {esSeleccionado && <div className="w-2 h-2 rounded-full bg-slate-950" />}
                          </div>

                          <div className="min-w-0">
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-100 block">
                              {c.nombre}
                            </span>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
                              <span className="flex items-center gap-1 font-mono">
                                <Phone size={12} className="text-slate-400" />
                                {formatearTelefonoArgentino(c.telefono)}
                              </span>
                              {c.direccion && (
                                <span className="flex items-center gap-1 truncate max-w-xs">
                                  <MapPin size={12} className="text-slate-400 shrink-0" />
                                  {c.direccion}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="inline-flex items-center gap-1 font-bold text-xs bg-slate-200/60 dark:bg-slate-700/60 px-2 py-0.5 rounded-lg text-slate-700 dark:text-slate-300">
                            <ShoppingBag size={12} /> {c.totalPedidos} {c.totalPedidos === 1 ? 'pedido' : 'pedidos'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Resumen del Resultado */}
              <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 text-xs space-y-1.5 border border-slate-200/60 dark:border-slate-700/60">
                <span className="font-bold text-slate-700 dark:text-slate-200 block">
                  Al confirmar la fusión:
                </span>
                <p className="text-slate-500 dark:text-slate-400">
                  • Todos los pedidos anteriores se reasignarán a: <strong>{nombreElegido}</strong>.
                </p>
                <p className="text-slate-500 dark:text-slate-400">
                  • El historial de compras, estadísticas y puntos de fidelidad se sumarán en una única ficha de cliente.
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-slate-400 space-y-4">
              <CheckCircle size={44} className="mx-auto text-emerald-500 opacity-90" />
              <div>
                <p className="font-bold text-base text-slate-700 dark:text-slate-200">¡Agenda al día!</p>
                <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">
                  No hay sugerencias de duplicados pendientes para revisar.
                </p>
                {totalOmitidos > 0 && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
                    Has marcado {totalOmitidos} {totalOmitidos === 1 ? 'caso' : 'casos'} como omitidos (se tratan como personas distintas).
                  </p>
                )}
              </div>

              {totalOmitidos > 0 && onRestablecerOmitidos && (
                <button
                  type="button"
                  onClick={() => {
                    onRestablecerOmitidos()
                    notificarExito('Casos omitidos restablecidos para revisión.')
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-950/60 transition-colors cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Volver a revisar casos omitidos</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {grupoActual ? (
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
              >
                Cerrar
              </button>

              <button
                type="button"
                onClick={manejarOmitir}
                disabled={procesando}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-700/70 hover:bg-slate-300 dark:hover:bg-slate-600 transition-all cursor-pointer disabled:opacity-50"
                title="Marcar como personas distintas y no volver a sugerir este grupo"
              >
                <EyeOff size={14} className="text-slate-500 dark:text-slate-400" />
                <span>Omitir (Son distintos)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={ejecutarFusion}
              disabled={procesando || !nombreElegido}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-chefsy-500 hover:bg-chefsy-400 active:scale-95 text-slate-950 font-bold text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {procesando ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Unificando pedidos...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={14} />
                  <span>Unificar en "{nombreElegido}"</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

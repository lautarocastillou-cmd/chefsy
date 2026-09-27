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
  RotateCcw,
  Crown,
  CheckSquare,
  Square
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
  const [clientePrincipalIdx, setClientePrincipalIdx] = useState<number>(0)
  const [indicesAFusionar, setIndicesAFusionar] = useState<Set<number>>(new Set())
  const [nombreElegido, setNombreElegido] = useState<string>('')
  const [telefonoElegido, setTelefonoElegido] = useState<string>('')
  const [direccionElegida, setDireccionElegida] = useState<string>('')
  const [procesando, setProcesando] = useState(false)

  // Mantener el índice dentro de los límites válidos
  const safeIdx = Math.min(grupoSeleccionadoIdx, Math.max(0, grupos.length - 1))
  const grupoActual = grupos[safeIdx]

  // Inicializar o sincronizar el caso actual
  useEffect(() => {
    if (grupoActual && Array.isArray(grupoActual.clientes) && grupoActual.clientes.length > 0) {
      // Por defecto, la ficha con más pedidos es la principal
      let mejorIdx = 0
      let maxPedidos = -1
      grupoActual.clientes.forEach((c, idx) => {
        if ((c.totalPedidos || 0) > maxPedidos) {
          maxPedidos = c.totalPedidos || 0
          mejorIdx = idx
        }
      })

      setClientePrincipalIdx(mejorIdx)

      // Todas las demás fichas quedan preseleccionadas para fusionarse
      const secSet = new Set<number>()
      grupoActual.clientes.forEach((_, idx) => {
        if (idx !== mejorIdx) secSet.add(idx)
      })
      setIndicesAFusionar(secSet)

      const principal = grupoActual.clientes[mejorIdx]
      setNombreElegido(principal?.nombre || '')

      // Buscar el mejor teléfono disponible (del principal o del grupo)
      const telValido = (principal?.telefono && principal.telefono !== 'Sin especificar')
        ? principal.telefono
        : (grupoActual.clientes.find(c => c.telefono && c.telefono !== 'Sin especificar')?.telefono || '')
      setTelefonoElegido(telValido)

      // Buscar la mejor dirección disponible
      const dirValida = (principal?.direccion && principal.direccion !== 'Retiro / Consumo Local')
        ? principal.direccion
        : (grupoActual.clientes.find(c => c.direccion && c.direccion !== 'Retiro / Consumo Local')?.direccion || '')
      setDireccionElegida(dirValida)
    } else {
      setClientePrincipalIdx(0)
      setIndicesAFusionar(new Set())
      setNombreElegido('')
      setTelefonoElegido('')
      setDireccionElegida('')
    }
  }, [safeIdx, grupoActual])

  if (!isOpen) return null

  // Cambiar qué ficha es la Principal oficial
  const elegirComoPrincipal = (idx: number) => {
    if (!grupoActual) return
    setClientePrincipalIdx(idx)

    // El nuevo principal no se fusiona consigo mismo; el anterior principal pasa a fusionarse
    const nuevoSet = new Set(indicesAFusionar)
    nuevoSet.delete(idx)
    nuevoSet.add(clientePrincipalIdx)
    setIndicesAFusionar(nuevoSet)

    const nuevoPrincipal = grupoActual.clientes[idx]
    if (nuevoPrincipal) {
      setNombreElegido(nuevoPrincipal.nombre)
      if (nuevoPrincipal.telefono && nuevoPrincipal.telefono !== 'Sin especificar') {
        setTelefonoElegido(nuevoPrincipal.telefono)
      }
      if (nuevoPrincipal.direccion && nuevoPrincipal.direccion !== 'Retiro / Consumo Local') {
        setDireccionElegida(nuevoPrincipal.direccion)
      }
    }
  }

  // Marcar/Desmarcar si una ficha secundaria se unifica o no
  const toggleFusionarSecundario = (idx: number) => {
    if (idx === clientePrincipalIdx) return
    const nuevoSet = new Set(indicesAFusionar)
    if (nuevoSet.has(idx)) {
      nuevoSet.delete(idx)
    } else {
      nuevoSet.add(idx)
    }
    setIndicesAFusionar(nuevoSet)
  }

  const manejarOmitir = () => {
    if (!grupoActual) return
    onOmitir?.(grupoActual)
    notificarExito('Caso omitido: se considerarán clientes distintos.')

    if (grupoSeleccionadoIdx >= grupos.length - 1) {
      setGrupoSeleccionadoIdx(Math.max(0, grupos.length - 2))
    }
  }

  const ejecutarFusion = async () => {
    if (!grupoActual || !nombreElegido) return

    const secundarios = Array.from(indicesAFusionar)
      .map(idx => grupoActual.clientes[idx])
      .filter(Boolean)

    if (secundarios.length === 0) {
      notificarError('Marcá al menos una ficha secundaria para unificar con la principal.')
      return
    }

    setProcesando(true)

    try {
      const res = await fetch('/api/admin/clientes-fusion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombrePrincipal: nombreElegido.trim(),
          telefonoPrincipal: telefonoElegido.trim(),
          direccionPrincipal: direccionElegida.trim(),
          clientesSecundarios: secundarios.map(s => ({
            nombre: s.nombre,
            telefono: s.telefono || ''
          }))
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

  const cantidadSecundariosSeleccionados = indicesAFusionar.size

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Unificación Inteligente de Clientes
              </h2>
              <p className="text-xs text-slate-400">
                {grupos.length > 0
                  ? `Se detectaron ${grupos.length} ${grupos.length === 1 ? 'caso' : 'casos'} de clientes duplicados o semejantes`
                  : 'Revisión de duplicados al día'}
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

        {/* Pestañas de Casos si hay más de 1 */}
        {grupos.length > 1 && (
          <div className="flex gap-2 px-6 pt-3 pb-2 overflow-x-auto border-b border-slate-100 dark:border-slate-800 shrink-0">
            {grupos.map((g, idx) => (
              <button
                key={g.idGrupo || `grupo_${idx}`}
                type="button"
                onClick={() => setGrupoSeleccionadoIdx(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  idx === safeIdx
                    ? 'bg-chefsy-500 text-slate-950 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Caso #{idx + 1}: {g.clientes[0]?.nombre || 'Cliente'} ({g.clientes.length} fichas)
              </button>
            ))}
          </div>
        )}

        {/* Cuerpo del Modal */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {grupoActual ? (
            <>
              {/* Banner de Diagnóstico del Caso */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs gap-3">
                <div className="flex items-center gap-2 font-medium min-w-0">
                  <AlertTriangle size={16} className="shrink-0 text-amber-500" />
                  <span className="truncate">
                    {grupoActual.motivo === 'mismo_telefono'
                      ? 'Mismo número de celular anotado con diferentes variaciones de nombre.'
                      : 'Nombres iguales o muy semejantes detectados (mismo nombre o sin teléfono).'}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-black px-2 py-0.5 rounded-lg bg-amber-500/20">
                    {grupoActual.confianza}% Coincidencia
                  </span>
                  <button
                    type="button"
                    onClick={manejarOmitir}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 transition-colors cursor-pointer"
                    title="No unificar: omitir este caso y considerarlos clientes distintos"
                  >
                    <EyeOff size={12} />
                    <span>Omitir caso</span>
                  </button>
                </div>
              </div>

              {/* Lista de Fichas del Caso */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Fichas detectadas en este grupo:
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Elegí cuál es la <strong>Ficha Principal</strong>
                  </span>
                </div>

                <div className="space-y-3">
                  {grupoActual.clientes.map((c, i) => {
                    const esPrincipal = clientePrincipalIdx === i
                    const seFusiona = indicesAFusionar.has(i)

                    return (
                      <div
                        key={`cliente_ficha_${i}`}
                        className={`p-4 rounded-2xl border transition-all ${
                          esPrincipal
                            ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-400 dark:border-amber-700 shadow-xs ring-1 ring-amber-400/50'
                            : seFusiona
                            ? 'bg-blue-50/30 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800'
                            : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            {/* Selector de Principal o Checkbox de Fusión */}
                            {esPrincipal ? (
                              <div
                                className="w-6 h-6 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 mt-0.5 shadow-xs"
                                title="Ficha Principal (Oficial)"
                              >
                                <Crown size={14} className="stroke-[2.5]" />
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => toggleFusionarSecundario(i)}
                                className="w-6 h-6 rounded-xl flex items-center justify-center shrink-0 mt-0.5 text-blue-600 dark:text-blue-400 cursor-pointer"
                                title={seFusiona ? 'Desmarcar fusión' : 'Marcar para fusionar'}
                              >
                                {seFusiona ? <CheckSquare size={20} /> : <Square size={20} className="text-slate-400" />}
                              </button>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                  {c.nombre}
                                </span>
                                {esPrincipal ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                                    <Crown size={10} /> Principal
                                  </span>
                                ) : seFusiona ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300">
                                    Se unificará
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                                    Se conservará separada
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-1 font-mono">
                                  <Phone size={12} className="text-slate-400" />
                                  {c.telefono && c.telefono !== 'Sin especificar'
                                    ? formatearTelefonoArgentino(c.telefono)
                                    : 'Sin teléfono'}
                                </span>
                                {c.direccion && c.direccion !== 'Retiro / Consumo Local' && (
                                  <span className="flex items-center gap-1 truncate max-w-xs" title={c.direccion}>
                                    <MapPin size={12} className="text-slate-400 shrink-0" />
                                    {c.direccion}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Estadísticas de la ficha y botón de hacer principal */}
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <span className="inline-flex items-center gap-1 font-bold text-xs bg-slate-200/60 dark:bg-slate-700/60 px-2 py-0.5 rounded-lg text-slate-700 dark:text-slate-300">
                              <ShoppingBag size={12} /> {c.totalPedidos} {c.totalPedidos === 1 ? 'ped.' : 'peds.'}
                            </span>
                            {!esPrincipal && (
                              <button
                                type="button"
                                onClick={() => elegirComoPrincipal(i)}
                                className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                              >
                                Hacer Principal
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Datos Oficiales que Prevalecerán */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Datos finales de la ficha unificada:
                  </h4>
                  <span className="text-[10px] text-slate-400">Podés modificarlos si deseás</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Nombre Oficial
                    </label>
                    <input
                      type="text"
                      value={nombreElegido}
                      onChange={(e) => setNombreElegido(e.target.value)}
                      placeholder="Nombre del cliente"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-chefsy/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Celular Oficial
                    </label>
                    <input
                      type="text"
                      value={telefonoElegido}
                      onChange={(e) => setTelefonoElegido(e.target.value)}
                      placeholder="Ej: 3834112233"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-chefsy/50"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Dirección Frecuente Oficial
                    </label>
                    <input
                      type="text"
                      value={direccionElegida}
                      onChange={(e) => setDireccionElegida(e.target.value)}
                      placeholder="Ej: Calle Principal 123"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-chefsy/50"
                    />
                  </div>
                </div>

                <div className="pt-1 text-[11px] text-slate-400 space-y-0.5">
                  <p>• Los pedidos de las fichas marcadas se reasignarán a <strong>{nombreElegido || 'la ficha oficial'}</strong>.</p>
                  <p>• Los puntos de fidelidad y estadísticas de consumo se sumarán en una sola cuenta.</p>
                </div>
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
                    Tenés {totalOmitidos} {totalOmitidos === 1 ? 'caso omitido' : 'casos omitidos'} (tratados como clientes distintos).
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
              disabled={procesando || !nombreElegido || cantidadSecundariosSeleccionados === 0}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-chefsy-500 hover:bg-chefsy-400 active:scale-95 text-slate-950 font-bold text-xs transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {procesando ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Unificando pedidos...</span>
                </>
              ) : cantidadSecundariosSeleccionados === 0 ? (
                <span>Seleccioná al menos 1 ficha</span>
              ) : (
                <>
                  <CheckCircle size={14} />
                  <span>
                    Unificar {cantidadSecundariosSeleccionados} {cantidadSecundariosSeleccionados === 1 ? 'ficha' : 'fichas'} en "{nombreElegido}"
                  </span>
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

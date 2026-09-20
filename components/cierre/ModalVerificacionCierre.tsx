'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  X,
  Check,
  CheckCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Smartphone,
  Banknote,
  CreditCard,
  Wallet,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Clock,
  Bike,
  Store,
  UtensilsCrossed,
  Layers,
  HelpCircle
} from 'lucide-react'
import { Pedido } from '@/tipos'
import { formatearPrecio, cn } from '@/lib/utils'

export interface ModalVerificacionCierreProps {
  abierto: boolean
  onCerrar: () => void
  pedidos: Pedido[]
  cajaInicial: number
  onFinalizarTurno: () => Promise<void>
  cambiarMetodoPago: (id: string, metodoPago: string) => void
  marcarPagoConfirmado: (id: string, confirmado: boolean) => void
}

type TabVerificacion = 'transferencias' | 'paso_a_paso' | 'arqueo'

export default function ModalVerificacionCierre({
  abierto,
  onCerrar,
  pedidos,
  cajaInicial,
  onFinalizarTurno,
  cambiarMetodoPago,
  marcarPagoConfirmado,
}: ModalVerificacionCierreProps) {
  const [tabActiva, setTabActiva] = useState<TabVerificacion>('transferencias')
  
  // Paso a paso
  const [indiceActual, setIndiceActual] = useState(0)
  const [soloPendientesPasoAPaso, setSoloPendientesPasoAPaso] = useState(false)

  // Arqueo físico
  const [efectivoContadoInput, setEfectivoContadoInput] = useState<string>('')
  const [finalizando, setFinalizando] = useState(false)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)

  // Pedidos válidos (no cancelados)
  const pedidosValidos = useMemo(() => {
    return pedidos.filter((p) => p.estado !== 'cancelado')
  }, [pedidos])

  // Transferencias
  const transferencias = useMemo(() => {
    return pedidosValidos.filter((p) => p.metodoPago === 'transferencia')
  }, [pedidosValidos])

  const transferenciasPendientes = useMemo(() => {
    return transferencias.filter((p) => !p.pago_confirmado)
  }, [transferencias])

  const transferenciasConfirmadas = useMemo(() => {
    return transferencias.filter((p) => p.pago_confirmado)
  }, [transferencias])

  // Cálculos de totales
  const totalEfectivo = useMemo(() => {
    return pedidosValidos.reduce((acc, p) => {
      if (p.metodoPago === 'efectivo') return acc + p.total
      if (p.metodoPago === 'mixto') return acc + (p.montoEfectivo || 0)
      return acc
    }, 0)
  }, [pedidosValidos])

  const totalTransferencia = useMemo(() => {
    return pedidosValidos.reduce((acc, p) => {
      if (p.metodoPago === 'transferencia') return acc + p.total
      if (p.metodoPago === 'mixto') return acc + (p.montoTransferencia || 0)
      return acc
    }, 0)
  }, [pedidosValidos])

  const totalTarjeta = useMemo(() => {
    return pedidosValidos.reduce((acc, p) => {
      if (p.metodoPago === 'tarjeta') return acc + p.total
      if (p.metodoPago === 'mixto') return acc + (p.montoTarjeta || 0)
      return acc
    }, 0)
  }, [pedidosValidos])

  const efectivoEsperado = cajaInicial + totalEfectivo

  // Lista para el modo Paso a Paso
  const pedidosPasoAPaso = useMemo(() => {
    if (!soloPendientesPasoAPaso) return pedidosValidos
    return pedidosValidos.filter((p) => {
      if (p.metodoPago === 'transferencia' && !p.pago_confirmado) return true
      return false
    })
  }, [pedidosValidos, soloPendientesPasoAPaso])

  // Asegurar índice válido si la lista cambia
  useEffect(() => {
    if (indiceActual >= pedidosPasoAPaso.length && pedidosPasoAPaso.length > 0) {
      setIndiceActual(pedidosPasoAPaso.length - 1)
    }
  }, [pedidosPasoAPaso.length, indiceActual])

  const pedidoActual = pedidosPasoAPaso[indiceActual] ?? null

  // Smart Discrepancy Matching (Arqueo)
  const efectivoContadoNum = Number(efectivoContadoInput)
  const tieneInputValido = efectivoContadoInput.trim() !== '' && !isNaN(efectivoContadoNum) && efectivoContadoNum >= 0
  const diferenciaEfectivo = tieneInputValido ? efectivoContadoNum - efectivoEsperado : 0

  // Búsqueda inteligente de discrepancias
  const sugerenciasDiscrepancia = useMemo(() => {
    if (!tieneInputValido || Math.abs(diferenciaEfectivo) < 1) return []

    const diffAbs = Math.abs(diferenciaEfectivo)

    if (diferenciaEfectivo < 0) {
      // Falta efectivo en caja: buscar pedidos marcados como EFECTIVO que sumen o sean iguales al faltante
      // Es decir: "Capaz este pedido figura como Efectivo pero en realidad te lo transfirieron"
      const coincidenciasDirectas = pedidosValidos
        .filter((p) => (p.metodoPago === 'efectivo' && Math.abs(p.total - diffAbs) < 50))
        .map((p) => ({
          pedido: p,
          tipo: 'cambiar_a_transferencia' as const,
          razon: `El pedido de ${p.cliente} por ${formatearPrecio(p.total)} figura como Efectivo. Si pagó por Transferencia, cambiarlo cuadrará la caja.`,
        }))

      return coincidenciasDirectas
    } else {
      // Sobra efectivo en caja: buscar pedidos marcados como TRANSFERENCIA que sumen o sean iguales al sobrante
      // Es decir: "Capaz este pedido figura como Transferencia pero en realidad te lo pagaron en billetes"
      const coincidenciasDirectas = pedidosValidos
        .filter((p) => (p.metodoPago === 'transferencia' && Math.abs(p.total - diffAbs) < 50))
        .map((p) => ({
          pedido: p,
          tipo: 'cambiar_a_efectivo' as const,
          razon: `El pedido de ${p.cliente} por ${formatearPrecio(p.total)} figura como Transferencia. Si pagó en Efectivo en mano, cambiarlo cuadrará la caja.`,
        }))

      return coincidenciasDirectas
    }
  }, [tieneInputValido, diferenciaEfectivo, pedidosValidos])

  // Navegación con teclado en modo paso a paso
  const avanzarPaso = useCallback(() => {
    if (indiceActual < pedidosPasoAPaso.length - 1) {
      setIndiceActual((prev) => prev + 1)
    }
  }, [indiceActual, pedidosPasoAPaso.length])

  const retrocederPaso = useCallback(() => {
    if (indiceActual > 0) {
      setIndiceActual((prev) => prev - 1)
    }
  }, [indiceActual])

  useEffect(() => {
    if (!abierto || tabActiva !== 'paso_a_paso') return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault()
        avanzarPaso()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        retrocederPaso()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [abierto, tabActiva, avanzarPaso, retrocederPaso])

  // Marcar todas las transferencias como confirmadas
  const validarTodasLasTransferencias = () => {
    transferenciasPendientes.forEach((p) => {
      marcarPagoConfirmado(p.id, true)
    })
    setMensajeExito('Todas las transferencias fueron validadas correctamente.')
    setTimeout(() => setMensajeExito(null), 3000)
  }

  // Ejecutar cierre final
  const ejecutarCierreFormal = async () => {
    setFinalizando(true)
    try {
      await onFinalizarTurno()
      onCerrar()
    } finally {
      setFinalizando(false)
    }
  }

  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1f1f1f] border border-slate-200 dark:border-[#333] w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-150 dark:border-[#2d2d2d] shrink-0 bg-slate-50/70 dark:bg-[#252525]/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-500/20">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">
                  Asistente de Cierre y Verificación
                </h3>
                {transferenciasPendientes.length === 0 ? (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 size={11} /> Transferencias OK
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <AlertTriangle size={11} /> {transferenciasPendientes.length} pendientes
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {pedidosValidos.length} pedidos en este turno • Total facturado: <strong className="text-slate-700 dark:text-slate-200">{formatearPrecio(totalEfectivo + totalTransferencia + totalTarjeta)}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onCerrar}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#2c2c2c] hover:bg-slate-200 dark:hover:bg-[#383838] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Mensaje temporal de éxito */}
        {mensajeExito && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800/40 px-6 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center justify-between animate-in fade-in">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={14} /> {mensajeExito}
            </span>
          </div>
        )}

        {/* Pestañas de Navegación del Asistente */}
        <div className="flex border-b border-slate-150 dark:border-[#2d2d2d] bg-slate-50/40 dark:bg-[#1e1e1e] px-4 sm:px-6 pt-2 shrink-0 gap-2 overflow-x-auto">
          <button
            onClick={() => setTabActiva('transferencias')}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-xs font-black rounded-t-xl transition-all cursor-pointer border-b-2",
              tabActiva === 'transferencias'
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-[#1f1f1f] shadow-sm"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            <Smartphone size={15} />
            <span>1. Transferencias</span>
            {transferenciasPendientes.length > 0 && (
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-500 text-white leading-tight">
                {transferenciasPendientes.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setTabActiva('paso_a_paso')}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-xs font-black rounded-t-xl transition-all cursor-pointer border-b-2",
              tabActiva === 'paso_a_paso'
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-[#1f1f1f] shadow-sm"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            <Layers size={15} />
            <span>2. Modo Paso a Paso</span>
          </button>

          <button
            onClick={() => setTabActiva('arqueo')}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-xs font-black rounded-t-xl transition-all cursor-pointer border-b-2",
              tabActiva === 'arqueo'
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-[#1f1f1f] shadow-sm"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            <Banknote size={15} />
            <span>3. Arqueo y Cuadre de Caja</span>
            {tieneInputValido && Math.abs(diferenciaEfectivo) > 0 && (
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-rose-500 text-white leading-tight">
                Dif
              </span>
            )}
          </button>
        </div>

        {/* Contenido según la Pestaña Activa */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">

          {/* ══════════════════════════════════════════════════════════════════
              PESTAÑA 1: CONCILIACIÓN DE TRANSFERENCIAS
             ══════════════════════════════════════════════════════════════════ */}
          {tabActiva === 'transferencias' && (
            <div className="space-y-4">
              
              {/* Tarjetas de Resumen Rápido de Transferencias */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 dark:bg-[#252525] border border-slate-200 dark:border-[#333] p-3.5 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Total Transferencias</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-lg font-black text-slate-800 dark:text-slate-100">{formatearPrecio(totalTransferencia)}</span>
                    <span className="text-xs font-bold text-slate-500">{transferencias.length} pedidos</span>
                  </div>
                </div>

                <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 p-3.5 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider block">Acreditadas en Banco</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {formatearPrecio(transferenciasConfirmadas.reduce((a, p) => a + p.total, 0))}
                    </span>
                    <span className="text-xs font-bold text-emerald-600/80">{transferenciasConfirmadas.length} confirmadas</span>
                  </div>
                </div>

                <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 p-3.5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 tracking-wider block">Pendientes de Impacto</span>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                        {formatearPrecio(transferenciasPendientes.reduce((a, p) => a + p.total, 0))}
                      </span>
                      <span className="text-xs font-bold text-amber-600/80">{transferenciasPendientes.length} pendientes</span>
                    </div>
                  </div>
                  {transferenciasPendientes.length > 0 && (
                    <button
                      type="button"
                      onClick={validarTodasLasTransferencias}
                      className="mt-2 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCheck size={13} /> Validar todas como acreditadas
                    </button>
                  )}
                </div>
              </div>

              {/* Listado de Transferencias */}
              {transferencias.length === 0 ? (
                <div className="bg-slate-50 dark:bg-[#252525] border border-dashed border-slate-200 dark:border-[#3a3a3a] rounded-2xl p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-[#333] text-slate-400 flex items-center justify-center mx-auto mb-2">
                    <Smartphone size={22} />
                  </div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No hay pedidos registrados por Transferencia</p>
                  <p className="text-xs text-slate-400 mt-1">Todos los pedidos del turno fueron abonados en efectivo o tarjeta.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-bold">
                    <span>Pedido y Cliente</span>
                    <span className="pr-2">Acción de Verificación</span>
                  </div>

                  <div className="space-y-2">
                    {transferencias.map((p) => (
                      <div
                        key={p.id}
                        className={cn(
                          "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all",
                          p.pago_confirmado
                            ? "bg-white dark:bg-[#232323] border-slate-200 dark:border-[#333]"
                            : "bg-amber-50/30 dark:bg-amber-950/15 border-amber-300/60 dark:border-amber-700/40 shadow-sm"
                        )}
                      >
                        {/* Info pedido */}
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                            p.pago_confirmado
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                          )}>
                            {p.pago_confirmado ? <Check size={18} /> : <Clock size={18} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                                {p.cliente}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                #{p.id.slice(-4).toUpperCase()}
                              </span>
                              {p.tipoEntrega === 'delivery' && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#333] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <Bike size={10} /> {p.cadete_nombre || 'Sin cadete'}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {p.hora ? `${p.hora} hs` : ''} • {p.productos?.map((pr) => `${pr.cantidad}x ${pr.nombre}`).join(', ')}
                            </p>
                          </div>
                        </div>

                        {/* Monto y Botones Rápidos de Conversión */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-[#2d2d2d]">
                          <span className="text-base font-black text-slate-800 dark:text-slate-100">
                            {formatearPrecio(p.total)}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {/* Toggle ¿Impactó? */}
                            <button
                              type="button"
                              onClick={() => marcarPagoConfirmado(p.id, !p.pago_confirmado)}
                              className={cn(
                                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                                p.pago_confirmado
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                  : "bg-slate-200 dark:bg-[#333] text-slate-700 dark:text-slate-300 hover:bg-emerald-500 hover:text-white"
                              )}
                              title={p.pago_confirmado ? "Marcar como pendiente" : "Confirmar acreditación bancaria"}
                            >
                              {p.pago_confirmado ? (
                                <>
                                  <CheckCircle2 size={13} /> Acreditada
                                </>
                              ) : (
                                <>
                                  <Check size={13} /> ¿Impactó?
                                </>
                              )}
                            </button>

                            {/* Botón rápido: "Fue Efectivo" */}
                            <button
                              type="button"
                              onClick={() => {
                                cambiarMetodoPago(p.id, 'efectivo')
                                setMensajeExito(`El pedido de ${p.cliente} se cambió a Efectivo en mano.`)
                                setTimeout(() => setMensajeExito(null), 3000)
                              }}
                              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-[#2c2c2c] hover:bg-emerald-500 hover:text-white text-slate-600 dark:text-slate-300 transition-all border border-slate-200 dark:border-[#383838] cursor-pointer flex items-center gap-1"
                              title="Cambiar este pedido a Efectivo si el cliente o cadete cobró billetes"
                            >
                              <Banknote size={14} />
                              <span>Fue Efectivo</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              PESTAÑA 2: MODO PASO A PASO (CARDS INTERACTIVAS)
             ══════════════════════════════════════════════════════════════════ */}
          {tabActiva === 'paso_a_paso' && (
            <div className="space-y-4 max-w-2xl mx-auto">
              
              {/* Barra de progreso y filtro superior */}
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-bold">
                  Pedido {pedidosPasoAPaso.length > 0 ? indiceActual + 1 : 0} de {pedidosPasoAPaso.length}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setSoloPendientesPasoAPaso(!soloPendientesPasoAPaso)
                    setIndiceActual(0)
                  }}
                  className={cn(
                    "text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer",
                    soloPendientesPasoAPaso
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                      : "bg-slate-100 dark:bg-[#282828] text-slate-500 border-slate-200 dark:border-[#333]"
                  )}
                >
                  {soloPendientesPasoAPaso ? 'Mostrando: Solo pendientes' : 'Mostrando: Todos los pedidos'}
                </button>
              </div>

              {/* Barra de progreso visual */}
              <div className="w-full bg-slate-100 dark:bg-[#2c2c2c] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{
                    width: pedidosPasoAPaso.length > 0 ? `${((indiceActual + 1) / pedidosPasoAPaso.length) * 100}%` : '0%',
                  }}
                />
              </div>

              {/* Tarjeta interactiva del pedido actual */}
              {pedidoActual ? (
                <div className="bg-slate-50/80 dark:bg-[#252525] border border-slate-200/80 dark:border-[#383838] rounded-3xl p-5 sm:p-7 shadow-sm space-y-6 animate-in fade-in zoom-in-95 duration-150">
                  
                  {/* Encabezado del Pedido */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xl font-black text-slate-800 dark:text-slate-100">
                          {pedidoActual.cliente}
                        </h4>
                        <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-200 dark:bg-[#333] text-slate-600 dark:text-slate-400 font-bold">
                          #{pedidoActual.id.slice(-4).toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                        <Clock size={13} /> {pedidoActual.hora || 'Sin hora'}
                        {pedidoActual.telefono && ` • Tel: ${pedidoActual.telefono}`}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Total</span>
                      <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {formatearPrecio(pedidoActual.total)}
                      </span>
                    </div>
                  </div>

                  {/* Modalidad de Entrega */}
                  <div className="flex items-center gap-2 bg-white dark:bg-[#1e1e1e] p-3 rounded-2xl border border-slate-200/60 dark:border-[#333] text-xs">
                    {pedidoActual.tipoEntrega === 'delivery' ? (
                      <>
                        <Bike className="text-emerald-500" size={16} />
                        <span className="font-bold text-slate-700 dark:text-slate-200">Delivery:</span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {pedidoActual.cadete_nombre || 'Sin cadete asignado'}
                        </span>
                        {pedidoActual.direccion && (
                          <span className="text-slate-400 truncate max-w-[200px] ml-auto">
                            {pedidoActual.direccion}
                          </span>
                        )}
                      </>
                    ) : pedidoActual.tipoEntrega === 'retiro' ? (
                      <>
                        <Store className="text-indigo-500" size={16} />
                        <span className="font-bold text-slate-700 dark:text-slate-200">Retiro por el local</span>
                      </>
                    ) : (
                      <>
                        <UtensilsCrossed className="text-amber-500" size={16} />
                        <span className="font-bold text-slate-700 dark:text-slate-200">Consumo en salón</span>
                      </>
                    )}
                  </div>

                  {/* Detalle de Productos */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Productos del Pedido
                    </span>
                    <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-3.5 border border-slate-200/60 dark:border-[#333] space-y-1.5 max-h-36 overflow-y-auto">
                      {pedidoActual.productos?.map((pr, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="text-slate-700 dark:text-slate-200 font-medium">
                            <strong className="text-emerald-600 dark:text-emerald-400 mr-1.5">{pr.cantidad}x</strong>
                            {pr.nombre}
                          </span>
                          <span className="text-slate-400 font-mono">
                            {formatearPrecio(pr.precio * pr.cantidad)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Selector Táctil Grande de Método de Pago */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Método de Pago Registrado
                    </span>

                    <div className="grid grid-cols-3 gap-2.5">
                      {/* Botón Efectivo */}
                      <button
                        type="button"
                        onClick={() => cambiarMetodoPago(pedidoActual.id, 'efectivo')}
                        className={cn(
                          "py-3.5 px-3 rounded-2xl font-black text-xs sm:text-sm flex flex-col items-center justify-center gap-1.5 border transition-all cursor-pointer",
                          pedidoActual.metodoPago === 'efectivo'
                            ? "bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/20 scale-[1.02]"
                            : "bg-white dark:bg-[#1e1e1e] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#333] hover:border-emerald-500"
                        )}
                      >
                        <Banknote size={20} />
                        <span>Efectivo</span>
                      </button>

                      {/* Botón Transferencia */}
                      <button
                        type="button"
                        onClick={() => cambiarMetodoPago(pedidoActual.id, 'transferencia')}
                        className={cn(
                          "py-3.5 px-3 rounded-2xl font-black text-xs sm:text-sm flex flex-col items-center justify-center gap-1.5 border transition-all cursor-pointer",
                          pedidoActual.metodoPago === 'transferencia'
                            ? "bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-600/20 scale-[1.02]"
                            : "bg-white dark:bg-[#1e1e1e] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#333] hover:border-indigo-500"
                        )}
                      >
                        <Smartphone size={20} />
                        <span>Transferencia</span>
                      </button>

                      {/* Botón Tarjeta */}
                      <button
                        type="button"
                        onClick={() => cambiarMetodoPago(pedidoActual.id, 'tarjeta')}
                        className={cn(
                          "py-3.5 px-3 rounded-2xl font-black text-xs sm:text-sm flex flex-col items-center justify-center gap-1.5 border transition-all cursor-pointer",
                          pedidoActual.metodoPago === 'tarjeta'
                            ? "bg-sky-600 text-white border-sky-700 shadow-md shadow-sky-600/20 scale-[1.02]"
                            : "bg-white dark:bg-[#1e1e1e] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#333] hover:border-sky-500"
                        )}
                      >
                        <CreditCard size={20} />
                        <span>Tarjeta</span>
                      </button>
                    </div>

                    {/* Sub-control de Impacto si es Transferencia */}
                    {pedidoActual.metodoPago === 'transferencia' && (
                      <div className="mt-3 flex items-center justify-between bg-indigo-50/50 dark:bg-indigo-950/25 border border-indigo-200 dark:border-indigo-800/40 p-3 rounded-2xl animate-in fade-in">
                        <div className="flex items-center gap-2">
                          <HelpCircle size={16} className="text-indigo-600 dark:text-indigo-400" />
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            ¿Impactó en Mercado Pago o Banco?
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => marcarPagoConfirmado(pedidoActual.id, !pedidoActual.pago_confirmado)}
                          className={cn(
                            "px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1",
                            pedidoActual.pago_confirmado
                              ? "bg-emerald-500 text-white shadow-sm"
                              : "bg-slate-200 dark:bg-[#333] text-slate-600 dark:text-slate-300 hover:bg-emerald-500 hover:text-white"
                          )}
                        >
                          {pedidoActual.pago_confirmado ? (
                            <>
                              <Check size={13} />
                              <span>Sí, Impactó</span>
                            </>
                          ) : (
                            <span>Pendiente</span>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Botones de Navegación */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-[#333]">
                    <button
                      type="button"
                      onClick={retrocederPaso}
                      disabled={indiceActual === 0}
                      className="px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-200 dark:bg-[#333] text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-[#444] disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ChevronLeft size={16} /> Anterior
                    </button>

                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      Tip: Usá las flechas <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-[#333] rounded text-[10px]">←</kbd> y <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-[#333] rounded text-[10px]">→</kbd>
                    </span>

                    <button
                      type="button"
                      onClick={avanzarPaso}
                      disabled={indiceActual === pedidosPasoAPaso.length - 1}
                      className="px-5 py-2.5 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      Confirmar y Siguiente <ChevronRight size={16} />
                    </button>
                  </div>

                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-[#252525] border border-dashed border-slate-200 dark:border-[#3a3a3a] rounded-3xl p-8 text-center">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No hay pedidos para revisar con el filtro actual.</p>
                </div>
              )}

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              PESTAÑA 3: ARQUEO DE EFECTIVO Y SMART DISCREPANCY MATCHING
             ══════════════════════════════════════════════════════════════════ */}
          {tabActiva === 'arqueo' && (
            <div className="space-y-5 max-w-2xl mx-auto">

              {/* Input grande de Efectivo en Mano */}
              <div className="bg-slate-50/80 dark:bg-[#252525] border border-slate-200 dark:border-[#333] p-5 sm:p-6 rounded-3xl space-y-3">
                <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                  ¿Cuánto dinero físico contaste en la caja / cajón?
                </label>
                
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={efectivoContadoInput}
                    onChange={(e) => setEfectivoContadoInput(e.target.value)}
                    placeholder="Ingresá el total de billetes contados..."
                    className="w-full pl-10 pr-4 py-3.5 bg-white dark:bg-[#1a1a1a] border border-slate-300 dark:border-[#444] rounded-2xl text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  />
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  El sistema comparará este número contra el efectivo que debería haber según las ventas y la caja inicial.
                </p>
              </div>

              {/* Comparativa Matemática de Caja */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-white dark:bg-[#222] border border-slate-200 dark:border-[#333] p-3 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Caja Inicial</span>
                  <span className="text-sm font-black text-slate-700 dark:text-slate-200 block mt-1">
                    {formatearPrecio(cajaInicial)}
                  </span>
                </div>

                <div className="bg-white dark:bg-[#222] border border-slate-200 dark:border-[#333] p-3 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Ventas Efectivo</span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 block mt-1">
                    +{formatearPrecio(totalEfectivo)}
                  </span>
                </div>

                <div className="bg-white dark:bg-[#222] border border-slate-200 dark:border-[#333] p-3 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Esperado en Caja</span>
                  <span className="text-sm font-black text-slate-800 dark:text-slate-100 block mt-1">
                    {formatearPrecio(efectivoEsperado)}
                  </span>
                </div>

                <div className={cn(
                  "border p-3 rounded-2xl transition-all",
                  !tieneInputValido
                    ? "bg-slate-50 dark:bg-[#222] border-slate-200 dark:border-[#333]"
                    : diferenciaEfectivo === 0
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    : diferenciaEfectivo < 0
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                    : "bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400"
                )}>
                  <span className="text-[10px] uppercase font-bold tracking-wider block opacity-80">
                    Diferencia
                  </span>
                  <span className="text-sm font-black block mt-1">
                    {!tieneInputValido ? '—' : formatearPrecio(diferenciaEfectivo)}
                  </span>
                </div>
              </div>

              {/* Resultado del Cuadre */}
              {tieneInputValido && (
                <div>
                  {diferenciaEfectivo === 0 ? (
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in">
                      <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Check size={20} strokeWidth={3} />
                      </div>
                      <div>
                        <h5 className="text-sm font-black text-emerald-800 dark:text-emerald-200">
                          ¡Caja cuadrada a la perfección!
                        </h5>
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                          El efectivo contado coincide exactamente con lo esperado ($0 de diferencia). Podés finalizar el turno con total tranquilidad.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Banner de Discrepancia */}
                      <div className={cn(
                        "p-4 rounded-2xl border flex items-start gap-3 animate-in fade-in",
                        diferenciaEfectivo < 0
                          ? "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300"
                          : "bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-900/40 text-sky-800 dark:text-sky-300"
                      )}>
                        <AlertTriangle className="shrink-0 mt-0.5" size={20} />
                        <div>
                          <h5 className="text-sm font-black">
                            {diferenciaEfectivo < 0
                              ? `Faltan ${formatearPrecio(Math.abs(diferenciaEfectivo))} en efectivo`
                              : `Sobran ${formatearPrecio(diferenciaEfectivo)} en efectivo`}
                          </h5>
                          <p className="text-xs mt-0.5 opacity-90 leading-relaxed">
                            {diferenciaEfectivo < 0
                              ? 'Es muy probable que algún pedido registrado como Efectivo haya sido pagado por Transferencia bancaria.'
                              : 'Es muy probable que algún pedido registrado como Transferencia haya sido abonado en Efectivo billete.'}
                          </p>
                        </div>
                      </div>

                      {/* Smart Discrepancy Matching: Coincidencias sugeridas */}
                      {sugerenciasDiscrepancia.length > 0 && (
                        <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 p-4 rounded-2xl space-y-3 animate-in fade-in">
                          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                            <Sparkles size={16} />
                            <h6 className="text-xs font-black uppercase tracking-wider">
                              Sugerencia Inteligente de Cuadre
                            </h6>
                          </div>

                          <div className="space-y-2">
                            {sugerenciasDiscrepancia.map((sug) => (
                              <div
                                key={sug.pedido.id}
                                className="bg-white dark:bg-[#1e1e1e] p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                                      {sug.pedido.cliente}
                                    </span>
                                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                                      {formatearPrecio(sug.pedido.total)}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                    {sug.razon}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (sug.tipo === 'cambiar_a_transferencia') {
                                      cambiarMetodoPago(sug.pedido.id, 'transferencia')
                                      setMensajeExito(`Se cambió el pedido de ${sug.pedido.cliente} a Transferencia. ¡Caja cuadrada!`)
                                    } else {
                                      cambiarMetodoPago(sug.pedido.id, 'efectivo')
                                      setMensajeExito(`Se cambió el pedido de ${sug.pedido.cliente} a Efectivo. ¡Caja cuadrada!`)
                                    }
                                    setTimeout(() => setMensajeExito(null), 3000)
                                  }}
                                  className="px-3.5 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 shadow-sm transition-all cursor-pointer flex items-center gap-1.5 justify-center"
                                >
                                  <Sparkles size={14} /> Corregir y Cuadrar Caja
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

        </div>

        {/* Pie de página con Acciones Principales */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-150 dark:border-[#2d2d2d] bg-slate-50/80 dark:bg-[#252525]/80 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span>
              Efectivo en caja: <strong className="text-slate-700 dark:text-slate-200">{formatearPrecio(efectivoEsperado)}</strong>
            </span>
            <span>•</span>
            <span>
              Transferencias: <strong className="text-slate-700 dark:text-slate-200">{formatearPrecio(totalTransferencia)}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onCerrar}
              disabled={finalizando}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#333] transition-colors cursor-pointer"
            >
              Guardar y Seguir Operando
            </button>

            <button
              type="button"
              onClick={ejecutarCierreFormal}
              disabled={finalizando}
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {finalizando ? 'Finalizando...' : 'Confirmar y Finalizar Turno'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

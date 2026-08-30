'use client'

import React, { useState, useEffect } from 'react'
import {
  Printer,
  X,
  CheckCircle2,
  AlertTriangle,
  Usb,
  Bluetooth,
  Scissors,
  Bell,
  Zap,
  Sparkles,
  RefreshCw,
  Sliders,
  DollarSign,
  Loader2,
} from 'lucide-react'
import { gestorImpresora, ConfiguracionImpresora } from '@/lib/impresion/impresoraTermica'

interface PropsModalConfiguracionImpresora {
  abierto: boolean
  onCerrar: () => void
  onImpresionExitosa?: () => void
}

export default function ModalConfiguracionImpresora({
  abierto,
  onCerrar,
}: PropsModalConfiguracionImpresora) {
  const [config, setConfig] = useState<ConfiguracionImpresora>(gestorImpresora.obtenerConfiguracion())
  const [info, setInfo] = useState(gestorImpresora.obtenerInfo())
  const [conectando, setConectando] = useState(false)
  const [probando, setProbando] = useState(false)
  const [mensajeFeedback, setMensajeFeedback] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  useEffect(() => {
    if (abierto) {
      setConfig(gestorImpresora.obtenerConfiguracion())
      setInfo(gestorImpresora.obtenerInfo())
      setMensajeFeedback(null)
    }
  }, [abierto])

  if (!abierto) return null

  const handleConectar = async (tipo: 'usb' | 'serial' | 'hid' | 'bluetooth') => {
    setConectando(true)
    setMensajeFeedback(null)
    try {
      const res = await gestorImpresora.conectar(tipo)
      setInfo(gestorImpresora.obtenerInfo())
      if (res.exito) {
        setMensajeFeedback({ tipo: 'ok', texto: res.mensaje || '¡Impresora conectada exitosamente!' })
      } else {
        setMensajeFeedback({ tipo: 'error', texto: res.mensaje || 'No se pudo conectar la impresora.' })
      }
    } catch (err: any) {
      setMensajeFeedback({ tipo: 'error', texto: err.message || 'Error de conexión.' })
    } finally {
      setConectando(false)
    }
  }

  const handleDesconectar = async () => {
    await gestorImpresora.desconectar()
    setInfo(gestorImpresora.obtenerInfo())
    setMensajeFeedback({ tipo: 'ok', texto: 'Impresora desconectada. Se usará el modo navegador.' })
  }

  const handleGuardarCambio = (cambios: Partial<ConfiguracionImpresora>) => {
    gestorImpresora.guardarConfiguracion(cambios)
    setConfig(gestorImpresora.obtenerConfiguracion())
  }

  const handleImprimirPrueba = async () => {
    setProbando(true)
    setMensajeFeedback(null)
    try {
      await gestorImpresora.imprimirPrueba()
      setMensajeFeedback({ tipo: 'ok', texto: 'Ticket de prueba enviado.' })
    } catch (err: any) {
      setMensajeFeedback({ tipo: 'error', texto: err.message || 'Error al imprimir prueba.' })
    } finally {
      setProbando(false)
    }
  }

  const handleAbrirCajon = async () => {
    if (!info.conectada) {
      setMensajeFeedback({ tipo: 'error', texto: 'Conectá una impresora térmica para enviar el pulso al cajón.' })
      return
    }
    const { EscPosBuilder } = await import('@/lib/impresion/escpos')
    const builder = new EscPosBuilder(config.anchoMm)
    builder.abrirCajon()
    await gestorImpresora.enviarRaw(builder.obtenerBytes())
    setMensajeFeedback({ tipo: 'ok', texto: 'Pulso de apertura enviado al cajón de dinero.' })
  }

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onCerrar}
    >
      <div
        className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-chefsy-500/10 border border-chefsy-500/20 flex items-center justify-center text-chefsy-400">
              <Printer size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">Impresora Térmica (ESC/POS)</h2>
              <p className="text-xs text-slate-400">Impresión instantánea y silenciosa en 1 clic</p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Feedback Alert */}
        {mensajeFeedback && (
          <div
            className={`mx-5 mt-4 p-3 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
              mensajeFeedback.tipo === 'ok'
                ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/60 border-rose-500/30 text-rose-300'
            }`}
          >
            {mensajeFeedback.tipo === 'ok' ? (
              <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle size={16} className="shrink-0 text-rose-400" />
            )}
            <span>{mensajeFeedback.texto}</span>
          </div>
        )}

        {/* Contenido con scroll */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs sm:text-sm">
          
          {/* Estado de Conexión */}
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estado de Conexión</span>
              {info.conectada ? (
                <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold px-2.5 py-1 rounded-xl">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Conectada (Directa)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-slate-800 text-slate-400 border border-slate-700 text-xs font-bold px-2.5 py-1 rounded-xl">
                  <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                  <span>Modo Navegador / Windows</span>
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300">
              {info.conectada
                ? `Dispositivo: ${info.nombre} (${info.tipo.toUpperCase()})`
                : 'Conectá tu impresora térmica para imprimir comandas en 0.1s sin carteles ni demoras:'}
            </p>

            {/* Botones de Conexión */}
            <div className="space-y-2 pt-1">
              {!info.conectada ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleConectar('usb')}
                      disabled={conectando}
                      className="py-3 px-3 bg-chefsy-600 hover:bg-chefsy-500 text-white font-black rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2 text-xs"
                      title="Muestra todos los dispositivos USB conectados a la PC"
                    >
                      {conectando ? <Loader2 size={16} className="animate-spin" /> : <Usb size={16} />}
                      <span>Conectar por USB</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleConectar('serial')}
                      disabled={conectando}
                      className="py-3 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 text-xs border border-slate-700"
                      title="Para impresoras con puerto virtual COM"
                    >
                      <span>📟 Puerto COM / Serie</span>
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleConectar('bluetooth')}
                      disabled={conectando}
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 text-xs border border-slate-800"
                    >
                      <Bluetooth size={15} />
                      <span>Conectar por Bluetooth</span>
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleDesconectar}
                  className="w-full py-2.5 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 font-bold rounded-xl transition-colors cursor-pointer text-xs flex items-center justify-center gap-2"
                >
                  <X size={14} />
                  <span>Desconectar Impresora</span>
                </button>
              )}
            </div>

            {/* Guía para impresoras de Windows */}
            {!info.conectada && (
              <div className="p-2.5 bg-slate-900/80 border border-slate-800/80 rounded-xl text-[11px] text-slate-400 leading-relaxed">
                💡 <strong>Tip para Unnion TP85:</strong> Si tu impresora ya está instalada en Windows, no hace falta vincularla; Chefsy imprimirá automáticamente tus tickets de 80mm usando el controlador de Windows.
              </div>
            )}
          </div>

          {/* Ajustes de Impresión */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders size={14} />
              <span>Ajustes de Impresión</span>
            </h3>

            {/* Ancho del papel */}
            <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between gap-4">
              <div>
                <p className="font-bold text-white text-xs sm:text-sm">Ancho de Papel / Rollo</p>
                <p className="text-[11px] text-slate-400">80mm (48 columnas) o 58mm (32 columnas)</p>
              </div>
              <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => handleGuardarCambio({ anchoMm: 80 })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    config.anchoMm === 80 ? 'bg-chefsy-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  80mm
                </button>
                <button
                  type="button"
                  onClick={() => handleGuardarCambio({ anchoMm: 58 })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    config.anchoMm === 58 ? 'bg-chefsy-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  58mm
                </button>
              </div>
            </div>

            {/* Impresión silenciosa */}
            <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <Zap size={16} />
                </div>
                <div>
                  <p className="font-bold text-white text-xs sm:text-sm">Impresión Silenciosa en 1 Clic</p>
                  <p className="text-[11px] text-slate-400">No abre el diálogo nativo de Windows al imprimir</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.impresionSilenciosaActiva}
                onChange={e => handleGuardarCambio({ impresionSilenciosaActiva: e.target.checked })}
                className="w-5 h-5 accent-chefsy-600 rounded cursor-pointer shrink-0"
              />
            </div>

            {/* Corte de papel */}
            <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <Scissors size={16} />
                </div>
                <div>
                  <p className="font-bold text-white text-xs sm:text-sm">Corte Automático de Papel</p>
                  <p className="text-[11px] text-slate-400">Activa la guillotina al finalizar el ticket</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.cortarPapel}
                onChange={e => handleGuardarCambio({ cortarPapel: e.target.checked })}
                className="w-5 h-5 accent-chefsy-600 rounded cursor-pointer shrink-0"
              />
            </div>

            {/* Alarma en comanda */}
            <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                  <Bell size={16} />
                </div>
                <div>
                  <p className="font-bold text-white text-xs sm:text-sm">Buzzer / Alarma en Cocina</p>
                  <p className="text-[11px] text-slate-400">Pita 2 veces al emitir comanda para avisar a cocineros</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.sonarAlarmaComanda}
                onChange={e => handleGuardarCambio({ sonarAlarmaComanda: e.target.checked })}
                className="w-5 h-5 accent-chefsy-600 rounded cursor-pointer shrink-0"
              />
            </div>

          </div>

          {/* Herramientas Rápidas */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={handleImprimirPrueba}
              disabled={probando}
              className="py-3 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 text-xs border border-slate-700"
            >
              {probando ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              <span>Imprimir Ticket Prueba</span>
            </button>

            <button
              type="button"
              onClick={handleAbrirCajon}
              className="py-3 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 text-xs border border-slate-700"
            >
              <DollarSign size={15} className="text-amber-400" />
              <span>Abrir Cajón</span>
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            type="button"
            onClick={onCerrar}
            className="w-full sm:w-auto px-6 py-2.5 bg-chefsy-600 hover:bg-chefsy-500 text-white font-black rounded-xl transition-all shadow-lg active:scale-95 cursor-pointer text-xs"
          >
            Listo / Cerrar
          </button>
        </div>

      </div>
    </div>
  )
}

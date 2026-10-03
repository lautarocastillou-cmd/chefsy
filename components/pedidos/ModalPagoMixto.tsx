'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Check, Banknote, Smartphone, CreditCard, AlertCircle } from 'lucide-react'
import { formatearPrecio } from '@/lib/utils'

interface PropsModalPagoMixto {
  abierto: boolean
  totalPedido: number
  montosIniciales?: {
    efectivo?: number
    transferencia?: number
    tarjeta?: number
  }
  onGuardar: (montos: { montoEfectivo: number; montoTransferencia: number; montoTarjeta: number }) => void
  onCerrar: () => void
}

export default function ModalPagoMixto({
  abierto,
  totalPedido,
  montosIniciales,
  onGuardar,
  onCerrar,
}: PropsModalPagoMixto) {
  const [efectivo, setEfectivo] = useState<string>(
    montosIniciales?.efectivo ? String(montosIniciales.efectivo) : ''
  )
  const [transferencia, setTransferencia] = useState<string>(
    montosIniciales?.transferencia ? String(montosIniciales.transferencia) : ''
  )
  const [tarjeta, setTarjeta] = useState<string>(
    montosIniciales?.tarjeta ? String(montosIniciales.tarjeta) : ''
  )

  useEffect(() => {
    if (abierto) {
      setEfectivo(montosIniciales?.efectivo ? String(montosIniciales.efectivo) : '')
      setTransferencia(montosIniciales?.transferencia ? String(montosIniciales.transferencia) : '')
      setTarjeta(montosIniciales?.tarjeta ? String(montosIniciales.tarjeta) : '')
    }
  }, [abierto, montosIniciales])

  if (!abierto || typeof document === 'undefined') return null

  const numEfectivo = Math.max(0, Number(efectivo) || 0)
  const numTransferencia = Math.max(0, Number(transferencia) || 0)
  const numTarjeta = Math.max(0, Number(tarjeta) || 0)

  const suma = numEfectivo + numTransferencia + numTarjeta
  const diferencia = totalPedido - suma

  const manejarGuardar = (e: React.FormEvent) => {
    e.preventDefault()
    onGuardar({
      montoEfectivo: numEfectivo,
      montoTransferencia: numTransferencia,
      montoTarjeta: numTarjeta,
    })
  }

  // Atajo rápido: 50% Efectivo + 50% Transferencia
  const asignarMitadYMitad = () => {
    const mitad = Math.round(totalPedido / 2)
    const resto = totalPedido - mitad
    setEfectivo(String(mitad))
    setTransferencia(String(resto))
    setTarjeta('')
  }

  // Atajo rápido: Autocompletar el campo restante con la diferencia
  const autocompletarRestante = (campo: 'efectivo' | 'transferencia' | 'tarjeta') => {
    let acumuladoOtros = 0
    if (campo === 'efectivo') acumuladoOtros = numTransferencia + numTarjeta
    if (campo === 'transferencia') acumuladoOtros = numEfectivo + numTarjeta
    if (campo === 'tarjeta') acumuladoOtros = numEfectivo + numTransferencia

    const faltante = Math.max(0, totalPedido - acumuladoOtros)
    if (campo === 'efectivo') setEfectivo(String(faltante))
    if (campo === 'transferencia') setTransferencia(String(faltante))
    if (campo === 'tarjeta') setTarjeta(String(faltante))
  }

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-[#1f1f1f] border border-slate-200 dark:border-[#333] rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between p-5 border-b border-slate-150 dark:border-[#2d2d2d] bg-slate-50/50 dark:bg-[#181818]">
          <div>
            <h3 className="text-base font-black text-slate-850 dark:text-slate-100 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              Desglose de Pago Mixto
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Total a cubrir: <span className="font-extrabold text-slate-900 dark:text-white font-mono text-sm">{formatearPrecio(totalPedido)}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1.5 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={manejarGuardar} className="p-5 space-y-4">
          {/* Inputs de montos */}
          <div className="space-y-3">
            {/* Efectivo */}
            <div className="bg-slate-50 dark:bg-[#262626] p-3 rounded-2xl border border-slate-200/80 dark:border-[#333]">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <Banknote size={15} /> Efectivo
                </label>
                <button
                  type="button"
                  onClick={() => autocompletarRestante('efectivo')}
                  className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                >
                  Restante
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={efectivo}
                  onChange={(e) => setEfectivo(e.target.value)}
                  placeholder="0"
                  min="0"
                  className="w-full bg-white dark:bg-[#1a1a1a] border border-slate-300 dark:border-[#404040] rounded-xl pl-7 pr-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/50"
                  autoFocus
                />
              </div>
            </div>

            {/* Transferencia */}
            <div className="bg-slate-50 dark:bg-[#262626] p-3 rounded-2xl border border-slate-200/80 dark:border-[#333]">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                  <Smartphone size={15} /> Transferencia
                </label>
                <button
                  type="button"
                  onClick={() => autocompletarRestante('transferencia')}
                  className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                >
                  Restante
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={transferencia}
                  onChange={(e) => setTransferencia(e.target.value)}
                  placeholder="0"
                  min="0"
                  className="w-full bg-white dark:bg-[#1a1a1a] border border-slate-300 dark:border-[#404040] rounded-xl pl-7 pr-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>

            {/* Tarjeta */}
            <div className="bg-slate-50 dark:bg-[#262626] p-3 rounded-2xl border border-slate-200/80 dark:border-[#333]">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                  <CreditCard size={15} /> Tarjeta / Débito
                </label>
                <button
                  type="button"
                  onClick={() => autocompletarRestante('tarjeta')}
                  className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline font-semibold cursor-pointer"
                >
                  Restante
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={tarjeta}
                  onChange={(e) => setTarjeta(e.target.value)}
                  placeholder="0"
                  min="0"
                  className="w-full bg-white dark:bg-[#1a1a1a] border border-slate-300 dark:border-[#404040] rounded-xl pl-7 pr-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-sky-500/50"
                />
              </div>
            </div>
          </div>

          {/* Atajo 50/50 */}
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={asignarMitadYMitad}
              className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
            >
              Dividir 50% Efectivo / 50% Transf.
            </button>
          </div>

          {/* Estado de balance */}
          <div className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 ${
            diferencia === 0
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : diferencia > 0
              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center gap-1.5">
              {diferencia === 0 ? (
                <Check size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle size={16} className="shrink-0" />
              )}
              <span>
                {diferencia === 0
                  ? 'Total cubierto con éxito'
                  : diferencia > 0
                  ? `Faltan ${formatearPrecio(diferencia)} para cubrir el total`
                  : `Supera el total por ${formatearPrecio(Math.abs(diferencia))}`}
              </span>
            </div>
            <span className="font-mono font-bold text-xs">{formatearPrecio(suma)}</span>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCerrar}
              className="flex-1 py-2.5 px-3 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check size={16} />
              Guardar Pago Mixto
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

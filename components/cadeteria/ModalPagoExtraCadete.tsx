'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, DollarSign, Bike, Sparkles, Plus, AlertCircle, Loader2 } from 'lucide-react'
import { CadetePagoExtra } from '@/tipos'
import { formatearPrecio } from '@/lib/utils'
import { obtenerFechaNegocio, detectarTipoTurnoActual } from '@/lib/tiempo'

interface PropsModalPagoExtraCadete {
  abierto: boolean
  onCerrar: () => void
  cadetesDisponibles: Array<{ id: string; nombre: string }>
  cadetePreseleccionadoId?: string | null
  fecha?: string
  turno_tipo?: string
  onGuardado?: (pago: CadetePagoExtra) => void
}

const MOTIVOS_SUGERIDOS = [
  { texto: 'Viaje a la carnicería', icono: '🥩' },
  { texto: 'Compra de insumos / verdulería', icono: '🥬' },
  { texto: 'Retiro de packaging / cajas', icono: '📦' },
  { texto: 'Búsqueda de cambio / banco', icono: '🏦' },
  { texto: 'Propina / Bonificación extra', icono: '⭐' },
  { texto: 'Viaje logístico / Mandado', icono: '🛵' },
]

const MONTOS_SUGERIDOS = [1000, 1500, 2000, 2500, 3000, 4000, 5000]

export default function ModalPagoExtraCadete({
  abierto,
  onCerrar,
  cadetesDisponibles,
  cadetePreseleccionadoId,
  fecha,
  turno_tipo,
  onGuardado,
}: PropsModalPagoExtraCadete) {
  const [montado, setMontado] = useState(false)
  const [cadeteId, setCadeteId] = useState('')
  const [monto, setMonto] = useState('')
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMontado(true)
  }, [])

  useEffect(() => {
    if (abierto) {
      setError(null)
      setMonto('')
      setMotivo('')
      if (cadetePreseleccionadoId) {
        setCadeteId(cadetePreseleccionadoId)
      } else if (cadetesDisponibles.length > 0) {
        setCadeteId(cadetesDisponibles[0].id)
      }
    }
  }, [abierto, cadetePreseleccionadoId, cadetesDisponibles])

  if (!abierto || !montado || typeof document === 'undefined') return null

  const cadeteSeleccionado = cadetesDisponibles.find(c => c.id === cadeteId) || {
    id: cadeteId,
    nombre: cadeteId
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const montoNum = Number(monto)

    if (!cadeteId) {
      setError('Seleccioná un cadete.')
      return
    }
    if (isNaN(montoNum) || montoNum <= 0) {
      setError('Ingresá un monto válido mayor a $0.')
      return
    }
    if (!motivo.trim()) {
      setError('Especificá el motivo del viaje o pago extra.')
      return
    }

    setGuardando(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/cadetes/pagos-extras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cadete_id: cadeteId,
          cadete_nombre: cadeteSeleccionado.nombre,
          monto: montoNum,
          motivo: motivo.trim(),
          fecha: fecha || obtenerFechaNegocio(),
          turno_tipo: turno_tipo || detectarTipoTurnoActual()
        })
      })

      if (!res.ok) {
        const dataErr = await res.json().catch(() => ({}))
        throw new Error(dataErr.error || 'Error al guardar el pago extra')
      }

      const nuevoPago: CadetePagoExtra = await res.json()
      if (onGuardado) {
        onGuardado(nuevoPago)
      }
      onCerrar()
    } catch (err: any) {
      console.error('Error al registrar pago extra:', err)
      setError(err.message || 'Error de conexión.')
    } finally {
      setGuardando(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onCerrar}
    >
      <div
        className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xl shadow-inner">
              🥩
            </div>
            <div>
              <h3 className="font-black text-base text-white leading-tight flex items-center gap-1.5">
                Sumar Dinero / Viaje Extra
              </h3>
              <p className="text-xs text-slate-400">
                Pago de carnicería, insumos o ajuste sin crear pedidos falsos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Selector de Cadete */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Bike size={14} className="text-emerald-400" /> Cadete que recibe el dinero
            </label>
            <select
              value={cadeteId}
              onChange={e => setCadeteId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 text-white rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none transition-colors"
            >
              {cadetesDisponibles.map(c => (
                <option key={c.id} value={c.id}>
                  🛵 {c.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Monto a Pagar */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <DollarSign size={14} className="text-emerald-400" /> Monto a Sumar ($)
              </span>
              {monto && !isNaN(Number(monto)) && (
                <span className="text-emerald-400 font-mono font-bold">
                  {formatearPrecio(Number(monto))}
                </span>
              )}
            </label>
            <input
              type="number"
              min="1"
              step="50"
              placeholder="Ej: 2500"
              value={monto}
              onChange={e => setMonto(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 text-white rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold outline-none transition-colors"
              autoFocus
            />

            {/* Presets de montos */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {MONTOS_SUGERIDOS.map(val => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setMonto(String(val))}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                    monto === String(val)
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  +{formatearPrecio(val)}
                </button>
              ))}
            </div>
          </div>

          {/* Motivo del Pago */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles size={14} className="text-emerald-400" /> Motivo del viaje / gasto
            </label>
            <input
              type="text"
              placeholder="Ej: Viaje a la carnicería Rivadavia"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 text-white rounded-xl px-3.5 py-2.5 text-xs outline-none transition-colors"
            />

            {/* Sugerencias Rápidas */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {MOTIVOS_SUGERIDOS.map(item => (
                <button
                  type="button"
                  key={item.texto}
                  onClick={() => setMotivo(item.texto)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 ${
                    motivo === item.texto
                      ? 'bg-blue-600 text-white border-blue-400 shadow-xs'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span>{item.icono}</span>
                  <span>{item.texto}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onCerrar}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-lg shadow-emerald-950/30 flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {guardando ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Plus size={14} />
                  <span>Sumar {monto && !isNaN(Number(monto)) ? formatearPrecio(Number(monto)) : ''} al Cadete</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

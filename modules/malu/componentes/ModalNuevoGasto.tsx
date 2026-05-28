'use client'

import { useState } from 'react'
import { usarMalu, obtenerFechaNegocioMalu } from '../contexto'

interface Props {
  onCerrar: () => void
}

export default function ModalNuevoGasto({ onCerrar }: Props) {
  const { agregarGasto } = usarMalu()
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(obtenerFechaNegocioMalu())
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!descripcion.trim()) {
      setError('La descripción es obligatoria.')
      return
    }
    const val = parseFloat(monto) || 0
    if (val <= 0) {
      setError('El monto debe ser mayor a 0.')
      return
    }

    setGuardando(true)
    setError('')
    try {
      await agregarGasto({
        descripcion: descripcion.trim(),
        monto: val,
        fecha,
      })
      alert('¡Gasto registrado con éxito!')
      onCerrar()
    } catch (err: any) {
      setError('Error al registrar el gasto.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={e => {
        if (e.target === e.currentTarget) onCerrar()
      }}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-6 space-y-4 animate-[slideIn_0.2s_ease-out]"
        style={{
          background: '#161616',
          border: '1px solid rgba(229, 211, 179, 0.18)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div>
            <h3 className="text-sm font-bold text-neutral-200 font-serif-elegant">Cargar Gasto</h3>
            <p className="text-[10px] text-neutral-400 mt-0.5">Registra una salida de caja del local</p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="text-xs p-1.5 px-2.5 rounded-lg bg-white/5 text-neutral-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Descripción */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-1.5 text-neutral-400 font-semibold">
              Concepto / Descripción *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Luz, Alquiler, Bolsas packaging, Envíos..."
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f5' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(229, 211, 179, 0.4)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
            />
          </div>

          {/* Monto */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-1.5 text-neutral-400 font-semibold">
              Monto ($) *
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              required
              placeholder="0.00"
              value={monto}
              onChange={e => setMonto(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f5' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(229, 211, 179, 0.4)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
            />
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-1.5 text-neutral-400 font-semibold">
              Fecha
            </label>
            <input
              type="date"
              required
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f5', colorScheme: 'dark' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(229, 211, 179, 0.4)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCerrar}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || !descripcion.trim() || !monto}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-neutral-900 transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #E5D3B3, #C9B497)' }}
            >
              {guardando ? 'Guardando...' : 'Cargar Gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

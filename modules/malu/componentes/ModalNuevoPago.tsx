'use client'

import { useState } from 'react'
import { usarMalu, obtenerFechaNegocioMalu } from '../contexto'
import type { MetodoPagoMalu } from '../tipos'

interface Props {
  clientaId: string
  onCerrar: () => void
}

const METODOS: { valor: MetodoPagoMalu; etiqueta: string; emoji: string }[] = [
  { valor: 'efectivo', etiqueta: 'Efectivo', emoji: '💵' },
  { valor: 'transferencia', etiqueta: 'Transferencia', emoji: '📱' },
  { valor: 'otro', etiqueta: 'Otro', emoji: '🔄' },
]

export default function ModalNuevoPago({ clientaId, onCerrar }: Props) {
  const { agregarPago, obtenerResumen } = usarMalu()
  const hoy = obtenerFechaNegocioMalu()
  const [monto, setMonto] = useState('')
  const [metodo, setMetodo] = useState<MetodoPagoMalu>('efectivo')
  const [fecha, setFecha] = useState(hoy)
  const [nota, setNota] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const resumen = obtenerResumen(clientaId)
  const saldoActual = resumen?.saldo ?? 0

  const handleSaldoTotal = () => {
    if (saldoActual > 0) setMonto(String(saldoActual))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const montoNum = parseFloat(monto.replace(',', '.'))
    if (!monto || isNaN(montoNum) || montoNum <= 0) { setError('Ingresá un monto válido.'); return }
    setGuardando(true)
    try {
      await agregarPago({
        clienta_id: clientaId,
        monto: montoNum,
        metodo,
        fecha,
        nota: nota.trim() || null,
      })
      onCerrar()
    } catch {
      setError('Error al guardar. Intentá de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onCerrar() }}
    >
      <div
        className="w-full max-w-md rounded-3xl p-6 animate-[slideIn_0.2s_ease-out]"
        style={{ background: '#161616', border: '1px solid rgba(34,197,94,0.25)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold" style={{ color: '#f5f5f5' }}>Registrar Pago</h3>
            {saldoActual > 0 && (
              <p className="text-xs mt-0.5" style={{ color: 'rgba(34,197,94,0.6)' }}>
                Saldo actual: ${saldoActual.toLocaleString('es-AR')}
              </p>
            )}
          </div>
          <button onClick={onCerrar} className="text-xs p-2 rounded-lg" style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Selector de método */}
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Método de pago</label>
            <div className="flex gap-2">
              {METODOS.map(m => (
                <button
                  key={m.valor}
                  type="button"
                  onClick={() => setMetodo(m.valor)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={
                    metodo === m.valor
                      ? { background: 'rgba(34,197,94,0.2)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.35)' }
                      : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }
                  }
                >
                  {m.emoji} {m.etiqueta}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>Monto $*</label>
                {saldoActual > 0 && (
                  <button
                    type="button"
                    onClick={handleSaldoTotal}
                    className="text-[10px] underline"
                    style={{ color: 'rgba(34,197,94,0.6)' }}
                  >
                    Total deuda
                  </button>
                )}
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                value={monto}
                onChange={e => { setMonto(e.target.value); setError('') }}
                placeholder="0"
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f5' }}
                onFocus={e => { e.target.style.borderColor = 'rgba(34,197,94,0.4)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f5', colorScheme: 'dark' }}
                onFocus={e => { e.target.style.borderColor = 'rgba(34,197,94,0.4)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Nota (opcional)</label>
            <input
              type="text"
              value={nota}
              onChange={e => setNota(e.target.value)}
              placeholder="Ej: Pago parcial, quedó debiendo..."
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f5' }}
              onFocus={e => { e.target.style.borderColor = 'rgba(34,197,94,0.4)' }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
            />
          </div>

          {error && <p className="text-xs text-red-400">⚠ {error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCerrar} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.9), rgba(22,163,74,0.9))', color: '#fff' }}
            >
              {guardando ? 'Guardando...' : 'Registrar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

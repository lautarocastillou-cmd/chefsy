'use client'

import { useState } from 'react'
import { usarMalu, obtenerFechaNegocioMalu } from '../contexto'

interface Props {
  clientaId: string
  onCerrar: () => void
}

function formatearPeso(monto: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(monto)
}

export default function ModalNuevaVenta({ clientaId, onCerrar }: Props) {
  const { agregarVenta } = usarMalu()
  const hoy = obtenerFechaNegocioMalu()
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(hoy)
  const [nota, setNota] = useState('')
  const [esCuotas, setEsCuotas] = useState(false)
  const [cuotas, setCuotas] = useState(3)
  const [dropdownCuotasOpen, setDropdownCuotasOpen] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const montoNum = parseFloat(monto.replace(',', '.'))
    if (!descripcion.trim()) { setError('Describí el artículo.'); return }
    if (!monto || isNaN(montoNum) || montoNum <= 0) { setError('Ingresá un monto válido.'); return }
    setGuardando(true)
    try {
      const notaFinal = esCuotas ? `[Cuotas: ${cuotas} | Pagadas: 0] ${nota.trim()}`.trim() : nota.trim()
      await agregarVenta({
        clienta_id: clientaId,
        descripcion: descripcion.trim(),
        monto: montoNum,
        fecha,
        nota: notaFinal || null,
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
        style={{ background: '#161616', border: '1px solid rgba(239,68,68,0.25)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold" style={{ color: '#f5f5f5' }}>Agregar Deuda</h3>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(239,68,68,0.6)' }}>Registrar venta fiada</p>
          </div>
          <button onClick={onCerrar} className="text-xs p-2 rounded-lg" style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Prenda / Artículo *</label>
            <input
              type="text"
              value={descripcion}
              onChange={e => { setDescripcion(e.target.value); setError('') }}
              placeholder="Ej: Vestido floral azul, Jeans tiro alto..."
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f5' }}
              onFocus={e => { e.target.style.borderColor = 'rgba(239,68,68,0.4)' }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Monto $*</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={monto}
                onChange={e => { setMonto(e.target.value); setError('') }}
                placeholder="0"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f5' }}
                onFocus={e => { e.target.style.borderColor = 'rgba(239,68,68,0.4)' }}
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
                onFocus={e => { e.target.style.borderColor = 'rgba(239,68,68,0.4)' }}
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
              placeholder="Ej: Llevó dos tallas para probar..."
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f5' }}
              onFocus={e => { e.target.style.borderColor = 'rgba(239,68,68,0.4)' }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
            />
          </div>

          {/* Cuotas Checkbox & Select */}
          <div 
            className="flex items-center justify-between gap-4 p-3.5 rounded-2xl bg-white/5"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div 
              onClick={() => setEsCuotas(!esCuotas)}
              className="flex items-center gap-2.5 cursor-pointer select-none text-xs font-semibold text-neutral-300"
            >
              <div 
                className="w-4.5 h-4.5 rounded-lg flex items-center justify-center transition-all border"
                style={{
                  background: esCuotas ? '#ef4444' : 'transparent',
                  borderColor: esCuotas ? '#ef4444' : 'rgba(255,255,255,0.15)',
                }}
              >
                {esCuotas && (
                  <svg className="w-3 h-3 text-[#0a0a0a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span>¿Paga en cuotas?</span>
            </div>
            
            {esCuotas && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownCuotasOpen(!dropdownCuotasOpen)}
                  className="px-3 py-1.5 rounded-xl text-xs outline-none bg-neutral-950 text-neutral-200 border border-white/10 flex items-center justify-between gap-2 min-w-[100px]"
                >
                  <span>{cuotas} cuotas</span>
                  <span className="text-[10px] opacity-60">▼</span>
                </button>
                {dropdownCuotasOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setDropdownCuotasOpen(false)} />
                    <div className="absolute right-0 mt-1.5 w-32 rounded-xl border border-white/10 bg-[#161616]/95 backdrop-blur-md shadow-2xl z-50 overflow-hidden py-1">
                      {[2, 3, 4, 6, 12].map(num => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            setCuotas(num)
                            setDropdownCuotasOpen(false)
                          }}
                          className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-red-500/10 hover:text-red-400 ${cuotas === num ? 'text-red-400 font-semibold bg-red-500/5' : 'text-neutral-300'}`}
                        >
                          {num} cuotas
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {esCuotas && (parseFloat(monto) || 0) > 0 && (
            <div 
              className="text-right text-[11px] text-neutral-400 font-medium p-3 rounded-xl animate-fade-in"
              style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}
            >
              Se registrarán <span className="font-bold text-red-400">{cuotas} cuotas</span> de <span className="font-bold text-red-400">{formatearPeso((parseFloat(monto) || 0) / cuotas)}</span>
            </div>
          )}
          {error && <p className="text-xs text-red-400">⚠ {error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCerrar} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.9), rgba(220,38,38,0.9))', color: '#fff' }}
            >
              {guardando ? 'Guardando...' : 'Registrar Deuda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

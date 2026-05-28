'use client'

import { useState } from 'react'
import { usarMalu } from '../contexto'

interface Props {
  onCerrar: () => void
}

export default function ModalNuevaClienta({ onCerrar }: Props) {
  const { agregarClienta } = usarMalu()
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [talleGeneral, setTalleGeneral] = useState('')
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) { setError('El nombre es obligatorio.'); return }
    setGuardando(true)
    try {
      await agregarClienta({ 
        nombre: nombre.trim(), 
        telefono: telefono.trim() || null, 
        notas: notas.trim() || null,
        fecha_nacimiento: fechaNacimiento || null,
        talle_general: talleGeneral.trim() || null
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
        style={{ background: '#161616', border: '1px solid rgba(229, 211, 179, 0.18)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold font-serif-elegant" style={{ color: '#f5f5f5' }}>Nueva Clienta</h3>
          <button onClick={onCerrar} className="text-xs p-2 rounded-lg" style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {[
            { label: 'Nombre *', value: nombre, setter: setNombre, placeholder: 'Ej: María García', required: true },
            { label: 'Teléfono', value: telefono, setter: setTelefono, placeholder: 'Ej: 3416543210', required: false },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{f.label}</label>
              <input
                type="text"
                value={f.value}
                onChange={e => f.setter(e.target.value)}
                placeholder={f.placeholder}
                required={f.required}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f5' }}
                onFocus={e => { e.target.style.borderColor = 'rgba(229, 211, 179, 0.4)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
              />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Fecha Nacimiento</label>
              <input
                type="date"
                value={fechaNacimiento}
                onChange={e => setFechaNacimiento(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f5', colorScheme: 'dark' }}
                onFocus={e => { e.target.style.borderColor = 'rgba(229, 211, 179, 0.4)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Talle General</label>
              <input
                type="text"
                placeholder="Ej: M, L, 38"
                value={talleGeneral}
                onChange={e => setTalleGeneral(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f5' }}
                onFocus={e => { e.target.style.borderColor = 'rgba(229, 211, 179, 0.4)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Notas (opcional)</label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Ej: Prefiere pagar los viernes..."
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f5' }}
              onFocus={e => { e.target.style.borderColor = 'rgba(229, 211, 179, 0.4)' }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCerrar} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #E5D3B3, #C9B497)', color: '#0a0a0a' }}
            >
              {guardando ? 'Guardando...' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

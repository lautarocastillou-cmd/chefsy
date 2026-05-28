'use client'

// ─────────────────────────────────────────────────────
// modules/malu/componentes/ListaClientas.tsx
// Tabla de clientas con búsqueda, saldo total y acciones.
// ─────────────────────────────────────────────────────

import { useState } from 'react'
import { usarMalu } from '../contexto'
import type { ClientaMalu } from '../tipos'

function formatearPeso(monto: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(monto)
}

function contarCuotasPendientes(clientaId: string, todasLasVentas: any[]): number {
  let pendientes = 0
  const ventasClienta = todasLasVentas.filter(v => v.clienta_id === clientaId)
  for (const v of ventasClienta) {
    if (!v.nota) continue
    const match = v.nota.match(/\[Cuotas:\s*(\d+)\s*\|\s*Pagadas:\s*(\d+)\]/)
    if (match) {
      const total = parseInt(match[1], 10)
      const pagadas = parseInt(match[2], 10)
      if (pagadas < total) {
        pendientes += (total - pagadas)
      }
    }
  }
  return pendientes
}

function BadgeSaldo({ saldo }: { saldo: number }) {
  if (saldo <= 0) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold"
        style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}
      >
        ✓ Al día
      </span>
    )
  }
  if (saldo < 5000) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold"
        style={{ background: 'rgba(234,179,8,0.15)', color: '#eab308', border: '1px solid rgba(234,179,8,0.2)' }}
      >
        ◆ {formatearPeso(saldo)}
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
    >
      ▲ {formatearPeso(saldo)}
    </span>
  )
}

interface Props {
  onVerDetalle: (id: string) => void
  onNuevaClienta: () => void
}

export default function ListaClientas({ onVerDetalle, onNuevaClienta }: Props) {
  const { obtenerClientasConSaldo, cargando, ventas } = usarMalu()
  const [busqueda, setBusqueda] = useState('')

  const clientas = obtenerClientasConSaldo()
  const terminobuscado = busqueda.trim().toLowerCase()
  const filtradas = clientas.filter(c => {
    if (!terminobuscado) return true
    const enNombre = c.nombre.toLowerCase().includes(terminobuscado)
    const enTelefono = c.telefono ? c.telefono.toLowerCase().includes(terminobuscado) : false
    const enNotas = c.notas ? c.notas.toLowerCase().includes(terminobuscado) : false
    return enNombre || enTelefono || enNotas
  })

  const totalDeuda = clientas.reduce((acc, c) => acc + (c.deudaTotal ?? 0), 0)
  const deudoras = clientas.filter(c => (c.deudaTotal ?? 0) > 0).length

  // Alerta de Cumpleaños
  const hoy = new Date()
  const mesHoy = hoy.getMonth() + 1
  const diaHoy = hoy.getDate()

  const cumpleaneras = clientas.filter(c => {
    if (!c.fecha_nacimiento) return false
    const parts = c.fecha_nacimiento.split('-')
    if (parts.length !== 3) return false
    const mes = parseInt(parts[1], 10)
    const dia = parseInt(parts[2], 10)
    return mes === mesHoy && dia === diaHoy
  })

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-24">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'rgba(229,211,179,0.3)', borderTopColor: '#E5D3B3' }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-7">
      {/* Alertas de Cumpleaños */}
      {cumpleaneras.length > 0 && (
        <div className="space-y-2 mb-2">
          {cumpleaneras.map(c => {
            const talleInfo = c.talle_general ? ` (Talle: ${c.talle_general})` : ''
            const template = `¡Hola ${c.nombre}! 💖 Desde Malú Clothing queremos desearte un muy feliz cumpleaños. ¡Que tengas un día increíble! 🎂 Como regalo, tenés un 15% de descuento en tu próxima compra usando el código CUMPLE${c.nombre.split(' ')[0].toUpperCase()} 💕✨`
            
            let link = '#'
            if (c.telefono) {
              let limpio = c.telefono.replace(/\D/g, '')
              if (!limpio.startsWith('54')) {
                if (limpio.startsWith('15')) {
                  limpio = limpio.substring(2)
                }
                limpio = '549' + limpio
              }
              link = `https://wa.me/${limpio}?text=${encodeURIComponent(template)}`
            }

            return (
              <div 
                key={c.id} 
                className="rounded-2xl p-4 flex items-center justify-between gap-3"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(229, 211, 179, 0.08) 0%, rgba(229, 211, 179, 0.02) 100%)', 
                  border: '1px solid rgba(229, 211, 179, 0.25)',
                  boxShadow: '0 4px 15px rgba(229, 211, 179, 0.1)',
                }}
              >
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider mb-0.5 flex items-center gap-1.5 flex-wrap">
                    <span>🎉 ¡Cumple de {c.nombre}!</span>
                    {talleInfo && <span className="text-[10px] text-[#E5D3B3] normal-case font-medium">{talleInfo}</span>}
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    Saludala con un 15% de descuento en su día.
                  </p>
                </div>
                {c.telefono ? (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-neutral-900 transition-all hover:scale-105 shrink-0 flex items-center gap-1"
                    style={{ background: 'linear-gradient(135deg, #E5D3B3, #C9B497)' }}
                  >
                    💬 Saludar
                  </a>
                ) : (
                  <span className="text-[10px] text-neutral-500 shrink-0 italic">Sin teléfono</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Métricas rápidas minimalistas horizontales con bordes finos */}
      <div 
        className="flex items-center justify-between rounded-2xl px-2 py-3 backdrop-blur-md"
        style={{ 
          background: 'rgba(255, 255, 255, 0.01)', 
          border: '1px solid rgba(229, 211, 179, 0.12)',
        }}
      >
        {[
          { label: 'Total Clientas', value: clientas.length.toString(), color: '#E5D3B3' },
          { label: 'Con Saldo Deudor', value: deudoras.toString(), color: '#ef4444' },
          { label: 'Saldo Total Calle', value: formatearPeso(totalDeuda), color: '#ef4444' },
        ].map((m, idx) => (
          <div
            key={m.label}
            className={`flex-1 text-center ${idx < 2 ? 'border-r' : ''}`}
            style={{ borderColor: 'rgba(229, 211, 179, 0.08)' }}
          >
            <p className="text-[9px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {m.label}
            </p>
            <p className="text-sm font-semibold mt-0.5" style={{ color: m.color }}>
              {m.value}
            </p>
          </div>
        ))}
      </div>

      {/* Buscador + Botón Nueva */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            🔍
          </span>
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o notas..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#f5f5f5',
              caretColor: '#E5D3B3',
            }}
            onFocus={e => { e.target.style.borderColor = 'rgba(229,211,179,0.35)' }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)' }}
          />
        </div>
        <button
          onClick={onNuevaClienta}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-95 active:scale-[0.98] whitespace-nowrap"
          style={{
            background: 'linear-gradient(135deg, #E5D3B3, #C9B497)',
            color: '#0a0a0a',
            boxShadow: '0 4px 12px rgba(229,211,179,0.15)',
          }}
        >
          + Nueva Clienta
        </button>
      </div>

      {/* Lista */}
      {filtradas.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'rgba(255,255,255,0.25)' }}>
          {busqueda ? (
            <>
              <p className="text-3xl mb-2">🔍</p>
              <p>No hay resultados para &quot;{busqueda}&quot;</p>
            </>
          ) : (
            <>
              <p className="text-3xl mb-2">👗</p>
              <p className="text-sm">Abril, aún no tenés clientas registradas</p>
              <button
                onClick={onNuevaClienta}
                className="mt-3 text-xs underline"
                style={{ color: '#E5D3B3' }}
              >
                Agregar tu primera clienta
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtradas.map((c, i) => {
            const cuotasPendientes = contarCuotasPendientes(c.id, ventas)
            return (
              <button
                key={c.id}
                onClick={() => onVerDetalle(c.id)}
                className="w-full text-left rounded-2xl px-4 py-3.5 transition-all duration-150 hover:scale-[1.005] active:scale-[0.998] group"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  animationDelay: `${i * 30}ms`,
                  backdropFilter: 'blur(5px)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(229,211,179,0.2)'
                  ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'
                  ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar inicial */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                      style={{
                        background: `rgba(229, 211, 179, ${0.08 + (i % 3) * 0.04})`,
                        color: '#E5D3B3',
                        border: '1px solid rgba(229, 211, 179, 0.15)',
                      }}
                    >
                      {c.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm truncate" style={{ color: '#f5f5f5' }}>
                          {c.nombre}
                        </p>
                        {cuotasPendientes > 0 && (
                          <span 
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0"
                            style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}
                          >
                            ⚠️ {cuotasPendientes} cuotas pend.
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {c.telefono && (
                          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                            {c.telefono}
                          </span>
                        )}
                        {c.ultimaActividad && (
                          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                            · {new Date(c.ultimaActividad).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <BadgeSaldo saldo={c.deudaTotal ?? 0} />
                    <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'rgba(229,211,179,0.6)' }}>
                      Ver →
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { X, CheckCircle2, RotateCcw } from 'lucide-react'

export interface Notificacion {
  id: string
  mensaje: string
  tipo: 'info' | 'success' | 'warning'
  accion?: {
    etiqueta: string
    alHacerClick: () => void
  }
}

export interface ValorContextoTemaNotificacion {
  modoOscuro: boolean
  alternarModoOscuro: () => void
  notificaciones: Notificacion[]
  agregarNotificacion: (
    mensaje: string,
    tipo?: 'info' | 'success' | 'warning',
    accion?: { etiqueta: string; alHacerClick: () => void }
  ) => void
  eliminarNotificacion: (id: string) => void
}

const ContextoTemaNotificacion = createContext<ValorContextoTemaNotificacion | undefined>(undefined)

// Sonidos
export function reproducirSonidoNotificacion() {
  if (typeof window === 'undefined') return
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, start)
      gain.gain.setValueAtTime(0.12, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + duration)
    }
    const t = ctx.currentTime
    playTone(523.25, t, 0.25)
    playTone(659.25, t + 0.08, 0.35)
  } catch (e) {}
}

export function reproducirSonidoCampanaCocina() {
  if (typeof window === 'undefined') return
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const playTone = (freq: number, start: number, duration: number, volume: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, start)
      gain.gain.setValueAtTime(volume, start)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + duration)
    }
    const t = ctx.currentTime
    playTone(1567.98, t, 1.0, 0.15)
    playTone(1975.53, t, 0.8, 0.10)
    playTone(2637.02, t, 0.6, 0.05)
    const t2 = t + 0.12
    playTone(1567.98, t2, 0.8, 0.12)
    playTone(1975.53, t2, 0.6, 0.08)
  } catch (e) {}
}

export function ProveedorTemaNotificacion({ children }: { children: ReactNode }) {
  const [modoOscuro, setModoOscuro] = useState(false)
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])

  // Cargar tema
  useEffect(() => {
    const temaGuardado = localStorage.getItem('chefsy-tema')
    if (temaGuardado === 'dark') {
      setModoOscuro(true)
      document.documentElement.classList.add('dark')
    } else {
      setModoOscuro(false)
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const alternarModoOscuro = () => {
    setModoOscuro((prev) => {
      const nuevo = !prev
      if (nuevo) {
        document.documentElement.classList.add('dark')
        localStorage.setItem('chefsy-tema', 'dark')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('chefsy-tema', 'light')
      }
      return nuevo
    })
  }

  const agregarNotificacion = (
    mensaje: string,
    tipo: 'info' | 'success' | 'warning' = 'success',
    accion?: { etiqueta: string; alHacerClick: () => void }
  ) => {
    const id = Date.now().toString()
    setNotificaciones((prev) => [...prev, { id, mensaje, tipo, accion }])
    setTimeout(() => {
      setNotificaciones((prev) => prev.filter((n) => n.id !== id))
    }, 6000)
  }

  const eliminarNotificacion = (id: string) => {
    setNotificaciones((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <ContextoTemaNotificacion.Provider
      value={{
        modoOscuro,
        alternarModoOscuro,
        notificaciones,
        agregarNotificacion,
        eliminarNotificacion,
      }}
    >
      {children}
      <ContenedorToasts notificaciones={notificaciones} onEliminar={eliminarNotificacion} />
    </ContextoTemaNotificacion.Provider>
  )
}

function ContenedorToasts({
  notificaciones,
  onEliminar,
}: {
  notificaciones: Notificacion[]
  onEliminar: (id: string) => void
}) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full px-4 sm:px-0">
      <style>{`
        @keyframes slideIn { from { transform: translateY(20px) scale(0.95); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
        .toast-animate { animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
      {notificaciones.map((n) => (
        <div
          key={n.id}
          className="toast-animate bg-white border border-slate-100 shadow-2xl rounded-2xl p-4 flex items-start gap-3 relative overflow-hidden"
          style={{
            borderLeft:
              n.tipo === 'success'
                ? '4px solid #10B981'
                : n.tipo === 'warning'
                ? '4px solid #F59E0B'
                : '4px solid #3B82F6',
          }}
        >
          <div className="text-green-500 shrink-0 mt-0.5">
            {n.tipo === 'success' ? (
              <CheckCircle2 size={18} className="text-green-500" />
            ) : (
              <CheckCircle2 size={18} className="text-blue-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Sistema de Pedidos
            </p>
            <p className="text-sm font-semibold text-slate-800 leading-snug mt-1">{n.mensaje}</p>
            {n.accion && (
              <button
                onClick={() => {
                  n.accion?.alHacerClick()
                  onEliminar(n.id)
                }}
                className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded transition-colors shadow-sm"
              >
                <RotateCcw size={10} /> {n.accion.etiqueta}
              </button>
            )}
          </div>
          <button
            onClick={() => onEliminar(n.id)}
            className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

export function usarTemaNotificacion(): ValorContextoTemaNotificacion {
  const contexto = useContext(ContextoTemaNotificacion)
  if (!contexto) {
    throw new Error('usarTemaNotificacion debe usarse dentro de un ProveedorTemaNotificacion')
  }
  return contexto
}

'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { X, CheckCircle2, RotateCcw, AlertTriangle, Bell } from 'lucide-react'

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
    setNotificaciones((prev) => {
      // Evitar notificaciones duplicadas idénticas activas en pantalla
      if (prev.some((n) => n.mensaje === mensaje && n.tipo === tipo)) {
        return prev
      }
      const id = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
      setTimeout(() => {
        setNotificaciones((p) => p.filter((n) => n.id !== id))
      }, 6000)
      return [...prev, { id, mensaje, tipo, accion }]
    })
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
    <>
      <style>{`
        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full px-4 sm:px-0">
        {notificaciones.map((n) => {
          const Icono = {
            success: CheckCircle2,
            warning: AlertTriangle,
            info: Bell
          }[n.tipo] || Bell

          const colorTema = {
            success: 'text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500',
            warning: 'text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border-amber-500',
            info: 'text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 border-blue-500',
          }[n.tipo] || 'text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 border-blue-500'

          return (
            <div
              key={n.id}
              className="relative overflow-hidden bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-zinc-800 shadow-[0_10px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.25)] rounded-2xl p-4 flex gap-3.5 items-start transition-all duration-350 transform hover:scale-[1.02] border-l-4"
              style={{
                borderLeftColor: n.tipo === 'success' ? '#10B981' : n.tipo === 'warning' ? '#F59E0B' : '#3B82F6'
              }}
            >
              <div className={`p-2 rounded-xl shrink-0 ${colorTema}`}>
                <Icono size={18} />
              </div>
              
              <div className="flex-1 min-w-0 pr-1 text-left">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {n.tipo === 'success' ? 'Éxito' : n.tipo === 'warning' ? 'Advertencia' : 'Información'}
                </span>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-1 leading-relaxed">
                  {n.mensaje}
                </p>
                {n.accion && (
                  <button
                    onClick={() => {
                      n.accion?.alHacerClick()
                      onEliminar(n.id)
                    }}
                    className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-black text-sky-700 hover:text-sky-800 bg-sky-50 dark:bg-sky-950/30 dark:text-sky-400 hover:bg-sky-100 px-2.5 py-1.5 rounded-lg transition-colors shadow-sm"
                  >
                    <RotateCcw size={10} /> {n.accion.etiqueta}
                  </button>
                )}
              </div>

              <button
                onClick={() => onEliminar(n.id)}
                className="text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 transition-colors p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800/50 shrink-0 -mr-1"
              >
                <X size={14} />
              </button>

              {/* Barra de progreso de autodestrucción */}
              <div 
                className={`absolute bottom-0 left-0 h-[3px] ${
                  n.tipo === 'success' ? 'bg-emerald-500' : n.tipo === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                }`}
                style={{ 
                  animation: 'toast-progress 6000ms linear forwards' 
                }} 
              />
            </div>
          )
        })}
      </div>
    </>
  )
}

export function usarTemaNotificacion(): ValorContextoTemaNotificacion {
  const contexto = useContext(ContextoTemaNotificacion)
  if (!contexto) {
    throw new Error('usarTemaNotificacion debe usarse dentro de un ProveedorTemaNotificacion')
  }
  return contexto
}

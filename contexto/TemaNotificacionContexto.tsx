'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'
import { X, CheckCircle2, AlertTriangle, Bell, Bike } from 'lucide-react'

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
  eliminarTodasNotificaciones: () => void
}

const ContextoTemaNotificacion = createContext<ValorContextoTemaNotificacion | undefined>(undefined)

// ── AudioContext Singleton: Reutilización sin fuga de memoria ni sobrecarga ─

let audioCtxSingleton: AudioContext | null = null

function obtenerAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return null
    if (!audioCtxSingleton || audioCtxSingleton.state === 'closed') {
      audioCtxSingleton = new AudioContextClass()
    }
    if (audioCtxSingleton.state === 'suspended') {
      audioCtxSingleton.resume().catch(() => {})
    }
    return audioCtxSingleton
  } catch {
    return null
  }
}

export function reproducirSonidoNotificacion() {
  const ctx = obtenerAudioContext()
  if (!ctx) return
  try {
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, start)
      gain.gain.setValueAtTime(0.1, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + duration)
    }
    const t = ctx.currentTime
    playTone(523.25, t, 0.22)
    playTone(659.25, t + 0.07, 0.3)
  } catch {}
}

export function reproducirSonidoCampanaCocina() {
  const ctx = obtenerAudioContext()
  if (!ctx) return
  try {
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
    playTone(1567.98, t, 0.8, 0.14)
    playTone(1975.53, t, 0.6, 0.09)
    playTone(2637.02, t, 0.5, 0.05)
    const t2 = t + 0.11
    playTone(1567.98, t2, 0.6, 0.1)
    playTone(1975.53, t2, 0.5, 0.07)
  } catch {}
}

export function reproducirSonidoEntregaExitosa() {
  const ctx = obtenerAudioContext()
  if (!ctx) return
  try {
    const playTone = (freq: number, start: number, duration: number, volume: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, start)
      gain.gain.setValueAtTime(volume, start)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + duration)
    }
    const t = ctx.currentTime
    playTone(587.33, t, 0.15, 0.15)
    playTone(739.99, t + 0.08, 0.18, 0.16)
    playTone(880.0, t + 0.16, 0.35, 0.18)
  } catch {}
}

// ── Proveedor de Tema y Notificaciones ─────────────────────────────────────

export function ProveedorTemaNotificacion({ children }: { children: ReactNode }) {
  const [modoOscuro, setModoOscuro] = useState(false)
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])

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

  const alternarModoOscuro = useCallback(() => {
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
  }, [])

  const agregarNotificacion = useCallback(
    (
      mensaje: string,
      tipo: 'info' | 'success' | 'warning' = 'success',
      accion?: { etiqueta: string; alHacerClick: () => void }
    ) => {
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted' &&
        document.visibilityState !== 'visible'
      ) {
        try {
          new Notification('Chefsy', {
            body: mensaje.replace(/[🛵🔔💵📍💬]/g, '').trim(),
            icon: '/logo.jpg',
          })
        } catch {}
      }

      setNotificaciones((prev) => {
        if (prev.some((n) => n.mensaje === mensaje && n.tipo === tipo)) {
          return prev
        }
        const id = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
        const nueva: Notificacion = { id, mensaje, tipo, accion }
        // Cola FIFO de máximo 3 en pantalla:
        // Si ya hay 3 o más, descartamos las más viejas para conservar como máximo 3 en total
        const base = prev.length >= 3 ? prev.slice(prev.length - 2) : prev
        return [...base, nueva]
      })
    },
    []
  )

  const eliminarNotificacion = useCallback((id: string) => {
    setNotificaciones((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const eliminarTodasNotificaciones = useCallback(() => {
    setNotificaciones([])
  }, [])

  return (
    <ContextoTemaNotificacion.Provider
      value={{
        modoOscuro,
        alternarModoOscuro,
        notificaciones,
        agregarNotificacion,
        eliminarNotificacion,
        eliminarTodasNotificaciones,
      }}
    >
      {children}
      <ContenedorToasts
        notificaciones={notificaciones}
        onEliminar={eliminarNotificacion}
        onEliminarTodas={eliminarTodasNotificaciones}
      />
    </ContextoTemaNotificacion.Provider>
  )
}

// ── Toast Individual en Formato Píldora Centrada (Ultra limpia y minimalista) ─

function ToastItem({
  notificacion: n,
  onEliminar,
}: {
  notificacion: Notificacion
  onEliminar: (id: string) => void
}) {
  const duracionMs = n.accion ? 4200 : 2600

  const esEntrega = n.mensaje.toLowerCase().includes('entregado') || n.mensaje.includes('🛵')

  const Icono = esEntrega
    ? Bike
    : n.tipo === 'success'
    ? CheckCircle2
    : n.tipo === 'warning'
    ? AlertTriangle
    : Bell

  const iconoEstilo = esEntrega || n.tipo === 'success'
    ? 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40'
    : n.tipo === 'warning'
    ? 'text-amber-400 bg-amber-500/20 border-amber-500/40'
    : 'text-sky-400 bg-sky-500/20 border-sky-500/40'

  useEffect(() => {
    const timer = setTimeout(() => {
      onEliminar(n.id)
    }, duracionMs)
    return () => clearTimeout(timer)
  }, [n.id, duracionMs, onEliminar])

  return (
    <div
      className="flex items-center gap-2.5 bg-[#0f172a]/95 backdrop-blur-md border border-white/20 text-white rounded-full px-4 sm:px-5 py-2 sm:py-2.5 shadow-[0_20px_30px_-5px_rgba(0,0,0,0.8),0_0_15px_0_rgba(0,0,0,0.4)] pointer-events-auto select-none transition-all duration-200 animate-in slide-in-from-bottom-3 fade-in-0 max-w-[92vw]"
    >
      {/* Icono temático circular */}
      <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shrink-0 border ${iconoEstilo}`}>
        <Icono size={13} strokeWidth={2.5} />
      </div>

      {/* Contenido / Mensaje en una línea */}
      <span className="text-xs sm:text-[13.5px] font-semibold text-slate-100 whitespace-nowrap overflow-hidden text-ellipsis max-w-[65vw] sm:max-w-[420px]">
        {n.mensaje}
      </span>

      {/* Botón de acción opcional */}
      {n.accion && (
        <button
          type="button"
          onClick={() => {
            n.accion?.alHacerClick()
            onEliminar(n.id)
          }}
          className="ml-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer shrink-0"
        >
          {n.accion.etiqueta}
        </button>
      )}

      {/* Botón de descarte inmediato */}
      <button
        type="button"
        onClick={() => onEliminar(n.id)}
        className="text-slate-400 hover:text-white transition-colors p-0.5 rounded-full hover:bg-white/10 shrink-0 ml-0.5 cursor-pointer"
        title="Cerrar notificación"
      >
        <X size={13} />
      </button>
    </div>
  )
}

// ── Contenedor de Toasts Centrado Abajo (Máximo 3 en pantalla) ────────────

function ContenedorToasts({
  notificaciones,
  onEliminar,
}: {
  notificaciones: Notificacion[]
  onEliminar: (id: string) => void
  onEliminarTodas: () => void
}) {
  if (notificaciones.length === 0) return null

  return (
    <div className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-[999999] flex flex-col items-center gap-2 pointer-events-none w-auto max-w-[92vw]">
      {notificaciones.map((n) => (
        <ToastItem key={n.id} notificacion={n} onEliminar={onEliminar} />
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

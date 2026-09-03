'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'
import { X, CheckCircle2, RotateCcw, AlertTriangle, Bell, Bike, Trash2 } from 'lucide-react'

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
        return [...prev, { id, mensaje, tipo, accion }]
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

// ── Toast Individual con Animación CSS Nativa en GPU (0 CPU / 0 Re-renders) ─

function ToastItem({
  notificacion: n,
  onEliminar,
}: {
  notificacion: Notificacion
  onEliminar: (id: string) => void
}) {
  const [pausado, setPausado] = useState(false)
  const duracionMs = n.accion ? 4800 : 3800

  const esEntrega = n.mensaje.toLowerCase().includes('entregado') || n.mensaje.includes('🛵')

  const Icono = esEntrega
    ? Bike
    : n.tipo === 'success'
    ? CheckCircle2
    : n.tipo === 'warning'
    ? AlertTriangle
    : Bell

  const badgeEstilo = esEntrega
    ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30'
    : n.tipo === 'success'
    ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30'
    : n.tipo === 'warning'
    ? 'text-amber-400 bg-amber-500/15 border border-amber-500/30'
    : 'text-sky-400 bg-sky-500/15 border border-sky-500/30'

  const barraColor = esEntrega
    ? 'from-emerald-500 to-teal-400'
    : n.tipo === 'success'
    ? 'from-emerald-500 to-emerald-400'
    : n.tipo === 'warning'
    ? 'from-amber-500 to-amber-400'
    : 'from-sky-500 to-sky-400'

  const etiquetaCategoria = esEntrega
    ? 'PEDIDO ENTREGADO'
    : n.tipo === 'success'
    ? 'ÉXITO'
    : n.tipo === 'warning'
    ? 'AVISO'
    : 'NOVEDAD'

  return (
    <div
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      className="relative overflow-hidden bg-[#0f172a] border border-white/10 hover:border-white/20 text-slate-100 rounded-2xl shadow-2xl shadow-black/90 p-3.5 sm:p-4 flex gap-3 items-start pointer-events-auto transition-transform duration-150 transform hover:scale-[1.01] animate-in slide-in-from-right-4 fade-in-0 duration-200 select-none"
    >
      {/* Icono temático */}
      <div className={`p-2 rounded-xl shrink-0 ${badgeEstilo}`}>
        <Icono size={17} strokeWidth={2.2} />
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0 pr-1 text-left">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            {etiquetaCategoria}
          </span>
          {pausado && (
            <span className="text-[9px] text-amber-400/90 font-bold tracking-tight">
              (pausado)
            </span>
          )}
        </div>
        <p className="text-xs sm:text-[13px] font-medium text-slate-100 mt-1 leading-snug">
          {n.mensaje}
        </p>

        {/* Botón de acción opcional */}
        {n.accion && (
          <button
            type="button"
            onClick={() => {
              n.accion?.alHacerClick()
              onEliminar(n.id)
            }}
            className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-white/10 hover:bg-white/20 border border-white/10 px-3 py-1.5 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <RotateCcw size={11} />
            <span>{n.accion.etiqueta}</span>
          </button>
        )}
      </div>

      {/* Botón de descarte inmediato */}
      <button
        type="button"
        onClick={() => onEliminar(n.id)}
        className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 shrink-0 -mr-1 cursor-pointer"
        title="Cerrar notificación"
      >
        <X size={14} />
      </button>

      {/* Barra de progreso en GPU pura (sin renders de React; se elimina al terminar la animación) */}
      <div
        className={`absolute bottom-0 left-0 h-[2.5px] bg-gradient-to-r ${barraColor}`}
        style={{
          width: '100%',
          animation: `toast-progress ${duracionMs}ms linear forwards`,
          animationPlayState: pausado ? 'paused' : 'running',
          willChange: 'transform, width',
        }}
        onAnimationEnd={() => onEliminar(n.id)}
      />
    </div>
  )
}

// ── Contenedor de Toasts a la Derecha con Animaciones a 60/120 FPS ──────────

function ContenedorToasts({
  notificaciones,
  onEliminar,
  onEliminarTodas,
}: {
  notificaciones: Notificacion[]
  onEliminar: (id: string) => void
  onEliminarTodas: () => void
}) {
  return (
    <>
      <style>{`
        @keyframes toast-progress {
          0% { width: 100%; }
          100% { width: 0%; }
        }
      `}</style>
      <div className="fixed bottom-5 right-5 z-[999999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full px-3 sm:px-0 pointer-events-none">
        {/* Botón flotante 'Borrar todas' si hay más de 3 notificaciones */}
        {notificaciones.length > 3 && (
          <div className="flex justify-end pb-0.5 pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-200">
            <button
              type="button"
              onClick={onEliminarTodas}
              className="group flex items-center gap-1.5 bg-[#0f172a] hover:bg-rose-950/90 text-slate-300 hover:text-rose-200 border border-white/15 hover:border-rose-500/50 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-2xl shadow-black/90 transition-all duration-150 cursor-pointer active:scale-95"
              title="Descartar todas las notificaciones activas"
            >
              <Trash2 size={13} className="text-rose-400 group-hover:scale-110 transition-transform" />
              <span>Borrar todas ({notificaciones.length})</span>
            </button>
          </div>
        )}

        {/* Lista de notificaciones con scroll suave si hay muchas */}
        <div className="flex flex-col gap-2.5 max-h-[75vh] overflow-y-auto no-scrollbar pr-0.5">
          {notificaciones.map((n) => (
            <ToastItem key={n.id} notificacion={n} onEliminar={onEliminar} />
          ))}
        </div>
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

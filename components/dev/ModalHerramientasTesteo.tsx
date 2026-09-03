'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Wrench,
  X,
  Minus,
  Maximize2,
  Trash2,
  Bell,
  Bike,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Zap,
  Play,
  Square,
  GripHorizontal,
} from 'lucide-react'
import {
  usarTemaNotificacion,
  reproducirSonidoCampanaCocina,
  reproducirSonidoEntregaExitosa,
  reproducirSonidoNotificacion,
} from '@/contexto/TemaNotificacionContexto'

const NOMBRES_MOCK = [
  'Juan Pérez',
  'María Gómez',
  'Carlos Rodríguez',
  'Lucía Fernández',
  'Martín Díaz',
  'Sofía Morales',
  'Lucas Benítez',
  'Agustina Romero',
  'Esteban Quito',
  'Valentina Castro',
]

const CADETES_MOCK = ['Lucas', 'Matías', 'Franco', 'Braian', 'Nico']

export default function ModalHerramientasTesteo() {
  const {
    notificaciones,
    agregarNotificacion,
    eliminarTodasNotificaciones,
  } = usarTemaNotificacion()

  const [abierto, setAbierto] = useState(false)
  const [minimizado, setMinimizado] = useState(false)
  const [spamActivo, setSpamActivo] = useState(false)

  // Posición flotante con persistencia en localStorage
  const [posicion, setPosicion] = useState<{ x: number; y: number }>({ x: 30, y: 120 })
  const modalRef = useRef<HTMLDivElement>(null)
  const arrastreRef = useRef<{
    arrastrando: boolean
    inicioX: number
    inicioY: number
    posXInicial: number
    posYInicial: number
  }>({
    arrastrando: false,
    inicioX: 0,
    inicioY: 0,
    posXInicial: 0,
    posYInicial: 0,
  })

  // Cargar posición guardada y estado previo
  useEffect(() => {
    try {
      const posGuardada = localStorage.getItem('chefsy_devtools_pos')
      if (posGuardada) {
        const parsed = JSON.parse(posGuardada)
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          // Clamp por si cambió la resolución
          const x = Math.max(10, Math.min(window.innerWidth - 340, parsed.x))
          const y = Math.max(10, Math.min(window.innerHeight - 200, parsed.y))
          setPosicion({ x, y })
        }
      }
      const estadoGuardado = localStorage.getItem('chefsy_devtools_abierto')
      if (estadoGuardado === 'true') {
        setAbierto(true)
      }
    } catch {}
  }, [])

  // Guardar estado abierto
  useEffect(() => {
    try {
      localStorage.setItem('chefsy_devtools_abierto', abierto ? 'true' : 'false')
    } catch {}
  }, [abierto])

  // Listener global de atajo de teclado: Ctrl + , (Control + Coma)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const esComa = e.key === ',' || e.code === 'Comma' || e.keyCode === 188
      if ((e.ctrlKey || e.metaKey) && esComa) {
        e.preventDefault()
        e.stopPropagation()
        setAbierto((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [])

  // ── Lógica de Arrastre (Drag) sin Backdrop a 60 FPS ───────────────────────

  const handlePointerDown = (e: React.PointerEvent) => {
    // Solo arrastrar desde el botón izquierdo / toque primario
    if (e.button !== 0) return
    arrastreRef.current = {
      arrastrando: true,
      inicioX: e.clientX,
      inicioY: e.clientY,
      posXInicial: posicion.x,
      posYInicial: posicion.y,
    }

    const onPointerMove = (ev: PointerEvent) => {
      if (!arrastreRef.current.arrastrando) return
      const dx = ev.clientX - arrastreRef.current.inicioX
      const dy = ev.clientY - arrastreRef.current.inicioY

      const nuevoX = Math.max(
        10,
        Math.min(window.innerWidth - (modalRef.current?.offsetWidth || 340) - 10, arrastreRef.current.posXInicial + dx)
      )
      const nuevoY = Math.max(
        10,
        Math.min(window.innerHeight - (modalRef.current?.offsetHeight || 150) - 10, arrastreRef.current.posYInicial + dy)
      )

      setPosicion({ x: nuevoX, y: nuevoY })
    }

    const onPointerUp = () => {
      arrastreRef.current.arrastrando = false
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      try {
        localStorage.setItem('chefsy_devtools_pos', JSON.stringify(posicion))
      } catch {}
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  // ── Generadores de Notificaciones ─────────────────────────────────────────

  const dispararNotificacion = useCallback(
    (tipo: 'nuevo' | 'entregado' | 'exito' | 'info' | 'warning' | 'deshacer') => {
      const cliente = NOMBRES_MOCK[Math.floor(Math.random() * NOMBRES_MOCK.length)]
      const cadete = CADETES_MOCK[Math.floor(Math.random() * CADETES_MOCK.length)]
      const numPedido = Math.floor(1000 + Math.random() * 9000)

      switch (tipo) {
        case 'nuevo':
          agregarNotificacion(`🔔 ¡Nuevo pedido de ${cliente}! (#${numPedido})`, 'info')
          reproducirSonidoCampanaCocina()
          break
        case 'entregado':
          agregarNotificacion(
            `🛵 ¡Pedido entregado! ${cliente} (#${numPedido}) recibió su pedido (Cadete: ${cadete}).`,
            'success'
          )
          reproducirSonidoEntregaExitosa()
          break
        case 'exito':
          agregarNotificacion(`Cierre de caja guardado con éxito ($${(Math.random() * 50000 + 10000).toFixed(0)}).`, 'success')
          reproducirSonidoNotificacion()
          break
        case 'info':
          agregarNotificacion(`Sincronización en tiempo real activa con Supabase.`, 'info')
          reproducirSonidoNotificacion()
          break
        case 'warning':
          agregarNotificacion(`⚠️ Stock bajo: Quedan solo 2 paquetes de Pan de Papa.`, 'warning')
          reproducirSonidoNotificacion()
          break
        case 'deshacer':
          agregarNotificacion(
            `Pedido #${numPedido} de ${cliente} marcado como entregado.`,
            'info',
            {
              etiqueta: 'Deshacer',
              alHacerClick: () => {
                agregarNotificacion(`Acción deshecha para #${numPedido}.`, 'info')
              },
            }
          )
          reproducirSonidoNotificacion()
          break
      }
    },
    [agregarNotificacion]
  )

  // Ráfaga masiva (burst)
  const dispararRafaga = (cantidad: number) => {
    const tipos: Array<'nuevo' | 'entregado' | 'exito' | 'info' | 'warning' | 'deshacer'> = [
      'nuevo',
      'entregado',
      'exito',
      'warning',
      'deshacer',
    ]
    for (let i = 0; i < cantidad; i++) {
      setTimeout(() => {
        const tipoRandom = tipos[Math.floor(Math.random() * tipos.length)]
        dispararNotificacion(tipoRandom)
      }, i * 60)
    }
  }

  // Spam continuo automático
  useEffect(() => {
    if (!spamActivo) return
    const interval = setInterval(() => {
      const tipos: Array<'nuevo' | 'entregado' | 'exito' | 'info' | 'warning'> = [
        'nuevo',
        'entregado',
        'exito',
        'info',
        'warning',
      ]
      const tipoRandom = tipos[Math.floor(Math.random() * tipos.length)]
      dispararNotificacion(tipoRandom)
    }, 450)

    return () => clearInterval(interval)
  }, [spamActivo, dispararNotificacion])

  if (!abierto) return null

  return (
    <div
      ref={modalRef}
      style={{
        transform: `translate3d(${posicion.x}px, ${posicion.y}px, 0)`,
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999998, // Muy alto pero debajo del toast container
      }}
      className="w-80 sm:w-96 bg-[#0f172a] text-slate-100 border border-white/15 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden select-none animate-in fade-in zoom-in-95 duration-150"
    >
      {/* ── Cabecera / Barra de arrastre (Draggable Header) ──────────────────── */}
      <div
        onPointerDown={handlePointerDown}
        className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900/90 border-b border-white/10 cursor-grab active:cursor-grabbing touch-none"
      >
        <div className="flex items-center gap-2">
          <GripHorizontal size={15} className="text-slate-500" />
          <div className="flex items-center gap-1.5">
            <Wrench size={14} className="text-amber-400" />
            <span className="font-bold text-xs tracking-tight text-white">
              Herramientas de Testeo
            </span>
          </div>
          <span className="text-[10px] font-mono bg-white/10 text-slate-300 px-1.5 py-0.2 rounded font-bold">
            Ctrl + ,
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMinimizado(!minimizado)}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
            title={minimizado ? 'Expandir' : 'Minimizar'}
          >
            {minimizado ? <Maximize2 size={12} /> : <Minus size={12} />}
          </button>
          <button
            type="button"
            onClick={() => {
              setAbierto(false)
              setSpamActivo(false)
            }}
            className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-white/10 transition-colors"
            title="Cerrar panel (Ctrl + ,)"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* ── Contenido de las herramientas (oculto si está minimizado) ───────── */}
      {!minimizado && (
        <div className="p-3.5 space-y-3.5 text-xs">
          {/* Estado de Notificaciones activas */}
          <div className="flex items-center justify-between bg-slate-950/60 border border-white/5 p-2.5 rounded-xl">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  notificaciones.length > 0
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-slate-600'
                }`}
              />
              <span className="text-slate-400 font-medium">Activas en pantalla:</span>
              <span className="font-mono font-bold text-white text-sm">
                {notificaciones.length}
              </span>
            </div>

            {notificaciones.length > 0 && (
              <button
                type="button"
                onClick={eliminarTodasNotificaciones}
                className="flex items-center gap-1 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 px-2 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer"
              >
                <Trash2 size={11} />
                <span>Limpiar</span>
              </button>
            )}
          </div>

          {/* Disparadores individuales */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Disparar Notificación Individual
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => dispararNotificacion('nuevo')}
                className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700 border border-white/5 p-2 rounded-xl text-left transition-all active:scale-95"
              >
                <Bell size={13} className="text-sky-400 shrink-0" />
                <span className="font-semibold truncate">🔔 Pedido Nuevo</span>
              </button>

              <button
                type="button"
                onClick={() => dispararNotificacion('entregado')}
                className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700 border border-white/5 p-2 rounded-xl text-left transition-all active:scale-95"
              >
                <Bike size={13} className="text-emerald-400 shrink-0" />
                <span className="font-semibold truncate">🛵 Entregado</span>
              </button>

              <button
                type="button"
                onClick={() => dispararNotificacion('exito')}
                className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700 border border-white/5 p-2 rounded-xl text-left transition-all active:scale-95"
              >
                <CheckCircle2 size={13} className="text-teal-400 shrink-0" />
                <span className="font-semibold truncate">✅ Éxito General</span>
              </button>

              <button
                type="button"
                onClick={() => dispararNotificacion('warning')}
                className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700 border border-white/5 p-2 rounded-xl text-left transition-all active:scale-95"
              >
                <AlertTriangle size={13} className="text-amber-400 shrink-0" />
                <span className="font-semibold truncate">⚠️ Advertencia</span>
              </button>

              <button
                type="button"
                onClick={() => dispararNotificacion('deshacer')}
                className="col-span-2 flex items-center justify-center gap-1.5 bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/30 text-purple-300 p-2 rounded-xl transition-all active:scale-95"
              >
                <RotateCcw size={13} />
                <span className="font-semibold">↩️ Con botón 'Deshacer'</span>
              </button>
            </div>
          </div>

          {/* Ráfagas de Spam para testear estrés y 'Borrar todas' */}
          <div className="space-y-1.5 pt-1 border-t border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Spam Masivo / Ráfagas de Carga
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => dispararRafaga(5)}
                className="flex items-center justify-center gap-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 py-1.5 rounded-xl font-bold transition-all active:scale-95"
              >
                <Zap size={12} /> +5
              </button>
              <button
                type="button"
                onClick={() => dispararRafaga(10)}
                className="flex items-center justify-center gap-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 py-1.5 rounded-xl font-bold transition-all active:scale-95"
              >
                <Zap size={12} /> +10
              </button>
              <button
                type="button"
                onClick={() => dispararRafaga(25)}
                className="flex items-center justify-center gap-1 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 py-1.5 rounded-xl font-bold transition-all active:scale-95"
              >
                <Zap size={12} /> +25 🔥
              </button>
            </div>

            {/* Spam Automático Continuo */}
            <button
              type="button"
              onClick={() => setSpamActivo(!spamActivo)}
              className={`w-full mt-2 flex items-center justify-center gap-2 py-2 rounded-xl font-bold transition-all shadow-md active:scale-98 ${
                spamActivo
                  ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {spamActivo ? (
                <>
                  <Square size={13} fill="currentColor" />
                  <span>Detener Spam Continuo</span>
                </>
              ) : (
                <>
                  <Play size={13} fill="currentColor" />
                  <span>Iniciar Spam Continuo (Simular Turno Pico)</span>
                </>
              )}
            </button>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
            <span>Arrastrá desde la barra superior</span>
            <span className="font-mono">chefsy-testing-v1</span>
          </div>
        </div>
      )}
    </div>
  )
}

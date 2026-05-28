'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Plus, StickyNote, GripHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Notita {
  id: string
  contenido: string
  color: 'amarillo' | 'verde' | 'azul'
}

const COLORES = {
  amarillo: {
    fondo: 'bg-amber-50 border-amber-300',
    fondoDark: 'dark:bg-amber-950/50 dark:border-amber-700/60',
    header: 'bg-amber-100 dark:bg-amber-900/50',
    textarea: 'text-amber-900 dark:text-amber-100 placeholder:text-amber-400 dark:placeholder:text-amber-700',
    dot: 'bg-amber-400',
    label: 'text-amber-700 dark:text-amber-300',
  },
  verde: {
    fondo: 'bg-emerald-50 border-emerald-300',
    fondoDark: 'dark:bg-emerald-950/50 dark:border-emerald-700/60',
    header: 'bg-emerald-100 dark:bg-emerald-900/50',
    textarea: 'text-emerald-900 dark:text-emerald-100 placeholder:text-emerald-400 dark:placeholder:text-emerald-700',
    dot: 'bg-emerald-400',
    label: 'text-emerald-700 dark:text-emerald-300',
  },
  azul: {
    fondo: 'bg-sky-50 border-sky-300',
    fondoDark: 'dark:bg-sky-950/50 dark:border-sky-700/60',
    header: 'bg-sky-100 dark:bg-sky-900/50',
    textarea: 'text-sky-900 dark:text-sky-100 placeholder:text-sky-400 dark:placeholder:text-sky-700',
    dot: 'bg-sky-400',
    label: 'text-sky-700 dark:text-sky-300',
  },
}

const LISTA_COLORES: Array<Notita['color']> = ['amarillo', 'verde', 'azul']

const POS_DEFAULT = { x: 0, y: 0 }

function generarId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export default function NotitaFlotante() {
  const [abierto, setAbierto] = useState(false)
  const [notitas, setNotitas] = useState<Notita[]>([])
  const [pos, setPos] = useState(POS_DEFAULT)
  const [cargado, setCargado] = useState(false)

  // Drag state
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number } | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // ── Carga inicial desde localStorage ─────────────────
  useEffect(() => {
    try {
      const guardadas = localStorage.getItem('chefsy-notitas-v2')
      const abiertoPrev = localStorage.getItem('chefsy-notitas-abierto')
      const savedPos = localStorage.getItem('chefsy-notitas-pos')

      if (guardadas) {
        const parsed = JSON.parse(guardadas) as Notita[]
        setNotitas(Array.isArray(parsed) ? parsed : [])
      }
      if (abiertoPrev === 'true') setAbierto(true)
      if (savedPos) setPos(JSON.parse(savedPos))
    } catch {
      // Si falla, estado vacío
    }
    setCargado(true)
  }, [])

  // ── Guardar notitas (solo después de carga) ───────────
  useEffect(() => {
    if (!cargado) return
    localStorage.setItem('chefsy-notitas-v2', JSON.stringify(notitas))
  }, [notitas, cargado])

  // ── Guardar estado abierto ────────────────────────────
  useEffect(() => {
    if (!cargado) return
    localStorage.setItem('chefsy-notitas-abierto', String(abierto))
  }, [abierto, cargado])

  // ── Guardar posición ──────────────────────────────────
  const guardarPos = useCallback((p: { x: number; y: number }) => {
    localStorage.setItem('chefsy-notitas-pos', JSON.stringify(p))
  }, [])

  // ── Drag logic ────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, posX: pos.x, posY: pos.y }
  }

  useEffect(() => {
    if (!isDragging) return
    const onMove = (e: MouseEvent) => {
      if (!dragStart.current) return
      const dx = e.clientX - dragStart.current.mouseX
      const dy = e.clientY - dragStart.current.mouseY
      const newPos = { x: dragStart.current.posX + dx, y: dragStart.current.posY + dy }
      setPos(newPos)
      guardarPos(newPos)
    }
    const onUp = () => setIsDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [isDragging, guardarPos])

  // ── CRUD notitas ──────────────────────────────────────
  const agregarNotita = () => {
    if (notitas.length >= 3) return
    const coloresUsados = notitas.map(n => n.color)
    const colorLibre = LISTA_COLORES.find(c => !coloresUsados.includes(c)) ?? 'amarillo'
    const nueva: Notita = { id: generarId(), contenido: '', color: colorLibre }
    setNotitas(prev => [...prev, nueva])
  }

  const eliminarNotita = (id: string) => {
    // Simplemente filtra — permite tener 0 notitas
    setNotitas(prev => prev.filter(n => n.id !== id))
  }

  const actualizarContenido = (id: string, contenido: string) => {
    setNotitas(prev => prev.map(n => n.id === id ? { ...n, contenido } : n))
  }

  const hayNotitas = notitas.length > 0
  const puedeAgregar = notitas.length < 3

  return (
    <>
      {/* ── Botón de activación ── */}
      <button
        onClick={() => setAbierto(v => !v)}
        className={cn(
          'fixed bottom-[5.5rem] right-6 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95',
          abierto
            ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/40'
            : 'bg-chefsy hover:bg-chefsy-700 text-white shadow-chefsy/20'
        )}
        title="Notas rápidas"
      >
        <StickyNote size={20} />
      </button>

      {/* ── Panel de notitas (draggable) ── */}
      {abierto && (
        <div
          ref={panelRef}
          className="fixed z-50 w-72"
          style={{
            bottom: `${96 - pos.y}px`,
            right: `${24 - pos.x}px`,
            cursor: isDragging ? 'grabbing' : 'auto',
          }}
        >
          <div
            className="rounded-2xl overflow-hidden shadow-2xl border border-[#3a3a3a]"
            style={{ background: '#252525' }}
          >
            {/* Header draggable del panel */}
            <div
              onMouseDown={onMouseDown}
              className="flex items-center justify-between px-4 py-2.5 bg-[#2e2e2e] border-b border-[#3a3a3a] cursor-grab active:cursor-grabbing select-none"
            >
              <div className="flex items-center gap-2">
                <StickyNote size={13} className="text-amber-400" />
                <span className="text-[11px] font-black uppercase tracking-widest text-[#a8a8a8]">
                  Notas rápidas
                </span>
              </div>
              <div className="flex items-center gap-2">
                {puedeAgregar && (
                  <button
                    onMouseDown={e => e.stopPropagation()}
                    onClick={agregarNotita}
                    className="flex items-center gap-1 text-[10px] font-bold text-chefsy-300 hover:text-white bg-chefsy-900/40 hover:bg-chefsy/30 px-2 py-0.5 rounded-full transition-all"
                    title="Agregar notita"
                  >
                    <Plus size={10} /> Nueva
                  </button>
                )}
                <GripHorizontal size={13} className="text-[#686868]" />
              </div>
            </div>

            {/* Cuerpo con las notitas */}
            <div className="p-3 space-y-2.5 max-h-[60vh] overflow-y-auto scrollbar-hide">
              {!hayNotitas && (
                <div className="text-center py-6">
                  <p className="text-[12px] text-[#686868] mb-3">No hay notas. ¡Creá una!</p>
                  <button
                    onClick={agregarNotita}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-chefsy hover:bg-chefsy-700 px-3 py-1.5 rounded-full transition-all hover:scale-105 active:scale-95"
                  >
                    <Plus size={11} /> Nueva notita
                  </button>
                </div>
              )}

              {notitas.map((notita) => {
                const estilo = COLORES[notita.color]
                return (
                  <div
                    key={notita.id}
                    className={cn(
                      'rounded-xl border overflow-hidden',
                      estilo.fondo,
                      estilo.fondoDark
                    )}
                  >
                    {/* Header de la notita individual */}
                    <div className={cn('flex items-center justify-between px-3 py-1.5', estilo.header)}>
                      <div className="flex items-center gap-2">
                        <span className={cn('w-2 h-2 rounded-full', estilo.dot)} />
                        <span className={cn('text-[9px] font-black uppercase tracking-widest opacity-70', estilo.label)}>
                          Nota
                        </span>
                      </div>
                      <button
                        onClick={() => eliminarNotita(notita.id)}
                        className={cn('p-0.5 rounded hover:scale-125 transition-transform opacity-60 hover:opacity-100', estilo.label)}
                        title="Borrar esta nota"
                      >
                        <X size={11} />
                      </button>
                    </div>

                    {/* Contenido */}
                    <textarea
                      value={notita.contenido}
                      onChange={(e) => actualizarContenido(notita.id, e.target.value)}
                      placeholder="Escribí acá..."
                      className={cn(
                        'w-full h-24 p-3 text-[12.5px] leading-relaxed resize-none border-none outline-none font-medium bg-transparent',
                        estilo.textarea
                      )}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

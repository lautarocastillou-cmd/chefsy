'use client'

// ─────────────────────────────────────────────────────
// modules/malu/componentes/NotitaFlotanteMalu.tsx
// Panel de notitas rápidas draggable para Malú.
// Estética Champagne Gold.
// ─────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Plus, StickyNote, GripHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Notita {
  id: string
  contenido: string
  color: 'nude' | 'champagne' | 'gris'
}

const COLORES = {
  nude: {
    fondo: 'bg-[#1f1a14] border-[#E5D3B3]/25',
    header: 'bg-[#29221b]',
    textarea: 'text-neutral-200 placeholder:text-neutral-600',
    dot: 'bg-[#E5D3B3]',
    label: 'text-[#E5D3B3]/80',
  },
  champagne: {
    fondo: 'bg-[#161616] border-[#C9B497]/25',
    header: 'bg-[#212121]',
    textarea: 'text-neutral-200 placeholder:text-neutral-600',
    dot: 'bg-[#C9B497]',
    label: 'text-[#C9B497]/80',
  },
  gris: {
    fondo: 'bg-zinc-900 border-zinc-700/50',
    header: 'bg-zinc-800/80',
    textarea: 'text-neutral-200 placeholder:text-neutral-650',
    dot: 'bg-zinc-500',
    label: 'text-zinc-400',
  },
}

const LISTA_COLORES: Array<Notita['color']> = ['nude', 'champagne', 'gris']

const POS_DEFAULT = { x: 0, y: 0 }

function generarId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export default function NotitaFlotanteMalu() {
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
      const guardadas = localStorage.getItem('malu-notitas')
      const abiertoPrev = localStorage.getItem('malu-notitas-abierto')
      const savedPos = localStorage.getItem('malu-notitas-pos')

      if (guardadas) {
        const parsed = JSON.parse(guardadas) as Notita[]
        setNotitas(Array.isArray(parsed) ? parsed : [])
      }
      if (abiertoPrev === 'true') setAbierto(true)
      if (savedPos) setPos(JSON.parse(savedPos))
    } catch {}
    setCargado(true)
  }, [])

  // ── Guardar notitas ───────────────────────────────────
  useEffect(() => {
    if (!cargado) return
    localStorage.setItem('malu-notitas', JSON.stringify(notitas))
  }, [notitas, cargado])

  // ── Guardar estado abierto ────────────────────────────
  const toggleAbierto = () => {
    setAbierto(prev => {
      const next = !prev
      localStorage.setItem('malu-notitas-abierto', String(next))
      return next
    })
  }

  // ── Guardar posición ──────────────────────────────────
  const guardarPos = useCallback((p: { x: number; y: number }) => {
    localStorage.setItem('malu-notitas-pos', JSON.stringify(p))
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
    const colorLibre = LISTA_COLORES.find(c => !coloresUsados.includes(c)) ?? 'nude'
    const nueva: Notita = { id: generarId(), contenido: '', color: colorLibre }
    setNotitas(prev => [...prev, nueva])
  }

  const eliminarNotita = (id: string) => {
    setNotitas(prev => prev.filter(n => n.id !== id))
  }

  const actualizarContenido = (id: string, contenido: string) => {
    setNotitas(prev => prev.map(n => n.id === id ? { ...n, contenido } : n))
  }

  const hayNotitas = notitas.length > 0
  const puedeAgregar = notitas.length < 3

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={toggleAbierto}
        className={cn(
          'fixed bottom-[5.5rem] right-6 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 border',
          abierto
            ? 'bg-zinc-800 text-white border-zinc-700'
            : 'bg-gradient-to-br from-[#E5D3B3] to-[#C9B497] text-[#0a0a0a] border-transparent shadow-[#E5D3B3]/10'
        )}
        title="Notas Rápidas"
      >
        <StickyNote size={20} />
      </button>

      {/* Panel de notitas (draggable) */}
      {abierto && (
        <div
          ref={panelRef}
          className="fixed z-50 w-72 animate-fade-in"
          style={{
            bottom: `${96 - pos.y}px`,
            right: `${24 - pos.x}px`,
            cursor: isDragging ? 'grabbing' : 'auto',
          }}
        >
          <div
            className="rounded-2xl overflow-hidden shadow-2xl border"
            style={{ 
              background: '#161616',
              borderColor: 'rgba(229, 211, 179, 0.18)',
              backdropFilter: 'blur(15px)'
            }}
          >
            {/* Header draggable del panel */}
            <div
              onMouseDown={onMouseDown}
              className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/60 border-b cursor-grab active:cursor-grabbing select-none"
              style={{ borderColor: 'rgba(229, 211, 179, 0.1)' }}
            >
              <div className="flex items-center gap-2">
                <StickyNote size={13} className="text-[#E5D3B3]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-serif-elegant">
                  Notas rápidas
                </span>
              </div>
              <div className="flex items-center gap-2">
                {puedeAgregar && (
                  <button
                    onMouseDown={e => e.stopPropagation()}
                    onClick={agregarNotita}
                    className="flex items-center gap-1 text-[9px] font-bold text-[#E5D3B3] hover:text-white bg-zinc-800 px-2 py-0.5 rounded-full border border-white/5 transition-all"
                    title="Agregar notita"
                  >
                    <Plus size={10} /> Nueva
                  </button>
                )}
                <GripHorizontal size={13} className="text-zinc-600" />
              </div>
            </div>

            {/* Cuerpo con las notitas */}
            <div className="p-3 space-y-2.5 max-h-[60vh] overflow-y-auto scrollbar-hide">
              {!hayNotitas && (
                <div className="text-center py-6">
                  <p className="text-[11px] text-zinc-500 mb-3">No hay notas guardadas.</p>
                  <button
                    onClick={agregarNotita}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0a0a0a] bg-gradient-to-br from-[#E5D3B3] to-[#C9B497] px-3.5 py-1.5 rounded-full transition-all hover:scale-105 active:scale-95"
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
                      'rounded-xl border overflow-hidden transition-all',
                      estilo.fondo
                    )}
                  >
                    {/* Header de la notita individual */}
                    <div className={cn('flex items-center justify-between px-3 py-1.5 border-b border-black/10', estilo.header)}>
                      <div className="flex items-center gap-2">
                        <span className={cn('w-2 h-2 rounded-full', estilo.dot)} />
                        <span className={cn('text-[9px] font-bold uppercase tracking-widest opacity-80', estilo.label)}>
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
                      placeholder="Escribí aquí..."
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

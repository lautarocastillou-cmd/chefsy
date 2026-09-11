'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Bike, MapPinOff, UserMinus, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Cadete } from '@/lib/entrega'

interface SelectorCadetePedidoProps {
  cadeteId: string | null
  cadeteNombre?: string | null
  cadetes: Cadete[]
  onAsignar: (cadeteId: string | null, cadeteNombre: string | null) => void
  disabled?: boolean
}

export default function SelectorCadetePedido({
  cadeteId,
  cadeteNombre,
  cadetes,
  onAsignar,
  disabled = false,
}: SelectorCadetePedidoProps) {
  const [abierto, setAbierto] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, placement: 'bottom' as 'bottom' | 'top' })
  const botonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const cadeteActual = cadetes.find((c) => c.id === cadeteId)
  const nombreMostrar = cadeteActual?.nombre || cadeteNombre || null
  const tieneGps = Boolean(cadeteActual?.gps_activo)

  // Calcular posición del popover
  const actualizarPosicion = () => {
    if (!botonRef.current) return
    const rect = botonRef.current.getBoundingClientRect()
    const anchoMenu = 210
    const altoMenuEstimado = 230

    // Verificar si desborda por abajo
    const espacioAbajo = window.innerHeight - rect.bottom
    const vaArriba = espacioAbajo < altoMenuEstimado && rect.top > altoMenuEstimado

    const top = vaArriba ? rect.top - 4 : rect.bottom + 4
    // Asegurar que no se salga por la derecha de la pantalla
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - anchoMenu - 8))

    setPos({ top, left, placement: vaArriba ? 'top' : 'bottom' })
  }

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (disabled) return
    if (!abierto) {
      actualizarPosicion()
    }
    setAbierto(!abierto)
  }

  // Cerrar al hacer clic fuera, presionar Escape o hacer scroll
  useEffect(() => {
    if (!abierto) return

    const manejarClickFuera = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        botonRef.current &&
        !botonRef.current.contains(e.target as Node)
      ) {
        setAbierto(false)
      }
    }

    const manejarTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false)
    }

    const manejarScroll = () => {
      setAbierto(false)
    }

    window.addEventListener('mousedown', manejarClickFuera, true)
    window.addEventListener('keydown', manejarTecla)
    window.addEventListener('scroll', manejarScroll, true)
    window.addEventListener('resize', manejarScroll)

    return () => {
      window.removeEventListener('mousedown', manejarClickFuera, true)
      window.removeEventListener('keydown', manejarTecla)
      window.removeEventListener('scroll', manejarScroll, true)
      window.removeEventListener('resize', manejarScroll)
    }
  }, [abierto])

  return (
    <div className="relative inline-flex items-center">
      <button
        ref={botonRef}
        type="button"
        disabled={disabled}
        onClick={toggleMenu}
        className={cn(
          "h-6 px-2 py-0.5 rounded text-[10px] uppercase font-semibold flex items-center gap-1.5 transition-all outline-none select-none cursor-pointer",
          nombreMostrar
            ? tieneGps
              ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/40 shadow-2xs"
              : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-[#3a3a3a] dark:hover:bg-[#444] dark:text-[#e6e6e6] border border-transparent"
            : "bg-amber-50/80 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/30",
          disabled && "opacity-60 cursor-not-allowed",
          abierto && "ring-2 ring-emerald-500/30"
        )}
        title={nombreMostrar ? `Cadete asignado: ${nombreMostrar} ${tieneGps ? '(GPS Activo)' : '(Sin GPS)'}` : 'Sin cadete asignado'}
      >
        {/* Icono izquierdo sutil */}
        {nombreMostrar ? (
          <Bike
            size={12}
            className={cn(
              "shrink-0",
              tieneGps ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"
            )}
          />
        ) : (
          <UserMinus size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />
        )}

        {/* Nombre / Estado */}
        <span className="truncate max-w-[95px] tracking-tight">
          {nombreMostrar || 'Sin Cadete'}
        </span>

        {/* Indicador sutil de GPS */}
        {nombreMostrar && (
          tieneGps ? (
            <span className="inline-flex items-center gap-0.5 text-[8.5px] font-black text-emerald-600 dark:text-emerald-400">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              GPS
            </span>
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-500 shrink-0" title="Sin señal GPS" />
          )
        )}

        {/* Chevron desplegable */}
        <ChevronDown
          size={10}
          className={cn(
            "text-slate-400 dark:text-slate-500 shrink-0 transition-transform duration-150",
            abierto && "rotate-180"
          )}
        />
      </button>

      {/* Menú Desplegable Flotante (Portal para evitar overflow-hidden) */}
      {abierto && typeof window !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: pos.placement === 'top' ? undefined : `${pos.top}px`,
            bottom: pos.placement === 'top' ? `${window.innerHeight - pos.top}px` : undefined,
            left: `${pos.left}px`,
            width: '210px',
            zIndex: 99999,
          }}
          className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl py-1 animate-in fade-in zoom-in-95 duration-100 text-slate-800 dark:text-slate-100 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cabecera sutil */}
          <div className="px-3 py-1 text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/70 flex items-center justify-between">
            <span>Asignar Cadete</span>
            <Bike size={11} className="text-slate-400" />
          </div>

          {/* Opción: Sin Cadete */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onAsignar(null, null)
              setAbierto(false)
            }}
            className={cn(
              "w-full px-2.5 py-1.5 text-left text-xs flex items-center gap-2 transition-colors cursor-pointer",
              !cadeteId
                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold"
                : "hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300"
            )}
          >
            <UserMinus size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
            <span className="text-[11px]">Sin Cadete</span>
            {!cadeteId && <Check size={12} className="text-amber-600 dark:text-amber-400 ml-auto shrink-0" />}
          </button>

          <div className="my-1 border-t border-slate-100 dark:border-slate-800/70" />

          {/* Lista de Cadetes */}
          <div className="max-h-52 overflow-y-auto py-0.5 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
            {cadetes.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-slate-400 italic text-center">
                No hay cadetes registrados
              </div>
            ) : (
              cadetes.map((c) => {
                const esSeleccionado = c.id === cadeteId
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onAsignar(c.id, c.nombre)
                      setAbierto(false)
                    }}
                    className={cn(
                      "w-full px-2.5 py-1.5 text-left text-xs flex items-center gap-2 transition-colors cursor-pointer group",
                      esSeleccionado
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200"
                    )}
                  >
                    <Bike
                      size={13}
                      className={cn(
                        "shrink-0",
                        c.gps_activo ? "text-emerald-500" : "text-slate-400 dark:text-slate-500"
                      )}
                    />
                    <span className="text-[11px] truncate flex-1">{c.nombre}</span>

                    {/* Badge de GPS sutil */}
                    {c.gps_activo ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-900/50 border border-emerald-200/60 dark:border-emerald-800/40 px-1.5 py-0.5 rounded-full shrink-0">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                        </span>
                        GPS
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-slate-400 dark:text-slate-500 shrink-0">
                        <MapPinOff size={10} />
                        Sin GPS
                      </span>
                    )}

                    {esSeleccionado && (
                      <Check size={12} className="text-emerald-600 dark:text-emerald-400 ml-1 shrink-0" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

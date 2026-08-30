'use client'

import React from 'react'
import { Pedido } from '@/tipos'
import { parsearFechaHora, calcularDiferenciaSegundos, formatearSegundos } from '@/lib/tiempo'
import { cn } from '@/lib/utils'
import { useRelojGlobal } from '@/hooks/useRelojGlobal'

interface PropsTimerPedido {
  pedido: Pedido
  mostrarFilaCompleta?: boolean
}

function parsearFechaMs(val: any): number | null {
  if (!val) return null
  if (typeof val === 'number') return val
  if (val instanceof Date) {
    const t = val.getTime()
    return isNaN(t) ? null : t
  }
  if (typeof val === 'string') {
    const t = Date.parse(val.includes(' ') && !val.includes('T') ? val.replace(' ', 'T') : val)
    if (!isNaN(t)) return t
  }
  return null
}

/**
 * Componente que muestra en tiempo real cuántos minutos/segundos lleva un pedido en cada estado.
 * Optimizado con cálculo entero en memoria para eliminar presión sobre CPU y Garbage Collector.
 */
const TimerPedido = React.memo(function TimerPedido({ pedido, mostrarFilaCompleta = false }: PropsTimerPedido) {
  const esFinal = pedido.estado === 'entregado' || pedido.estado === 'cancelado'
  const ahoraMs = useRelojGlobal(!esFinal)

  // Memoizar timestamps de fechas parseadas (solo se calculan si cambian los campos del pedido)
  const tCreacion = React.useMemo(() => {
    return parsearFechaMs(pedido.created_at) || parsearFechaHora(pedido.fecha, pedido.hora).getTime()
  }, [pedido.created_at, pedido.fecha, pedido.hora])

  const tCocina = React.useMemo(() => parsearFechaMs(pedido.cocina_at), [pedido.cocina_at])
  const tListo = React.useMemo(() => parsearFechaMs(pedido.listo_at), [pedido.listo_at])
  const tEntregado = React.useMemo(() => parsearFechaMs(pedido.entregado_at), [pedido.entregado_at])

  // ── 1. Temporizador: NUEVO ──────────────────────────────
  let finNuevoMs = ahoraMs
  if (tCocina) finNuevoMs = tCocina
  else if (tListo) finNuevoMs = tListo
  else if (tEntregado) finNuevoMs = tEntregado
  else if (pedido.estado !== 'nuevo') {
    finNuevoMs = tCreacion
  }
  const segNuevo = Math.max(0, Math.floor((finNuevoMs - tCreacion) / 1000))
  const estaNuevoTicking = !tCocina && !tListo && !tEntregado && pedido.estado === 'nuevo'

  // ── 2. Temporizador: COCINA ──────────────────────────────
  const showCocina = !!tCocina || pedido.estado === 'en_cocina'
  let segCocina = 0
  let estaCocinaTicking = false
  if (showCocina) {
    const inicioCocina = tCocina || tCreacion
    let finCocina = ahoraMs
    if (tListo) finCocina = tListo
    else if (tEntregado) finCocina = tEntregado
    else if (pedido.estado !== 'en_cocina') {
      finCocina = inicioCocina
    }
    segCocina = Math.max(0, Math.floor((finCocina - inicioCocina) / 1000))
    estaCocinaTicking = !tListo && !tEntregado && pedido.estado === 'en_cocina'
  }

  // ── 3. Temporizador: LISTO ──────────────────────
  const showListo = !!tListo || pedido.estado === 'listo'
  let segListo = 0
  let estaListoTicking = false
  if (showListo) {
    const inicioListo = tListo || tCocina || tCreacion
    let finListo = ahoraMs
    if (tEntregado) finListo = tEntregado
    else if (pedido.estado !== 'listo') {
      finListo = inicioListo
    }
    segListo = Math.max(0, Math.floor((finListo - inicioListo) / 1000))
    estaListoTicking = !tEntregado && pedido.estado === 'listo'
  }

  // Detección de atraso ultra liviana
  let esAtrasado = false
  if (!esFinal) {
    let tInicioAtraso: number | null = null
    let limiteSegundos = 0

    if (pedido.estado === 'nuevo') {
      tInicioAtraso = tCreacion
      limiteSegundos = 60 // 1 min
    } else if (pedido.estado === 'en_cocina') {
      tInicioAtraso = tCocina || tCreacion
      limiteSegundos = 45 * 60 // 45 min
    } else if (pedido.estado === 'listo') {
      tInicioAtraso = tListo || tCocina || tCreacion
      limiteSegundos = 10 * 60 // 10 min
    }

    if (tInicioAtraso) {
      const segTranscurridos = Math.floor((ahoraMs - tInicioAtraso) / 1000)
      esAtrasado = segTranscurridos >= limiteSegundos
    }
  }

  const badgesTemporizadores = (
    <div className="flex items-center gap-1 shrink-0 select-none">
      {/* Nuevo (Verde si está activo, Gris si está frenado) */}
      <span
        className={cn(
          "inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-bold tracking-wide transition-all duration-300 border",
          estaNuevoTicking
            ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30"
            : "bg-slate-50 text-slate-400 border-slate-100 dark:bg-slate-900/40 dark:text-slate-500 dark:border-slate-800/30 font-medium"
        )}
        title={`Tiempo de espera en nuevo. Creado a las ${pedido.hora}`}
      >
        <span>N: {formatearSegundos(segNuevo)}</span>
      </span>

      {/* Cocina (Amarillo si está activo, Gris si está frenado) */}
      {showCocina && (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-bold tracking-wide transition-all duration-300 border",
            estaCocinaTicking
              ? "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30"
              : "bg-slate-50 text-slate-400 border-slate-100 dark:bg-slate-900/40 dark:text-slate-500 dark:border-slate-800/30 font-medium"
          )}
          title="Tiempo transcurrido en Cocina"
        >
          <span>C: {formatearSegundos(segCocina)}</span>
        </span>
      )}

      {/* Listo (Azul si está activo, Gris si está frenado) */}
      {showListo && (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-bold tracking-wide transition-all duration-300 border",
            estaListoTicking
              ? "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30"
              : "bg-slate-50 text-slate-400 border-slate-100 dark:bg-slate-900/40 dark:text-slate-500 dark:border-slate-800/30 font-medium"
          )}
          title="Tiempo transcurrido en Listo"
        >
          <span>L: {formatearSegundos(segListo)}</span>
        </span>
      )}
    </div>
  )

  if (mostrarFilaCompleta) {
    return (
      <div className={cn(
        "bg-slate-50/70 dark:bg-[#2f2f2f] border border-slate-100/50 dark:border-[#3d3d3d] rounded-xl p-2 flex items-center justify-between gap-2 transition-all select-none",
        esAtrasado && "bg-amber-50/50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30"
      )}>
        <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-[#686868] tracking-wider flex items-center gap-1.5">
          {esAtrasado && (
            <span className="relative flex h-2 w-2" title="Pedido con demora">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          )}
          Tiempos
        </span>
        {badgesTemporizadores}
      </div>
    )
  }

  return badgesTemporizadores
})

export default TimerPedido

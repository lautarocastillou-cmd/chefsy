'use client'

import React, { useState, useEffect } from 'react'
import { Pedido } from '@/tipos'
import { parsearFechaHora, calcularDiferenciaSegundos, formatearSegundos } from '@/lib/tiempo'
import { cn } from '@/lib/utils'

interface PropsTimerPedido {
  pedido: Pedido
}

/**
 * Componente que muestra en tiempo real cuántos minutos/segundos lleva un pedido en cada estado.
 * Muestra múltiples temporizadores (Nuevo, Cocina, Listo) secuencialmente que se frenan
 * a medida que el pedido cambia de estado.
 */
export default function TimerPedido({ pedido }: PropsTimerPedido) {
  const [ahora, setAhora] = useState<Date>(() => new Date())

  useEffect(() => {
    // Si el pedido está en un estado final (entregado o cancelado), los contadores no corren
    const esFinal = pedido.estado === 'entregado' || pedido.estado === 'cancelado'
    if (esFinal) return

    // Actualizar cada segundo para reflejar el paso del tiempo real
    const intervaloId = setInterval(() => {
      setAhora(new Date())
    }, 1000)

    return () => {
      clearInterval(intervaloId)
    }
  }, [pedido.estado])

  // Obtener fechas base
  const fechaCreacion = pedido.created_at
    ? new Date(pedido.created_at)
    : parsearFechaHora(pedido.fecha, pedido.hora)

  const fechaCocina = pedido.cocina_at ? new Date(pedido.cocina_at) : null
  const fechaListo = pedido.listo_at ? new Date(pedido.listo_at) : null
  const fechaReparto = pedido.reparto_at ? new Date(pedido.reparto_at) : null
  const fechaEntregado = pedido.entregado_at ? new Date(pedido.entregado_at) : null

  // ── 1. Temporizador: NUEVO ──────────────────────────────
  // Siempre visible.
  // Termina cuando el pedido pasa a Cocina, Listo o Entregado/Cancelado.
  let finNuevo = ahora
  if (fechaCocina) finNuevo = fechaCocina
  else if (fechaListo) finNuevo = fechaListo
  else if (fechaEntregado) finNuevo = fechaEntregado
  else if (pedido.estado !== 'nuevo') {
    // Si cambió de estado pero no tiene timestamp, se congela en la creación
    finNuevo = fechaCreacion
  }
  const segNuevo = calcularDiferenciaSegundos(fechaCreacion, finNuevo)
  const estaNuevoTicking = !fechaCocina && !fechaListo && !fechaEntregado && pedido.estado === 'nuevo'

  // ── 2. Temporizador: COCINA ──────────────────────────────
  // Visible solo si ya entró a cocina.
  // Termina cuando el pedido pasa a Listo o Entregado/Cancelado.
  const showCocina = !!fechaCocina || pedido.estado === 'en_cocina'
  let segCocina = 0
  let estaCocinaTicking = false
  if (showCocina) {
    const inicioCocina = fechaCocina || ahora
    let finCocina = ahora
    if (fechaListo) finCocina = fechaListo
    else if (fechaEntregado) finCocina = fechaEntregado
    else if (pedido.estado !== 'en_cocina') {
      finCocina = inicioCocina
    }
    segCocina = calcularDiferenciaSegundos(inicioCocina, finCocina)
    estaCocinaTicking = !fechaListo && !fechaEntregado && pedido.estado === 'en_cocina'
  }

  // ── 3. Temporizador: LISTO ──────────────────────
  // Visible solo si pasó a Listo.
  const showListo = !!fechaListo || pedido.estado === 'listo'
  let segListo = 0
  let estaListoTicking = false
  if (showListo) {
    const inicioListo = fechaListo || ahora
    let finListo = ahora
    if (fechaReparto) finListo = fechaReparto
    else if (fechaEntregado) finListo = fechaEntregado
    else if (pedido.estado !== 'listo') {
      finListo = inicioListo
    }
    segListo = calcularDiferenciaSegundos(inicioListo, finListo)
    estaListoTicking = !fechaReparto && !fechaEntregado && pedido.estado === 'listo'
  }

  // ── 4. Temporizador: REPARTO ──────────────────────
  // Visible solo para delivery que haya entrado a reparto
  const showReparto = pedido.tipoEntrega === 'delivery' && (!!fechaReparto || pedido.estado === 'en_reparto')
  let segReparto = 0
  let estaRepartoTicking = false
  if (showReparto) {
    const inicioReparto = fechaReparto || ahora
    let finReparto = ahora
    if (fechaEntregado) finReparto = fechaEntregado
    else if (pedido.estado !== 'en_reparto') {
      finReparto = inicioReparto
    }
    segReparto = calcularDiferenciaSegundos(inicioReparto, finReparto)
    estaRepartoTicking = !fechaEntregado && pedido.estado === 'en_reparto'
  }

  return (
    <div className="flex items-center gap-1 shrink-0 select-none">
      {/* Nuevo (Verde si está activo, Gris si está frenado) */}
      <span
        className={cn(
          "inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-bold tracking-wide transition-all duration-300 border",
          estaNuevoTicking
            ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30 animate-pulse"
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
              ? "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30 animate-pulse"
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
              ? "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30 animate-pulse"
              : "bg-slate-50 text-slate-400 border-slate-100 dark:bg-slate-900/40 dark:text-slate-500 dark:border-slate-800/30 font-medium"
          )}
          title="Tiempo transcurrido en Listo"
        >
          <span>L: {formatearSegundos(segListo)}</span>
        </span>
      )}

      {/* Reparto (Naranja si está activo, Gris si está frenado) */}
      {showReparto && (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-bold tracking-wide transition-all duration-300 border",
            estaRepartoTicking
              ? "bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30 animate-pulse"
              : "bg-slate-50 text-slate-400 border-slate-100 dark:bg-slate-900/40 dark:text-slate-500 dark:border-slate-800/30 font-medium"
          )}
          title="Tiempo de viaje en Reparto"
        >
          <span>R: {formatearSegundos(segReparto)}</span>
        </span>
      )}
    </div>
  )
}

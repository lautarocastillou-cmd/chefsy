'use client'

import React from 'react'
import { Pedido } from '@/tipos'
import { parsearFechaHora, calcularDiferenciaSegundos, formatearSegundos } from '@/lib/tiempo'
import { cn } from '@/lib/utils'
import { useRelojGlobal } from '@/hooks/useRelojGlobal'

interface PropsTimerPedido {
  pedido: Pedido
}

/**
 * Componente que muestra en tiempo real cuántos minutos/segundos lleva un pedido en cada estado.
 * Muestra múltiples temporizadores (Nuevo, Cocina, Listo) secuencialmente que se frenan
 * a medida que el pedido cambia de estado.
 */
const TimerPedido = React.memo(function TimerPedido({ pedido }: PropsTimerPedido) {
  const esFinal = pedido.estado === 'entregado' || pedido.estado === 'cancelado'
  const ahora = useRelojGlobal(!esFinal)

  // Función de parseo segura compatible con todos los navegadores (incluso Safari de iOS)
  const parsearFechaSegura = (val: any): Date | null => {
    if (!val) return null
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val
    
    let d = new Date(val)
    if (!isNaN(d.getTime())) return d

    if (typeof val === 'string') {
      // Reemplazar espacios por T para compatibilidad estricta
      const normalizada = val.replace(' ', 'T')
      d = new Date(normalizada)
      if (!isNaN(d.getTime())) return d

      // Intentar quitando milisegundos y zonas horarias
      const limpia = normalizada.split('.')[0]
      d = new Date(limpia)
      if (!isNaN(d.getTime())) return d
    }
    return null
  }

  // Obtener fechas base usando el parser seguro
  const fechaCreacion = parsearFechaSegura(pedido.created_at) || parsearFechaHora(pedido.fecha, pedido.hora)
  const fechaCocina = parsearFechaSegura(pedido.cocina_at)
  const fechaListo = parsearFechaSegura(pedido.listo_at)
  const fechaEntregado = parsearFechaSegura(pedido.entregado_at)

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
  const segNuevo = Math.max(0, calcularDiferenciaSegundos(fechaCreacion, finNuevo))
  const estaNuevoTicking = !fechaCocina && !fechaListo && !fechaEntregado && pedido.estado === 'nuevo'

  // ── 2. Temporizador: COCINA ──────────────────────────────
  // Visible solo si ya entró a cocina.
  // Termina cuando el pedido pasa a Listo o Entregado/Cancelado.
  const showCocina = !!fechaCocina || pedido.estado === 'en_cocina'
  let segCocina = 0
  let estaCocinaTicking = false
  if (showCocina) {
    const inicioCocina = fechaCocina || fechaCreacion
    let finCocina = ahora
    if (fechaListo) finCocina = fechaListo
    else if (fechaEntregado) finCocina = fechaEntregado
    else if (pedido.estado !== 'en_cocina') {
      finCocina = inicioCocina
    }
    segCocina = Math.max(0, calcularDiferenciaSegundos(inicioCocina, finCocina))
    estaCocinaTicking = !fechaListo && !fechaEntregado && pedido.estado === 'en_cocina'
  }

  // ── 3. Temporizador: LISTO ──────────────────────
  // Visible solo si pasó a Listo.
  const showListo = !!fechaListo || pedido.estado === 'listo'
  let segListo = 0
  let estaListoTicking = false
  if (showListo) {
    const inicioListo = fechaListo || fechaCocina || fechaCreacion
    let finListo = ahora
    if (fechaEntregado) finListo = fechaEntregado
    else if (pedido.estado !== 'listo') {
      finListo = inicioListo
    }
    segListo = Math.max(0, calcularDiferenciaSegundos(inicioListo, finListo))
    estaListoTicking = !fechaEntregado && pedido.estado === 'listo'
  }


  return (
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
})

export default TimerPedido

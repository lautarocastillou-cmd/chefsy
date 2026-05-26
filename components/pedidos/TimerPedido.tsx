'use client'

import React, { useState, useEffect } from 'react'
import { calcularTiempoTranscurrido, obtenerEstilosTimer } from '@/lib/tiempo'
import { Clock } from 'lucide-react'

interface PropsTimerPedido {
  fecha: string
  hora: string
  estado: string
}

/**
 * Componente que muestra en tiempo real cuántos minutos lleva activo un pedido.
 * Utiliza un temporizador local para evitar el re-renderizado de todo el listado de pedidos.
 *
 * @param props Contiene la fecha de creación, la hora y el estado actual del pedido.
 */
export default function TimerPedido({ fecha, hora, estado }: PropsTimerPedido) {
  // Solo se calcula para pedidos activos (distintos a entregado o cancelado)
  const esPedidoActivo = estado !== 'entregado' && estado !== 'cancelado'

  // Almacenar el tiempo transcurrido en el estado local del componente
  const [minutos, setMinutos] = useState<number>(() =>
    esPedidoActivo ? calcularTiempoTranscurrido(fecha, hora) : 0
  )

  useEffect(() => {
    // Si el pedido ya no está activo, detenemos la suscripción y no actualizamos
    if (!esPedidoActivo) return

    // Actualizar inmediatamente al montar o cuando cambian las dependencias
    setMinutos(calcularTiempoTranscurrido(fecha, hora))

    // Configurar un intervalo de 30 segundos (30000ms) para recalcular el tiempo transcurrido
    // Esto optimiza el consumo de CPU en comparación a hacerlo cada segundo
    const intervaloId = setInterval(() => {
      setMinutos(calcularTiempoTranscurrido(fecha, hora))
    }, 30000)

    // Función de limpieza ejecutada al desmontar el componente o cambiar dependencias
    // Es CRÍTICA para evitar fugas de memoria (memory leaks) por hilos de temporizador huérfanos
    return () => {
      clearInterval(intervaloId)
    }
  }, [fecha, hora, estado, esPedidoActivo])

  // Si no está activo el pedido, no renderizamos absolutamente nada en el DOM
  if (!esPedidoActivo) {
    return null
  }

  const estilosColor = obtenerEstilosTimer(minutos)

  return (
    <span 
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide transition-all duration-300 ${estilosColor}`}
      title={`Pedido creado a las ${hora} del ${fecha}`}
    >
      <Clock size={10} className="shrink-0" />
      <span>Hace {minutos} min</span>
    </span>
  )
}

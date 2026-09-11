'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { usarPedidos } from '@/contexto/PedidosContexto'
import { reproducirAlarmaDemora } from '@/contexto/TemaNotificacionContexto'
import { obtenerMinutosTranscurridos } from '@/lib/problemas'
import { formatearPrecio } from '@/lib/utils'
import { Pedido, EstadoPedido } from '@/tipos'
import {
  AlertTriangle,
  Clock,
  BellOff,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Bike,
  ChefHat,
  Minus,
  Maximize2,
  X,
} from 'lucide-react'

interface InfoDemora {
  pedido: Pedido
  minutos: number
  motivo: string
  etapa: 'cocina' | 'listo' | 'total' | 'nuevo'
}

export default function AlertaPedidosDemoradosFlotante() {
  const router = useRouter()
  const pathname = usePathname()
  const { pedidos, cambiarEstado, configuracionOperativa } = usarPedidos()

  const [montado, setMontado] = useState(false)
  const [minimizado, setMinimizado] = useState(false)
  const [indiceActual, setIndiceActual] = useState(0)
  const [snoozes, setSnoozes] = useState<Record<string, number>>({})
  const [ahora, setAhora] = useState<Date>(new Date())
  const ultimoSonidoRef = useRef<number>(0)

  // Configuración de la alerta flotante
  const config = useMemo(() => {
    const fallback = {
      habilitada: true,
      tiempoCocinaMinutos: 25,
      tiempoListoMinutos: 12,
      tiempoTotalMinutos: 40,
      tiempoAplazoMinutos: 5,
      sonidoHabilitado: true,
    }
    const conf = (configuracionOperativa as any)?.alertaCriticaFlotante
    if (!conf) return fallback
    return {
      habilitada: conf.habilitada !== undefined ? Boolean(conf.habilitada) : fallback.habilitada,
      tiempoCocinaMinutos: Number(conf.tiempoCocinaMinutos || fallback.tiempoCocinaMinutos),
      tiempoListoMinutos: Number(conf.tiempoListoMinutos || fallback.tiempoListoMinutos),
      tiempoTotalMinutos: Number(conf.tiempoTotalMinutos || fallback.tiempoTotalMinutos),
      tiempoAplazoMinutos: Number(conf.tiempoAplazoMinutos || fallback.tiempoAplazoMinutos),
      sonidoHabilitado: conf.sonidoHabilitado !== undefined ? Boolean(conf.sonidoHabilitado) : fallback.sonidoHabilitado,
    }
  }, [configuracionOperativa])

  // Cargar snoozes guardados desde localStorage
  useEffect(() => {
    setMontado(true)
    try {
      const raw = localStorage.getItem('chefsy_alertas_snooze')
      if (raw) {
        const parsed = JSON.parse(raw)
        const ahoraMs = Date.now()
        // Filtrar los que ya expiraron
        const vigentes: Record<string, number> = {}
        for (const [id, expira] of Object.entries(parsed)) {
          if (typeof expira === 'number' && expira > ahoraMs) {
            vigentes[id] = expira
          }
        }
        setSnoozes(vigentes)
      }
    } catch {}
  }, [])

  // Timer para refrescar el tiempo relativo cada 10 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setAhora(new Date())
    }, 10000)
    return () => clearInterval(timer)
  }, [])

  // Guardar snoozes en localStorage cuando cambian
  const guardarSnooze = (pedidoId: string, minutos: number) => {
    const expira = Date.now() + minutos * 60 * 1000
    setSnoozes((prev) => {
      const nuevo = { ...prev, [pedidoId]: expira }
      try {
        localStorage.setItem('chefsy_alertas_snooze', JSON.stringify(nuevo))
      } catch {}
      return nuevo
    })
  }

  // Filtrar y ordenar los pedidos verdaderamente demorados
  const pedidosDemorados: InfoDemora[] = useMemo(() => {
    if (!config.habilitada || !pedidos || pedidos.length === 0) return []

    const ahoraMs = ahora.getTime()
    const lista: InfoDemora[] = []

    pedidos.forEach((p) => {
      // Ignorar finalizados y archivados
      if (p.estado === 'entregado' || p.estado === 'cancelado' || p.archivado) return

      // Ignorar si está aplazado
      const snoozeHasta = snoozes[p.id]
      if (snoozeHasta && snoozeHasta > ahoraMs) return

      const minTotal = obtenerMinutosTranscurridos(p.created_at, ahora, p.fecha, p.hora)

      // 1. Demorado en Cocina
      if (p.estado === 'en_cocina') {
        const minCocina = obtenerMinutosTranscurridos(p.cocina_at || p.created_at, ahora, p.fecha, p.hora)
        if (minCocina >= config.tiempoCocinaMinutos) {
          lista.push({
            pedido: p,
            minutos: minCocina,
            motivo: `Lleva ${minCocina} min preparándose en cocina (límite: ${config.tiempoCocinaMinutos} min)`,
            etapa: 'cocina',
          })
          return
        }
      }

      // 2. Demorado en Listo (empaquetado esperando cadete o retiro)
      if (p.estado === 'listo') {
        const minListo = obtenerMinutosTranscurridos(p.listo_at || p.created_at, ahora, p.fecha, p.hora)
        if (minListo >= config.tiempoListoMinutos) {
          lista.push({
            pedido: p,
            minutos: minListo,
            motivo: `Lleva ${minListo} min empaquetado esperando entrega (límite: ${config.tiempoListoMinutos} min)`,
            etapa: 'listo',
          })
          return
        }
      }

      // 3. Demorado en Nuevo (de la tienda online sin tomar)
      if (p.estado === 'nuevo') {
        if (minTotal >= 5) {
          lista.push({
            pedido: p,
            minutos: minTotal,
            motivo: `Lleva ${minTotal} min en espera de confirmación`,
            etapa: 'nuevo',
          })
          return
        }
      }

      // 4. Demora total acumulada
      if (minTotal >= config.tiempoTotalMinutos) {
        lista.push({
          pedido: p,
          minutos: minTotal,
          motivo: `Lleva ${minTotal} min activo en total (límite: ${config.tiempoTotalMinutos} min)`,
          etapa: 'total',
        })
      }
    })

    // Ordenar de mayor a menor atraso
    return lista.sort((a, b) => b.minutos - a.minutos)
  }, [pedidos, config, snoozes, ahora])

  // Ajustar índice si la lista se achica
  useEffect(() => {
    if (indiceActual >= pedidosDemorados.length) {
      setIndiceActual(Math.max(0, pedidosDemorados.length - 1))
    }
  }, [pedidosDemorados.length, indiceActual])

  // Reproducir sonido suave de alarma si hay pedidos demorados nuevos
  useEffect(() => {
    if (!config.sonidoHabilitado || pedidosDemorados.length === 0) return
    const ahoraMs = Date.now()
    // Cooldown de 45 segundos para no ser invasivo
    if (ahoraMs - ultimoSonidoRef.current > 45000) {
      ultimoSonidoRef.current = ahoraMs
      reproducirAlarmaDemora()
    }
  }, [pedidosDemorados.length, config.sonidoHabilitado])

  // No renderizar si no está montado, o no está habilitado, o estamos en cadetería
  if (!montado || !config.habilitada || pedidosDemorados.length === 0) {
    return null
  }

  // No mostrar en /cadeteria si es vista exclusiva de repartidor
  if (pathname === '/cadeteria') {
    return null
  }

  const actual = pedidosDemorados[indiceActual] || pedidosDemorados[0]
  if (!actual) return null

  const pedido = actual.pedido
  const totalItems = pedido.productos.reduce((sum, p) => sum + p.cantidad, 0)
  const productosResumen = pedido.productos
    .slice(0, 2)
    .map((p) => `${p.cantidad}x ${p.nombre}`)
    .join(', ') + (pedido.productos.length > 2 ? ` (+${pedido.productos.length - 2} más)` : '')

  const handleAplazar = (e: React.MouseEvent) => {
    e.stopPropagation()
    guardarSnooze(pedido.id, config.tiempoAplazoMinutos)
  }

  const handleIrAlPedido = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/pedidos?buscar=${encodeURIComponent(pedido.cliente)}`)
  }

  const handleAvanzarSiguienteEstado = async (e: React.MouseEvent) => {
    e.stopPropagation()
    let nuevoEstado: EstadoPedido | null = null
    if (pedido.estado === 'nuevo') nuevoEstado = 'en_cocina'
    else if (pedido.estado === 'en_cocina') nuevoEstado = 'listo'
    else if (pedido.estado === 'listo') {
      nuevoEstado = pedido.tipoEntrega === 'delivery' ? 'en_camino' : 'entregado'
    }

    if (nuevoEstado) {
      await cambiarEstado(pedido.id, nuevoEstado)
    }
  }

  // Etiqueta y color para el botón de avance rápido
  const etiquetaAccionRapida =
    pedido.estado === 'nuevo'
      ? 'Comandar a Cocina 🍳'
      : pedido.estado === 'en_cocina'
      ? 'Marcar como Listo ✨'
      : pedido.estado === 'listo' && pedido.tipoEntrega === 'delivery'
      ? 'Marcar en Camino 🛵'
      : 'Marcar Entregado ✅'

  // Vista Minimizada (Píldora flotante compacta)
  if (minimizado) {
    return (
      <div className="fixed bottom-20 md:bottom-5 right-4 z-[9999] animate-in slide-in-from-bottom-3 duration-200">
        <button
          onClick={() => setMinimizado(false)}
          className="flex items-center gap-2.5 bg-slate-950 border-2 border-amber-500/80 hover:border-amber-400 text-white px-4 py-2.5 rounded-full shadow-2xl cursor-pointer hover:scale-105 active:scale-95 transition-all group"
          title="Abrir alerta de pedidos demorados"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
          </span>
          <span className="text-xs font-black tracking-wide text-amber-300">
            {pedidosDemorados.length} {pedidosDemorados.length === 1 ? 'Pedido Demorado' : 'Pedidos Demorados'}
          </span>
          <Maximize2 size={13} className="text-slate-400 group-hover:text-white transition-colors" />
        </button>
      </div>
    )
  }

  // Vista Completa: Cartelito persistente estilo Alarma
  return (
    <aside
      aria-label="Alerta de pedido demorado"
      className="fixed bottom-20 md:bottom-5 right-3 md:right-5 z-[9999] w-[calc(100vw-1.5rem)] sm:w-96 max-w-sm animate-in slide-in-from-bottom-5 duration-200"
    >
      <div className="bg-slate-950 border-2 border-amber-500/70 rounded-2xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.85)] flex flex-col gap-3 relative overflow-hidden">
        {/* Barra superior de acento con brillo sutil */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 animate-pulse" />

        {/* Encabezado: Título + Paginador + Controles */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 truncate">
                ⚠️ Alerta de Demora
              </span>
              {pedidosDemorados.length > 1 && (
                <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded">
                  {indiceActual + 1}/{pedidosDemorados.length}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {pedidosDemorados.length > 1 && (
              <div className="flex items-center gap-0.5 mr-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setIndiceActual((prev) => (prev > 0 ? prev - 1 : pedidosDemorados.length - 1))}
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
                  title="Pedido demorado anterior"
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setIndiceActual((prev) => (prev < pedidosDemorados.length - 1 ? prev + 1 : 0))}
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
                  title="Siguiente pedido demorado"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setMinimizado(true)}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
              title="Minimizar a píldora"
            >
              <Minus size={14} />
            </button>
          </div>
        </div>

        {/* Cuerpo de la Tarjeta: Info del Pedido */}
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-extrabold text-white truncate leading-tight flex items-center gap-1.5">
                <span>{pedido.cliente}</span>
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  #{pedido.id.slice(-4)}
                </span>
              </h4>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {pedido.tipoEntrega === 'delivery' ? '🛵 Delivery' : pedido.tipoEntrega === 'retiro' ? '🏪 Retiro' : '🍽️ Consumo Local'}
                {pedido.direccion && ` • ${pedido.direccion}`}
              </p>
            </div>
            <span className="text-xs font-mono font-black text-emerald-400 shrink-0">
              {formatearPrecio(pedido.total)}
            </span>
          </div>

          {/* Motivo del retraso con badge llamativo */}
          <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-2.5 flex items-start gap-2">
            <Clock size={15} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-amber-200 leading-snug">
                {actual.motivo}
              </p>
              <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">
                {totalItems} ítems: {productosResumen}
              </p>
            </div>
          </div>
        </div>

        {/* Botonera de Acciones (Estilo Alarma) */}
        <div className="flex items-center gap-2 pt-1">
          {/* Botón Aplazar (Snooze) */}
          <button
            type="button"
            onClick={handleAplazar}
            className="flex-1 bg-slate-900 hover:bg-slate-850 active:scale-95 text-slate-200 border border-slate-700/80 hover:border-slate-600 rounded-xl py-2 px-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            title={`Silenciar este aviso por ${config.tiempoAplazoMinutos} minutos`}
          >
            <BellOff size={13} className="text-amber-400" />
            <span>Aplazar {config.tiempoAplazoMinutos}m</span>
          </button>

          {/* Botón Acción Rápida de Avance */}
          <button
            type="button"
            onClick={handleAvanzarSiguienteEstado}
            className="flex-1 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black rounded-xl py-2 px-2.5 text-xs transition-all flex items-center justify-center gap-1 shadow-md cursor-pointer truncate"
            title="Avanzar estado del pedido inmediatamente"
          >
            <span>{etiquetaAccionRapida}</span>
          </button>

          {/* Botón Ir al Pedido */}
          <button
            type="button"
            onClick={handleIrAlPedido}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-colors cursor-pointer shrink-0"
            title="Ver pedido en el panel de pedidos"
          >
            <ExternalLink size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}

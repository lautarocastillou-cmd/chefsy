'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { usarPedidos } from '@/contexto/PedidosContexto'
import { reproducirAlarmaDemora } from '@/contexto/TemaNotificacionContexto'
import { obtenerMinutosTranscurridos } from '@/lib/problemas'
import { formatearPrecio, cn } from '@/lib/utils'
import { Pedido, EstadoPedido } from '@/tipos'
import {
  Clock,
  BellOff,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ChefHat,
  Minus,
  Maximize2,
  Bike,
  Store,
  Utensils,
  GripHorizontal,
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

  // ── Coordenadas y Lógica de Arrastre (Draggable) ──────────────────────────
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const posRef = useRef<{ x: number; y: number } | null>(null)
  posRef.current = pos

  const dragInfoRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    initialX: number
    initialY: number
    movio: boolean
  } | null>(null)

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

  // Cargar snoozes y posición guardada desde localStorage al montar
  useEffect(() => {
    setMontado(true)

    // 1. Snoozes
    try {
      const raw = localStorage.getItem('chefsy_alertas_snooze')
      if (raw) {
        const parsed = JSON.parse(raw)
        const ahoraMs = Date.now()
        const vigentes: Record<string, number> = {}
        for (const [id, expira] of Object.entries(parsed)) {
          if (typeof expira === 'number' && expira > ahoraMs) {
            vigentes[id] = expira
          }
        }
        setSnoozes(vigentes)
      }
    } catch {}

    // 2. Posición guardada
    const cardW = Math.min(390, window.innerWidth - 20)
    try {
      const rawPos = localStorage.getItem('chefsy_alerta_pos')
      if (rawPos) {
        const parsed = JSON.parse(rawPos)
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          const maxX = Math.max(10, window.innerWidth - cardW - 10)
          const maxY = Math.max(10, window.innerHeight - 240)
          setPos({
            x: Math.min(Math.max(10, parsed.x), maxX),
            y: Math.min(Math.max(10, parsed.y), maxY),
          })
          return
        }
      }
    } catch {}

    // Posición por defecto: Abajo a la derecha
    const defX = Math.max(10, window.innerWidth - cardW - (window.innerWidth < 768 ? 10 : 24))
    const defY = Math.max(10, window.innerHeight - (window.innerWidth < 768 ? 340 : 260))
    setPos({ x: defX, y: defY })
  }, [])

  // Re-clampear en resize de ventana
  useEffect(() => {
    const handleResize = () => {
      if (!posRef.current) return
      const cardW = Math.min(390, window.innerWidth - 20)
      const maxX = Math.max(10, window.innerWidth - cardW - 10)
      const maxY = Math.max(10, window.innerHeight - 220)
      setPos((prev) => {
        if (!prev) return null
        return {
          x: Math.min(Math.max(10, prev.x), maxX),
          y: Math.min(Math.max(10, prev.y), maxY),
        }
      })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Timer para refrescar tiempos cada 10 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setAhora(new Date())
    }, 10000)
    return () => clearInterval(timer)
  }, [])

  // Guardar snoozes en localStorage
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

  // Manejadores de arrastre con Pointer Events (Mouse y Touch unificados)
  const iniciarArrastre = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('a') || target.closest('input')) {
      return
    }

    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {}

    const currentPos = posRef.current || {
      x: window.innerWidth - 400,
      y: window.innerHeight - 260,
    }

    dragInfoRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      initialX: currentPos.x,
      initialY: currentPos.y,
      movio: false,
    }
    setArrastrando(true)
  }

  const moverArrastre = (e: React.PointerEvent) => {
    if (!dragInfoRef.current || dragInfoRef.current.pointerId !== e.pointerId) return

    const deltaX = e.clientX - dragInfoRef.current.startX
    const deltaY = e.clientY - dragInfoRef.current.startY

    if (!dragInfoRef.current.movio && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) {
      dragInfoRef.current.movio = true
    }

    const cardW = minimizado ? 240 : Math.min(390, window.innerWidth - 20)
    const cardH = minimizado ? 54 : 260

    const maxX = Math.max(8, window.innerWidth - cardW - 8)
    const maxY = Math.max(8, window.innerHeight - cardH - 8)

    const nuevoX = Math.min(Math.max(8, dragInfoRef.current.initialX + deltaX), maxX)
    const nuevoY = Math.min(Math.max(8, dragInfoRef.current.initialY + deltaY), maxY)

    setPos({ x: nuevoX, y: nuevoY })
  }

  const terminarArrastre = (e: React.PointerEvent) => {
    if (!dragInfoRef.current || dragInfoRef.current.pointerId !== e.pointerId) return

    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}

    if (dragInfoRef.current.movio && posRef.current) {
      try {
        localStorage.setItem('chefsy_alerta_pos', JSON.stringify(posRef.current))
      } catch {}
    }

    dragInfoRef.current = null
    setArrastrando(false)
  }

  // Filtrar y ordenar los pedidos verdaderamente demorados
  const pedidosDemorados: InfoDemora[] = useMemo(() => {
    if (!config.habilitada || !pedidos || pedidos.length === 0) return []

    const ahoraMs = ahora.getTime()
    const lista: InfoDemora[] = []

    pedidos.forEach((p) => {
      if (p.estado === 'entregado' || p.estado === 'cancelado' || p.archivado) return

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
            motivo: `Lleva ${minCocina} min en cocina (límite: ${config.tiempoCocinaMinutos} min)`,
            etapa: 'cocina',
          })
          return
        }
      }

      // 2. Demorado en Listo
      if (p.estado === 'listo') {
        const minListo = obtenerMinutosTranscurridos(p.listo_at || p.created_at, ahora, p.fecha, p.hora)
        if (minListo >= config.tiempoListoMinutos) {
          lista.push({
            pedido: p,
            minutos: minListo,
            motivo: `Lleva ${minListo} min empaquetado (límite: ${config.tiempoListoMinutos} min)`,
            etapa: 'listo',
          })
          return
        }
      }

      // 3. Demorado en Nuevo
      if (p.estado === 'nuevo') {
        if (minTotal >= 5) {
          lista.push({
            pedido: p,
            minutos: minTotal,
            motivo: `Lleva ${minTotal} min sin comandar a cocina`,
            etapa: 'nuevo',
          })
          return
        }
      }

      // 4. Demora total
      if (minTotal >= config.tiempoTotalMinutos) {
        lista.push({
          pedido: p,
          minutos: minTotal,
          motivo: `Lleva ${minTotal} min activo en total (límite: ${config.tiempoTotalMinutos} min)`,
          etapa: 'total',
        })
      }
    })

    return lista.sort((a, b) => b.minutos - a.minutos)
  }, [pedidos, config, snoozes, ahora])

  // Ajustar índice si la lista se achica
  useEffect(() => {
    if (indiceActual >= pedidosDemorados.length) {
      setIndiceActual(Math.max(0, pedidosDemorados.length - 1))
    }
  }, [pedidosDemorados.length, indiceActual])

  // Reproducir sonido suave de alarma periódicamente
  useEffect(() => {
    if (!config.sonidoHabilitado || pedidosDemorados.length === 0) return
    const ahoraMs = Date.now()
    if (ahoraMs - ultimoSonidoRef.current > 45000) {
      ultimoSonidoRef.current = ahoraMs
      reproducirAlarmaDemora()
    }
  }, [pedidosDemorados.length, config.sonidoHabilitado])

  if (!montado || !config.habilitada || pedidosDemorados.length === 0 || pathname === '/cadeteria') {
    return null
  }

  const actual = pedidosDemorados[indiceActual] || pedidosDemorados[0]
  if (!actual) return null

  const pedido = actual.pedido
  const totalItems = pedido.productos.reduce((sum, p) => sum + p.cantidad, 0)
  const productosResumen =
    pedido.productos
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

  const etiquetaAccionRapida =
    pedido.estado === 'nuevo'
      ? 'A Cocina'
      : pedido.estado === 'en_cocina'
      ? 'Listo'
      : pedido.estado === 'listo' && pedido.tipoEntrega === 'delivery'
      ? 'En Camino'
      : 'Entregado'

  // ── Vista Minimizada (Píldora Chefsy Flotante y Arrastrable) ───────────────
  if (minimizado) {
    return (
      <div
        style={pos ? { left: `${pos.x}px`, top: `${pos.y}px` } : undefined}
        onPointerDown={iniciarArrastre}
        onPointerMove={moverArrastre}
        onPointerUp={terminarArrastre}
        onPointerCancel={terminarArrastre}
        className={cn(
          'fixed z-[9999] select-none touch-none',
          arrastrando ? 'cursor-grabbing' : 'cursor-grab'
        )}
      >
        <button
          type="button"
          onClick={() => {
            if (dragInfoRef.current?.movio) return
            setMinimizado(false)
          }}
          className="flex items-center gap-2.5 bg-[#141416] border-2 border-amber-500/80 hover:border-amber-400 text-white px-3.5 py-2 rounded-full shadow-[0_12px_35px_rgba(0,0,0,0.85)] hover:scale-105 active:scale-95 transition-all group cursor-pointer"
          title="Arrastrar para mover • Clic para ver pedido demorado"
        >
          <GripHorizontal size={13} className="text-white/40 group-hover:text-amber-400 transition-colors" />
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
          </span>
          <span className="font-bebas text-sm sm:text-base tracking-wider text-amber-300">
            {pedidosDemorados.length} {pedidosDemorados.length === 1 ? 'PEDIDO DEMORADO' : 'PEDIDOS DEMORADOS'}
          </span>
          <Maximize2 size={13} className="text-slate-400 group-hover:text-white transition-colors ml-0.5" />
        </button>
      </div>
    )
  }

  // ── Vista Completa: Ventana Flotante Estilo Chefsy ────────────────────────
  return (
    <aside
      aria-label="Alerta de pedido demorado"
      style={pos ? { left: `${pos.x}px`, top: `${pos.y}px` } : undefined}
      className={cn(
        'fixed z-[9999] w-[calc(100vw-1.25rem)] sm:w-[390px] max-w-[390px] select-none',
        arrastrando ? 'cursor-grabbing' : ''
      )}
    >
      <div className="bg-[#141416] border-2 border-[#2f2f36] hover:border-amber-500/60 rounded-2xl md:rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden relative transition-colors duration-200">
        
        {/* Barra de acento Chefsy superior */}
        <div className="h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500" />

        {/* ── BARRA SUPERIOR DE ARRASTRE (Grip & Header) ───────────────────── */}
        <div
          onPointerDown={iniciarArrastre}
          onPointerMove={moverArrastre}
          onPointerUp={terminarArrastre}
          onPointerCancel={terminarArrastre}
          className="pt-2.5 pb-2 px-3.5 flex items-center justify-between cursor-grab active:cursor-grabbing touch-none select-none border-b border-white/5 bg-white/[0.02]"
          title="Mantené presionado para arrastrar por la pantalla"
        >
          {/* Identidad Chefsy */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <ChefHat size={13} />
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bebas text-base sm:text-lg text-white tracking-wider leading-none">
                CHEFSY ALERTA
              </span>
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </span>
            </div>
          </div>

          {/* Manija táctil central de arrastre */}
          <div className="flex items-center gap-1 text-white/35 hover:text-amber-400 transition-colors px-2 py-0.5 rounded-full bg-white/5 border border-white/10 shrink-0">
            <GripHorizontal size={13} />
            <span className="text-[9px] font-bold uppercase tracking-wider hidden sm:inline">Mover</span>
          </div>

          {/* Controles: Paginador y Minimizar */}
          <div className="flex items-center gap-1 shrink-0">
            {pedidosDemorados.length > 1 && (
              <div className="flex items-center gap-0.5 mr-1 bg-[#202024] border border-white/10 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIndiceActual((prev) => (prev > 0 ? prev - 1 : pedidosDemorados.length - 1))
                  }}
                  className="p-1 hover:bg-white/10 text-slate-400 hover:text-white rounded transition-colors"
                  title="Anterior pedido demorado"
                >
                  <ChevronLeft size={13} />
                </button>
                <span className="text-[10px] font-mono font-bold text-amber-300 px-1">
                  {indiceActual + 1}/{pedidosDemorados.length}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIndiceActual((prev) => (prev < pedidosDemorados.length - 1 ? prev + 1 : 0))
                  }}
                  className="p-1 hover:bg-white/10 text-slate-400 hover:text-white rounded transition-colors"
                  title="Siguiente pedido demorado"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setMinimizado(true)
              }}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Minimizar a píldora"
            >
              <Minus size={14} />
            </button>
          </div>
        </div>

        {/* ── CUERPO: INFORMACIÓN DEL PEDIDO ──────────────────────────────── */}
        <div className="p-3.5 sm:p-4 flex flex-col gap-3">
          {/* Fila Cliente, Canal y Monto */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-sans font-bold text-sm sm:text-base text-white truncate leading-tight">
                  {pedido.cliente}
                </h4>
                <span className="font-mono text-[10px] font-bold text-amber-400/90 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.2 rounded">
                  #{pedido.id.slice(-4)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-1 flex items-center gap-1 font-medium">
                {pedido.tipoEntrega === 'delivery' ? (
                  <>
                    <Bike size={12} className="text-sky-400 shrink-0" />
                    <span>Delivery {pedido.direccion ? `• ${pedido.direccion}` : ''}</span>
                  </>
                ) : pedido.tipoEntrega === 'retiro' ? (
                  <>
                    <Store size={12} className="text-emerald-400 shrink-0" />
                    <span>Retiro en mostrador</span>
                  </>
                ) : (
                  <>
                    <Utensils size={12} className="text-amber-400 shrink-0" />
                    <span>Consumo en salón</span>
                  </>
                )}
              </p>
            </div>

            <div className="flex flex-col items-end shrink-0">
              <span className="font-bebas text-lg sm:text-xl text-emerald-400 tracking-wide leading-none">
                {formatearPrecio(pedido.total)}
              </span>
            </div>
          </div>

          {/* Caja Operativa de Demora (Chefsy Alert Card) */}
          <div className="bg-gradient-to-br from-amber-500/15 via-[#1c1a16] to-[#161618] border border-amber-500/35 rounded-xl p-3 flex items-start gap-2.5 shadow-inner">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <Clock size={15} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-amber-200 leading-snug">
                {actual.motivo}
              </p>
              <p className="text-[11px] text-slate-300/80 truncate mt-1 font-normal">
                <span className="font-semibold text-slate-200">{totalItems} ítems:</span> {productosResumen}
              </p>
            </div>
          </div>

          {/* ── BOTONERA DE ACCIONES CHEFSY ───────────────────────────────── */}
          <div className="flex items-center gap-2 pt-0.5">
            {/* Botón Aplazar (Snooze Alarma) */}
            <button
              type="button"
              onClick={handleAplazar}
              className="flex-1 bg-[#222226] hover:bg-[#2c2c32] active:scale-95 text-slate-200 border border-white/10 hover:border-amber-500/30 rounded-xl py-2.5 px-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              title={`Silenciar este aviso por ${config.tiempoAplazoMinutos} minutos`}
            >
              <BellOff size={13} className="text-amber-400" />
              <span>Aplazar {config.tiempoAplazoMinutos}m</span>
            </button>

            {/* Botón Acción Rápida (Hero CTA) */}
            <button
              type="button"
              onClick={handleAvanzarSiguienteEstado}
              className="flex-1 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 active:scale-95 text-slate-950 font-black rounded-xl py-2.5 px-3 text-xs transition-all flex items-center justify-center gap-1 shadow-lg shadow-amber-500/20 cursor-pointer truncate"
              title="Avanzar estado del pedido inmediatamente"
            >
              <span>{etiquetaAccionRapida}</span>
            </button>

            {/* Botón Abrir Detalle Pedido */}
            <button
              type="button"
              onClick={handleIrAlPedido}
              className="p-2.5 bg-[#222226] hover:bg-[#2c2c32] text-slate-400 hover:text-white rounded-xl border border-white/10 hover:border-white/20 transition-colors cursor-pointer shrink-0"
              title="Ver pedido en el panel de pedidos"
            >
              <ExternalLink size={14} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}

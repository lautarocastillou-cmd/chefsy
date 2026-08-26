'use client'

import { useState, useEffect, useRef } from 'react'
import { usarPedidos } from '@/contexto/PedidosContexto'
import { obtenerProblemasOperativos, AlertaOperativa } from '@/lib/problemas'
import { obtenerSiguienteEstado, obtenerEtiquetaAccionEstado } from '@/lib/entrega'
import { AlertTriangle, Clock, ChefHat, Bike, Eye, User, ShieldCheck, ArrowRight } from 'lucide-react'

interface PropsSeccionProblemas {
  alAbrirPedido: (pedido: any) => void
}

export default function SeccionProblemas({ alAbrirPedido }: PropsSeccionProblemas) {
  const { pedidos, cambiarEstado, asignarCadete, cadetes } = usarPedidos()
  const [alertas, setAlertas] = useState<AlertaOperativa[]>([])

  // Ref para acceder a la lista más reciente de pedidos sin recrear intervalos
  const pedidosRef = useRef(pedidos)
  useEffect(() => {
    pedidosRef.current = pedidos
  }, [pedidos])

  // Función interna para recalcular las alertas operativas
  const recalcularAlertas = (listaPedidos = pedidosRef.current) => {
    const problemas = obtenerProblemasOperativos(listaPedidos)
    setAlertas(problemas)
  }

  // Recalcular en tiempo real cuando cambien los pedidos
  useEffect(() => {
    recalcularAlertas(pedidos)
  }, [pedidos])

  // Temporizador para recalcular cada 30 segundos (solo se monta una vez)
  useEffect(() => {
    const intervalo = setInterval(() => {
      recalcularAlertas(pedidosRef.current)
    }, 30000)

    return () => clearInterval(intervalo)
  }, [])

  if (alertas.length === 0) {
    return (
      <div className="bg-gradient-to-r from-emerald-50/80 via-white to-emerald-50/40 dark:from-emerald-950/20 dark:via-slate-900/60 dark:to-emerald-950/10 border border-emerald-200/80 dark:border-emerald-900/40 rounded-3xl p-4 md:p-5 flex items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-800 dark:text-slate-100">Servicio bajo control</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Óptimo
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              No se detectaron demoras ni problemas operativos activos en este momento.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <AlertTriangle size={18} className="text-rose-500 animate-bounce" />
          <span>Alertas Operativas ({alertas.length})</span>
        </h2>
        <span className="text-[11px] bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-900/50 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
          Atención Requerida
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {alertas.map((alerta) => {
          const pedido = alerta.pedido
          const siguienteEstado = obtenerSiguienteEstado(pedido.estado, pedido.tipoEntrega)
          
          const esAlta = alerta.prioridad === 'alta'
          const claseCard = esAlta
            ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200'
            : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200'

          const claseBadge = esAlta
            ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
            : 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'

          let Icono = AlertTriangle
          if (alerta.tipo === 'atrasado') Icono = Clock
          if (alerta.tipo === 'cocina_demorado') Icono = ChefHat
          if (alerta.tipo === 'sin_cadete') Icono = Bike

          return (
            <div
              key={alerta.id}
              className={`border rounded-3xl p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-md ${claseCard}`}
            >
              {/* Información de la Alerta */}
              <div className="flex items-start gap-3.5">
                <div className={`p-2.5 rounded-2xl shrink-0 border ${claseBadge}`}>
                  <Icono size={20} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="font-black text-sm md:text-base">
                      Pedido de {alerta.cliente}
                    </span>
                    <span className="text-xs font-mono font-bold bg-white/70 dark:bg-slate-900/60 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      #{pedido.id.slice(-4).toUpperCase()}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${claseBadge}`}>
                      Prioridad {alerta.prioridad}
                    </span>
                  </div>
                  <p className="text-xs md:text-sm font-semibold opacity-90">
                    {alerta.mensaje}
                  </p>
                </div>
              </div>

              {/* Acciones Rápidas */}
              <div className="flex items-center flex-wrap gap-2 shrink-0 self-end md:self-center">
                {/* Asignar Cadete Rápido si no tiene y es Delivery */}
                {pedido.tipoEntrega === 'delivery' && !pedido.cadete_id && (
                  <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <span className="text-[10px] font-bold px-1.5 text-slate-500 dark:text-slate-400 flex items-center gap-0.5">
                      <User size={11} /> Asignar:
                    </span>
                    {cadetes.map((cadete) => (
                      <button
                        key={cadete.id}
                        onClick={() => asignarCadete(pedido.id, cadete.id, cadete.nombre)}
                        className="bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs transition-all active:scale-95 cursor-pointer"
                      >
                        {cadete.nombre}
                      </button>
                    ))}
                  </div>
                )}

                {/* Avanzar Estado Rápido */}
                {siguienteEstado && (
                  <button
                    onClick={() => cambiarEstado(pedido.id, siguienteEstado)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-2 px-3.5 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{obtenerEtiquetaAccionEstado(siguienteEstado, pedido.tipoEntrega)}</span>
                    <ArrowRight size={13} />
                  </button>
                )}

                {/* Abrir Detalle del Pedido */}
                <button
                  onClick={() => alAbrirPedido(pedido)}
                  className="bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold py-2 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                  title="Abrir detalles de la orden"
                >
                  <Eye size={14} />
                  <span>Detalles</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}


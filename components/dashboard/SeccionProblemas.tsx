'use client'

import { useState, useEffect } from 'react'
import { usarPedidos } from '@/contexto/PedidosContexto'
import { obtenerProblemasOperativos, AlertaOperativa } from '@/lib/problemas'
import { LISTA_CADETES, obtenerSiguienteEstado, obtenerEtiquetaAccionEstado } from '@/lib/entrega'
import { AlertTriangle, Clock, ChefHat, Bike, Eye, User, CheckCircle2 } from 'lucide-react'

interface PropsSeccionProblemas {
  alAbrirPedido: (pedido: any) => void
}

export default function SeccionProblemas({ alAbrirPedido }: PropsSeccionProblemas) {
  const { pedidos, cambiarEstado, asignarCadete } = usarPedidos()
  const [alertas, setAlertas] = useState<AlertaOperativa[]>([])

  // Función interna para recalcular las alertas operativas
  const recalcularAlertas = () => {
    const problemas = obtenerProblemasOperativos(pedidos)
    setAlertas(problemas)
  }

  // Recalcular cuando cambien los pedidos
  useEffect(() => {
    recalcularAlertas()
  }, [pedidos])

  // Temporizador para recalcular cada 30 segundos en el cliente
  useEffect(() => {
    const intervalo = setInterval(() => {
      recalcularAlertas()
    }, 30000)

    return () => clearInterval(intervalo)
  }, [pedidos])

  if (alertas.length === 0) {
    return (
      <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-150 dark:border-emerald-900/30 rounded-2xl p-4 flex items-center gap-3 text-emerald-800 dark:text-emerald-400">
        <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />
        <div>
          <p className="font-semibold text-sm">Servicio bajo control</p>
          <p className="text-xs opacity-90">No se detectaron problemas operativos activos en este momento.</p>
        </div>
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800 dark:text-[#e6e6e6] flex items-center gap-2">
          🚨 Problemas Operativos ({alertas.length})
        </h2>
        <span className="text-xs bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
          Atención Requerida
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {alertas.map((alerta) => {
          const pedido = alerta.pedido
          const siguienteEstado = obtenerSiguienteEstado(pedido.estado, pedido.tipoEntrega)
          
          // Estilos según la prioridad
          const esAlta = alerta.prioridad === 'alta'
          const clasePrioridad = esAlta
            ? 'bg-red-50 dark:bg-red-950/15 border-red-200 dark:border-red-900/40 text-red-900 dark:text-red-300'
            : 'bg-amber-50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/35 text-amber-900 dark:text-amber-300'

          const claseBadge = esAlta
            ? 'bg-red-200 dark:bg-red-950/50 text-red-800 dark:text-red-400'
            : 'bg-amber-200 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400'

          // Icono correspondiente según el tipo de alerta
          let Icono = AlertTriangle
          if (alerta.tipo === 'atrasado') Icono = Clock
          if (alerta.tipo === 'cocina_demorado') Icono = ChefHat
          if (alerta.tipo === 'sin_cadete') Icono = Bike

          return (
            <div
              key={alerta.id}
              className={`border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-sm ${clasePrioridad}`}
            >
              {/* Información de la Alerta */}
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${claseBadge}`}>
                  <Icono size={20} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="font-bold text-sm md:text-base">
                      Pedido de {alerta.cliente}
                    </span>
                    <span className="text-xs font-mono bg-white/60 dark:bg-black/20 px-2 py-0.5 rounded border border-current/10">
                      #{pedido.id.slice(-4).toUpperCase()}
                    </span>
                    <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${claseBadge}`}>
                      Prioridad {alerta.prioridad}
                    </span>
                  </div>
                  <p className="text-xs md:text-sm font-medium opacity-90">
                    ⚠️ {alerta.mensaje}
                  </p>
                </div>
              </div>

              {/* Acciones Rápidas */}
              <div className="flex items-center flex-wrap gap-2.5 shrink-0 self-end md:self-center">
                {/* Asignar Cadete Rápido si no tiene y es Delivery */}
                {pedido.tipoEntrega === 'delivery' && !pedido.cadete_id && (
                  <div className="flex items-center gap-1 bg-white/50 dark:bg-black/10 p-1 rounded-xl border border-current/10">
                    <span className="text-[10px] font-bold px-1.5 text-gray-500 dark:text-gray-400 flex items-center gap-0.5">
                      <User size={10} /> Asignar:
                    </span>
                    {LISTA_CADETES.map((cadete) => (
                      <button
                        key={cadete.id}
                        onClick={() => asignarCadete(pedido.id, cadete.id, cadete.nombre)}
                        className="bg-white hover:bg-slate-100 dark:bg-[#333] dark:hover:bg-[#444] text-gray-800 dark:text-[#e6e6e6] text-xs font-semibold py-1 px-2.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xs transition-all active:scale-95 cursor-pointer"
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
                    className="bg-chefsy hover:bg-chefsy-700 text-white text-xs font-bold py-1.5 px-3 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                  >
                    <span>{obtenerEtiquetaAccionEstado(siguienteEstado, pedido.tipoEntrega)}</span>
                  </button>
                )}

                {/* Abrir Detalle del Pedido */}
                <button
                  onClick={() => alAbrirPedido(pedido)}
                  className="bg-white hover:bg-slate-100 dark:bg-[#333] dark:hover:bg-[#444] text-gray-700 dark:text-[#e6e6e6] text-xs font-bold py-1.5 px-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1"
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

'use client'

import { useEffect, useState } from 'react'
import { TipoTurno } from '@/tipos'
import {
  calcularComparativaSemanal,
  MetricasTurno,
  ResultadoComparativa,
} from '@/lib/comparativa'
import { formatearPrecio } from '@/lib/utils'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  ShoppingBag,
  Receipt,
  Calendar,
} from 'lucide-react'

interface PropsComparativaTurnoVivo {
  fecha: string
  turnoTipo: TipoTurno
  metricasActuales: MetricasTurno
}

export default function ComparativaTurnoVivo({
  fecha,
  turnoTipo,
  metricasActuales,
}: PropsComparativaTurnoVivo) {
  const [comparativa, setComparativa] = useState<ResultadoComparativa | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let activo = true
    async function cargar() {
      setCargando(true)
      const res = await calcularComparativaSemanal(fecha, turnoTipo, metricasActuales)
      if (activo) {
        setComparativa(res)
        setCargando(false)
      }
    }

    if (metricasActuales.totalPedidos > 0) {
      cargar()
    } else {
      setCargando(false)
      setComparativa(null)
    }

    return () => {
      activo = false
    }
  }, [fecha, turnoTipo, metricasActuales.facturacionNeta, metricasActuales.totalPedidos])

  if (cargando || !comparativa || comparativa.sinHistorial) {
    return null
  }

  const {
    porcentajeFacturacion,
    diferenciaFacturacion,
    porcentajePedidos,
    diferenciaPedidos,
    porcentajeTicket,
    diferenciaTicket,
    esPositivo,
    anterior,
    diaNombre,
    fechaAnterior,
  } = comparativa

  // Formatear fecha anterior DD/MM
  const fechaPartes = fechaAnterior.split('-')
  const fechaFormateada = `${fechaPartes[2]}/${fechaPartes[1]}`
  const turnoTexto = turnoTipo === 'mediodia' ? 'mediodía' : 'noche'

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 shadow-lg border border-indigo-800/40 relative overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Resplandor decorativo de fondo */}
      <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 relative z-10">
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-xl shrink-0 mt-0.5 shadow-sm ${
              esPositivo
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}
          >
            {esPositivo ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/20">
                📊 Comparativa en Vivo
              </span>
              <span className="text-xs text-indigo-300 flex items-center gap-1 font-medium">
                <Calendar size={12} /> vs {diaNombre} anterior ({fechaFormateada})
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-black text-white mt-1 leading-tight">
              {esPositivo ? (
                <>
                  Vendiste{' '}
                  <span className="text-emerald-400">
                    +{porcentajeFacturacion}% ({formatearPrecio(metricasActuales.facturacionNeta)})
                  </span>{' '}
                  más en el turno {turnoTexto}
                </>
              ) : (
                <>
                  Facturación{' '}
                  <span className="text-rose-400">
                    {porcentajeFacturacion}% ({formatearPrecio(metricasActuales.facturacionNeta)})
                  </span>{' '}
                  vs {formatearPrecio(anterior.facturacionNeta)} anterior
                </>
              )}
            </h3>
          </div>
        </div>

        {/* Badges de métricas complementarias */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-indigo-800/40">
          {/* Ticket promedio */}
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-1.5 flex items-center gap-2">
            <Receipt size={14} className="text-indigo-400" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none">
                Ticket Promedio
              </span>
              <span className="text-xs font-black text-white">
                {formatearPrecio(metricasActuales.ticketPromedio)}{' '}
                <span
                  className={`text-[10px] font-bold ${
                    diferenciaTicket >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  ({diferenciaTicket >= 0 ? '+' : ''}
                  {porcentajeTicket}%)
                </span>
              </span>
            </div>
          </div>

          {/* Cantidad de pedidos */}
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-1.5 flex items-center gap-2">
            <ShoppingBag size={14} className="text-amber-400" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none">
                Pedidos
              </span>
              <span className="text-xs font-black text-white">
                {metricasActuales.totalPedidos}{' '}
                <span className="text-slate-400 text-[10px] font-normal">
                  vs {anterior.totalPedidos} ant.{' '}
                </span>
                <span
                  className={`text-[10px] font-bold ${
                    diferenciaPedidos >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  ({diferenciaPedidos >= 0 ? '+' : ''}
                  {porcentajePedidos}%)
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

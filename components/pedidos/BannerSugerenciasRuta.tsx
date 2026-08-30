'use client'

import { useMemo, useState } from 'react'
import { usarPedidos } from '@/contexto/PedidosContexto'
import { detectarGruposCercanos, GrupoBatch } from '@/lib/batching'
import { Sparkles, Bike, MapPin, Check, ChevronRight } from 'lucide-react'
import { formatearPrecio } from '@/lib/utils'

export default function BannerSugerenciasRuta() {
  const { pedidos, cadetes, asignarCadete } = usarPedidos()
  const [procesandoGrupoId, setProcesandoGrupoId] = useState<string | null>(null)

  const firmaCandidatos = useMemo(() => {
    return pedidos
      .filter((p) => p.tipoEntrega === 'delivery' && p.estado !== 'entregado' && p.estado !== 'cancelado')
      .map((p) => `${p.id}:${p.cadete_id || ''}:${p.coordenadas?.latitud || ''}`)
      .join('|')
  }, [pedidos])

  const grupos = useMemo(() => {
    return detectarGruposCercanos(pedidos, 750)
  }, [firmaCandidatos])

  // Filtrar grupos que tengan pedidos sin asignar o con cadetes diferentes
  const gruposConOportunidad = useMemo(() => {
    return grupos.filter((g) => {
      const cadetesDistintos = new Set(g.pedidos.map((p) => p.cadete_id).filter(Boolean))
      const haySinCadete = g.pedidos.some((p) => !p.cadete_id)
      return haySinCadete || cadetesDistintos.size > 1
    })
  }, [grupos])

  if (gruposConOportunidad.length === 0) return null

  const asignarGrupoACadete = async (grupo: GrupoBatch, cadeteId: string, cadeteNombre: string) => {
    setProcesandoGrupoId(grupo.id)
    try {
      await Promise.all(
        grupo.pedidos.map((p) => asignarCadete(p.id, cadeteId, cadeteNombre))
      )
    } finally {
      setProcesandoGrupoId(null)
    }
  }

  return (
    <div className="space-y-3 mb-6 animate-in fade-in slide-in-from-top-3 duration-200">
      {gruposConOportunidad.map((grupo) => {
        const nombresClientes = grupo.pedidos.map((p) => p.cliente.split(' ')[0]).join(' y ')
        const totalGrupo = grupo.pedidos.reduce((acc, p) => acc + p.total, 0)
        const cadeteActual = cadetes.find((c) => c.id === grupo.cadeteId)

        return (
          <div
            key={grupo.id}
            className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/30 dark:via-slate-900 dark:to-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-emerald-500 text-white shrink-0 shadow-sm mt-0.5">
                <Sparkles size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-black tracking-wider uppercase bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                    💡 Ruta Inteligente ({grupo.pedidos.length} pedidos)
                  </span>
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <MapPin size={12} /> A solo {grupo.distanciaMaximaMetros}m entre sí
                  </span>
                </div>
                <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm mt-1 truncate">
                  Entrega conjunta para {nombresClientes}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Total acumulado: <strong>{formatearPrecio(totalGrupo)}</strong> • Ahorrá 1 viaje asignando al mismo cadete.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto shrink-0 flex-wrap">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 hidden lg:inline">
                Asignar ruta a:
              </span>
              <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                {cadetes.filter((c) => c.gps_activo).map((c) => {
                  const esAsignado = c.id === grupo.cadeteId
                  return (
                    <button
                      key={c.id}
                      disabled={procesandoGrupoId === grupo.id}
                      onClick={() => asignarGrupoACadete(grupo, c.id, c.nombre)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 ${
                        esAsignado
                          ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Bike size={13} />
                      <span>{c.nombre}</span>
                      {esAsignado && <Check size={12} />}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

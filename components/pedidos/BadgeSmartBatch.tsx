'use client'

import { useState, useMemo } from 'react'
import { Pedido } from '@/tipos'
import { obtenerVecinosCercanos } from '@/lib/batching'
import { usarPedidos } from '@/contexto/PedidosContexto'
import { MapPin, Bike, Check, X, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PropsBadgeSmartBatch {
  pedido: Pedido
}

export default function BadgeSmartBatch({ pedido }: PropsBadgeSmartBatch) {
  const { pedidos, cadetes, asignarCadete } = usarPedidos()
  const [abierto, setAbierto] = useState(false)
  const [asignando, setAsignando] = useState(false)

  const vecinos = useMemo(() => {
    return obtenerVecinosCercanos(pedido, pedidos, 750)
  }, [pedido, pedidos])

  if (vecinos.length === 0) return null

  const primerVecino = vecinos[0]
  const tieneCadeteDiferente =
    primerVecino.pedido.cadete_id &&
    pedido.cadete_id &&
    primerVecino.pedido.cadete_id !== pedido.cadete_id

  const cadeteSugeridoId = primerVecino.pedido.cadete_id || pedido.cadete_id
  const cadeteSugerido = cadetes.find((c) => c.id === cadeteSugeridoId)

  const unificarCadete = async (cadeteId: string, cadeteNombre: string) => {
    setAsignando(true)
    try {
      await Promise.all([
        asignarCadete(pedido.id, cadeteId, cadeteNombre),
        ...vecinos.map((v) => asignarCadete(v.pedido.id, cadeteId, cadeteNombre)),
      ])
      setAbierto(false)
    } finally {
      setAsignando(false)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all shadow-2xs cursor-pointer active:scale-95",
          tieneCadeteDiferente
            ? "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
            : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
        )}
        title="Ver pedidos cercanos para entrega conjunta"
      >
        <Sparkles size={11} className="text-emerald-600 dark:text-emerald-400" />
        <span>
          Misma zona: <strong>{primerVecino.pedido.cliente.split(' ')[0]}</strong> ({primerVecino.distanciaMetros}m)
          {vecinos.length > 1 ? ` +${vecinos.length - 1}` : ''}
        </span>
      </button>

      {abierto && (
        <div className="absolute left-0 top-full mt-1.5 z-40 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-slate-100">
              <MapPin size={14} className="text-emerald-600" />
              <span>Smart Batching (Entrega Conjunta)</span>
            </div>
            <button
              onClick={() => setAbierto(false)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={13} />
            </button>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2 leading-tight">
            Destinos a menos de 750m. Asigná el mismo cadete para ahorrar viajes:
          </p>

          <div className="space-y-1.5 max-h-36 overflow-y-auto mb-3">
            {vecinos.map((v) => (
              <div
                key={v.pedido.id}
                className="flex items-center justify-between p-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs"
              >
                <div className="min-w-0 pr-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                    {v.pedido.cliente}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {v.pedido.cadete_nombre ? `🛵 ${v.pedido.cadete_nombre}` : 'Sin cadete'}
                  </span>
                </div>
                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-full shrink-0">
                  {v.distanciaMetros}m
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-2 space-y-1.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Asignar todos a:
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {cadetes.filter((c) => c.gps_activo).map((c) => (
                <button
                  key={c.id}
                  disabled={asignando}
                  onClick={() => unificarCadete(c.id, c.nombre)}
                  className="px-2 py-1.5 text-left text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 text-slate-700 dark:text-slate-200 transition-colors truncate flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <Bike size={12} className="shrink-0" />
                  <span className="truncate">{c.nombre}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

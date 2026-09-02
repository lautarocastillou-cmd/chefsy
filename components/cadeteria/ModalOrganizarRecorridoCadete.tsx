'use client'

import { useState, useEffect } from 'react'
import { Pedido } from '@/tipos'
import { usarPedidos } from '@/contexto/PedidosContexto'
import { UBICACION_LOCAL, calcularDistanciaKm } from '@/lib/ubicacion'
import { X, ArrowUp, ArrowDown, Sparkles, MapPin, Check, Bike } from 'lucide-react'

interface PropsModalOrganizarRecorridoCadete {
  abierto: boolean
  onCerrar: () => void
  cadeteId: string
  cadeteNombre: string
  pedidos: Pedido[]
}

export function ordenarPedidosPorCercaniaOManual(pedidos: Pedido[]): Pedido[] {
  return [...pedidos].sort((a, b) => {
    // 1. Si tienen orden_entrega manual, respetar ese orden
    const ordA = a.orden_entrega != null ? Number(a.orden_entrega) : null
    const ordB = b.orden_entrega != null ? Number(b.orden_entrega) : null
    if (ordA !== null && ordB !== null) return ordA - ordB
    if (ordA !== null) return -1
    if (ordB !== null) return 1

    // 2. Cercanía al local Chefsy
    const distA = a.coordenadas?.latitud && a.coordenadas?.longitud
      ? calcularDistanciaKm(UBICACION_LOCAL, a.coordenadas)
      : 9999
    const distB = b.coordenadas?.latitud && b.coordenadas?.longitud
      ? calcularDistanciaKm(UBICACION_LOCAL, b.coordenadas)
      : 9999

    if (Math.abs(distA - distB) > 0.05) {
      return distA - distB
    }

    return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
  })
}

export default function ModalOrganizarRecorridoCadete({
  abierto,
  onCerrar,
  cadeteId,
  cadeteNombre,
  pedidos,
}: PropsModalOrganizarRecorridoCadete) {
  const { reordenarPedidosCadete } = usarPedidos()
  const [listaLocal, setListaLocal] = useState<Pedido[]>([])
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (abierto) {
      setListaLocal(ordenarPedidosPorCercaniaOManual(pedidos))
    }
  }, [abierto, pedidos])

  if (!abierto) return null

  const moverElemento = (indiceActual: number, direccion: 'arriba' | 'abajo') => {
    const nuevoIndice = direccion === 'arriba' ? indiceActual - 1 : indiceActual + 1
    if (nuevoIndice < 0 || nuevoIndice >= listaLocal.length) return

    const copia = [...listaLocal]
    const temp = copia[indiceActual]
    copia[indiceActual] = copia[nuevoIndice]
    copia[nuevoIndice] = temp

    // Reasignar orden_entrega explícito según su nueva posición
    const conOrden = copia.map((p, idx) => ({
      ...p,
      orden_entrega: idx + 1,
    }))

    setListaLocal(conOrden)
  }

  const restablecerPorCercania = () => {
    const ordenadosPorDist = [...pedidos].sort((a, b) => {
      const distA = a.coordenadas?.latitud && a.coordenadas?.longitud
        ? calcularDistanciaKm(UBICACION_LOCAL, a.coordenadas)
        : 9999
      const distB = b.coordenadas?.latitud && b.coordenadas?.longitud
        ? calcularDistanciaKm(UBICACION_LOCAL, b.coordenadas)
        : 9999
      return distA - distB
    }).map((p, idx) => ({
      ...p,
      orden_entrega: idx + 1,
    }))

    setListaLocal(ordenadosPorDist)
  }

  const guardarCambios = async () => {
    setGuardando(true)
    try {
      const payload = listaLocal.map((p, idx) => ({
        id: p.id,
        orden_entrega: idx + 1,
      }))
      await reordenarPedidosCadete(cadeteId, payload)
      onCerrar()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Bike size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 leading-tight">
                Recorrido de {cadeteNombre}
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-400">
                {listaLocal.length} pedidos asignados en curso
              </p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Instrucciones y botón de autocalcular */}
        <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border-b border-amber-200/50 dark:border-amber-900/30 flex items-center justify-between gap-2">
          <p className="text-[11px] text-amber-900 dark:text-amber-200 leading-tight">
            Los clientes verán su turno según este orden. Podés moverlos arriba/abajo:
          </p>
          <button
            type="button"
            onClick={restablecerPorCercania}
            className="shrink-0 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-1 transition-all cursor-pointer"
            title="Ordenar automáticamente desde la casa más cercana al local hasta la más lejana"
          >
            <Sparkles size={11} className="text-emerald-500" />
            <span>Por cercanía</span>
          </button>
        </div>

        {/* Lista de paradas */}
        <div className="p-4 space-y-2.5 overflow-y-auto flex-1">
          {listaLocal.map((pedido, idx) => {
            const distKm = pedido.coordenadas
              ? calcularDistanciaKm(UBICACION_LOCAL, pedido.coordenadas)
              : null
            const distTexto = distKm !== null
              ? distKm < 1 ? `${Math.round(distKm * 1000)}m` : `${distKm.toFixed(1)}km`
              : 'Sin GPS'

            const esPrimero = idx === 0
            const esUltimo = idx === listaLocal.length - 1

            return (
              <div
                key={pedido.id}
                className="flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-emerald-500/40 transition-all shadow-2xs"
              >
                {/* Número de parada */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                    esPrimero
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    {idx + 1}°
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {pedido.cliente}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {pedido.direccion || 'Sin dirección'}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                      <MapPin size={10} />
                      <span>{distTexto} del local</span>
                      {esPrimero && (
                        <span className="ml-1 text-[9px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.2 rounded-full font-bold">
                          Próxima parada
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botones de movimiento */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => moverElemento(idx, 'arriba')}
                    disabled={esPrimero}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-25 transition-all cursor-pointer"
                    title="Mover arriba"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moverElemento(idx, 'abajo')}
                    disabled={esUltimo}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-25 transition-all cursor-pointer"
                    title="Mover abajo"
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer con Guardar */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCerrar}
            disabled={guardando}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardarCambios}
            disabled={guardando}
            className="px-4 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Check size={14} />
            <span>{guardando ? 'Guardando...' : 'Aplicar Recorrido'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { memo, useCallback, useState, type MouseEvent } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ArrowDown,
  ArrowUp,
  Bike,
  DollarSign,
  Download,
  GripVertical,
  MapPin,
  Navigation,
  Plus,
  PowerOff,
  RefreshCw,
  Radio,
  Zap,
} from 'lucide-react'
import { Pedido } from '@/tipos'
import type { CadeteData } from '@/components/torre-control/MapaGlobal'
import { cn } from '@/lib/utils'

type PedidoArrastrado = { cadeteId: string; pedidoId: string } | null

interface TarjetaCadeteOperativoProps {
  cadete: CadeteData
  pedidosRuta: Pedido[]
  isSelected: boolean
  guardandoOrden: boolean
  apagando: boolean
  pedidoArrastrado: PedidoArrastrado
  onSelect: (cadeteId: string) => void
  onAbrirPagoExtra: (cadeteId: string) => void
  onApagarGps: (event: MouseEvent, cadeteId: string, cadeteNombre: string) => void
  onMoverPedido: (cadeteId: string, pedidosRuta: Pedido[], indice: number, destino: number) => void
  onArrastrarPedido: (cadeteId: string, pedidoId: string) => void
  onSoltarPedido: (cadeteId: string, pedidosRuta: Pedido[], pedidoDestinoId: string) => void
  onFinalizarArrastre: () => void
}

/** Tarjeta aislada: un cambio de GPS de otro cadete no re-renderiza este bloque. */
function TarjetaCadeteOperativo({
  cadete,
  pedidosRuta,
  isSelected,
  guardandoOrden,
  apagando,
  pedidoArrastrado,
  onSelect,
  onAbrirPagoExtra,
  onApagarGps,
  onMoverPedido,
  onArrastrarPedido,
  onSoltarPedido,
  onFinalizarArrastre,
}: TarjetaCadeteOperativoProps) {
  const puedeEditarRuta = pedidosRuta.length > 1

  return (
    <Card
      onClick={() => onSelect(cadete.id)}
      className={cn(
        'overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md dark:bg-slate-950',
        isSelected ? 'border-blue-400 ring-2 ring-blue-100 dark:ring-blue-950' : 'border-slate-200 dark:border-slate-800'
      )}
    >
      <div className={cn('h-1', pedidosRuta.length > 0 ? 'bg-orange-500' : 'bg-emerald-500')} />
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <Bike className="h-4 w-4 shrink-0 text-slate-500" />
            <span className="truncate text-sm font-extrabold text-slate-900 dark:text-slate-100">{cadete.nombre}</span>
          </div>
          <Badge
            variant="secondary"
            className={cn(
              'shrink-0 px-1.5 py-0 text-[9px] font-black uppercase tracking-wide',
              cadete.gps_activo
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            )}
          >
            {cadete.gps_activo ? 'Online' : 'Offline'}
          </Badge>
        </div>

        {pedidosRuta.length > 0 ? (
          <div className="mt-2 rounded-lg border border-orange-200 bg-orange-50/70 p-2 dark:border-orange-900/50 dark:bg-orange-950/20">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-wide text-orange-700 dark:text-orange-300">
                {pedidosRuta.length} {pedidosRuta.length === 1 ? 'entrega' : 'entregas'} en ruta
              </span>
              {puedeEditarRuta && guardandoOrden && (
                <span className="text-[10px] font-bold text-orange-700 dark:text-orange-300">Guardando…</span>
              )}
            </div>
            <div className="space-y-1">
              {pedidosRuta.map((pedido, idx) => (
                <div
                  key={pedido.id}
                  draggable={puedeEditarRuta}
                  onDragStart={() => onArrastrarPedido(cadete.id, pedido.id)}
                  onDragEnd={onFinalizarArrastre}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => onSoltarPedido(cadete.id, pedidosRuta, pedido.id)}
                  className={cn(
                    'group flex items-center gap-1 text-[11px] text-slate-700 dark:text-slate-200',
                    puedeEditarRuta && 'cursor-grab active:cursor-grabbing',
                    pedidoArrastrado?.pedidoId === pedido.id && 'opacity-40'
                  )}
                >
                  <GripVertical className="h-3.5 w-3.5 shrink-0 text-orange-300 opacity-0 transition-opacity group-hover:opacity-100" />
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white font-black text-orange-700 shadow-sm dark:bg-slate-900 dark:text-orange-300">{idx + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{pedido.cliente}</span>
                  {puedeEditarRuta && (
                    <span className="flex shrink-0 items-center gap-0.5 opacity-70">
                      <button
                        type="button"
                        aria-label={`Subir ${pedido.cliente}`}
                        disabled={idx === 0 || guardandoOrden}
                        onClick={(event) => {
                          event.stopPropagation()
                          onMoverPedido(cadete.id, pedidosRuta, idx, idx - 1)
                        }}
                        className="rounded p-0.5 text-orange-700 hover:bg-orange-200 disabled:opacity-20 dark:text-orange-300 dark:hover:bg-orange-900/50"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Bajar ${pedido.cliente}`}
                        disabled={idx === pedidosRuta.length - 1 || guardandoOrden}
                        onClick={(event) => {
                          event.stopPropagation()
                          onMoverPedido(cadete.id, pedidosRuta, idx, idx + 1)
                        }}
                        className="rounded p-0.5 text-orange-700 hover:bg-orange-200 disabled:opacity-20 dark:text-orange-300 dark:hover:bg-orange-900/50"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-2 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 py-2 text-[10px] dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <span className="font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Disponible</span>
            <span className="text-slate-500 dark:text-slate-400">Sin entregas</span>
          </div>
        )}

        <div className="mt-2 flex items-center gap-1.5">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onSelect(cadete.id)
            }}
            className="flex-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 text-[10px] font-extrabold text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300"
          >
            <Navigation className="mr-1 inline h-3 w-3" /> Ver mapa
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onAbrirPagoExtra(cadete.id)
            }}
            className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[10px] font-extrabold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
          >
            <DollarSign className="mr-1 inline h-3 w-3" /> Extra
          </button>
          {cadete.gps_activo && (
            <button
              type="button"
              disabled={apagando}
              onClick={(event) => onApagarGps(event, cadete.id, cadete.nombre)}
              className="rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-[10px] font-extrabold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
              title="Apagar GPS"
            >
              <PowerOff className={cn('h-3 w-3', apagando && 'animate-spin')} />
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function mismaCadeteVisible(a: CadeteData, b: CadeteData) {
  return a.id === b.id &&
    a.nombre === b.nombre &&
    a.gps_activo === b.gps_activo
}

const TarjetaCadeteOperativoMemo = memo(TarjetaCadeteOperativo, (anterior, siguiente) =>
  mismaCadeteVisible(anterior.cadete, siguiente.cadete) &&
  anterior.pedidosRuta === siguiente.pedidosRuta &&
  anterior.isSelected === siguiente.isSelected &&
  anterior.guardandoOrden === siguiente.guardandoOrden &&
  anterior.apagando === siguiente.apagando &&
  anterior.pedidoArrastrado?.cadeteId === siguiente.pedidoArrastrado?.cadeteId &&
  anterior.pedidoArrastrado?.pedidoId === siguiente.pedidoArrastrado?.pedidoId &&
  anterior.onSelect === siguiente.onSelect &&
  anterior.onAbrirPagoExtra === siguiente.onAbrirPagoExtra &&
  anterior.onApagarGps === siguiente.onApagarGps &&
  anterior.onMoverPedido === siguiente.onMoverPedido &&
  anterior.onArrastrarPedido === siguiente.onArrastrarPedido &&
  anterior.onSoltarPedido === siguiente.onSoltarPedido &&
  anterior.onFinalizarArrastre === siguiente.onFinalizarArrastre
)

export interface PanelCadetesOperativoProps {
  cadetes: CadeteData[]
  pedidosActivosCount: number
  pedidosOrdenadosPorCadete: Map<string, Pedido[]>
  focusedId: string | null
  isLoading: boolean
  isRefreshing: boolean
  apagandoId: string | null
  guardandoOrdenCadete: string | null
  vistaMobile: 'mapa' | 'cadetes'
  onSelectCadete: (cadeteId: string) => void
  onAbrirPagoExtra: (cadeteId: string | null) => void
  onAbrirCompartirUbicacion: () => void
  onActualizar: () => void
  onApagarGps: (event: MouseEvent, cadeteId: string, cadeteNombre: string) => void
  onGuardarOrden: (cadeteId: string, pedidosOrdenados: Pedido[]) => void
}

function PanelCadetesOperativo({
  cadetes,
  pedidosActivosCount,
  pedidosOrdenadosPorCadete,
  focusedId,
  isLoading,
  isRefreshing,
  apagandoId,
  guardandoOrdenCadete,
  vistaMobile,
  onSelectCadete,
  onAbrirPagoExtra,
  onAbrirCompartirUbicacion,
  onActualizar,
  onApagarGps,
  onGuardarOrden,
}: PanelCadetesOperativoProps) {
  const [pedidoArrastrado, setPedidoArrastrado] = useState<PedidoArrastrado>(null)

  const seleccionarCadete = useCallback((cadeteId: string) => {
    onSelectCadete(cadeteId)
  }, [onSelectCadete])

  const moverPedidoEnRuta = useCallback((cadeteId: string, pedidosRuta: Pedido[], indice: number, destino: number) => {
    if (destino < 0 || destino >= pedidosRuta.length) return
    const nuevaLista = [...pedidosRuta]
    const [movido] = nuevaLista.splice(indice, 1)
    nuevaLista.splice(destino, 0, movido)
    onGuardarOrden(cadeteId, nuevaLista)
  }, [onGuardarOrden])

  const soltarPedidoEnRuta = useCallback((cadeteId: string, pedidosRuta: Pedido[], pedidoDestinoId: string) => {
    if (!pedidoArrastrado || pedidoArrastrado.cadeteId !== cadeteId || pedidoArrastrado.pedidoId === pedidoDestinoId) return
    const origen = pedidosRuta.findIndex((pedido) => pedido.id === pedidoArrastrado.pedidoId)
    const destino = pedidosRuta.findIndex((pedido) => pedido.id === pedidoDestinoId)
    if (origen >= 0 && destino >= 0) moverPedidoEnRuta(cadeteId, pedidosRuta, origen, destino)
    setPedidoArrastrado(null)
  }, [moverPedidoEnRuta, pedidoArrastrado])

  const abrirPagoExtra = useCallback((cadeteId: string) => {
    onAbrirPagoExtra(cadeteId)
  }, [onAbrirPagoExtra])
  const arrastrarPedido = useCallback((cadeteId: string, pedidoId: string) => {
    setPedidoArrastrado({ cadeteId, pedidoId })
  }, [])
  const finalizarArrastre = useCallback(() => setPedidoArrastrado(null), [])

  return (
    <div className={`${vistaMobile === 'cadetes' ? 'flex' : 'hidden'} pointer-events-auto absolute bottom-3 left-3 top-[4.5rem] z-20 w-[min(22rem,calc(100%-1.5rem))] flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-gray-50/95 shadow-xl backdrop-blur md:left-24 md:flex dark:border-slate-700 dark:bg-slate-900/95`}>
      <div className="border-b border-slate-200 bg-white px-3 py-3 shrink-0 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="flex items-center gap-1.5 text-base font-black text-slate-900 dark:text-slate-100">
              <Zap className="h-4 w-4 shrink-0 text-emerald-500" />
              Cadetería
            </h1>
            <p className="mt-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
              {cadetes.length} cadetes · {pedidosActivosCount} pedidos activos
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onAbrirPagoExtra(null)}
              className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1.5 text-[10px] font-extrabold text-white shadow-sm transition-all hover:bg-emerald-500 active:scale-95 cursor-pointer"
              title="Registrar viaje a la carnicería, insumos o pago extra"
            >
              <Plus size={14} />
              <span>Pago extra</span>
            </button>
            <button
              type="button"
              onClick={onAbrirCompartirUbicacion}
              className="rounded-lg p-1.5 text-sky-600 transition-colors hover:bg-sky-50 hover:text-sky-700"
              title="Compartir ubicación en vivo de un cadete sin necesidad de login"
            >
              <Radio size={16} className="animate-pulse" />
            </button>
            <a
              href="/api/cadeteria/descargar-apk"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              title="Descargar última versión APK de Cadetería"
            >
              <Download size={16} />
            </a>
            <button
              type="button"
              onClick={onActualizar}
              disabled={isRefreshing}
              className={`rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 ${isRefreshing ? 'animate-spin' : ''}`}
              title="Actualizar ahora"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-3 min-h-0">
        <div className="space-y-3">
          {isLoading && cadetes.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm animate-pulse">Cargando estado de cadetes...</div>
          ) : cadetes.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No hay cadetes registrados en el sistema.</p>
            </div>
          ) : (
            cadetes.map((cadete) => (
              <TarjetaCadeteOperativoMemo
                key={cadete.id}
                cadete={cadete}
                pedidosRuta={pedidosOrdenadosPorCadete.get(cadete.id.toLowerCase()) ?? []}
                isSelected={focusedId === cadete.id}
                guardandoOrden={guardandoOrdenCadete === cadete.id}
                apagando={apagandoId === cadete.id}
                pedidoArrastrado={pedidoArrastrado}
                onSelect={seleccionarCadete}
                onAbrirPagoExtra={abrirPagoExtra}
                onApagarGps={onApagarGps}
                onMoverPedido={moverPedidoEnRuta}
                onArrastrarPedido={arrastrarPedido}
                onSoltarPedido={soltarPedidoEnRuta}
                onFinalizarArrastre={finalizarArrastre}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export default memo(PanelCadetesOperativo)

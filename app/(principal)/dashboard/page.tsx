'use client'

// ─────────────────────────────────────────────────────
// app/(principal)/dashboard/page.tsx
// Vista principal con métricas del día y pedidos recientes.
// ─────────────────────────────────────────────────────

import { useState } from 'react'
import { usarPedidos } from '@/contexto/PedidosContexto'
import dynamic from 'next/dynamic'
import TarjetaPedido from '@/components/pedidos/TarjetaPedido'
import TarjetaPedidoErrorBoundary from '@/components/pedidos/TarjetaPedidoErrorBoundary'
import Link from 'next/link'

import { 
  Clock, 
  Clock3, 
  ChefHat, 
  CheckCircle2,
  Plus,
  X, 
  DollarSign,
  Calendar, 
  ArrowUpRight, 
  PlusCircle, 
  FileText 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usarTemaNotificacion } from '@/contexto/TemaNotificacionContexto'

const GeneradorQrCadete = dynamic(() => import('@/components/dashboard/GeneradorQrCadete'), { ssr: false })
const ImpresorTicketsPromocionales = dynamic(() => import('@/components/dashboard/ImpresorTicketsPromocionales'), { ssr: false })
const FormularioPedido = dynamic(() => import('@/components/pedidos/FormularioPedido'), {
  loading: () => <div className="p-8 text-center text-slate-400">Cargando formulario...</div>,
  ssr: false,
})
import { formatearPrecio } from '@/lib/utils'
import { obtenerFechaNegocio } from '@/lib/tiempo'
import { esPedidoDelivery } from '@/lib/entrega'


export default function PaginaDashboard() {
  const { pedidos, cadetes, estadoTurno, abrirModalNuevoPedido } = usarPedidos()
  const { agregarNotificacion } = usarTemaNotificacion()
  const [pedidoSeleccionadoParaEditar, setPedidoSeleccionadoParaEditar] = useState<any>(null)
  const [cadeteFiltro, setCadeteFiltro] = useState<string>('todos')

  const handleAbrirNuevoPedido = () => {
    abrirModalNuevoPedido()
  }

  // ── Cálculo de métricas ──
  const activos   = pedidos.filter((p) => !['entregado', 'cancelado'].includes(p.estado)).length
  const enCocina  = pedidos.filter((p) => p.estado === 'en_cocina').length

  const hoy = obtenerFechaNegocio()
  const pedidosHoy = pedidos.filter((p) => p.fecha === hoy)
  
  // Pedidos completados en general hoy (entregados hoy de cualquier tipo)
  const completadosHoy = pedidosHoy.filter((p) => p.estado === 'entregado').length

  // Pedidos delivery entregados hoy (viajes) filtrados por cadete
  const enviosHoy = pedidosHoy.filter((p) => 
    p.estado === 'entregado' && 
    esPedidoDelivery(p) &&
    (cadeteFiltro === 'todos' || p.cadete_id === cadeteFiltro)
  )
  const totalViajes = enviosHoy.length
  
  // Total recaudado por envíos de delivery hoy
  const totalEnvios = enviosHoy.reduce((acc, curr) => acc + (curr.costoEnvio || 0), 0)

  // Últimos 6 pedidos para la vista rápida (excluyendo cancelados y entregados)
  const pedidosRecientes = pedidos.filter(p => p.estado !== 'cancelado' && p.estado !== 'entregado').slice(0, 6)

  const fechaActual = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="space-y-8 pb-12">
      {/* ── Banner de Bienvenida Chefsy Modern ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#122e21] via-[#1d4633] to-[#0f241a] dark:from-[#0d1f16] dark:via-[#153426] dark:to-[#09150f] text-white p-7 sm:p-9 shadow-xl border border-emerald-500/20">
        {/* Texturas de fondo */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-emerald-600/5 rounded-full pointer-events-none" />
        
        {/* Watermark sutil */}
        <div className="absolute top-1/2 -translate-y-1/2 -right-8 opacity-10 pointer-events-none rotate-12">
          <ChefHat size={260} strokeWidth={1.2} />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 dark:bg-black/30 border border-white/15 text-emerald-100 text-xs font-semibold tracking-wide">
                <Calendar size={13} className="text-emerald-300" />
                <span className="capitalize">{fechaActual}</span>
              </div>
              
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-bold">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${estadoTurno.activo ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${estadoTurno.activo ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                </span>
                <span>{estadoTurno.activo ? 'Turno Noche Activo' : 'Turno Cerrado'}</span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
              ¡Hola Lauta! <span className="text-emerald-300 font-medium text-2xl sm:text-3xl block sm:inline">¿Listo para el servicio?</span>
            </h1>
          </div>

          <div className="shrink-0 flex flex-wrap items-center gap-3">
            <ImpresorTicketsPromocionales botonVariante="banner" />
            <Button
              onClick={handleAbrirNuevoPedido}
              className="w-full sm:w-auto h-auto gap-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black px-6 py-3.5 rounded-2xl text-sm shadow-lg shadow-emerald-950/40 hover:scale-[1.02] active:scale-[0.98] border border-emerald-400/30"
            >
              <Plus size={18} strokeWidth={3} />
              Nuevo Pedido
            </Button>
          </div>
        </div>
      </div>


      {/* ── Estado operativo ── */}
      <section>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[240px_1px_1fr] lg:items-center">
            {/* Izquierda: ahora mismo */}
            <div className="space-y-2.5">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums leading-none">
                  {activos}
                </span>
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 leading-tight">
                  pedido{activos === 1 ? '' : 's'} en curso
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {enCocina} en cocina · {completadosHoy} cerrados hoy
              </p>
              {/* avance del día */}
              <div className="space-y-1.5 pt-1">
                <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
                    style={{
                      width: `${pedidosHoy.length === 0 ? 0 : Math.round((completadosHoy / pedidosHoy.length) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  {pedidosHoy.length === 0
                    ? 'Sin movimiento todavía hoy'
                    : `${completadosHoy} de ${pedidosHoy.length} cerrados`}
                </p>
              </div>
            </div>

            {/* divisor */}
            <div className="hidden lg:block w-px self-stretch bg-slate-200 dark:bg-slate-800" />

            {/* Derecha: desglose */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-0 sm:divide-x divide-slate-200 dark:divide-slate-800">
              <div className="flex sm:px-5 sm:first:pl-0 items-start gap-2.5">
                <ChefHat size={17} className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500" />
                <div className="min-w-0">
                  <p className="text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white leading-none">{enCocina}</p>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1.5">En cocina</p>
                </div>
              </div>

              <div className="flex sm:px-5 items-start gap-2.5">
                <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500" />
                <div className="min-w-0">
                  <p className="text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white leading-none">{completadosHoy}</p>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1.5">Completados hoy</p>
                </div>
              </div>

              <div className="flex sm:px-5 sm:last:pr-0 items-start gap-2.5">
                <DollarSign size={17} className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white leading-none">{formatearPrecio(totalEnvios)}</p>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1.5">
                    {totalViajes} viaje{totalViajes === 1 ? '' : 's'} hoy
                  </p>
                  <select
                    value={cadeteFiltro}
                    onChange={(e) => setCadeteFiltro(e.target.value)}
                    className="mt-1 w-full bg-transparent text-[11px] font-semibold text-slate-400 dark:text-slate-500 outline-none cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                  >
                    <option value="todos">Todos los cadetes</option>
                    {cadetes.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Accesos y Pedidos Recientes ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-8">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Clock3 size={18} className="text-emerald-600 dark:text-emerald-400" />
              <span>Pedidos Recientes</span>
            </h2>
            <Button asChild variant="link" className="h-auto p-0 text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 gap-1 no-underline">
              <Link href="/pedidos">
                Ver todos
                <ArrowUpRight size={14} />
              </Link>
            </Button>
          </div>

          {pedidosRecientes.length === 0 ? (
            <div className="bg-white/60 dark:bg-slate-900/60 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center py-16 px-6 space-y-2 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
                <Clock size={24} />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No hay pedidos pendientes</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
                Las órdenes en curso aparecerán automáticamente aquí para su seguimiento en vivo.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {pedidosRecientes.map((pedido) => (
                <TarjetaPedidoErrorBoundary key={pedido.id} pedidoId={pedido.id} cliente={pedido.cliente}>
                  <TarjetaPedido 
                    pedido={pedido} 
                    onEditarPedido={(p) => setPedidoSeleccionadoParaEditar(p)} 
                  />
                </TarjetaPedidoErrorBoundary>
              ))}
            </div>
          )}
        </section>

        {/* ── Herramientas laterales ── */}
        <section className="space-y-4">
          <div className="space-y-3">
            <GeneradorQrCadete />
            <ImpresorTicketsPromocionales botonVariante="sidebar" />
          </div>
        </section>
      </div>

      {/* ── Botón Flotante para Crear Pedido ── */}
      <Button
        onClick={handleAbrirNuevoPedido}
        className="fixed bottom-6 right-6 z-40 h-auto gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-black py-3.5 px-6 rounded-full shadow-xl shadow-emerald-950/30 hover:scale-105 active:scale-[0.95] text-sm border border-emerald-400/30"
      >
        <Plus size={18} strokeWidth={3} />
        Crear Pedido
      </Button>

      {/* ── Modal de Editar Pedido (Alertas Operativas) ── */}
      {pedidoSeleccionadoParaEditar && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 transition-opacity duration-150 animate-in fade-in"
          onClick={() => setPedidoSeleccionadoParaEditar(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide animate-in zoom-in-95 duration-150 relative" 
            data-lenis-prevent="true"
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-6 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <FileText size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                    Editar Pedido
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">Modificar los datos de la orden</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPedidoSeleccionadoParaEditar(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </Button>
            </div>
            {/* Contenido del Modal */}
            <div className="px-6 pb-6">
              <FormularioPedido pedidoInicial={pedidoSeleccionadoParaEditar} onClose={() => setPedidoSeleccionadoParaEditar(null)} />
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

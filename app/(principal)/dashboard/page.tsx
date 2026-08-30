'use client'

// ─────────────────────────────────────────────────────
// app/(principal)/dashboard/page.tsx
// Vista principal con métricas del día y pedidos recientes.
// ─────────────────────────────────────────────────────

import { useState } from 'react'
import { usarPedidos } from '@/contexto/PedidosContexto'
import dynamic from 'next/dynamic'
import TarjetaMetrica from '@/components/dashboard/TarjetaMetrica'
import TarjetaPedido from '@/components/pedidos/TarjetaPedido'
import SeccionProblemas from '@/components/dashboard/SeccionProblemas'
import Link from 'next/link'

import { 
  Clock, 
  Clock3, 
  ChefHat, 
  CheckCircle2, 
  Users, 
  Plus, 
  X, 
  DollarSign, 
  Activity, 
  Zap, 
  Calendar, 
  ArrowUpRight, 
  PlusCircle, 
  FileText 
} from 'lucide-react'
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
import { useAtajoNuevoPedido } from '@/hooks/useAtajoNuevoPedido'
import BannerSugerenciasRuta from '@/components/pedidos/BannerSugerenciasRuta'

export default function PaginaDashboard() {
  const { pedidos, cadetes, estadoTurno } = usarPedidos()
  const { agregarNotificacion } = usarTemaNotificacion()
  const [modalNuevoPedidoAbierto, setModalNuevoPedidoAbierto] = useState(false)
  const [pedidoSeleccionadoParaEditar, setPedidoSeleccionadoParaEditar] = useState<any>(null)
  const [cadeteFiltro, setCadeteFiltro] = useState<string>('todos')

  const handleAbrirNuevoPedido = () => {
    if (!estadoTurno.activo) {
      agregarNotificacion('Debés iniciar el turno desde "Cierre de Caja" para cargar pedidos.', 'warning')
      return
    }
    setModalNuevoPedidoAbierto(true)
  }

  useAtajoNuevoPedido({
    modalAbierto: modalNuevoPedidoAbierto || Boolean(pedidoSeleccionadoParaEditar),
    onAbrirModal: handleAbrirNuevoPedido,
  })

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
                <span>{estadoTurno.activo ? `Turno ${estadoTurno.tipoTurno === 'mediodia' ? 'Mediodía' : 'Noche'} Activo` : 'Turno Cerrado'}</span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
              ¡Hola Lauta! <span className="text-emerald-300 font-medium text-2xl sm:text-3xl block sm:inline">¿Listo para el servicio?</span>
            </h1>
          </div>

          <div className="shrink-0 flex flex-wrap items-center gap-3">
            <ImpresorTicketsPromocionales botonVariante="banner" />
            <button
              onClick={handleAbrirNuevoPedido}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black px-6 py-3.5 rounded-2xl text-sm transition-all duration-200 shadow-lg shadow-emerald-950/40 hover:scale-[1.02] active:scale-98 cursor-pointer border border-emerald-400/30"
            >
              <Plus size={18} strokeWidth={3} />
              <span>Nuevo Pedido</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Sección Inteligente de Problemas Operativos ── */}
      <SeccionProblemas alAbrirPedido={setPedidoSeleccionadoParaEditar} />

      {/* ── Métricas ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Activity size={18} className="text-emerald-600 dark:text-emerald-400" />
            <span>Métricas del Servicio</span>
          </h2>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Tiempo real</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <TarjetaMetrica
            etiqueta="Pedidos Activos"
            valor={activos}
            descripcion="Pendientes de entregar"
            variante="azul"
            icon={Clock}
          />
          <TarjetaMetrica
            etiqueta="En Cocina"
            valor={enCocina}
            descripcion="Órdenes en preparación"
            variante="naranja"
            icon={ChefHat}
          />
          <TarjetaMetrica
            etiqueta="Completados Hoy"
            valor={completadosHoy}
            descripcion="Entregas totales hoy"
            variante="verde"
            icon={CheckCircle2}
          />
          <TarjetaMetrica
            etiqueta="Envíos y Viajes"
            valor={formatearPrecio(totalEnvios)}
            descripcion={`${totalViajes} ${totalViajes === 1 ? 'viaje' : 'viajes'} de delivery hoy`}
            variante="neutro"
            icon={DollarSign}
          >
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <select
                value={cadeteFiltro}
                onChange={(e) => setCadeteFiltro(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 py-1.5 px-2.5 rounded-xl text-[11px] font-bold outline-none cursor-pointer transition-colors"
              >
                <option value="todos">Todos los cadetes</option>
                {cadetes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </TarjetaMetrica>
        </div>
      </section>

      {/* ── Rutas y Grupos Inteligentes (Smart Batching) ── */}
      <BannerSugerenciasRuta />

      {/* ── Accesos y Pedidos Recientes ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-8">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Clock3 size={18} className="text-emerald-600 dark:text-emerald-400" />
              <span>Pedidos Recientes</span>
            </h2>
            <Link
              href="/pedidos"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 flex items-center gap-1 transition-colors"
            >
              <span>Ver todos</span>
              <ArrowUpRight size={14} />
            </Link>
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
                <TarjetaPedido 
                  key={pedido.id} 
                  pedido={pedido} 
                  onEditarPedido={(p) => setPedidoSeleccionadoParaEditar(p)} 
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Acceso rápido lateral ── */}
        <section className="space-y-4">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Zap size={18} className="text-amber-500" />
            <span>Atajos Directos</span>
          </h2>
          
          <div className="space-y-3">
            <Link
              href="/cadeteria"
              className="group flex items-center justify-between p-4 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3.5">
                <div className="bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 p-3 rounded-2xl text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                  <Users size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-100">Cadetería</p>
                  <p className="text-[11px] text-slate-400 font-medium">Gestión de repartidores</p>
                </div>
              </div>
              <ArrowUpRight size={16} className="text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </Link>
            
            <Link
              href="/pedidos"
              className="group flex items-center justify-between p-4 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-800 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3.5">
                <div className="bg-sky-500/10 dark:bg-sky-500/15 border border-sky-500/20 p-3 rounded-2xl text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform">
                  <Clock size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-100">Historial</p>
                  <p className="text-[11px] text-slate-400 font-medium">Todos los pedidos y filtros</p>
                </div>
              </div>
              <ArrowUpRight size={16} className="text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </Link>
          </div>

          <div className="pt-2 space-y-3">
            <GeneradorQrCadete />
            <ImpresorTicketsPromocionales botonVariante="sidebar" />
          </div>
        </section>
      </div>

      {/* ── Botón Flotante para Crear Pedido ── */}
      <button
        onClick={handleAbrirNuevoPedido}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-black py-3.5 px-6 rounded-full shadow-xl shadow-emerald-950/30 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all text-sm cursor-pointer border border-emerald-400/30"
      >
        <Plus size={18} strokeWidth={3} />
        <span>Crear Pedido</span>
      </button>

      {/* ── Modal de Nuevo Pedido ── */}
      {modalNuevoPedidoAbierto && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 transition-opacity duration-150 animate-in fade-in"
          onClick={() => setModalNuevoPedidoAbierto(false)}
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
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <PlusCircle size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                    Nuevo Pedido
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">Registrar una orden manual desde el panel</p>
                </div>
              </div>
              <button
                onClick={() => setModalNuevoPedidoAbierto(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            {/* Contenido del Modal */}
            <div className="px-6 pb-6">
              <FormularioPedido onClose={() => setModalNuevoPedidoAbierto(false)} />
            </div>
          </div>
        </div>
      )}

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
              <button
                onClick={() => setPedidoSeleccionadoParaEditar(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none cursor-pointer"
              >
                <X size={20} />
              </button>
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

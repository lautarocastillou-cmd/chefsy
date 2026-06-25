'use client'

// ─────────────────────────────────────────────────────
// app/(principal)/dashboard/page.tsx
// Vista principal con métricas del día y pedidos recientes.
// ─────────────────────────────────────────────────────

import { useState } from 'react'
import { usarPedidos } from '@/contexto/PedidosContexto'
import TarjetaMetrica from '@/components/dashboard/TarjetaMetrica'
import TarjetaPedido from '@/components/pedidos/TarjetaPedido'
import SeccionProblemas from '@/components/dashboard/SeccionProblemas'
import GeneradorQrCadete from '@/components/dashboard/GeneradorQrCadete'
import Link from 'next/link'
import { Clock, ChefHat, Bike, CheckCircle2, Users, Plus, X, MessageCircle, Music, ExternalLink, DollarSign } from 'lucide-react'
import { usarTemaNotificacion } from '@/contexto/TemaNotificacionContexto'
import FormularioPedido from '@/components/pedidos/FormularioPedido'
import { formatearPrecio } from '@/lib/utils'
import { obtenerFechaNegocio } from '@/lib/tiempo'
import { esPedidoDelivery } from '@/lib/entrega'

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
    <div className="space-y-8 pb-8">
      {/* ── Banner de Bienvenida ── */}
      <div className="bg-gradient-to-r from-chefsy-800 to-chefsy-600 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
          <ChefHat size={300} />
        </div>
        <div className="relative z-10">
          <p className="text-chefsy-100 font-medium mb-1 capitalize">{fechaActual}</p>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">¡Hola Lauta! ¿Listo para el servicio?</h1>
        </div>
      </div>

      {/* ── Sección Inteligente de Problemas Operativos ── */}
      <SeccionProblemas alAbrirPedido={setPedidoSeleccionadoParaEditar} />

      {/* ── Métricas ── */}
      <section>
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          📊 Estado del día
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-5">
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
            <div className="mt-3 pt-2 border-t border-gray-150 dark:border-slate-800/80">
              <select
                value={cadeteFiltro}
                onChange={(e) => setCadeteFiltro(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#3a3a3a] border border-slate-200 dark:border-[#4d4d4d] text-gray-700 dark:text-[#e6e6e6] py-1 px-2 rounded-lg text-[11px] font-semibold outline-none cursor-pointer transition-colors"
              >
                <option value="todos">👥 Todos los cadetes</option>
                {cadetes.map(c => (
                  <option key={c.id} value={c.id}>🛵 {c.nombre}</option>
                ))}
              </select>
            </div>
          </TarjetaMetrica>
        </div>
      </section>

      {/* ── Accesos y Pedidos Recientes ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-8">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-[#e6e6e6] flex items-center gap-2">
              ⏱️ Pedidos recientes
            </h2>
            <Link
              href="/pedidos"
              className="text-sm font-medium text-chefsy-600 hover:text-chefsy-800 transition-colors"
            >
              Ver todos →
            </Link>
          </div>

          {pedidosRecientes.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center py-16 text-gray-400 text-sm">
              <Clock className="mx-auto mb-3 opacity-50" size={32} />
              No hay pedidos registrados aún.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {pedidosRecientes.map((pedido) => (
                <TarjetaPedido key={pedido.id} pedido={pedido} />
              ))}
            </div>
          )}
        </section>

        {/* ── Acceso rápido lateral ── */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-gray-800">⚡ Atajos</h2>
          
          <Link
            href="/cadeteria"
            className="group flex items-center gap-4 p-4 rounded-2xl border border-gray-200 hover:border-chefsy-300 hover:bg-chefsy-50 dark:border-slate-800 dark:hover:bg-slate-900 transition-all shadow-sm"
          >
            <div className="bg-chefsy-100 dark:bg-chefsy-950/20 p-3 rounded-xl text-chefsy-600 group-hover:scale-110 transition-transform">
              <Users size={24} />
            </div>
            <div>
              <p className="font-semibold text-gray-850 dark:text-slate-100">Cadetería</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Gestión de repartidores</p>
            </div>
          </Link>
          
          <Link
            href="/pedidos"
            className="group flex items-center gap-4 p-4 rounded-2xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-800 dark:hover:bg-slate-900 transition-all shadow-sm"
          >
            <div className="bg-blue-100 dark:bg-blue-950/20 p-3 rounded-xl text-blue-600 group-hover:scale-110 transition-transform">
              <Clock size={24} />
            </div>
            <div>
              <p className="font-semibold text-gray-850 dark:text-slate-100">Historial</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Todos los pedidos</p>
            </div>
          </Link>

          <div className="border-t border-slate-100 dark:border-slate-800 my-4" />

          
          <GeneradorQrCadete />
        </section>
      </div>

      {/* ── Botón Flotante para Crear Pedido ── */}
      <button
        onClick={handleAbrirNuevoPedido}
        className="fixed bottom-6 right-6 z-40 bg-chefsy hover:bg-chefsy-700 text-white font-bold py-3 px-5 rounded-full shadow-lg shadow-chefsy/20 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all text-sm cursor-pointer"
      >
        <Plus size={18} />
        <span>Crear Pedido</span>
      </button>

      {/* ── Modal de Nuevo Pedido ── */}
      {modalNuevoPedidoAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide animate-in zoom-in-95 duration-200 relative">
            {/* Header del Modal */}
            <div className="sticky top-0 z-10 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md flex items-center justify-between border-b border-gray-150 dark:border-slate-800 p-6 pb-4 mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                  📝 Nuevo Pedido
                </h2>
                <p className="text-xs text-gray-400 dark:text-slate-400">Registrar una orden desde el panel</p>
              </div>
              <button
                onClick={() => setModalNuevoPedidoAbierto(false)}
                className="text-slate-450 hover:text-slate-600 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide animate-in zoom-in-95 duration-200 relative">
            {/* Header del Modal */}
            <div className="sticky top-0 z-10 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md flex items-center justify-between border-b border-gray-150 dark:border-slate-800 p-6 pb-4 mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                  📝 Editar Pedido
                </h2>
                <p className="text-xs text-gray-400 dark:text-slate-400">Modificar los datos de la orden</p>
              </div>
              <button
                onClick={() => setPedidoSeleccionadoParaEditar(null)}
                className="text-slate-450 hover:text-slate-600 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
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

'use client'

// ─────────────────────────────────────────────────────
// app/(principal)/dashboard/page.tsx
// Vista principal con métricas del día y pedidos recientes.
// ─────────────────────────────────────────────────────

import { useState } from 'react'
import { usarPedidos } from '@/contexto/PedidosContexto'
import TarjetaMetrica from '@/components/dashboard/TarjetaMetrica'
import TarjetaPedido from '@/components/pedidos/TarjetaPedido'
import Link from 'next/link'
import { Clock, ChefHat, Bike, CheckCircle2, Users, Plus, X, MessageCircle, Music, ExternalLink } from 'lucide-react'
import FormularioPedido from '@/components/pedidos/FormularioPedido'

export default function PaginaDashboard() {
  const { pedidos } = usarPedidos()
  const [modalNuevoPedidoAbierto, setModalNuevoPedidoAbierto] = useState(false)

  // ── Cálculo de métricas ──
  const activos   = pedidos.filter((p) => !['entregado', 'cancelado'].includes(p.estado)).length
  const enCocina  = pedidos.filter((p) => p.estado === 'en_cocina').length
  const enReparto = pedidos.filter((p) => p.estado === 'en_reparto').length
  const entregados = pedidos.filter((p) => p.estado === 'entregado').length

  // Últimos 6 pedidos para la vista rápida
  const pedidosRecientes = pedidos.slice(0, 6)

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

      {/* ── Métricas ── */}
      <section>
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          📊 Estado del día
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
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
            etiqueta="En Reparto"
            valor={enReparto}
            variante="morado"
            icon={Bike}
          />
          <TarjetaMetrica
            etiqueta="Entregados Hoy"
            valor={entregados}
            variante="verde"
            icon={CheckCircle2}
          />
        </div>
      </section>

      {/* ── Accesos y Pedidos Recientes ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-8">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
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

          <a
            href="https://web.whatsapp.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 p-4 rounded-2xl border border-gray-200 hover:border-green-300 hover:bg-green-50/30 dark:border-slate-800 dark:hover:bg-slate-900 transition-all shadow-sm"
          >
            <div className="bg-green-100 dark:bg-green-950/20 p-3 rounded-xl text-green-600 group-hover:scale-110 transition-transform">
              <MessageCircle size={24} />
            </div>
            <div>
              <p className="font-semibold text-gray-850 dark:text-slate-100">WhatsApp Web</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Chat y atención externa</p>
            </div>
          </a>

          <a
            href="https://music.youtube.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 p-4 rounded-2xl border border-gray-200 hover:border-red-300 hover:bg-red-50/30 dark:border-slate-800 dark:hover:bg-slate-900 transition-all shadow-sm"
          >
            <div className="bg-red-100 dark:bg-red-950/20 p-3 rounded-xl text-red-600 group-hover:scale-110 transition-transform">
              <Music size={24} />
            </div>
            <div>
              <p className="font-semibold text-gray-850 dark:text-slate-100">YouTube Music</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Música para el local</p>
            </div>
          </a>

          <a
            href="https://pedix.app/chefsy"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 p-4 rounded-2xl border border-gray-200 hover:border-amber-300 hover:bg-amber-50/30 dark:border-slate-800 dark:hover:bg-slate-900 transition-all shadow-sm"
          >
            <div className="bg-amber-100 dark:bg-amber-950/20 p-3 rounded-xl text-amber-600 group-hover:scale-110 transition-transform">
              <ExternalLink size={24} />
            </div>
            <div>
              <p className="font-semibold text-gray-850 dark:text-slate-100">Pedix App</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Catálogo público online</p>
            </div>
          </a>
        </section>
      </div>

      {/* ── Botón Flotante para Crear Pedido ── */}
      <button
        onClick={() => setModalNuevoPedidoAbierto(true)}
        className="fixed bottom-6 right-6 z-40 bg-chefsy hover:bg-chefsy-700 text-white font-bold py-3 px-5 rounded-full shadow-lg shadow-chefsy/20 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all text-sm cursor-pointer"
      >
        <Plus size={18} />
        <span>Crear Pedido</span>
      </button>

      {/* ── Modal de Nuevo Pedido ── */}
      {modalNuevoPedidoAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header del Modal */}
            <div className="flex items-center justify-between border-b border-gray-150 dark:border-slate-800 pb-3 mb-4 shrink-0">
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
            {/* Contenido del Modal (Scrollable) */}
            <div className="flex-1 overflow-y-auto pr-1">
              <FormularioPedido onClose={() => setModalNuevoPedidoAbierto(false)} />
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

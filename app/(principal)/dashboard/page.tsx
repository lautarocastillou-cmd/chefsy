'use client'

// ─────────────────────────────────────────────────────
// app/(principal)/dashboard/page.tsx
// Vista principal con métricas del día y pedidos recientes.
// ─────────────────────────────────────────────────────

import { usarPedidos } from '@/contexto/PedidosContexto'
import TarjetaMetrica from '@/components/dashboard/TarjetaMetrica'
import TarjetaPedido from '@/components/pedidos/TarjetaPedido'
import Link from 'next/link'
import { Clock, ChefHat, Bike, CheckCircle2, Users } from 'lucide-react'

export default function PaginaDashboard() {
  const { pedidos } = usarPedidos()

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
            className="group flex items-center gap-4 p-4 rounded-2xl border border-gray-200 hover:border-chefsy-300 hover:bg-chefsy-50 transition-all"
          >
            <div className="bg-chefsy-100 p-3 rounded-xl text-chefsy-600 group-hover:scale-110 transition-transform">
              <Users size={24} />
            </div>
            <div>
              <p className="font-semibold text-gray-800">Cadetería</p>
              <p className="text-xs text-gray-500">Gestión de repartidores</p>
            </div>
          </Link>
          
          <Link
            href="/pedidos"
            className="group flex items-center gap-4 p-4 rounded-2xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
          >
            <div className="bg-blue-100 p-3 rounded-xl text-blue-600 group-hover:scale-110 transition-transform">
              <Clock size={24} />
            </div>
            <div>
              <p className="font-semibold text-gray-800">Historial</p>
              <p className="text-xs text-gray-500">Todos los pedidos</p>
            </div>
          </Link>
        </section>
      </div>
    </div>
  )
}

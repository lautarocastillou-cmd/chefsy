'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ClipboardList,
  Bike,
  Plus,
  BarChart3,
  Menu,
  X,
  Store,
  DollarSign,
  Package,
  Users,
  Radio,
  Settings,
  Sparkles,
} from 'lucide-react'
import { usarPedidos } from '@/contexto/PedidosContexto'
import { usarAuth } from '@/contexto/AuthContexto'
import { cn } from '@/lib/utils'
import { useState, useMemo } from 'react'
import { esPedidoDelivery } from '@/lib/entrega'

interface PropsBottomNavMobile {
  onAbrirMenuCompleto?: () => void
  onAbrirNuevoPedido?: () => void
}

export default function BottomNavMobile({
  onAbrirMenuCompleto,
  onAbrirNuevoPedido,
}: PropsBottomNavMobile) {
  const pathname = usePathname()
  const router = useRouter()
  const { pedidos, estadoTurno } = usarPedidos()
  const { usuarioActivo } = usarAuth()
  const [menuMasAbierto, setMenuMasAbierto] = useState(false)

  const vibrar = (ms = 15) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(ms)
    }
  }

  // Métricas en vivo para los badges de la barra inferior
  const pedidosActivosCount = useMemo(() => {
    return pedidos.filter(
      (p) => !p.archivado && p.estado !== 'entregado' && p.estado !== 'cancelado'
    ).length
  }, [pedidos])

  const enviosActivosCount = useMemo(() => {
    return pedidos.filter(
      (p) =>
        !p.archivado &&
        esPedidoDelivery(p) &&
        (p.estado === 'en_cocina' || p.estado === 'listo' || p.estado === 'en_camino')
    ).length
  }, [pedidos])

  const handleNuevoPedido = () => {
    vibrar(25)
    if (onAbrirNuevoPedido) {
      onAbrirNuevoPedido()
    } else {
      router.push('/nuevo-pedido')
    }
  }

  const itemsPrincipales = [
    {
      id: 'pedidos',
      label: 'Pedidos',
      href: '/pedidos',
      icon: ClipboardList,
      badge: pedidosActivosCount > 0 ? pedidosActivosCount : null,
      badgeColor: 'bg-amber-500 text-white',
    },
    ...(usuarioActivo?.rol === 'admin'
      ? [
          {
            id: 'cadeteria',
            label: 'Cadetería',
            href: '/cadeteria',
            icon: Bike,
            badge: enviosActivosCount > 0 ? enviosActivosCount : null,
            badgeColor: 'bg-emerald-500 text-white',
          },
        ]
      : []),
    // Botón central Nuevo Pedido (renderizado especial)
    {
      id: 'nuevo',
      label: 'Nuevo',
      esCentro: true,
    },
    {
      id: 'dashboard',
      label: 'Métricas',
      href: '/dashboard',
      icon: BarChart3,
      badge: null,
    },
    {
      id: 'mas',
      label: 'Menú',
      icon: Menu,
      esMenuMas: true,
      badge: null,
    },
  ]

  const itemsMenuSecundario = [
    { label: 'Cierre de Caja', href: '/cierre', icon: DollarSign, color: 'text-emerald-400 bg-emerald-500/10' },
    { label: 'Stock e Insumos', href: '/configuracion/stock', icon: Package, color: 'text-indigo-400 bg-indigo-500/10' },
    { label: 'Agenda Clientes', href: '/clientes', icon: Users, color: 'text-sky-400 bg-sky-500/10' },
    { label: 'Carta y Productos', href: '/productos', icon: Store, color: 'text-amber-400 bg-amber-500/10' },
    { label: 'Torre de Control', href: '/torre-control', icon: Radio, color: 'text-purple-400 bg-purple-500/10' },
    { label: 'Configuración', href: '/configuracion', icon: Settings, color: 'text-slate-400 bg-slate-500/10' },
  ]

  return (
    <>
      {/* ── Sheet / Drawer Inferior para Menú "Más" ────────────────── */}
      {menuMasAbierto && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setMenuMasAbierto(false)}
          />

          {/* Panel Sheet */}
          <div className="relative bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 pb-8 shadow-2xl z-10 animate-in slide-in-from-bottom duration-250">
            {/* Handle táctil */}
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-white">Módulos del Sistema</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-500/30">
                  CHEFSY PRO
                </span>
              </div>
              <button
                onClick={() => setMenuMasAbierto(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {itemsMenuSecundario.map((item) => {
                const Icono = item.icon
                const activo = pathname === item.href

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      vibrar(15)
                      setMenuMasAbierto(false)
                    }}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-2xl border transition-all active:scale-95',
                      activo
                        ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-200 hover:bg-slate-800/60'
                    )}
                  >
                    <div className={cn('p-2 rounded-xl shrink-0', item.color)}>
                      <Icono size={18} />
                    </div>
                    <span className="text-xs font-bold leading-tight">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Barra de Navegación Inferior Fija (Bottom Navigation) ─── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/92 backdrop-blur-xl border-t border-slate-800/80 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] px-3 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))]"
        style={{ paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-around relative max-w-md mx-auto">
          {itemsPrincipales.map((item) => {
            // Botón central elevado "Nuevo Pedido"
            if (item.esCentro) {
              return (
                <div key="centro" className="relative -top-4 px-1">
                  <button
                    onClick={handleNuevoPedido}
                    className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex flex-col items-center justify-center shadow-lg shadow-emerald-600/40 hover:scale-105 active:scale-90 transition-all border-2 border-slate-950 cursor-pointer"
                    title="Crear Nuevo Pedido"
                  >
                    <Plus size={24} className="stroke-[3]" />
                  </button>
                  <span className="block text-[9px] font-black text-center text-emerald-400 mt-0.5 tracking-wider uppercase">
                    Nuevo
                  </span>
                </div>
              )
            }

            // Botón "Más" (Drawer)
            if (item.esMenuMas) {
              return (
                <button
                  key="mas"
                  onClick={() => {
                    vibrar(15)
                    setMenuMasAbierto(true)
                  }}
                  className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all text-slate-400 hover:text-slate-200 active:scale-90"
                >
                  <Menu size={20} />
                  <span className="text-[10px] font-bold mt-1 tracking-tight">Más</span>
                </button>
              )
            }

            const Icono = item.icon!
            const activo = pathname === item.href

            return (
              <Link
                key={item.id}
                href={item.href!}
                onClick={() => vibrar(15)}
                className={cn(
                  'flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all relative active:scale-90',
                  activo
                    ? 'text-emerald-400 font-extrabold'
                    : 'text-slate-400 hover:text-slate-200 font-medium'
                )}
              >
                <div className="relative">
                  <Icono size={20} className={cn(activo && 'scale-110 transition-transform')} />
                  {item.badge !== null && item.badge !== undefined && (
                    <span
                      className={cn(
                        'absolute -top-1.5 -right-2.5 text-[9px] font-black px-1.5 py-0.2 rounded-full min-w-[16px] text-center shadow-sm animate-in zoom-in',
                        item.badgeColor || 'bg-indigo-500 text-white'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-1 tracking-tight">{item.label}</span>
                {activo && (
                  <span className="w-1 h-1 rounded-full bg-emerald-400 mt-0.5" />
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}

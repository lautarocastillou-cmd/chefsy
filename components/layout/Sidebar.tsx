'use client'

// ─────────────────────────────────────────────────────
// components/layout/Sidebar.tsx
// Barra lateral de navegación. Resalta la ruta activa.
// ─────────────────────────────────────────────────────

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { usarPedidos } from '@/contexto/PedidosContexto'
import { Sun, Moon, LogOut } from 'lucide-react'
import { usarAuth } from '@/contexto/AuthContexto'

// Ítems de navegación principal
const elementosNavegacion = [
  { href: '/dashboard',     etiqueta: 'Dashboard',     icono: '📊' },
  { href: '/pedidos',       etiqueta: 'Pedidos',       icono: '📋' },
  { href: '/cadeteria',     etiqueta: 'Cadetería',     icono: '🛵' },
  { href: '/cierre',        etiqueta: 'Cierre de Caja', icono: '💰' },
  { href: '/productos',     etiqueta: 'Productos',     icono: '🍔' },
  { href: '/clientes',      etiqueta: 'Clientes',      icono: '👥' },
  { href: '/tienda',        etiqueta: 'Tienda',        icono: '🏪' },
]

interface PropsSidebar {
  className?: string
  onCloseMobile?: () => void
}

export default function Sidebar({ className, onCloseMobile }: PropsSidebar) {
  const rutaActual = usePathname()
  const { modoOscuro, alternarModoOscuro, dbEstado } = usarPedidos()
  const { usuarioActivo, cerrarSesion } = usarAuth()

  const elementosFiltrados = elementosNavegacion.filter((item) => {
    if (usuarioActivo?.rol === 'cadete') {
      return item.href === '/cadeteria'
    }
    return true
  })

  const itemsPrincipales = elementosFiltrados.filter(item => item.href !== '/tienda')
  const itemTienda = elementosFiltrados.find(item => item.href === '/tienda')

  return (
    <aside className={cn('w-56 bg-chefsy border-r border-chefsy-700 flex flex-col shrink-0', className)}>
      {/* Marca */}
      <div className="px-5 py-6 border-b border-chefsy-700 flex flex-col items-center gap-3">
        <div className="relative group">
          <img 
            src="/logo.jpg" 
            alt="Chefsy Logo" 
            className="w-28 h-28 object-contain rounded-2xl border border-chefsy-600 bg-white p-1.5 shadow-md transition-transform duration-300 group-hover:scale-105" 
          />
        </div>
        <div className="text-center">
          <span className="text-xs font-bold text-chefsy-200 uppercase tracking-widest">
            Sistema de Pedidos
          </span>
        </div>
        {/* Supabase Status Indicator */}
        <div className={cn(
          "mt-2 flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[9px] font-black tracking-wider select-none border transition-all duration-300",
          dbEstado === 'conectado'
            ? "bg-emerald-950/20 text-emerald-400 border-emerald-800/40"
            : dbEstado === 'desconectado'
              ? "bg-red-950/20 text-red-400 border-red-900/40 animate-pulse"
              : "bg-slate-800/30 text-slate-400 border-slate-700/30"
        )}>
          <span className={cn(
            "h-1.5 w-1.5 rounded-full shrink-0",
            dbEstado === 'conectado'
              ? "bg-emerald-400 animate-pulse"
              : dbEstado === 'desconectado'
                ? "bg-red-500 animate-ping"
                : "bg-slate-400"
          )} />
          <span>
            {dbEstado === 'conectado'
              ? 'ONLINE'
              : dbEstado === 'desconectado'
                ? 'SIN CONEXIÓN'
                : 'CONECTANDO...'}
          </span>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 p-3 flex flex-col justify-between">
        <div className="space-y-0.5">
          {itemsPrincipales.map((item) => {
            const estaActivo = rutaActual === item.href
            return (
               <Link
                key={item.href}
                href={item.href}
                onClick={() => onCloseMobile?.()}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium',
                  estaActivo
                    ? 'bg-chefsy-700 text-white'
                    : 'text-chefsy-100 hover:bg-chefsy-700/60 hover:text-white'
                )}
              >
                <span className="text-base">{item.icono}</span>
                <span className="leading-tight">{item.etiqueta}</span>
              </Link>
            )
          })}
        </div>

        {itemTienda && (
          <div className="pt-3 border-t border-chefsy-700/50 mt-4 space-y-1.5">
            {/* Tarjeta de acceso a Malú Clothing */}
            <a
              href="/malu"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onCloseMobile?.()}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group"
              style={{
                background: 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.06) 100%)',
                border: '1px solid rgba(212,175,55,0.18)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'linear-gradient(135deg, rgba(212,175,55,0.2) 0%, rgba(212,175,55,0.1) 100%)'
                ;(e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(212,175,55,0.35)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.06) 100%)'
                ;(e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(212,175,55,0.18)'
              }}
            >
              <img
                src="/malu-logo.png"
                alt="Malú"
                className="w-7 h-7 rounded-full object-cover shrink-0 transition-transform duration-200 group-hover:scale-105"
                style={{ border: '1px solid rgba(212,175,55,0.3)' }}
              />
              <div className="flex flex-col text-left min-w-0">
                <span className="text-xs font-bold leading-tight" style={{ color: '#d4af37' }}>
                  Malú Clothing
                </span>
                <span className="text-[10px] leading-none mt-0.5" style={{ color: 'rgba(212,175,55,0.5)' }}>
                  Gestión de deudoras ↗
                </span>
              </div>
            </a>

            {/* Link Tienda */}
            <Link
              href={itemTienda.href}
              onClick={() => onCloseMobile?.()}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium',
                rutaActual === itemTienda.href
                  ? 'bg-chefsy-700 text-white'
                  : 'text-chefsy-100 hover:bg-chefsy-700/60 hover:text-white'
              )}
            >
              <span className="text-base">{itemTienda.icono}</span>
              <div className="flex flex-col text-left">
                <span className="leading-tight">{itemTienda.etiqueta}</span>
                <span className="text-[0.7rem] text-chefsy-300 font-medium opacity-80 leading-none">
                  en construcción
                </span>
              </div>
            </Link>
          </div>
        )}
      </nav>

      {/* Pie del sidebar */}
      <div className="px-5 py-3 border-t border-chefsy-700 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2 w-full">
          <p className="text-xs text-chefsy-300">Chefsy v1.0.0</p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={alternarModoOscuro}
              className="p-1.5 rounded-lg text-chefsy-200 hover:text-white hover:bg-chefsy-700/60 transition-colors focus:outline-none focus:ring-1 focus:ring-chefsy-400"
              title={modoOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {modoOscuro ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              onClick={() => {
                cerrarSesion()
                onCloseMobile?.()
              }}
              className="p-1.5 rounded-lg text-chefsy-200 hover:text-red-400 hover:bg-red-950/40 transition-colors focus:outline-none focus:ring-1 focus:ring-red-400"
              title="Cerrar sesión"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
        <p className="text-[10px] text-chefsy-400 font-semibold tracking-wider text-left pl-0.5">
          designed by lauta
        </p>
      </div>
    </aside>
  )
}

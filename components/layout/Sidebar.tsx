'use client'

// ─────────────────────────────────────────────────────
// components/layout/Sidebar.tsx
// Barra lateral de navegación re-diseñada, colapsable y premium.
// ─────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { usarPedidos } from '@/contexto/PedidosContexto'
import { usarAuth } from '@/contexto/AuthContexto'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { 
  Sun, Moon, LogOut, Settings, 
  LayoutDashboard, ClipboardList, Bike, Wallet, UtensilsCrossed, Users, Store, Paintbrush, Package,
  ChevronLeft, ChevronRight, Target, Radar
} from 'lucide-react'

// Ítems de navegación principal (Configuración se movió al pie)
const elementosNavegacion = [
  { href: '/dashboard',     etiqueta: 'Dashboard',     icono: LayoutDashboard },
  { href: '/pedidos',       etiqueta: 'Pedidos',       icono: ClipboardList },
  { href: '/cadeteria',     etiqueta: 'Cadetería',     icono: Bike },
  { href: '/torre-control', etiqueta: 'Torre de Control', icono: Radar },
  { href: '/cierre',        etiqueta: 'Cierre de Caja', icono: Wallet },
  { href: '/productos',     etiqueta: 'Productos',     icono: UtensilsCrossed },
  { href: '/configuracion/stock', etiqueta: 'Stock', icono: Package },
  { href: '/clientes',      etiqueta: 'Clientes',      icono: Users },
  { href: '/caceria',       etiqueta: 'Cacería',       icono: Target },
  { href: '/dev-tools',     etiqueta: 'Tienda Diseño', icono: Paintbrush },
  { href: '/',        etiqueta: 'Tienda',        icono: Store },
]

interface PropsSidebar {
  className?: string
  onCloseMobile?: () => void
}

export default function Sidebar({ className, onCloseMobile }: PropsSidebar) {
  const rutaActual = usePathname()
  const { modoOscuro, alternarModoOscuro, dbEstado } = usarPedidos()
  const { usuarioActivo, cerrarSesion } = usarAuth()

  // Determinar si estamos en la vista móvil
  const isMobile = !!onCloseMobile

  // Estado local para colapsar en desktop
  const [colapsado, setColapsado] = useState(false)

  // Opcional: Persistir el estado de colapsado en localStorage para que no salte al recargar
  useEffect(() => {
    const colapsadoGuardado = localStorage.getItem('chefsy_sidebar_colapsado')
    if (colapsadoGuardado === 'true') {
      setColapsado(true)
    }
  }, [])

  const toggleColapsar = () => {
    const nuevoEstado = !colapsado
    setColapsado(nuevoEstado)
    localStorage.setItem('chefsy_sidebar_colapsado', nuevoEstado.toString())
  }

  const elementosFiltrados = elementosNavegacion.filter((item) => {
    if (usuarioActivo?.rol === 'cadete') {
      return item.href === '/cadeteria'
    }
    if (usuarioActivo?.rol !== 'admin' && item.href === '/dev-tools') {
      return false
    }
    return true
  })

  const itemsPrincipales = elementosFiltrados.filter(item => item.href !== '/')
  const itemTienda = elementosFiltrados.find(item => item.href === '/')

  return (
    <aside 
      className={cn(
        'bg-gradient-to-b from-chefsy to-chefsy-900 border-r border-chefsy-800 flex flex-col shrink-0 transition-all duration-300 relative z-50',
        colapsado && !isMobile ? 'w-20' : 'w-64',
        className
      )}
    >
      {/* Botón de colapsar (solo visible en desktop) */}
      {!isMobile && (
        <button
          onClick={toggleColapsar}
          className="absolute -right-3 top-8 bg-chefsy-800 text-white rounded-full p-1.5 border border-chefsy-600 shadow-md hover:bg-chefsy-700 transition-colors z-50 focus:outline-none"
          title={colapsado ? "Expandir menú" : "Ocultar menú"}
        >
          {colapsado ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      )}

      {/* Marca y Estado */}
      <div className={cn("px-4 py-6 border-b border-chefsy-800 flex flex-col items-center gap-3 transition-all", colapsado && !isMobile ? "px-2" : "")}>
        <div className="relative group">
          <img 
            src="/logo.jpg" 
            alt="Chefsy Logo" 
            className={cn(
              "object-contain bg-white shadow-lg transition-all duration-300 group-hover:scale-105",
              colapsado && !isMobile ? "w-11 h-11 rounded-xl p-1" : "w-24 h-24 rounded-2xl p-1.5 border border-chefsy-600"
            )} 
          />
        </div>
        
        {(!colapsado || isMobile) && (
          <div className="text-center animate-in fade-in duration-300">
            <span className="text-xs font-bold text-chefsy-200 uppercase tracking-widest">
              Sistema de Pedidos
            </span>
          </div>
        )}
        
        {/* Supabase Status Indicator */}
        <div className={cn(
          "mt-2 flex items-center justify-center rounded-full text-[9px] font-black tracking-wider select-none border transition-all duration-300",
          (!colapsado || isMobile) ? "px-3 py-0.5 gap-1.5" : "w-6 h-6 p-0",
          dbEstado === 'conectado'
            ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/40"
            : dbEstado === 'desconectado'
              ? "bg-red-950/40 text-red-400 border-red-900/40 animate-pulse"
              : "bg-slate-800/40 text-slate-400 border-slate-700/30"
        )}
        title={dbEstado}
        >
          <span className={cn(
            "h-1.5 w-1.5 rounded-full shrink-0",
            dbEstado === 'conectado'
              ? "bg-emerald-400 animate-pulse shadow-[0_0_5px_#34d399]"
              : dbEstado === 'desconectado'
                ? "bg-red-500 animate-ping"
                : "bg-slate-400"
          )} />
          {(!colapsado || isMobile) && (
            <span>
              {dbEstado === 'conectado' ? 'ONLINE' : dbEstado === 'desconectado' ? 'SIN CONEXIÓN' : 'CONECTANDO...'}
            </span>
          )}
        </div>
      </div>

      {/* Navegación */}
      <nav className={cn("flex-1 overflow-y-auto overflow-x-hidden flex flex-col justify-between py-4", (!colapsado || isMobile) ? "px-3" : "px-2")}>
        <div className="space-y-1">
          {itemsPrincipales.map((item) => {
            const estaActivo = rutaActual === item.href
            const Icono = item.icono
            return (
               <Link
                key={item.href}
                href={item.href}
                onClick={() => onCloseMobile?.()}
                title={colapsado && !isMobile ? item.etiqueta : undefined}
                className={cn(
                  'flex items-center rounded-xl font-medium transition-all duration-200 group relative',
                  (!colapsado || isMobile) ? 'px-3 py-2.5 gap-3' : 'justify-center p-2.5 mx-auto w-11 h-11',
                  estaActivo
                    ? 'bg-white/10 text-white shadow-inner border border-white/5'
                    : 'text-chefsy-200 hover:bg-white/5 hover:text-white'
                )}
              >
                {/* Micro-animación de hover */}
                {(!colapsado || isMobile) && !estaActivo && (
                  <span className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/5 transition-colors" />
                )}
                {/* Línea indicadora activa */}
                {estaActivo && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-[60%] bg-emerald-400 rounded-r-md shadow-[0_0_8px_#34d399]" />
                )}
                
                <Icono 
                  size={colapsado && !isMobile ? 22 : 18} 
                  className={cn("shrink-0 transition-all", (!estaActivo && (!colapsado || isMobile)) ? "group-hover:translate-x-1" : "")} 
                />
                
                {(!colapsado || isMobile) && (
                  <span className={cn("text-sm tracking-wide transition-transform", !estaActivo ? "group-hover:translate-x-1" : "")}>
                    {item.etiqueta}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        {itemTienda && (
          <div className="pt-3 border-t border-chefsy-800/60 mt-4 space-y-2">
            {/* Tarjeta de acceso a Malú Clothing */}
            <a
              href="/malu"
              target="_blank"
              rel="noopener noreferrer"
              title={colapsado && !isMobile ? "Malú Clothing" : undefined}
              className={cn("flex items-center rounded-xl transition-all duration-200 group relative", (!colapsado || isMobile) ? "px-3 py-2.5 gap-3" : "justify-center p-2 mx-auto w-11 h-11")}
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
              {(!colapsado || isMobile) && (
                <div className="flex flex-col text-left min-w-0 transition-transform group-hover:translate-x-1">
                  <span className="text-xs font-bold leading-tight" style={{ color: '#d4af37' }}>
                    Malú Clothing
                  </span>
                  <span className="text-[9px] leading-none mt-0.5" style={{ color: 'rgba(212,175,55,0.5)' }}>
                    Gestión de deudoras ↗
                  </span>
                </div>
              )}
            </a>

            {/* Link Tienda */}
            {(() => {
              const IconoTienda = itemTienda.icono
              const estaActivo = rutaActual === itemTienda.href
              return (
                <Link
                  href={itemTienda.href}
                  title={colapsado && !isMobile ? itemTienda.etiqueta : undefined}
                  onClick={() => onCloseMobile?.()}
                  className={cn(
                    'flex items-center rounded-xl font-medium transition-all duration-200 group relative',
                    (!colapsado || isMobile) ? 'px-3 py-2.5 gap-3' : 'justify-center p-2.5 mx-auto w-11 h-11',
                    estaActivo
                      ? 'bg-white/10 text-white border border-white/5'
                      : 'text-chefsy-200 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <IconoTienda 
                    size={colapsado && !isMobile ? 22 : 18} 
                    className={cn("shrink-0 transition-all", (!estaActivo && (!colapsado || isMobile)) ? "group-hover:translate-x-1" : "")} 
                  />
                  {(!colapsado || isMobile) && (
                    <div className={cn("flex flex-col text-left transition-transform", !estaActivo ? "group-hover:translate-x-1" : "")}>
                      <span className="text-sm tracking-wide leading-tight">{itemTienda.etiqueta}</span>
                      <span className="text-[0.65rem] text-chefsy-300 font-medium opacity-80 leading-none mt-0.5">
                        en construcción
                      </span>
                    </div>
                  )}
                </Link>
              )
            })()}
          </div>
        )}
      </nav>

      {/* Pie del sidebar */}
      <div className={cn("px-4 py-4 border-t border-chefsy-800 flex flex-col gap-2 transition-all", colapsado && !isMobile ? "items-center px-2" : "")}>
        <div className={cn("flex items-center", colapsado && !isMobile ? "flex-col gap-3" : "justify-between w-full")}>
          {/* Si está expandido mostramos la versión */}
          {(!colapsado || isMobile) && (
            <p className="text-xs text-chefsy-400 font-medium tracking-wide ml-1">Chefsy v1.0</p>
          )}

          <div className={cn("flex items-center", colapsado && !isMobile ? "flex-col gap-3" : "gap-1")}>
            {/* Configuración */}
            <Link
              href="/configuracion"
              title="Configuración"
              onClick={() => onCloseMobile?.()}
              className={cn(
                "p-2 rounded-xl transition-all focus:outline-none",
                rutaActual === '/configuracion' 
                  ? 'bg-white/20 text-white shadow-inner' 
                  : 'text-chefsy-200 hover:text-white hover:bg-white/10 hover:scale-110'
              )}
            >
              <Settings size={16} />
            </Link>
            
            {/* Tema Oscuro */}
            <ThemeToggle />
            
            {/* Cerrar Sesión */}
            <button
              onClick={() => {
                cerrarSesion()
                onCloseMobile?.()
              }}
              className="p-2 rounded-xl text-chefsy-200 hover:text-red-400 hover:bg-red-950/40 transition-all focus:outline-none hover:scale-110"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Créditos */}
        {(!colapsado || isMobile) && (
          <p className="text-[9px] text-chefsy-500 font-semibold tracking-widest uppercase text-left pl-1 mt-1 opacity-70 hover:opacity-100 transition-opacity cursor-default">
            designed by lauta
          </p>
        )}
      </div>
    </aside>
  )
}

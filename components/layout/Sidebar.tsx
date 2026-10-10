'use client'

// ─────────────────────────────────────────────────────
// components/layout/Sidebar.tsx
// Barra lateral de navegación colapsable estilo "isla/dock".
// Portada desde flota-web y adaptada a los módulos + paleta emerald de Chefsy.
// ─────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { usarPedidos } from '@/contexto/PedidosContexto'
import { usarAuth } from '@/contexto/AuthContexto'
import { setCache, getCache } from '@/lib/localCache'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import {
  LogOut, Settings,
  LayoutDashboard, ClipboardList, Wallet, UtensilsCrossed, Users, Store, Paintbrush,
  ChevronLeft, Radar
} from 'lucide-react'

// TTL de preferencias de UI del admin: 90 días
const TTL_UI_HS = 90 * 24

// Ítems de navegación principal (Configuración va al pie, Tienda pública abajo aparte)
// Cadetería unificada: mapa, repartos, GPS y rendimiento.
const elementosNavegacion = [
  { href: '/dashboard',     etiqueta: 'Dashboard',       icono: LayoutDashboard },
  { href: '/pedidos',       etiqueta: 'Pedidos',         icono: ClipboardList },
  { href: '/cadeteria', etiqueta: 'Cadetería', icono: Radar },
  { href: '/cierre',        etiqueta: 'Cierre de Caja',  icono: Wallet },
  { href: '/productos',     etiqueta: 'Productos',       icono: UtensilsCrossed },
  { href: '/clientes',      etiqueta: 'Clientes',        icono: Users },
  { href: '/dev-tools',     etiqueta: 'Tienda Diseño',   icono: Paintbrush },
]

interface PropsSidebar {
  className?: string
  onCloseMobile?: () => void
}

export default function Sidebar({ className, onCloseMobile }: PropsSidebar) {
  const rutaActual = usePathname()
  const { dbEstado } = usarPedidos()
  const { usuarioActivo, cerrarSesion } = usarAuth()

  // Reloj en vivo para el pie de la barra lateral
  const [fechaHora, setFechaHora] = useState({ fecha: '', hora: '' })

  useEffect(() => {
    const actualizar = () => {
      const ahora = new Date()
      setFechaHora({
        fecha: ahora.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }),
        hora: ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
      })
    }
    actualizar()
    const timer = setInterval(actualizar, 30000)
    return () => clearInterval(timer)
  }, [])

  // Determinar si estamos en la vista móvil
  const isMobile = !!onCloseMobile

  // Estado local para colapsar en desktop: colapsado activa el Modo Dock
  const [colapsado, setColapsado] = useState(false)
  const estabaEnCadeteriaRef = useRef(rutaActual === '/cadeteria')

  // Persistir el estado colapsado (TTL 90 días)
  useEffect(() => {
    const esCadeteria = rutaActual === '/cadeteria'
    if (esCadeteria) {
      setColapsado(true)
    } else if (estabaEnCadeteriaRef.current) {
      // Al salir de Cadetería vuelve a Isla, independientemente del último
      // estado visual forzado para el mapa.
      setColapsado(false)
    } else {
      setColapsado(getCache<boolean>('chefsy_sidebar_colapsado', TTL_UI_HS) ?? false)
    }
    estabaEnCadeteriaRef.current = esCadeteria
  }, [rutaActual])

  const toggleColapsar = () => {
    const nuevoEstado = !colapsado
    setColapsado(nuevoEstado)
    setCache('chefsy_sidebar_colapsado', nuevoEstado)
  }

  const elementosFiltrados = elementosNavegacion.filter((item) => {
    if (usuarioActivo?.rol !== 'admin') {
      if (item.href === '/dev-tools') {
        return false
      }
    }
    return true
  })

  // ── MODO DOCK: cuando la barra lateral flotante se contrae en desktop ──
  const esDock = !isMobile && (rutaActual === '/cadeteria' || colapsado)

  return (
    <aside
      className={cn(
        "chefsy-sidebar-animada relative z-50 text-slate-800 dark:text-slate-100 shrink-0 transition-[width,height,padding] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
        esDock && "delay-[1000ms]",
        isMobile
          ? "bg-white dark:bg-slate-900 border-r border-slate-200/70 dark:border-slate-800 flex flex-col h-full w-full"
          : "m-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg flex flex-col items-center",
        !isMobile && (
          esDock
            ? "w-16 min-h-[520px] h-[calc(100vh-1.75rem)] py-3.5 px-2"
            : "w-64 h-[calc(100vh-1.75rem)] py-3.5 px-3"
        ),
        className
      )}
    >
      {/* Botón flotante para alternar entre Modo Isla y Modo Dock (solo desktop) */}
      {!isMobile && (
        <button
          type="button"
          onClick={toggleColapsar}
          className="absolute -right-3 top-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-full p-1.5 border border-slate-200/70 dark:border-slate-700 shadow-xl hover:border-emerald-400/60 dark:hover:border-emerald-500/60 transition-all z-50 focus:outline-none cursor-pointer active:scale-90"
          title={esDock ? "Expandir a Modo Isla" : "Contraer a Modo Dock"}
          aria-label={esDock ? "Expandir a Modo Isla" : "Contraer a Modo Dock"}
        >
          <ChevronLeft
            size={13}
            className={cn(
              "transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
              esDock && "rotate-180"
            )}
          />
        </button>
      )}

      {/* Marca: logo + indicador de estado Supabase */}
      <div className={cn(
        "w-full transition-[padding,border-color] duration-300 flex flex-col items-center gap-2 pb-2.5",
        !esDock && "border-b border-slate-200/70 dark:border-slate-800"
      )}>
        <img
          src="/logo.jpg"
          alt="Chefsy Logo"
          className={cn(
            "object-contain bg-white shadow-md rounded-xl transition-[width,height,padding,border-color] duration-300",
            esDock ? "w-9 h-9 p-0.5" : "w-16 h-16 sm:w-20 sm:h-20 p-1 border border-slate-200/70 dark:border-slate-700"
          )}
        />
        {/* Indicador de estado Supabase */}
        <div className={cn(
          "flex items-center justify-center rounded-full text-[9px] font-black tracking-wider select-none border transition-[width,padding,gap,background-color,border-color] duration-300",
          esDock ? "w-6 h-6 p-0" : "px-2.5 py-0.5 gap-1.5",
          dbEstado === 'conectado'
            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/70 dark:border-emerald-800/40"
            : dbEstado === 'desconectado'
              ? "bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400 border-red-200/70 dark:border-red-900/40 animate-pulse"
              : "bg-slate-100 dark:bg-slate-800/60 text-slate-400 border-slate-200/70 dark:border-slate-700/50"
        )}
          title={dbEstado}
        >
          <span className={cn(
            "h-1.5 w-1.5 rounded-full shrink-0",
            dbEstado === 'conectado'
              ? "bg-emerald-500 animate-pulse shadow-[0_0_5px_#10b981]"
              : dbEstado === 'desconectado'
                ? "bg-red-500 animate-ping"
                : "bg-slate-400"
          )} />
          {!esDock && (
            <span>
              {dbEstado === 'conectado' ? 'ONLINE' : dbEstado === 'desconectado' ? 'SIN CONEXIÓN' : 'CONECTANDO...'}
            </span>
          )}
        </div>
      </div>

      {/* Navegación (con contención de layout: el recálculo de la animación no se propaga afuera) */}
      <nav className={cn(
        "flex-1 w-full flex flex-col items-center overflow-x-hidden overflow-y-auto transition-[padding,gap] duration-300 [contain:layout_style]",
        esDock ? "gap-1.5 py-1" : "gap-1 py-2 px-0.5"
      )}>
        {/* Espaciador superior: centra el grupo en dock y colapsa al expandir,
            haciendo que los ítems deslicen hacia arriba con animación */}
        <div
          aria-hidden
          className={cn(
            "w-full overflow-hidden transition-[flex-grow,height] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
            esDock ? "flex-1 delay-[1000ms]" : "flex-none h-0"
          )}
        />
        {elementosFiltrados.map((item, idx) => {
          const estaActivo = rutaActual === item.href
          const Icono = item.icono

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onCloseMobile?.()}
              className={cn(
                "flex items-center rounded-xl font-medium transition-[width,height,padding,gap,background-color,border-color] duration-700 group relative cursor-pointer text-xs overflow-hidden",
                esDock
                  ? "w-11 h-11 items-center shrink-0 px-[13px] delay-[1000ms]"
                  : "w-full items-center h-11 px-3 gap-3",
                "justify-start",
                estaActivo
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/50 shadow-sm font-semibold"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-800 dark:hover:text-slate-100"
              )}
            >
              <Icono
                size={18}
                className={cn(
                  "shrink-0 transition-transform duration-200",
                  !estaActivo && "group-hover:scale-105"
                )}
              />

              {/* Etiqueta con cascada: al expandir aparece de arriba hacia abajo
                  con delay; al contraer se desvanece rápido de abajo hacia arriba
                  mientras las cajas se acomodan al centro */}
              <span
                style={{
                  transitionDelay: `${120 + idx * 50}ms`,
                }}
                className={cn(
                  "tracking-tight whitespace-nowrap transition-[max-width,opacity,transform] overflow-hidden",
                  esDock
                    ? "max-w-0 opacity-0 -translate-x-4 pointer-events-none duration-600"
                    : "max-w-[140px] opacity-100 translate-x-0 duration-600"
                )}
              >
                {item.etiqueta}
              </span>

              {/* Tooltip flotante a la derecha (solo activo en modo Dock) */}
              {esDock && (
                <span className="absolute left-full ml-3 px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/70 dark:border-slate-700 rounded-lg text-xs font-semibold whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50 translate-x-1 group-hover:translate-x-0">
                  {item.etiqueta}
                </span>
              )}
            </Link>
          )
        })}
        {/* Espaciador inferior: espeja al superior para centrar el grupo en dock */}
        <div
          aria-hidden
          className={cn(
            "w-full overflow-hidden transition-[flex-grow,height] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
            esDock ? "flex-1 delay-[1000ms]" : "flex-none h-0"
          )}
        />
      </nav>

      {/* Separador fino sobre el pie */}
      <div className={cn(
        "h-[1px] bg-slate-200/70 dark:bg-slate-800 transition-[width] duration-300 my-1 shrink-0",
        esDock ? "w-8" : "w-full"
      )} />

      {/* Atajo a la tienda online (cara pública) — abre en pestaña nueva */}
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        title="Ver la tienda online como la ve el cliente"
        onClick={() => onCloseMobile?.()}
        className={cn(
          "flex items-center rounded-xl font-medium transition-[width,height,padding,gap,background-color] duration-700 group relative cursor-pointer text-xs shrink-0",
          "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-800 dark:hover:text-slate-100",
          esDock
            ? "w-11 h-11 items-center self-center px-[13px] delay-[1000ms]"
            : "w-full items-center h-11 px-3 gap-3",
          "justify-start"
        )}
      >
        <Store
          size={18}
          className="shrink-0 transition-transform duration-200 group-hover:scale-105"
        />
        <span
          className={cn(
            "tracking-tight whitespace-nowrap transition-all duration-200 overflow-hidden",
            esDock
              ? "max-w-0 opacity-0 -translate-x-2 pointer-events-none"
              : "max-w-[140px] opacity-100 translate-x-0"
          )}
        >
          Tienda
        </span>
        {esDock && (
          <span className="absolute left-full ml-3 px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/70 dark:border-slate-700 rounded-lg text-xs font-semibold whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50 translate-x-1 group-hover:translate-x-0">
            Tienda
          </span>
        )}
      </a>

      {/* Pie del Sidebar */}
      <div className="w-full flex flex-col shrink-0 items-center">
        {/* Fecha y Hora en tiempo real con transición de altura sin unmount */}
        <div className={cn(
          "flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium px-2 tracking-tight transition-[max-height,opacity,margin,padding,transform] duration-300 overflow-hidden whitespace-nowrap w-full",
          esDock
            ? "max-h-0 opacity-0 my-0 py-0 pointer-events-none -translate-y-1"
            : "max-h-8 opacity-100 my-1 py-1 translate-y-0"
        )}>
          <span className="capitalize text-slate-700 dark:text-slate-200">{fechaHora.fecha}</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded text-[10px] tracking-wider border border-emerald-200/70 dark:border-emerald-800/50">{fechaHora.hora}</span>
            <ThemeToggle className="h-8 w-8 rounded-lg" />
          </div>
        </div>

        {/* Acciones: Configuración y Cerrar Sesión */}
        <div className="flex flex-col gap-1 w-full items-center pt-0.5">
          {/* Configuración */}
          <Link
            href="/configuracion"
            onClick={() => onCloseMobile?.()}
            title={esDock ? undefined : "Configuración"}
            className={cn(
              "flex items-center rounded-xl font-medium transition-[width,height,padding,gap,background-color] duration-700 group relative cursor-pointer text-xs overflow-hidden",
              esDock
                ? "w-11 h-11 items-center shrink-0 px-[13px] delay-[1000ms] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                : "w-full items-center h-11 px-3 gap-3 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-800 dark:hover:text-slate-100",
              "justify-start",
              rutaActual === '/configuracion' && "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
            )}
          >
            <Settings size={17} className="shrink-0 transition-transform duration-200 group-hover:rotate-45" />
            <span className={cn(
              "tracking-tight whitespace-nowrap transition-all duration-200 overflow-hidden",
              esDock ? "max-w-0 opacity-0 -translate-x-2 pointer-events-none" : "max-w-[140px] opacity-100 translate-x-0"
            )}>
              Configuración
            </span>
            {esDock && (
              <span className="absolute left-full ml-3 px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/70 dark:border-slate-700 rounded-lg text-xs font-semibold whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50 translate-x-1 group-hover:translate-x-0">
                Configuración
              </span>
            )}
          </Link>

          {/* Cerrar Sesión */}
          <button
            type="button"
            onClick={() => {
              cerrarSesion()
              onCloseMobile?.()
            }}
            className={cn(
              "flex items-center rounded-xl font-medium transition-[width,height,padding,gap,background-color] duration-700 group relative cursor-pointer text-xs overflow-hidden",
              esDock
                ? "w-11 h-11 items-center shrink-0 px-[13px] delay-[1000ms] text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                : "w-full items-center h-11 px-3 gap-3 text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400",
              "justify-start"
            )}
            title={esDock ? undefined : "Cerrar sesión"}
          >
            <LogOut size={17} className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
            <span className={cn(
              "tracking-tight whitespace-nowrap transition-all duration-200 overflow-hidden",
              esDock ? "max-w-0 opacity-0 -translate-x-2 pointer-events-none" : "max-w-[140px] opacity-100 translate-x-0"
            )}>
              Cerrar sesión
            </span>
            {esDock && (
              <span className="absolute left-full ml-3 px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/70 dark:border-slate-700 rounded-lg text-xs font-semibold whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50 translate-x-1 group-hover:translate-x-0">
                Cerrar sesión
              </span>
            )}
          </button>
        </div>
      </div>
    </aside>
  )
}

'use client'

// ─────────────────────────────────────────────────────
// app/(principal)/layout.tsx
// Layout compartido por dashboard, pedidos y nuevo-pedido.
// Incluye Sidebar + Header responsivo + área de contenido.
// ─────────────────────────────────────────────────────

import { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import { Menu, X } from 'lucide-react'
import { usarAuth } from '@/contexto/AuthContexto'
import VerificadorLogin from '@/components/auth/VerificadorLogin'
import NotificadorAccesos from '@/components/auth/NotificadorAccesos'
import AccesoRestringido from '@/components/auth/AccesoRestringido'
import { usePathname } from 'next/navigation'
import NotitaFlotante from '@/components/herramientas/NotitaFlotante'
import CalculadoraFlotante from '@/components/herramientas/CalculadoraFlotante'

export default function LayoutPrincipal({ children }: { children: React.ReactNode }) {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const { usuarioActivo, estaListoAuth } = usarAuth()
  const pathname = usePathname()

  if (!estaListoAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-chefsy-50 dark:bg-zinc-950">
        <div className="w-10 h-10 border-4 border-chefsy border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!usuarioActivo) {
    return <VerificadorLogin />
  }

  // Si el usuario es cadete, no tiene permiso de ver las páginas de administración (que están en este layout)
  const esCadete = usuarioActivo.rol === 'cadete'
  const esAdmin = usuarioActivo.rol === 'admin'

  // Si es cadete y está en cadetería, renderizamos su vista directamente sin la barra lateral
  if (esCadete && pathname === '/cadeteria') {
    return <>{children}</>
  }

  const tienePermiso = !esCadete || pathname === '/cadeteria'

  return (
    <div className="flex h-screen overflow-hidden bg-chefsy-50 dark:bg-zinc-950 transition-colors">
      {/* Sidebar Desktop */}
      <div className="hidden md:flex shrink-0">
        <Sidebar />
      </div>

      {/* Sidebar Móvil (Drawer overlay) */}
      {menuAbierto && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop/Overlay */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMenuAbierto(false)}
          />
          {/* Drawer Content */}
          <div className="relative w-64 max-w-xs bg-chefsy flex flex-col h-full shadow-2xl animate-in slide-in-from-left duration-200">
            {/* Botón de Cierre dentro del Drawer */}
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={() => setMenuAbierto(false)}
                className="p-1.5 rounded-lg text-chefsy-200 hover:text-white hover:bg-chefsy-700/60 transition-colors focus:outline-none"
              >
                <X size={20} />
              </button>
            </div>
            {/* Sidebar real para mobile */}
            <Sidebar onCloseMobile={() => setMenuAbierto(false)} className="border-r-0 h-full w-full" />
          </div>
        </div>
      )}

      {/* Área principal */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Cabecera Móvil (Barra superior) */}
        <header className="md:hidden bg-chefsy text-white px-4 py-3 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuAbierto(true)}
              className="p-1 rounded-lg hover:bg-chefsy-700/60 transition-colors focus:outline-none"
              title="Abrir menú"
            >
              <Menu size={24} />
            </button>
            <span className="font-bold text-base tracking-wider uppercase">Chefsy</span>
          </div>
          <img
            src="/logo.jpg"
            alt="Chefsy Logo"
            className="w-8 h-8 rounded-lg bg-white p-0.5 object-contain"
          />
        </header>

        {/* Contenedor de Contenido Principal */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {tienePermiso ? children : <AccesoRestringido />}
        </main>
      </div>

      {/* Herramientas flotantes (solo admin, persisten entre páginas) */}
      {esAdmin && pathname !== '/cadeteria' && (
        <>
          <NotificadorAccesos />
          <NotitaFlotante />
          <CalculadoraFlotante />
        </>
      )}
    </div>
  )
}


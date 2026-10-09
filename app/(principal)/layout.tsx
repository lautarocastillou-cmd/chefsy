'use client'

// ─────────────────────────────────────────────────────
// app/(principal)/layout.tsx
// Layout compartido por dashboard, pedidos y nuevo-pedido.
// Incluye Sidebar + Header responsivo + área de contenido.
// ─────────────────────────────────────────────────────

import { Suspense, useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import BottomNavMobile from '@/components/layout/BottomNavMobile'
import { Menu, X, FlaskConical } from 'lucide-react'
import { usarAuth } from '@/contexto/AuthContexto'
import VerificadorLogin from '@/components/auth/VerificadorLogin'
import LoginPage from '@/components/auth/LoginPage'
import NotificadorAccesos from '@/components/auth/NotificadorAccesos'
import AccesoRestringido from '@/components/auth/AccesoRestringido'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { usarPedidos } from '@/contexto/PedidosContexto'
import FormularioPedido from '@/components/pedidos/FormularioPedido'
import NotitaFlotante from '@/components/herramientas/NotitaFlotante'
import CalculadoraFlotante from '@/components/herramientas/CalculadoraFlotante'
import ConsumoPersonalFlotante from '@/components/herramientas/ConsumoPersonalFlotante'
import AlertaPedidosDemoradosFlotante from '@/components/pedidos/AlertaPedidosDemoradosFlotante'
import ModalHerramientasTesteo from '@/components/dev/ModalHerramientasTesteo'
import { useAtajoNuevoPedido } from '@/hooks/useAtajoNuevoPedido'

function ContenidoPrincipal({ children }: { children: React.ReactNode }) {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const { usuarioActivo } = usarAuth()
  const { modalNuevoPedidoAbierto, abrirModalNuevoPedido, cerrarModalNuevoPedido, estadoTurno } = usarPedidos()
  const pathname = usePathname()
  const router = useRouter()

  useAtajoNuevoPedido({
    modalAbierto: modalNuevoPedidoAbierto,
    onAbrirModal: abrirModalNuevoPedido,
  })

  // Si el usuario es cadete, no tiene permiso de ver las páginas de administración (que están en este layout)
  const esCadete = usuarioActivo?.rol === 'cadete'
  const esAdmin = usuarioActivo?.rol === 'admin'

  // Si es cadete y está en cadetería, renderizamos su vista directamente sin la barra lateral
  if (esCadete && pathname === '/cadeteria') {
    return <>{children}</>
  }

  // Si es el editor visual de la tienda, renderizamos a pantalla completa para evitar colisiones móviles y navegación superpuesta
  if (pathname === '/configuracion/editor') {
    return <>{children}</>
  }

  const tienePermiso = !esCadete || pathname === '/cadeteria'

  return (
    <div className="flex h-screen overflow-hidden bg-chefsy-50 dark:bg-zinc-950 transition-colors">
      {/* Sidebar Desktop (flotante tipo isla/dock) */}
      <div className="hidden md:flex shrink-0 items-stretch h-full z-40">
        <Sidebar />
      </div>

      {/* Sidebar Móvil (Drawer overlay) */}
      {menuAbierto && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop/Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/80 transition-opacity will-change-opacity"
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
      <div className="flex flex-col flex-1 min-w-0 min-h-0 h-full overflow-y-auto" data-lenis-prevent="true">
        {/* Cabecera Móvil (Barra superior) */}
        <header className="md:hidden sticky top-0 bg-chefsy text-white px-4 py-3 flex items-center justify-between shadow-md shrink-0 z-40">
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

        {/* Banner Global de Turno de Prueba */}
        {estadoTurno?.activo && estadoTurno.tipoTurno === 'prueba' && (
          <div className="bg-purple-900 border-b border-purple-700 text-purple-100 px-4 py-2.5 flex items-center justify-between gap-3 text-xs shrink-0 z-30 shadow-md">
            <div className="flex items-center gap-2 font-medium">
              <span className="p-1 bg-purple-800 text-purple-200 rounded-md shrink-0 border border-purple-600">
                <FlaskConical size={14} />
              </span>
              <span>
                <strong className="font-extrabold uppercase tracking-wide text-purple-200">Modo Turno de Prueba Activo:</strong> Los pedidos y operaciones están aislados. No afectan estadísticas, cierres ni la tienda online.
              </span>
            </div>
            {pathname !== '/cierre' && (
              <Link
                href="/cierre"
                className="shrink-0 px-3 py-1 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-lg transition-colors border border-purple-500/50 shadow-xs"
              >
                Ir a Cierre / Finalizar
              </Link>
            )}
          </div>
        )}

        {/* Contenedor de Contenido Principal con padding inferior para BottomNav */}
        <main className="flex-1 p-3 md:p-6 pb-28 md:pb-6">
          {tienePermiso ? children : <AccesoRestringido />}
        </main>
      </div>

      {/* Barra de Navegación Inferior Fija para Móviles */}
      {tienePermiso && (
        <BottomNavMobile
          onAbrirNuevoPedido={abrirModalNuevoPedido}
        />
      )}

      {/* Herramientas flotantes (solo admin, persisten entre páginas) */}
      {esAdmin && pathname !== '/cadeteria' && (
        <div className="hidden md:block">
          <NotificadorAccesos />
          <NotitaFlotante />
          <CalculadoraFlotante />
          <ConsumoPersonalFlotante />
          <ModalHerramientasTesteo />
        </div>
      )}

      {/* Alerta flotante persistente de pedidos demorados (Estilo Alarma con aplazo) */}
      <AlertaPedidosDemoradosFlotante />

      {/* ── Modal Flotante Universal de Nuevo Pedido ── */}
      {modalNuevoPedidoAbierto && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-slate-950/85 transition-opacity duration-200 will-change-opacity animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              cerrarModalNuevoPedido()
            }
          }}
        >
          <div 
            className="bg-white dark:bg-slate-900 border-0 md:border border-slate-200/50 dark:border-slate-800 rounded-none md:rounded-3xl shadow-2xl max-w-5xl w-full h-full md:h-auto md:max-h-[90vh] overflow-y-auto scrollbar-hide animate-in zoom-in-95 duration-200 relative flex flex-col" 
            data-lenis-prevent="true"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <FormularioPedido 
              conHeaderModal={true}
              onClose={cerrarModalNuevoPedido} 
            />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Excepción temporal para probar el renderer experimental de MapLibre.
 *
 * El verificador de acceso muestra un 404 falso y espera aprobación del
 * administrador, lo que impide abrir el login en esta única dirección. Con el
 * parámetro `mapa=maplibre` en Torre de Control se muestra el login real para
 * poder iniciar sesión con una cuenta de administrador.
 *
 * Retirar esta excepción cuando MapLibre deje de ser experimental.
 */
function AccesoSinSesionExperimental() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const esPruebaMapLibre =
    pathname === '/torre-control' && searchParams.get('mapa') === 'maplibre'

  return esPruebaMapLibre ? <LoginPage /> : <VerificadorLogin />
}

export default function LayoutPrincipal({ children }: { children: React.ReactNode }) {
  const { usuarioActivo, estaListoAuth } = usarAuth()

  if (!estaListoAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-chefsy-50 dark:bg-zinc-950">
        <div className="w-10 h-10 border-4 border-chefsy border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!usuarioActivo) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-chefsy-50 dark:bg-zinc-950">
            <div className="w-10 h-10 border-4 border-chefsy border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <AccesoSinSesionExperimental />
      </Suspense>
    )
  }

  return <ContenidoPrincipal>{children}</ContenidoPrincipal>
}


'use client'

// ─────────────────────────────────────────────────────
// components/layout/Header.tsx
// Encabezado superior. Muestra el título de la sección
// actual y la fecha/hora del sistema.
// ─────────────────────────────────────────────────────

import { usePathname } from 'next/navigation'

const titulosPorRuta: Record<string, string> = {
  '/dashboard':     'Dashboard',
  '/pedidos':       'Pedidos',
  '/nuevo-pedido':  'Nuevo Pedido',
  '/cadeteria':     'Cadetería',
  '/cierre':        'Cierre de Caja',
  '/productos':     'Productos',
  '/clientes':      'Clientes',
  '/tienda':        'Tienda',
  '/configuracion': 'Configuración del Sistema',
}

export default function Header() {
  const rutaActual = usePathname()
  const titulo = titulosPorRuta[rutaActual] ?? 'Chefsy'

  const ahora = new Date()
  const horaFormateada = ahora.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const fechaFormateada = ahora.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <header className="bg-white border-b border-chefsy-200 px-6 py-3 flex items-center justify-between shrink-0">
      <h2 className="text-base font-semibold text-chefsy-800">{titulo}</h2>
      <div className="text-sm text-gray-400 capitalize">
        {fechaFormateada} · {horaFormateada}
      </div>
    </header>
  )
}

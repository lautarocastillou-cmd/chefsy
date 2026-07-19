'use client'

// ─────────────────────────────────────────────────────
// components/layout/Header.tsx
// Encabezado superior. Muestra el título de la sección
// actual y la fecha/hora del sistema.
// ─────────────────────────────────────────────────────

import { usePathname } from 'next/navigation'
import { usePedidos } from '@/contexto/PedidosContexto'

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
  const { cadetes } = usePedidos()

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

  // Solo mostramos batería de los que sabemos su nivel
  const cadetesConBateria = (cadetes || []).filter(c => c.bateria !== undefined && c.bateria !== null)

  return (
    <header className="bg-white border-b border-chefsy-200 px-6 py-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-6">
        <h2 className="text-base font-semibold text-chefsy-800">{titulo}</h2>
        {cadetesConBateria.length > 0 && (
          <div className="hidden md:flex gap-4 border-l border-slate-200 pl-6 h-6 items-center">
            {cadetesConBateria.map(c => (
              <div key={c.id} className="flex items-center gap-1.5 text-xs text-slate-600 font-medium bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                <span>🛵 {c.nombre.split(' ')[0]}</span>
                <span className={`font-bold ${c.bateria! < 20 ? 'text-red-600 animate-pulse' : c.bateria! < 50 ? 'text-orange-500' : 'text-emerald-600'}`}>
                  {c.bateria}% {c.bateria! < 20 ? '🪫' : '🔋'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="text-sm text-gray-400 capitalize whitespace-nowrap">
        {fechaFormateada} · {horaFormateada}
      </div>
    </header>
  )
}

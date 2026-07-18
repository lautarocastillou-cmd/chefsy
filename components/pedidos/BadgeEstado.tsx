// ─────────────────────────────────────────────────────
// components/pedidos/BadgeEstado.tsx
// Badge visual que representa el estado de un pedido.
// Cada estado tiene su propio color para lectura rápida.
// ─────────────────────────────────────────────────────

import { EstadoPedido } from '@/tipos'
import { cn } from '@/lib/utils'

// Configuración de etiqueta y clases por estado
const configuracionEstado: Record<EstadoPedido, { etiqueta: string; clases: string }> = {
  nuevo:      { etiqueta: 'Nuevo',       clases: 'bg-blue-100 text-blue-800' },
  en_cocina:  { etiqueta: 'En Cocina',   clases: 'bg-orange-100 text-orange-800' },
  listo:      { etiqueta: 'Listo',       clases: 'bg-yellow-100 text-yellow-800' },
  en_camino:  { etiqueta: 'En Camino',   clases: 'bg-indigo-100 text-indigo-800' },
  entregado:  { etiqueta: 'Entregado',   clases: 'bg-green-100 text-green-800' },
  cancelado:  { etiqueta: 'Cancelado',   clases: 'bg-red-100 text-red-800' },
}

interface PropsBadgeEstado {
  estado: EstadoPedido
}

export default function BadgeEstado({ estado }: PropsBadgeEstado) {
  const { etiqueta, clases } = configuracionEstado[estado]

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        clases
      )}
    >
      {etiqueta}
    </span>
  )
}

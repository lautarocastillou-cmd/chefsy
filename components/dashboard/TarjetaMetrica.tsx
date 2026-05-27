// ─────────────────────────────────────────────────────
// components/dashboard/TarjetaMetrica.tsx
// Muestra una métrica numérica en el dashboard.
// ─────────────────────────────────────────────────────

import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

type VarianteColor = 'neutro' | 'naranja' | 'morado' | 'verde' | 'azul'

const estilosPorVariante: Record<VarianteColor, { bg: string; iconBg: string; iconColor: string }> = {
  neutro:  { bg: 'bg-white border-gray-100', iconBg: 'bg-gray-100', iconColor: 'text-gray-500' },
  azul:    { bg: 'bg-gradient-to-br from-blue-50 to-white border-blue-100', iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
  naranja: { bg: 'bg-gradient-to-br from-orange-50 to-white border-orange-100', iconBg: 'bg-orange-100', iconColor: 'text-orange-500' },
  morado:  { bg: 'bg-gradient-to-br from-purple-50 to-white border-purple-100', iconBg: 'bg-purple-100', iconColor: 'text-purple-500' },
  verde:   { bg: 'bg-gradient-to-br from-chefsy-50 to-white border-chefsy-200', iconBg: 'bg-chefsy-100', iconColor: 'text-chefsy-600' },
}

interface PropsTarjetaMetrica {
  etiqueta: string
  valor: number | string
  descripcion?: string
  variante?: VarianteColor
  icon?: LucideIcon
}

export default function TarjetaMetrica({
  etiqueta,
  valor,
  descripcion,
  variante = 'neutro',
  icon: Icon,
}: PropsTarjetaMetrica) {
  const estilos = estilosPorVariante[variante]

  return (
    <div className={cn('border rounded-2xl p-5 shadow-sm transition-transform hover:-translate-y-1 duration-300', estilos.bg)}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500">{etiqueta}</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{valor}</p>
        </div>
        {Icon && (
          <div className={cn('p-3 rounded-xl', estilos.iconBg, estilos.iconColor)}>
            <Icon size={20} strokeWidth={2.5} />
          </div>
        )}
      </div>
      {descripcion && (
        <p className="text-xs text-gray-400 mt-3 font-medium">{descripcion}</p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────
// components/dashboard/TarjetaMetrica.tsx
// Muestra una métrica numérica en el dashboard.
// ─────────────────────────────────────────────────────

import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

type VarianteColor = 'neutro' | 'naranja' | 'morado' | 'verde' | 'azul'

const estilosPorVariante: Record<VarianteColor, {
  bg: string
  iconBg: string
  iconColor: string
  darkBg: string
  darkIconBg: string
}> = {
  neutro:  {
    bg: 'bg-white border-gray-100',
    iconBg: 'bg-gray-100', iconColor: 'text-gray-500',
    darkBg: 'dark:bg-[#252525] dark:border-[#3d3d3d]',
    darkIconBg: 'dark:bg-[#3a3a3a]',
  },
  azul: {
    bg: 'bg-gradient-to-br from-blue-50 to-white border-blue-100',
    iconBg: 'bg-blue-100', iconColor: 'text-blue-600',
    darkBg: 'dark:bg-[#252525] dark:border-[#3d3d3d] dark:from-[#252525] dark:to-[#252525]',
    darkIconBg: 'dark:bg-blue-950/40',
  },
  naranja: {
    bg: 'bg-gradient-to-br from-orange-50 to-white border-orange-100',
    iconBg: 'bg-orange-100', iconColor: 'text-orange-500',
    darkBg: 'dark:bg-[#252525] dark:border-[#3d3d3d] dark:from-[#252525] dark:to-[#252525]',
    darkIconBg: 'dark:bg-orange-950/40',
  },
  morado: {
    bg: 'bg-gradient-to-br from-purple-50 to-white border-purple-100',
    iconBg: 'bg-purple-100', iconColor: 'text-purple-500',
    darkBg: 'dark:bg-[#252525] dark:border-[#3d3d3d] dark:from-[#252525] dark:to-[#252525]',
    darkIconBg: 'dark:bg-purple-950/40',
  },
  verde: {
    bg: 'bg-gradient-to-br from-chefsy-50 to-white border-chefsy-200',
    iconBg: 'bg-chefsy-100', iconColor: 'text-chefsy-600',
    darkBg: 'dark:bg-[#252525] dark:border-[#3d3d3d] dark:from-[#252525] dark:to-[#252525]',
    darkIconBg: 'dark:bg-chefsy-900/40',
  },
}

interface PropsTarjetaMetrica {
  etiqueta: string
  valor: number | string
  descripcion?: string
  variante?: VarianteColor
  icon?: LucideIcon
  children?: React.ReactNode
}

export default function TarjetaMetrica({
  etiqueta,
  valor,
  descripcion,
  variante = 'neutro',
  icon: Icon,
  children,
}: PropsTarjetaMetrica) {
  const e = estilosPorVariante[variante]

  return (
    <div className={cn(
      'border rounded-2xl p-5 shadow-sm transition-transform hover:-translate-y-1 duration-300 relative',
      e.bg, e.darkBg
    )}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-[#a8a8a8]">{etiqueta}</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-[#e6e6e6] mt-2">{valor}</p>
        </div>
        {Icon && (
          <div className={cn('p-3 rounded-xl', e.iconBg, e.darkIconBg, e.iconColor)}>
            <Icon size={20} strokeWidth={2.5} />
          </div>
        )}
      </div>
      {descripcion && (
        <p className="text-xs text-gray-400 dark:text-[#686868] mt-3 font-medium">{descripcion}</p>
      )}
      {children}
    </div>
  )
}

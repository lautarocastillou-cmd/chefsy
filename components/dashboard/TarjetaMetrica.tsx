// ─────────────────────────────────────────────────────
// components/dashboard/TarjetaMetrica.tsx
// Muestra una métrica numérica en el dashboard con diseño Modern Web.
// ─────────────────────────────────────────────────────

import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

type VarianteColor = 'neutro' | 'naranja' | 'morado' | 'verde' | 'azul'

const estilosPorVariante: Record<VarianteColor, {
  card: string
  iconBg: string
  iconColor: string
  badgeGlow: string
}> = {
  neutro: {
    card: 'bg-white dark:bg-slate-900/90 border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700',
    iconBg: 'bg-slate-100 dark:bg-slate-800/80',
    iconColor: 'text-slate-600 dark:text-slate-300',
    badgeGlow: 'bg-slate-500/10'
  },
  azul: {
    card: 'bg-gradient-to-br from-sky-50/70 via-white to-white dark:from-sky-950/20 dark:via-slate-900/90 dark:to-slate-900 border-sky-200/70 dark:border-sky-900/40 shadow-sm hover:border-sky-300 dark:hover:border-sky-800 shadow-sky-500/5',
    iconBg: 'bg-sky-500/10 dark:bg-sky-500/15 border border-sky-500/20',
    iconColor: 'text-sky-600 dark:text-sky-400',
    badgeGlow: 'bg-sky-500/10'
  },
  naranja: {
    card: 'bg-gradient-to-br from-amber-50/70 via-white to-white dark:from-amber-950/20 dark:via-slate-900/90 dark:to-slate-900 border-amber-200/70 dark:border-amber-900/40 shadow-sm hover:border-amber-300 dark:hover:border-amber-800 shadow-amber-500/5',
    iconBg: 'bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
    badgeGlow: 'bg-amber-500/10'
  },
  morado: {
    card: 'bg-gradient-to-br from-indigo-50/70 via-white to-white dark:from-indigo-950/20 dark:via-slate-900/90 dark:to-slate-900 border-indigo-200/70 dark:border-indigo-900/40 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-800 shadow-indigo-500/5',
    iconBg: 'bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/20',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    badgeGlow: 'bg-indigo-500/10'
  },
  verde: {
    card: 'bg-gradient-to-br from-emerald-50/80 via-white to-white dark:from-emerald-950/20 dark:via-slate-900/90 dark:to-slate-900 border-emerald-200/70 dark:border-emerald-900/40 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-800 shadow-emerald-500/5',
    iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    badgeGlow: 'bg-emerald-500/10'
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
      'border rounded-3xl p-5 md:p-6 transition-all duration-300 relative group overflow-hidden hover:-translate-y-1 hover:shadow-lg',
      e.card
    )}>
      {/* Glow de fondo decorativo */}
      <div className={cn(
        'absolute -right-6 -bottom-6 w-24 h-24 rounded-full pointer-events-none transition-opacity opacity-20 group-hover:opacity-40 duration-500',
        e.badgeGlow
      )} />

      <div className="flex justify-between items-start gap-3 relative z-10">
        <div className="space-y-1.5 flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
            {etiqueta}
          </p>
          <p className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight font-mono">
            {valor}
          </p>
        </div>
        {Icon && (
          <div className={cn(
            'p-3 rounded-2xl shrink-0 transition-transform duration-300 group-hover:scale-110 shadow-sm',
            e.iconBg, e.iconColor
          )}>
            <Icon size={22} strokeWidth={2.5} />
          </div>
        )}
      </div>

      {descripcion && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 font-semibold relative z-10 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 inline-block" />
          <span>{descripcion}</span>
        </p>
      )}

      {children && (
        <div className="relative z-10 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
          {children}
        </div>
      )}
    </div>
  )
}

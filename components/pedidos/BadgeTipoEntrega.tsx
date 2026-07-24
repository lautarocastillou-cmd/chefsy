import { TipoEntrega } from '@/tipos'
import { obtenerEtiquetaTipoEntrega } from '@/lib/entrega'
import { cn } from '@/lib/utils'
import IconoTipoEntrega from '@/components/ui/IconoTipoEntrega'

const clasesPorTipo: Record<TipoEntrega, string> = {
  delivery: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/40',
  retiro: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40',
  consumo_local: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/40',
}

interface PropsBadgeTipoEntrega {
  tipoEntrega: TipoEntrega
  className?: string
}

export default function BadgeTipoEntrega({ tipoEntrega, className }: PropsBadgeTipoEntrega) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded border',
        clasesPorTipo[tipoEntrega],
        className
      )}
    >
      <IconoTipoEntrega tipo={tipoEntrega} />
      <span>{obtenerEtiquetaTipoEntrega(tipoEntrega)}</span>
    </span>
  )
}

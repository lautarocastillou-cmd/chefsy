import { TipoEntrega } from '@/tipos'
import { obtenerEtiquetaTipoEntrega, obtenerIconoTipoEntrega } from '@/lib/entrega'
import { cn } from '@/lib/utils'

const clasesPorTipo: Record<TipoEntrega, string> = {
  delivery: 'bg-blue-50 text-blue-700 border-blue-200',
  retiro: 'bg-amber-50 text-amber-800 border-amber-200',
  consumo_local: 'bg-purple-50 text-purple-700 border-purple-200',
}

interface PropsBadgeTipoEntrega {
  tipoEntrega: TipoEntrega
  className?: string
}

export default function BadgeTipoEntrega({ tipoEntrega, className }: PropsBadgeTipoEntrega) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded border',
        clasesPorTipo[tipoEntrega],
        className
      )}
    >
      <span>{obtenerIconoTipoEntrega(tipoEntrega)}</span>
      {obtenerEtiquetaTipoEntrega(tipoEntrega)}
    </span>
  )
}

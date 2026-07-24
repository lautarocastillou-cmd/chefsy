'use client'

import { TipoEntrega } from '@/tipos'
import { opcionesTipoEntrega } from '@/lib/entrega'
import { cn } from '@/lib/utils'
import IconoTipoEntrega from '@/components/ui/IconoTipoEntrega'

interface PropsSelectorTipoEntrega {
  valor: TipoEntrega
  onCambio: (tipo: TipoEntrega) => void
}

export default function SelectorTipoEntrega({ valor, onCambio }: PropsSelectorTipoEntrega) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
        Tipo de pedido <span className="text-red-400">*</span>
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {opcionesTipoEntrega.map((opcion) => {
          const seleccionado = valor === opcion.valor
          return (
            <button
              key={opcion.valor}
              type="button"
              onClick={() => onCambio(opcion.valor)}
              className={cn(
                'text-left border rounded-md px-3 py-2.5 transition-colors',
                seleccionado
                  ? 'border-chefsy bg-chefsy-50 dark:bg-chefsy-950/30 ring-2 ring-chefsy'
                  : 'border-gray-300 dark:border-slate-800 hover:border-gray-400 dark:hover:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-850'
              )}
            >
              <IconoTipoEntrega tipo={opcion.valor} className="w-5 h-5 text-chefsy dark:text-chefsy-400" />
              <p className="text-sm font-medium text-gray-900 dark:text-slate-100 mt-1">{opcion.etiqueta}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{opcion.descripcion}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

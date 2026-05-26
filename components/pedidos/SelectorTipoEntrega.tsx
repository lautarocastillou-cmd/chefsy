'use client'

import { TipoEntrega } from '@/tipos'
import { opcionesTipoEntrega } from '@/lib/entrega'
import { cn } from '@/lib/utils'

interface PropsSelectorTipoEntrega {
  valor: TipoEntrega
  onCambio: (tipo: TipoEntrega) => void
}

export default function SelectorTipoEntrega({ valor, onCambio }: PropsSelectorTipoEntrega) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  ? 'border-chefsy bg-chefsy-50 ring-2 ring-chefsy'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              )}
            >
              <span className="text-lg">{opcion.icono}</span>
              <p className="text-sm font-medium text-gray-900 mt-1">{opcion.etiqueta}</p>
              <p className="text-xs text-gray-500 mt-0.5">{opcion.descripcion}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

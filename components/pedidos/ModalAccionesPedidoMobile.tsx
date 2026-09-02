import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Pedido } from '@/tipos'
import {
  Pencil,
  Printer,
  Receipt,
  Copy,
  MapPin,
  Undo2,
  Trash2,
  X,
  Phone,
  MessageCircle,
} from 'lucide-react'
import { formatearPrecio, cn } from '@/lib/utils'

interface PropsModalAccionesPedidoMobile {
  pedido: Pedido
  abierto: boolean
  onClose: () => void
  onEditar: () => void
  onImprimir: () => void
  onCopiarTicket: () => void
  onCopiarWhatsApp: () => void
  onVerMapa?: () => void
  onRevertirEstado?: () => void
  onCancelar: () => void
}

export default function ModalAccionesPedidoMobile({
  pedido,
  abierto,
  onClose,
  onEditar,
  onImprimir,
  onCopiarTicket,
  onCopiarWhatsApp,
  onVerMapa,
  onRevertirEstado,
  onCancelar,
}: PropsModalAccionesPedidoMobile) {
  const [montado, setMontado] = useState(false)

  useEffect(() => {
    setMontado(true)
  }, [])

  if (!abierto || !montado || typeof document === 'undefined') return null

  const vibrar = (ms = 15) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(ms)
    }
  }

  const opciones = [
    {
      id: 'editar',
      label: 'Editar Pedido',
      descripcion: 'Modificar productos, dirección o cliente',
      icon: Pencil,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      action: onEditar,
    },
    {
      id: 'imprimir',
      label: 'Imprimir Comanda Térmica',
      descripcion: 'Enviar a ticketera USB / Bluetooth',
      icon: Printer,
      color: 'text-slate-300 bg-slate-800 border-slate-700',
      action: onImprimir,
    },
    {
      id: 'ticket',
      label: 'Copiar Desglose para Cliente',
      descripcion: 'Texto formateado con ítems y total',
      icon: Receipt,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      action: onCopiarTicket,
    },
    {
      id: 'whatsapp',
      label: 'Copiar Resumen para Cocina / Cadete',
      descripcion: 'Copia rápida con dirección y link',
      icon: Copy,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      action: onCopiarWhatsApp,
    },
    ...(pedido.cadete_id && onVerMapa
      ? [
          {
            id: 'mapa',
            label: 'Ver Mapa de Seguimiento GPS',
            descripcion: 'Ubicación en tiempo real del repartidor',
            icon: MapPin,
            color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
            action: onVerMapa,
          },
        ]
      : []),
    ...(onRevertirEstado && pedido.estado !== 'nuevo'
      ? [
          {
            id: 'revertir',
            label: 'Revertir a Estado Anterior',
            descripcion: 'Retroceder la comanda un paso',
            icon: Undo2,
            color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
            action: onRevertirEstado,
          },
        ]
      : []),
    {
      id: 'cancelar',
      label: 'Cancelar Pedido',
      descripcion: 'Anular orden y restituir stock',
      icon: Trash2,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      esPeligroso: true,
      action: onCancelar,
    },
  ]

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Sheet Panel */}
      <div className="relative bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 pb-8 shadow-2xl z-10 animate-in slide-in-from-bottom duration-200 max-h-[85vh] overflow-y-auto">
        {/* Handle */}
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4" />

        {/* Cabecera del pedido */}
        <div className="flex items-start justify-between mb-4 border-b border-slate-800 pb-3">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
              Opciones de Pedido #{pedido.id.slice(-4)}
            </span>
            <h3 className="text-lg font-black text-white leading-tight mt-0.5">
              {pedido.cliente}
            </h3>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {formatearPrecio(pedido.total)}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Lista de Opciones Táctiles */}
        <div className="space-y-2">
          {opciones.map((op) => {
            const Icono = op.icon

            return (
              <button
                key={op.id}
                onClick={() => {
                  vibrar(20)
                  op.action()
                  onClose()
                }}
                className={cn(
                  'w-full flex items-center gap-3.5 p-3 rounded-2xl border text-left transition-all active:scale-98 cursor-pointer',
                  op.esPeligroso
                    ? 'bg-rose-950/20 border-rose-900/40 hover:bg-rose-900/30'
                    : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/60'
                )}
              >
                <div className={cn('p-2.5 rounded-xl border shrink-0', op.color)}>
                  <Icono size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-xs font-extrabold leading-tight',
                      op.esPeligroso ? 'text-rose-400' : 'text-slate-100'
                    )}
                  >
                    {op.label}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">
                    {op.descripcion}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>,
    document.body
  )
}

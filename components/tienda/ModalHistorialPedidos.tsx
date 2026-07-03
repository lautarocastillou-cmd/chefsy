'use client'

import React, { useEffect, useState } from 'react'
import { X, ShoppingBag, Truck, Store, UtensilsCrossed, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { usarClienteAuth } from '@/contexto/ClienteAuthContexto'

interface ProductoPedido {
  nombre: string
  cantidad: number
  precio: number
}

interface PedidoHistorial {
  id: string
  created_at?: string
  fecha?: string
  hora?: string
  total: number
  costoEnvio?: number
  tipoEntrega: string
  direccion?: string
  productos: ProductoPedido[]
  puntos_ganados?: number
  estado?: string
}

interface Props {
  abierto: boolean
  onCerrar: () => void
}

function formatearPrecio(monto: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(monto || 0)
}

function obtenerDetallesEstado(estado?: string) {
  switch (estado?.toLowerCase()) {
    case 'entregado':
      return { label: 'Entregado', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icono: CheckCircle2 }
    case 'en_camino':
    case 'reparto':
      return { label: 'En camino', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icono: Truck }
    case 'listo':
      return { label: 'Listo para entregar', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icono: ShoppingBag }
    case 'cocina':
      return { label: 'En cocina', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icono: Clock }
    case 'cancelado':
      return { label: 'Cancelado', color: 'bg-red-500/20 text-red-400 border-red-500/30', icono: AlertCircle }
    default:
      return { label: 'Recibido', color: 'bg-chefsy/20 text-chefsy-400 border-chefsy/30', icono: Clock }
  }
}

function obtenerTipoEntregaUI(tipo?: string, direccion?: string) {
  const t = tipo?.toLowerCase() || ''
  if (t === 'delivery') {
    return {
      titulo: 'Delivery',
      subtitulo: direccion || 'A domicilio',
      icono: Truck,
      clase: 'bg-blue-950/40 text-blue-300 border-blue-800/40'
    }
  } else if (t === 'consumo_local' || t === 'salon' || t === 'local') {
    return {
      titulo: 'Consumo en el local',
      subtitulo: 'En salón',
      icono: UtensilsCrossed,
      clase: 'bg-purple-950/40 text-purple-300 border-purple-800/40'
    }
  } else {
    return {
      titulo: 'Retiro en el local',
      subtitulo: 'Takeaway',
      icono: Store,
      clase: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
    }
  }
}

export default function ModalHistorialPedidos({ abierto, onCerrar }: Props) {
  const { perfil } = usarClienteAuth()
  const [pedidos, setPedidos] = useState<PedidoHistorial[]>([])
  const [cargando, setCargando] = useState<boolean>(true)

  useEffect(() => {
    if (!abierto) return

    async function cargarPedidos() {
      setCargando(true)
      try {
        const res = await fetch('/api/clientes/pedidos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clienteId: perfil?.id,
            telefono: perfil?.telefono
          })
        })
        if (res.ok) {
          const data = await res.json()
          setPedidos(data.pedidos || [])
        } else {
          setPedidos([])
        }
      } catch (err) {
        console.error('Error cargando historial de pedidos:', err)
        setPedidos([])
      } finally {
        setCargando(false)
      }
    }

    cargarPedidos()
  }, [abierto, perfil])

  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 transition-opacity duration-200 will-change-opacity animate-in fade-in" onClick={onCerrar}>
      <div className="bg-[#121418] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200 will-change-transform" onClick={(e) => e.stopPropagation()}>
        
        {/* Cabecera */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-chefsy/20 border border-chefsy/40 flex items-center justify-center text-chefsy-400 shrink-0">
              <ShoppingBag size={22} />
            </div>
            <div>
              <h3 className="font-bebas text-3xl sm:text-4xl text-white tracking-wide leading-none">
                HISTORIAL DE PEDIDOS
              </h3>
              <p className="text-xs sm:text-sm text-slate-400">
                Revisá tus compras y consumos
              </p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
          {cargando ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
              <div className="w-8 h-8 border-4 border-chefsy border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Buscando tus pedidos...</span>
            </div>
          ) : pedidos.length === 0 ? (
            <div className="py-16 text-center bg-black/30 rounded-2xl border border-dashed border-white/10 p-6 flex flex-col items-center">
              <span className="text-4xl mb-3">🍔</span>
              <h4 className="font-bebas text-2xl text-white tracking-wide">AÚN NO TENÉS PEDIDOS REGISTRADOS</h4>
              <p className="text-slate-400 text-sm max-w-xs mt-1">
                Tus próximas compras y pedidos aparecerán en este historial automáticamente.
              </p>
            </div>
          ) : (
            pedidos.map((pedido) => {
              const infoEstado = obtenerDetallesEstado(pedido.estado)
              const infoEntrega = obtenerTipoEntregaUI(pedido.tipoEntrega, pedido.direccion)
              const IconoEstado = infoEstado.icono
              const IconoEntrega = infoEntrega.icono

              // Calcular puntos si no estaban guardados explícitamente
              const puntosGanados = pedido.puntos_ganados !== undefined && pedido.puntos_ganados !== null
                ? pedido.puntos_ganados
                : Math.floor((pedido.total || 0) * 0.05)

              const subtotalProd = (pedido.productos || []).reduce((acc, p) => acc + (p.precio * p.cantidad), 0)

              return (
                <div
                  key={pedido.id}
                  className="bg-[#181b22] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4 hover:border-white/20 transition-all"
                >
                  {/* Fila superior: ID/Fecha y Estado */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
                    <div>
                      <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
                        PEDIDO #{pedido.id ? pedido.id.split('-').pop() : 'REF'}
                      </span>
                      <span className="text-sm font-medium text-white">
                        {pedido.fecha ? `${pedido.fecha.split('-').reverse().join('/')}` : 'Fecha reciente'}
                        {pedido.hora ? ` • ${pedido.hora}` : ''}
                      </span>
                    </div>

                    <div className={`px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${infoEstado.color}`}>
                      <IconoEstado size={14} />
                      <span>{infoEstado.label}</span>
                    </div>
                  </div>

                  {/* Badge Tipo de Entrega */}
                  <div className={`p-3 rounded-xl border flex items-center gap-3 ${infoEntrega.clase}`}>
                    <div className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
                      <IconoEntrega size={18} />
                    </div>
                    <div className="truncate">
                      <span className="text-xs font-bold uppercase tracking-wider block">
                        {infoEntrega.titulo}
                      </span>
                      <span className="text-xs opacity-80 truncate block">
                        {infoEntrega.subtitulo}
                      </span>
                    </div>
                  </div>

                  {/* Listado de Productos */}
                  <div className="bg-black/30 rounded-xl p-3 border border-white/5 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Productos comprados
                    </span>
                    {(pedido.productos && pedido.productos.length > 0) ? (
                      pedido.productos.map((prod, idx) => (
                        <div key={idx} className="flex justify-between items-start text-sm py-0.5">
                          <span className="text-slate-200 font-medium pr-2">
                            <span className="text-chefsy-400 font-bold mr-1.5">{prod.cantidad || 1}x</span>
                            {prod.nombre}
                          </span>
                          <span className="text-slate-300 font-mono text-xs shrink-0 pt-0.5">
                            {formatearPrecio((prod.precio || 0) * (prod.cantidad || 1))}
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">Detalle de productos no disponible</span>
                    )}
                  </div>

                  {/* Desglose Económico */}
                  <div className="pt-2 space-y-1.5 text-sm border-t border-white/5">
                    <div className="flex justify-between text-slate-400 text-xs">
                      <span>Subtotal de productos:</span>
                      <span className="font-mono">{formatearPrecio(subtotalProd || pedido.total - (pedido.costoEnvio || 0))}</span>
                    </div>
                    <div className="flex justify-between text-slate-400 text-xs">
                      <span>Precio de envío:</span>
                      <span className="font-mono">
                        {(pedido.costoEnvio && pedido.costoEnvio > 0)
                          ? formatearPrecio(pedido.costoEnvio)
                          : 'Gratis / Retiro'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-white font-bold pt-1 text-base">
                      <span>TOTAL:</span>
                      <span className="font-bebas text-2xl tracking-wide text-chefsy-400">
                        {formatearPrecio(pedido.total)}
                      </span>
                    </div>
                  </div>


                </div>
              )
            })
          )}
        </div>

        {/* Pie */}
        <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end shrink-0">
          <button
            onClick={onCerrar}
            className="bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 px-6 rounded-xl transition-all cursor-pointer text-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

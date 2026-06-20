'use client'

import React from 'react'
import { Plus, Minus, Trash2, X, ShoppingCart, ChevronRight } from 'lucide-react'
import { User, Phone, MapPin, CreditCard } from 'lucide-react'
import { SlideButton } from '@/components/ui/slide-button'
import { ItemCarrito } from '@/tipos/tienda'
import { formatearPrecio } from '@/lib/utils'

interface CartDrawerProps {
  carrito: ItemCarrito[]
  cartAbierto: boolean
  mostrarCheckout: boolean
  tipoEntrega: 'delivery' | 'retiro'
  nombreCliente: string
  telefonoCliente: string
  direccionCliente: string
  metodoPago: 'efectivo' | 'tarjeta' | 'transferencia' | 'sin_especificar'
  observaciones: string
  subtotalCarrito: number
  totalCarrito: number
  totalProductosCarrito: number
  costoEnvio: number
  onCerrar: () => void
  onActualizarCantidad: (idCart: string, delta: number) => void
  onEliminar: (idCart: string) => void
  onSetMostrarCheckout: (v: boolean) => void
  onSetTipoEntrega: (v: 'delivery' | 'retiro') => void
  onSetNombreCliente: (v: string) => void
  onSetTelefonoCliente: (v: string) => void
  onSetDireccionCliente: (v: string) => void
  onSetMetodoPago: (v: 'efectivo' | 'tarjeta' | 'transferencia' | 'sin_especificar') => void
  onSetObservaciones: (v: string) => void
  onProcesarCompra: () => void
}

export default function CartDrawer({
  carrito,
  cartAbierto,
  mostrarCheckout,
  tipoEntrega,
  nombreCliente,
  telefonoCliente,
  direccionCliente,
  metodoPago,
  observaciones,
  subtotalCarrito,
  totalCarrito,
  totalProductosCarrito,
  costoEnvio,
  onCerrar,
  onActualizarCantidad,
  onEliminar,
  onSetMostrarCheckout,
  onSetTipoEntrega,
  onSetNombreCliente,
  onSetTelefonoCliente,
  onSetDireccionCliente,
  onSetMetodoPago,
  onSetObservaciones,
  onProcesarCompra,
}: CartDrawerProps) {
  if (!cartAbierto) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onCerrar}
      />
      
      <div className="relative w-full max-w-md bg-slate-900/90 backdrop-blur-xl shadow-2xl h-full flex flex-col z-10 animate-in slide-in-from-right duration-250 border-l border-white/10">
        {/* Cabecera del Drawer */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="text-chefsy-500" size={20} />
            <h2 className="font-extrabold text-white text-sm">Tu Carrito</h2>
            <span className="bg-white/10 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {totalProductosCarrito} items
            </span>
          </div>
          <button
            onClick={onCerrar}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 transition-colors focus:outline-none"
          >
            <X size={18} />
          </button>
        </div>

        {/* Listado del Carrito */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-5 space-y-4">
          {carrito.length === 0 ? (
            <div className="text-center py-20 text-slate-400 text-xs">
              🛒 Tu carrito está vacío.<br />Agrega algunos platos ricos de la tienda.
            </div>
          ) : !mostrarCheckout ? (
            carrito.map(item => (
              <div 
                key={item.idCart}
                className="flex justify-between gap-3 p-3 bg-white/5 border border-white/5 rounded-2xl transition-all"
              >
                <div className="flex-1 space-y-1 text-left">
                  <h4 className="font-bold text-xs text-white leading-tight">
                    {item.producto.nombre}
                  </h4>
                  {item.modificadoresSeleccionados.length > 0 && (
                    <p className="text-[10px] text-slate-400 italic">
                      + {item.modificadoresSeleccionados.map(m => `${m.nombre} (${formatearPrecio(m.precioExtra)})`).join(', ')}
                    </p>
                  )}
                  <p className="text-[11px] font-bold text-slate-400">
                    {formatearPrecio(item.precioUnitario)}
                  </p>
                </div>

                <div className="flex flex-col items-end justify-between gap-2.5 min-w-[100px]">
                  <button
                    onClick={() => onEliminar(item.idCart)}
                    className="text-slate-500 hover:text-red-500 p-1 rounded transition-colors focus:outline-none"
                    title="Eliminar ítem"
                  >
                    <Trash2 size={14} />
                  </button>

                  <div className="flex items-center border border-white/10 rounded-lg bg-black/20 overflow-hidden">
                    <button
                      onClick={() => onActualizarCantidad(item.idCart, -1)}
                      className="px-2 py-1 hover:bg-white/10 transition-colors text-slate-400 focus:outline-none"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="px-2.5 text-xs font-bold text-white">
                      {item.cantidad}
                    </span>
                    <button
                      onClick={() => onActualizarCantidad(item.idCart, 1)}
                      className="px-2 py-1 hover:bg-white/10 transition-colors text-slate-400 focus:outline-none"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            /* --- FORMULARIO DE CHECKOUT --- */
            <form onSubmit={(e) => { e.preventDefault(); onProcesarCompra() }} className="space-y-4">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                <button
                  type="button"
                  onClick={() => onSetMostrarCheckout(false)}
                  className="text-xs text-chefsy-400 hover:underline font-bold cursor-pointer"
                >
                  ← Volver al carrito
                </button>
              </div>

              {/* Campo Nombre */}
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Nombre Completo
                </label>
                <div className="relative flex items-center">
                  <User size={14} className="absolute left-3 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={nombreCliente}
                    onChange={(e) => onSetNombreCliente(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    className="w-full border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-chefsy-500 bg-black/20 text-white placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* Campo Teléfono */}
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Teléfono de Contacto
                </label>
                <div className="relative flex items-center">
                  <Phone size={14} className="absolute left-3 text-slate-500" />
                  <input
                    type="tel"
                    required
                    value={telefonoCliente}
                    onChange={(e) => onSetTelefonoCliente(e.target.value)}
                    placeholder="Ej: 1122334455"
                    className="w-full border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-chefsy-500 bg-black/20 text-white placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* Tipo de Entrega */}
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Modalidad de Entrega
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onSetTipoEntrega('delivery')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      tipoEntrega === 'delivery'
                        ? 'bg-chefsy-500/20 text-chefsy-400 border-chefsy-500'
                        : 'border-white/10 bg-black/20 text-slate-400'
                    }`}
                  >
                    🛵 Delivery
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetTipoEntrega('retiro')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      tipoEntrega === 'retiro'
                        ? 'bg-chefsy-500/20 text-chefsy-400 border-chefsy-500'
                        : 'border-white/10 bg-black/20 text-slate-400'
                    }`}
                  >
                    🏪 Retiro por local
                  </button>
                </div>
              </div>

              {/* Campo Dirección */}
              {tipoEntrega === 'delivery' && (
                <div className="space-y-1 text-left animate-in fade-in slide-in-from-top-2 duration-150">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Dirección de Envío
                  </label>
                  <div className="relative flex items-center">
                    <MapPin size={14} className="absolute left-3 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={direccionCliente}
                      onChange={(e) => onSetDireccionCliente(e.target.value)}
                      placeholder="Calle, Altura, Piso / Depto"
                      className="w-full border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-chefsy-500 bg-black/20 text-white placeholder:text-slate-600"
                    />
                  </div>
                </div>
              )}

              {/* Método de Pago */}
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Método de Pago
                </label>
                <div className="relative flex items-center">
                  <CreditCard size={14} className="absolute left-3 text-slate-500" />
                  <select
                    value={metodoPago}
                    onChange={(e) => onSetMetodoPago(e.target.value as any)}
                    className="w-full border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-chefsy-500 bg-black/20 text-white"
                  >
                    <option value="efectivo">💵 Efectivo (Paga al recibir)</option>
                    <option value="tarjeta">💳 Tarjeta (Débito/Crédito)</option>
                    <option value="transferencia">📲 Transferencia Bancaria</option>
                  </select>
                </div>
              </div>

              {/* Observaciones */}
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Aclaraciones / Notas (Opcional)
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => onSetObservaciones(e.target.value)}
                  placeholder="Ej: Sin cebolla, tocar timbre de abajo..."
                  rows={2}
                  className="w-full border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-chefsy-500 bg-black/20 text-white placeholder:text-slate-600 resize-none"
                />
              </div>

              <div className="mt-4 flex w-full">
                <SlideButton 
                  onAction={onProcesarCompra}
                  texto={`DESLIZA PARA CONFIRMAR (${formatearPrecio(totalCarrito)})`}
                  className="w-full"
                />
              </div>
            </form>
          )}
        </div>

        {/* Footer de Drawer */}
        {carrito.length > 0 && (
          <div className="p-5 border-t border-white/10 bg-black/10 space-y-4">
            <div className="space-y-1.5 text-xs text-slate-400 text-left">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-white">{formatearPrecio(subtotalCarrito)}</span>
              </div>
              {tipoEntrega === 'delivery' && (
                <div className="flex justify-between">
                  <span>Costo de envío</span>
                  <span className="font-semibold text-white">{formatearPrecio(costoEnvio)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-white/10 pt-2 text-sm font-black text-white">
                <span>Total a pagar</span>
                <span className="text-chefsy-400">{formatearPrecio(totalCarrito)}</span>
              </div>
            </div>

            {!mostrarCheckout && (
              <button
                onClick={() => onSetMostrarCheckout(true)}
                className="w-full bg-chefsy-500 hover:bg-chefsy-600 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
              >
                Iniciar Checkout
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

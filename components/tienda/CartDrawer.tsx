'use client'

import React, { useState, useEffect } from 'react'
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
  const [checkoutStep, setCheckoutStep] = useState(1)
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false)

  // Resetear paso cuando se cierra el carrito o se abre el checkout
  useEffect(() => {
    if (!mostrarCheckout) setCheckoutStep(1)
  }, [mostrarCheckout])

  const obtenerUbicacion = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización.')
      return
    }
    setBuscandoUbicacion(true)
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords
        // Usar Nominatim OpenStreetMap
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`)
        const data = await res.json()
        if (data && data.address) {
          const calle = data.address.road || data.address.pedestrian || ''
          const nro = data.address.house_number || ''
          const barrio = data.address.suburb || data.address.neighbourhood || ''
          
          const direccionFinal = `${calle} ${nro}, ${barrio}`.trim().replace(/,$/, '')
          if (direccionFinal.length > 3) {
            onSetDireccionCliente(direccionFinal)
          } else {
            alert('No pudimos encontrar la calle exacta, por favor ingresala manualmente.')
          }
        } else {
          alert('No pudimos encontrar la calle exacta, por favor ingresala manualmente.')
        }
      } catch (error) {
        alert('Error al obtener la dirección. Ingresala manualmente.')
      } finally {
        setBuscandoUbicacion(false)
      }
    }, (err) => {
      setBuscandoUbicacion(false)
      alert('No pudimos acceder a tu ubicación. Verificá los permisos del navegador.')
    }, { enableHighAccuracy: true, timeout: 10000 })
  }

  useEffect(() => {
    if (cartAbierto) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [cartAbierto])

  if (!cartAbierto) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onCerrar}
      />
      
      <div className="relative w-full max-w-md bg-slate-900/90 backdrop-blur-xl shadow-2xl h-full flex flex-col z-10 animate-in slide-in-from-right duration-250 border-l border-white/10">
        {/* Cabecera del Drawer */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
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

        {/* Contenido Principal */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {carrito.length === 0 ? (
            <div className="text-center py-20 px-5 text-slate-400 text-xs">
              🛒 Tu carrito está vacío.<br />Agrega algunos platos ricos de la tienda.
            </div>
          ) : !mostrarCheckout ? (
            <div className="flex-1 overflow-y-auto scrollbar-hide p-5 space-y-4">
              {carrito.map(item => (
                <div 
                  key={item.idCart}
                  className="flex justify-between gap-3 p-3 bg-white/5 border border-white/5 rounded-2xl transition-all hover:bg-white/10"
                >
                  <div className="flex-1 space-y-1 text-left">
                    <h4 className="font-bold text-base text-white leading-tight">
                      {item.producto.nombre}
                    </h4>
                    {item.modificadoresSeleccionados.length > 0 && (
                      <p className="text-sm text-slate-400 italic">
                        + {item.modificadoresSeleccionados.map(m => `${m.nombre} (${formatearPrecio(m.precioExtra)})`).join(', ')}
                      </p>
                    )}
                    <p className="text-sm font-bold text-slate-400">
                      {formatearPrecio(item.precioUnitario)}
                    </p>
                  </div>

                  <div className="flex flex-col items-end justify-between gap-2.5 min-w-[120px]">
                    <button
                      onClick={() => onEliminar(item.idCart)}
                      className="text-slate-500 hover:text-red-500 p-2 rounded transition-colors focus:outline-none"
                      title="Eliminar ítem"
                    >
                      <Trash2 size={20} />
                    </button>

                    <div className="flex items-center border border-white/10 rounded-lg bg-black/20 overflow-hidden">
                      <button
                        onClick={() => onActualizarCantidad(item.idCart, -1)}
                        className="w-10 h-10 flex items-center justify-center hover:bg-white/10 transition-colors text-slate-400 focus:outline-none"
                      >
                        <Minus size={18} />
                      </button>
                      <span className="px-3 text-sm font-bold text-white">
                        {item.cantidad}
                      </span>
                      <button
                        onClick={() => onActualizarCantidad(item.idCart, 1)}
                        className="w-10 h-10 flex items-center justify-center hover:bg-white/10 transition-colors text-slate-400 focus:outline-none"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* --- FORMULARIO DE CHECKOUT (STEPPER) --- */
            <div className="flex-1 overflow-y-auto scrollbar-hide p-5">
              <form onSubmit={(e) => { e.preventDefault(); onProcesarCompra() }} className="flex flex-col h-full relative">
                {/* Header con botón de volver y progreso */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (checkoutStep > 1) setCheckoutStep(checkoutStep - 1)
                      else onSetMostrarCheckout(false)
                    }}
                    className="text-sm text-slate-400 hover:text-white font-bold cursor-pointer flex items-center gap-1 transition-colors"
                  >
                    <ChevronRight size={16} className="rotate-180" />
                    {checkoutStep > 1 ? 'Anterior' : 'Volver al carrito'}
                  </button>
                  <div className="flex gap-1.5">
                    {[1, 2, 3].map(s => (
                      <div key={s} className={`h-1.5 w-6 rounded-full transition-all duration-300 ${s === checkoutStep ? 'bg-chefsy-500' : s < checkoutStep ? 'bg-chefsy-500/50' : 'bg-white/10'}`} />
                    ))}
                  </div>
                </div>

                <div className="relative flex-1 min-h-[350px]">
                  {/* PASO 1: DATOS PERSONALES */}
                  <div className={`absolute inset-0 transition-all duration-300 ${checkoutStep === 1 ? 'opacity-100 translate-x-0 pointer-events-auto z-10' : 'opacity-0 -translate-x-full pointer-events-none z-0'}`}>
                    <h3 className="text-xl font-black text-white mb-6 text-left">Tus Datos</h3>
                    
                    <div className="space-y-5">
                      {/* Floating Label Input: Nombre */}
                      <div className="relative group text-left">
                        <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-chefsy-400 transition-colors z-10" />
                        <input
                          id="nombre_cliente"
                          type="text"
                          required={checkoutStep === 1}
                          value={nombreCliente}
                          onChange={(e) => onSetNombreCliente(e.target.value)}
                          className="peer w-full border border-white/10 rounded-2xl pl-12 pr-4 pt-6 pb-2 text-base focus:outline-none focus:ring-2 focus:ring-chefsy-500 focus:border-chefsy-500 bg-black/20 text-white placeholder-transparent transition-all"
                          placeholder="Nombre Completo"
                        />
                        <label htmlFor="nombre_cliente" className="absolute left-12 top-4 -translate-y-1/2 text-[10px] font-bold text-slate-500 peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-focus:top-4 peer-focus:text-[10px] peer-focus:font-bold peer-focus:text-chefsy-400 transition-all pointer-events-none uppercase tracking-wider">
                          Nombre Completo
                        </label>
                      </div>

                      {/* Floating Label Input: Teléfono */}
                      <div className="relative group text-left">
                        <Phone size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-chefsy-400 transition-colors z-10" />
                        <input
                          id="telefono_cliente"
                          type="tel"
                          required={checkoutStep === 1}
                          value={telefonoCliente}
                          onChange={(e) => onSetTelefonoCliente(e.target.value)}
                          className="peer w-full border border-white/10 rounded-2xl pl-12 pr-4 pt-6 pb-2 text-base focus:outline-none focus:ring-2 focus:ring-chefsy-500 focus:border-chefsy-500 bg-black/20 text-white placeholder-transparent transition-all"
                          placeholder="Teléfono"
                        />
                        <label htmlFor="telefono_cliente" className="absolute left-12 top-4 -translate-y-1/2 text-[10px] font-bold text-slate-500 peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-focus:top-4 peer-focus:text-[10px] peer-focus:font-bold peer-focus:text-chefsy-400 transition-all pointer-events-none uppercase tracking-wider">
                          Teléfono
                        </label>
                      </div>
                    </div>

                    <div className="mt-8">
                      <button
                        type="button"
                        onClick={() => {
                          if (nombreCliente.trim() && telefonoCliente.trim()) setCheckoutStep(2)
                          else alert('Completá tus datos para continuar')
                        }}
                        className="w-full bg-chefsy-500 hover:bg-chefsy-600 text-white font-extrabold py-4 px-4 rounded-xl shadow-[0_4px_20px_rgba(42,99,72,0.3)] transition-all flex items-center justify-center gap-2"
                      >
                        Siguiente Paso <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>

                  {/* PASO 2: ENTREGA */}
                  <div className={`absolute inset-0 transition-all duration-300 ${checkoutStep === 2 ? 'opacity-100 translate-x-0 pointer-events-auto z-10' : checkoutStep < 2 ? 'opacity-0 translate-x-12 pointer-events-none z-0' : 'opacity-0 -translate-x-full pointer-events-none z-0'}`}>
                    <h3 className="text-xl font-black text-white mb-6 text-left">¿Cómo te lo entregamos?</h3>
                    
                    <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => onSetTipoEntrega('delivery')}
                          className={`py-5 px-3 rounded-2xl border-2 text-sm font-bold transition-all flex flex-col items-center gap-2 ${
                            tipoEntrega === 'delivery'
                              ? 'bg-chefsy-500/20 text-white border-chefsy-500 shadow-[0_0_15px_rgba(42,99,72,0.3)]'
                              : 'border-white/5 bg-black/20 text-slate-400 hover:bg-white/5 hover:border-white/10'
                          }`}
                        >
                          <span className="text-3xl mb-1">🛵</span>
                          Delivery
                        </button>
                        <button
                          type="button"
                          onClick={() => onSetTipoEntrega('retiro')}
                          className={`py-5 px-3 rounded-2xl border-2 text-sm font-bold transition-all flex flex-col items-center gap-2 ${
                            tipoEntrega === 'retiro'
                              ? 'bg-chefsy-500/20 text-white border-chefsy-500 shadow-[0_0_15px_rgba(42,99,72,0.3)]'
                              : 'border-white/5 bg-black/20 text-slate-400 hover:bg-white/5 hover:border-white/10'
                          }`}
                        >
                          <span className="text-3xl mb-1">🏪</span>
                          Retiro por local
                        </button>
                      </div>

                      {tipoEntrega === 'delivery' && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-300 pt-2 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                              Dirección de envío
                            </label>
                            <button 
                              type="button"
                              onClick={obtenerUbicacion}
                              disabled={buscandoUbicacion}
                              className="text-xs text-chefsy-400 font-bold bg-chefsy-500/10 hover:bg-chefsy-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                            >
                              {buscandoUbicacion ? (
                                <><div className="w-3 h-3 border-2 border-chefsy-400 border-t-transparent rounded-full animate-spin" /> Buscando...</>
                              ) : (
                                <>📍 Usar mi ubicación</>
                              )}
                            </button>
                          </div>
                          <div className="relative group text-left">
                            <MapPin size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-chefsy-400 transition-colors z-10" />
                            <input
                              id="direccion_cliente"
                              type="text"
                              required={checkoutStep === 2 && tipoEntrega === 'delivery'}
                              value={direccionCliente}
                              onChange={(e) => onSetDireccionCliente(e.target.value)}
                              className="w-full border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-base focus:outline-none focus:ring-2 focus:ring-chefsy-500 focus:border-chefsy-500 bg-black/20 text-white placeholder:text-slate-500 transition-all"
                              placeholder="Calle, Altura, Barrio..."
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-8">
                      <button
                        type="button"
                        onClick={() => {
                          if (tipoEntrega === 'delivery' && !direccionCliente.trim()) alert('Ingresá tu dirección o usá el botón de ubicación.')
                          else setCheckoutStep(3)
                        }}
                        className="w-full bg-chefsy-500 hover:bg-chefsy-600 text-white font-extrabold py-4 px-4 rounded-xl shadow-[0_4px_20px_rgba(42,99,72,0.3)] transition-all flex items-center justify-center gap-2"
                      >
                        Siguiente Paso <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>

                  {/* PASO 3: PAGO */}
                  <div className={`absolute inset-0 transition-all duration-300 ${checkoutStep === 3 ? 'opacity-100 translate-x-0 pointer-events-auto z-10' : 'opacity-0 translate-x-12 pointer-events-none z-0'}`}>
                    <h3 className="text-xl font-black text-white mb-6 text-left">Pago y Detalles</h3>
                    
                    <div className="space-y-5">
                      {/* Método de Pago */}
                      <div className="space-y-2 text-left">
                        <label htmlFor="metodo_pago" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                          Método de Pago
                        </label>
                        <div className="relative flex items-center group">
                          <CreditCard size={20} className="absolute left-4 text-slate-500 group-focus-within:text-chefsy-400 transition-colors z-10 pointer-events-none" />
                          <select
                            id="metodo_pago"
                            value={metodoPago}
                            onChange={(e) => onSetMetodoPago(e.target.value as any)}
                            className="w-full border border-white/10 rounded-2xl pl-12 pr-10 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-chefsy-500 bg-slate-800 text-white appearance-none cursor-pointer"
                          >
                            <option value="efectivo">💵 Efectivo al recibir</option>
                            <option value="tarjeta">💳 Tarjeta (Débito/Crédito)</option>
                            <option value="transferencia">📲 Transferencia Bancaria</option>
                          </select>
                          <ChevronRight size={16} className="absolute right-4 text-slate-500 rotate-90 pointer-events-none" />
                        </div>
                      </div>

                      {/* Observaciones */}
                      <div className="space-y-2 text-left">
                        <label htmlFor="observaciones" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                          Aclaraciones (Opcional)
                        </label>
                        <textarea
                          id="observaciones"
                          value={observaciones}
                          onChange={(e) => onSetObservaciones(e.target.value)}
                          placeholder="Ej: Sin cebolla, tocar timbre de abajo..."
                          rows={2}
                          className="w-full border border-white/10 rounded-2xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-chefsy-500 bg-black/20 text-white placeholder:text-slate-600 resize-none"
                        />
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/10">
                      <SlideButton 
                        onAction={onProcesarCompra}
                        texto={`DESLIZA PARA CONFIRMAR (${formatearPrecio(totalCarrito)})`}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>
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

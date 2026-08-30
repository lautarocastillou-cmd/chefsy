'use client'

import React, { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Plus, Minus, Trash2, X, ShoppingCart, ChevronRight, Map, Store, Bike, Info, Navigation } from 'lucide-react'
import { User, Phone, MapPin, CreditCard } from 'lucide-react'
import { formatearPrecio } from '@/lib/utils'
import { buscarSugerenciasDireccion, buscarCoordenadasPorDireccion, SugerenciaDireccion } from '@/lib/ubicacion'

const MapaSelector = dynamic(() => import('@/components/ubicacion/MapaSelector'), { ssr: false })

import { usarCarrito } from '@/contexto/CarritoContexto'
import { usarClienteAuth } from '@/contexto/ClienteAuthContexto'
import { ItemCarrito as TipoItemCarrito } from '@/tipos/tienda'
import ModalLoginCliente from '@/components/auth/ModalLoginCliente'

interface PropsItemCarritoFila {
  item: TipoItemCarrito
  onEliminar: (idCart: string) => void
  onActualizarCantidad: (idCart: string, delta: number) => void
}

const ItemCarritoFila = React.memo(function ItemCarritoFila({ item, onEliminar, onActualizarCantidad }: PropsItemCarritoFila) {
  return (
    <div 
      className="flex justify-between gap-3 p-3 bg-[#252525] border border-[#3d3d3d] rounded-2xl transition-colors hover:bg-[#2a2a2a]"
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
        <p className="text-sm font-bold text-slate-400 flex items-center gap-2">
          {item.pago_con_puntos ? (
             <span className="text-chefsy-400 bg-chefsy-500/10 px-2 py-0.5 rounded-md border border-chefsy-500/20">{item.producto.precio_puntos} pts</span>
          ) : formatearPrecio(item.precioUnitario)}
        </p>
      </div>

      <div className="flex flex-col items-end justify-between gap-2.5 min-w-[120px]">
        <button
          onClick={() => onEliminar(item.idCart)}
          className="text-slate-500 hover:text-red-500 p-2 rounded transition-colors focus:outline-none cursor-pointer"
          title="Eliminar ítem"
        >
          <Trash2 size={20} />
        </button>

        <div className="flex items-center border border-[#3d3d3d] rounded-lg bg-[#1a1a1a] overflow-hidden">
          <button
            onClick={() => onActualizarCantidad(item.idCart, -1)}
            className="w-10 h-10 flex items-center justify-center hover:bg-[#252525] transition-colors text-slate-400 focus:outline-none cursor-pointer"
          >
            <Minus size={18} />
          </button>
          <span className="px-3 text-sm font-bold text-white">
            {item.cantidad}
          </span>
          <button
            onClick={() => onActualizarCantidad(item.idCart, 1)}
            className="w-10 h-10 flex items-center justify-center hover:bg-[#252525] transition-colors text-slate-400 focus:outline-none cursor-pointer"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
    </div>
  )
})

export default function CartDrawer() {
  const { usuario, perfil } = usarClienteAuth()
  const [mostrarLogin, setMostrarLogin] = useState(false)

  const {
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
    setCartAbierto,
    actualizarCantidadCarrito: onActualizarCantidad,
    eliminarDelCarrito: onEliminar,
    setMostrarCheckout: onSetMostrarCheckout,
    setTipoEntrega: onSetTipoEntrega,
    setNombreCliente: onSetNombreCliente,
    setTelefonoCliente: onSetTelefonoCliente,
    setDireccionCliente: onSetDireccionCliente,
    setMetodoPago: onSetMetodoPago,
    setObservaciones: onSetObservaciones,
    procesarCompra: onProcesarCompra,
    coordenadasCliente,
    setCoordenadasCliente: onSetCoordenadasCliente,
    turnoActivo,
    esDomingoCerrado,
    mensajeCierre,
    procesandoCompra
  } = usarCarrito()

  const onCerrar = () => setCartAbierto(false)
  const cerradoPorAtrasRef = useRef(false)

  const [checkoutStep, setCheckoutStep] = useState(1)
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false)
  
  // Estados para el selector de mapa
  const [mostrarMapa, setMostrarMapa] = useState(false)
  const [coordsMapa, setCoordsMapa] = useState<{ latitud: number, longitud: number }>({ latitud: -28.4695, longitud: -65.7852 }) // Plaza 25 de Mayo
  const [cargandoMapaDir, setCargandoMapaDir] = useState(false)

  // Estado para aviso flotante que sale desde abajo (Toast animado de validación)
  const [avisoInferior, setAvisoInferior] = useState<string | null>(null)
  const [avisoAnimado, setAvisoAnimado] = useState(false)
  const timerAvisoRef = useRef<NodeJS.Timeout | null>(null)

  const mostrarAvisoInferior = (texto: string) => {
    if (timerAvisoRef.current) clearTimeout(timerAvisoRef.current)
    setAvisoInferior(texto)
    setAvisoAnimado(true)

    timerAvisoRef.current = setTimeout(() => {
      setAvisoAnimado(false)
      setTimeout(() => setAvisoInferior(null), 300)
    }, 3200)
  }

  // Estados para sugerencias de dirección y geocodificación en Catamarca
  const [sugerencias, setSugerencias] = useState<SugerenciaDireccion[]>([])
  const [buscandoSugerencias, setBuscandoSugerencias] = useState(false)
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false)
  const sugerenciasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickFuera = (event: MouseEvent) => {
      if (sugerenciasRef.current && !sugerenciasRef.current.contains(event.target as Node)) {
        setMostrarSugerencias(false)
      }
    }
    document.addEventListener('mousedown', handleClickFuera)
    return () => document.removeEventListener('mousedown', handleClickFuera)
  }, [])

  useEffect(() => {
    if (direccionCliente.length < 4 || !mostrarSugerencias) {
      setSugerencias([])
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setBuscandoSugerencias(true)
      try {
        const resultados = await buscarSugerenciasDireccion(direccionCliente, controller.signal)
        setSugerencias(resultados)
      } catch (err: any) {
        if (err.name !== 'AbortError') console.error('Error buscando sugerencias:', err)
      } finally {
        if (!controller.signal.aborted) setBuscandoSugerencias(false)
      }
    }, 600)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [direccionCliente, mostrarSugerencias])

  // Geocodificación silenciosa en segundo plano (Fallback por si no eligen de la lista)
  useEffect(() => {
    if (!direccionCliente || direccionCliente.length < 5 || coordenadasCliente) return
    
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const coords = await buscarCoordenadasPorDireccion(direccionCliente)
        if (coords && !controller.signal.aborted) {
          onSetCoordenadasCliente(coords)
        }
      } catch (e) {}
    }, 1200)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [direccionCliente, coordenadasCliente, onSetCoordenadasCliente])

  const seleccionarSugerencia = (sug: SugerenciaDireccion) => {
    onSetDireccionCliente(sug.nombre)
    onSetCoordenadasCliente(sug.coordenadas)
    setMostrarSugerencias(false)
    setSugerencias([])
  }

  const [usadoGpsActual, setUsadoGpsActual] = useState(false)

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
    setUsadoGpsActual(true)
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords
        // Usar Nominatim OpenStreetMap
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`)
        const data = await res.json()
        const calle = data.address?.road || ''
        const num = data.address?.house_number || ''
        const dir = [calle, num].filter(Boolean).join(' ') || data.display_name?.split(',')[0] || 'Ubicación seleccionada en mapa'
        onSetDireccionCliente(dir)
        onSetCoordenadasCliente({ latitud: latitude, longitud: longitude })
        setCoordsMapa({ latitud: latitude, longitud: longitude })
      } catch {
        alert('Obtuvimos tus coordenadas pero no pudimos leer el nombre de la calle. Por favor agrégalo manualmente.')
        onSetCoordenadasCliente({ latitud: pos.coords.latitude, longitud: pos.coords.longitude })
        setCoordsMapa({ latitud: pos.coords.latitude, longitud: pos.coords.longitude })
      } finally {
        setBuscandoUbicacion(false)
      }
    }, () => {
      alert('No se pudo obtener tu ubicación. Por favor verifica que tengas activado el GPS y permisos en el navegador.')
      setBuscandoUbicacion(false)
    }, { enableHighAccuracy: true, timeout: 10000 })
  }

  const confirmarUbicacionMapa = async () => {
    const { latitud, longitud } = coordsMapa
    setCargandoMapaDir(true)
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitud}&lon=${longitud}`)
      const data = await response.json()
      if (data && data.address) {
        const calle = data.address.road || ''
        const numero = data.address.house_number || ''
        const dir = [calle, numero].filter(Boolean).join(' ') || data.display_name?.split(',')[0] || 'Ubicación seleccionada en mapa'
        onSetDireccionCliente(dir)
      } else {
        onSetDireccionCliente('Ubicación seleccionada en mapa')
      }
      onSetCoordenadasCliente({ latitud, longitud })
    } catch (error) {
      console.error('Error en geocoding inverso del mapa:', error)
      onSetDireccionCliente('Ubicación seleccionada en mapa')
      onSetCoordenadasCliente({ latitud, longitud })
    } finally {
      setCargandoMapaDir(false)
      setMostrarMapa(false)
    }
  }

  useEffect(() => {
    if (cartAbierto) {
      document.documentElement.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'

      window.history.pushState({ drawerCarrito: true }, '', window.location.href)
      const handlePopState = () => {
        cerradoPorAtrasRef.current = true
        onCerrar()
      }
      window.addEventListener('popstate', handlePopState)

      return () => {
        window.removeEventListener('popstate', handlePopState)
        document.documentElement.style.overflow = ''
        document.body.style.overflow = ''
        if (!cerradoPorAtrasRef.current && window.history.state?.drawerCarrito) {
          window.history.back()
        }
      }
    } else {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
  }, [cartAbierto])

  if (!cartAbierto) return null

  return (
    <div 
      className="fixed inset-0 z-[99999] flex justify-end"
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      data-lenis-prevent="true"
    >
      <div 
        className="fixed inset-0 bg-black/75 transition-opacity duration-200 ease-out" 
        onClick={onCerrar}
      />
      
      <div className="relative w-full max-w-md bg-[#1c1c1c] shadow-2xl h-full flex flex-col z-10 animate-in slide-in-from-right duration-200 ease-out border-l border-[#3d3d3d] will-change-transform transform-gpu">
        {/* Cabecera del Drawer */}
        <div className="px-5 py-4 border-b border-[#3d3d3d] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="text-chefsy-500" size={20} />
            <h2 className="font-extrabold text-white text-sm">Tu Carrito</h2>
            <span className="bg-[#252525] text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#3d3d3d]">
              {totalProductosCarrito} {totalProductosCarrito === 1 ? 'Producto' : 'Productos'}
            </span>
          </div>
          <button
            onClick={onCerrar}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-[#252525] transition-colors focus:outline-none"
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
                <ItemCarritoFila
                  key={item.idCart}
                  item={item}
                  onEliminar={onEliminar}
                  onActualizarCantidad={onActualizarCantidad}
                />
              ))}
            </div>
          ) : (
            /* --- FORMULARIO DE CHECKOUT (STEPPER) --- */
            <div className="flex-1 overflow-y-auto scrollbar-hide p-5">
              <form 
                onSubmit={(e) => { 
                  e.preventDefault()
                  if (checkoutStep === 1) {
                    if (!nombreCliente.trim()) {
                      mostrarAvisoInferior('¡Por favor ingresá tu nombre!')
                      return
                    }
                    if (telefonoCliente.replace(/\D/g, '').length < 8) {
                      mostrarAvisoInferior('¡Ingresá un número de teléfono válido!')
                      return
                    }
                    setCheckoutStep(2)
                  } else if (checkoutStep === 2) {
                    if (tipoEntrega === 'delivery' && !direccionCliente.trim()) {
                      mostrarAvisoInferior('¡Ingresá tu dirección de envío!')
                      return
                    }
                    setCheckoutStep(3)
                  } else if (checkoutStep === 3) {
                    if (metodoPago === 'sin_especificar') {
                      mostrarAvisoInferior('¡Elegí un método de pago!')
                      return
                    }
                    onProcesarCompra((msg) => mostrarAvisoInferior(msg))
                  }
                }} 
                className="flex flex-col h-full relative"
              >
                {/* Header con botón de volver y progreso */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#3d3d3d] shrink-0">
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
                      <div key={s} className={`h-1.5 w-6 rounded-full transition-colors duration-250 ${s === checkoutStep ? 'bg-chefsy-500' : s < checkoutStep ? 'bg-chefsy-500/50' : 'bg-[#3d3d3d]'}`} />
                    ))}
                  </div>
                </div>

                <div className="relative flex-1 min-h-[350px]">
                  {/* PASO 1: DATOS PERSONALES */}
                  <div className={`absolute inset-0 overflow-y-auto scrollbar-hide transition-[opacity,transform] duration-250 ease-out will-change-[opacity,transform] ${checkoutStep === 1 ? 'opacity-100 translate-x-0 pointer-events-auto z-10' : 'opacity-0 -translate-x-8 pointer-events-none z-0'}`}>
                    <h3 className="text-xl font-black text-white mb-6 text-left tracking-wide">TUS DATOS</h3>
                    
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
                          className="peer w-full border border-[#3d3d3d] rounded-2xl pl-12 pr-4 pt-6 pb-2 text-base focus:outline-none focus:ring-2 focus:ring-chefsy-500 focus:border-chefsy-500 bg-[#1a1a1a] text-white placeholder-transparent transition-colors"
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
                          name="telefono_cliente"
                          type="tel"
                          required={checkoutStep === 1}
                          value={telefonoCliente}
                          onChange={(e) => onSetTelefonoCliente(e.target.value)}
                          className="peer w-full border border-[#3d3d3d] rounded-2xl pl-12 pr-4 pt-6 pb-2 text-base focus:outline-none focus:ring-2 focus:ring-chefsy-500 focus:border-chefsy-500 bg-[#1a1a1a] text-white placeholder-transparent transition-colors"
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
                          if (!nombreCliente.trim()) {
                            mostrarAvisoInferior('¡Por favor ingresá tu nombre!')
                            return
                          }
                          if (telefonoCliente.replace(/\D/g, '').length < 8) {
                            mostrarAvisoInferior('¡Ingresá un número de teléfono válido!')
                            return
                          }
                          setCheckoutStep(2)
                        }}
                        className="w-full bg-chefsy-500 hover:bg-chefsy-600 active:scale-[0.98] text-white font-extrabold py-4 px-4 rounded-xl shadow-[0_4px_20px_rgba(42,99,72,0.3)] transition-[background-color,transform] duration-150 flex items-center justify-center gap-2"
                      >
                        SIGUIENTE PASO <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>

                  {/* PASO 2: ENTREGA */}
                  <div className={`absolute inset-0 overflow-y-auto scrollbar-hide transition-[opacity,transform] duration-250 ease-out will-change-[opacity,transform] ${checkoutStep === 2 ? 'opacity-100 translate-x-0 pointer-events-auto z-10' : checkoutStep < 2 ? 'opacity-0 translate-x-8 pointer-events-none z-0' : 'opacity-0 -translate-x-8 pointer-events-none z-0'}`}>
                    <h3 className="text-xl font-black text-white mb-3 text-left">¿Cómo te lo entregamos?</h3>
                    
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => onSetTipoEntrega('delivery')}
                          className={`py-3 px-3 rounded-2xl border-2 text-sm font-bold transition-[colors,transform,border-color] duration-150 active:scale-[0.98] flex flex-col items-center justify-center gap-1.5 ${
                            tipoEntrega === 'delivery'
                              ? 'bg-chefsy-500/20 text-white border-chefsy-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                              : 'border-[#3d3d3d] bg-[#1a1a1a] text-slate-400 hover:bg-[#252525] hover:border-slate-500'
                          }`}
                        >
                          <div className="h-10 flex items-center justify-center">
                            <Bike size={28} className={tipoEntrega === 'delivery' ? 'text-chefsy-400' : 'text-slate-400'} />
                          </div>
                          <span>Delivery</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onSetTipoEntrega('retiro')}
                          className={`py-3 px-3 rounded-2xl border-2 text-sm font-bold transition-[colors,transform,border-color] duration-150 active:scale-[0.98] flex flex-col items-center justify-center gap-1.5 ${
                            tipoEntrega === 'retiro'
                              ? 'bg-chefsy-500/20 text-white border-chefsy-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                              : 'border-[#3d3d3d] bg-[#1a1a1a] text-slate-400 hover:bg-[#252525] hover:border-slate-500'
                          }`}
                        >
                          <div className="h-10 flex items-center justify-center">
                            <Store size={28} className={tipoEntrega === 'retiro' ? 'text-chefsy-400' : 'text-slate-400'} />
                          </div>
                          <span>Retiro por local</span>
                        </button>
                      </div>

                      {tipoEntrega === 'delivery' && (
                        <div className="animate-in fade-in duration-200 pt-1 space-y-2">
                          <div className="bg-chefsy-500/15 border border-chefsy-500/40 rounded-xl p-3 text-left">
                            <p className="text-chefsy-400 font-bold text-xs mb-0.5 flex items-center gap-1.5">
                              <Info size={16} className="text-chefsy-400 shrink-0" />
                              <span>Tarifa base de envío: {formatearPrecio(1500)}</span>
                            </p>
                            <p className="text-slate-300 text-[11px] leading-relaxed font-medium">
                              El costo de envío se calcula automáticamente según la distancia de tu dirección: <strong className="text-white font-bold">a mayor distancia, mayor será el valor del envío</strong>.
                            </p>
                          </div>

                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block text-left">
                            Dirección de envío
                          </label>

                          <button 
                            type="button"
                            onClick={obtenerUbicacion}
                            disabled={buscandoUbicacion}
                            className="w-full bg-gradient-to-r from-emerald-500 to-chefsy-600 hover:from-emerald-400 hover:to-chefsy-500 text-white font-black text-xs sm:text-sm py-3 px-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-emerald-400/50 animate-[pulse_3s_ease-in-out_infinite] disabled:opacity-50 disabled:animate-none my-2 cursor-pointer"
                          >
                            {buscandoUbicacion ? (
                              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Obteniendo tu ubicación GPS...</>
                            ) : (
                              <>
                                <Navigation size={18} className="animate-bounce shrink-0 text-white" />
                                <span>Usar mi ubicación actual (GPS Automático)</span>
                              </>
                            )}
                          </button>

                          <div ref={sugerenciasRef} className="relative group text-left">
                            <MapPin size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-chefsy-400 transition-colors z-10" />
                            <input
                              id="direccion_cliente"
                              type="text"
                              required={checkoutStep === 2 && tipoEntrega === 'delivery'}
                              value={direccionCliente}
                              onChange={(e) => {
                                onSetDireccionCliente(e.target.value)
                                setMostrarSugerencias(true)
                                if (coordenadasCliente) onSetCoordenadasCliente(null)
                              }}
                              onFocus={() => {
                                if (direccionCliente.length >= 4) setMostrarSugerencias(true)
                              }}
                              className="w-full border border-[#3d3d3d] rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-chefsy-500 focus:border-chefsy-500 bg-[#1a1a1a] text-white placeholder:text-slate-500 transition-colors"
                              placeholder="O escribí: Calle, Altura, Barrio..."
                            />

                            {/* Dropdown de Sugerencias */}
                            {mostrarSugerencias && (sugerencias.length > 0 || buscandoSugerencias) && (
                              <div className="absolute z-50 left-0 right-0 mt-1.5 bg-[#222222] border border-[#3d3d3d] rounded-2xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-[#333333] animate-in fade-in slide-in-from-top-2 duration-150">
                                {buscandoSugerencias && (
                                  <div className="p-3 text-xs text-slate-400 flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-chefsy-400 border-t-transparent rounded-full animate-spin" />
                                    Buscando direcciones en Catamarca...
                                  </div>
                                )}
                                {!buscandoSugerencias && sugerencias.map((sug, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => seleccionarSugerencia(sug)}
                                    className="w-full text-left p-3.5 hover:bg-[#2a2a2a] transition-colors flex items-start gap-2.5 group/btn cursor-pointer"
                                  >
                                    <MapPin size={16} className="text-chefsy-400 mt-0.5 shrink-0 group-hover/btn:scale-110 transition-transform" />
                                    <div>
                                      <p className="text-xs font-bold text-white leading-snug">
                                        {sug.nombre.split(',')[0]}
                                      </p>
                                      <p className="text-[11px] text-slate-400 line-clamp-1">
                                        {sug.nombre.split(',').slice(1).join(',')}
                                      </p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Mensaje de confirmación en verde chefsy si el usuario activó GPS */}
                          {usadoGpsActual && (
                            <p className="text-xs font-bold text-chefsy-400 dark:text-chefsy-400 mt-1.5 text-left flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                              <span>¡Por favor, compruebe si la dirección esta correcta!</span>
                            </p>
                          )}

                          {/* Botón para abrir/cerrar mapa */}
                          <div className="flex justify-end pt-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (!mostrarMapa && coordenadasCliente) {
                                  setCoordsMapa(coordenadasCliente)
                                }
                                setMostrarMapa(!mostrarMapa)
                              }}
                              className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                            >
                              <Map size={12} />
                              {mostrarMapa ? 'Ocultar mapa' : 'Elegir en el mapa'}
                            </button>
                          </div>

                          {/* Renderizado del Mapa */}
                          {mostrarMapa && (
                            <div className="mt-2 bg-[#1a1a1a] border border-[#3d3d3d] rounded-2xl p-3 animate-in fade-in duration-200">
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 text-center">
                                Arrastrá el marcador a tu ubicación exacta
                              </p>
                              <div className="rounded-xl overflow-hidden shadow-inner relative border border-[#3d3d3d]">
                                <MapaSelector
                                  centro={coordenadasCliente || { latitud: -28.4695, longitud: -65.7852 }}
                                  coordenadas={coordsMapa}
                                  onCoordenadasChange={(c) => setCoordsMapa(c)}
                                  className="h-44 w-full z-0 relative"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={confirmarUbicacionMapa}
                                disabled={cargandoMapaDir}
                                className="w-full mt-2.5 bg-[#252525] hover:bg-[#3d3d3d] text-white text-xs font-bold py-2 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                              >
                                {cargandoMapaDir ? 'Cargando dirección...' : 'Confirmar esta ubicación'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pb-4">
                      <button
                        type="button"
                        onClick={() => {
                          if (tipoEntrega === 'delivery' && !direccionCliente.trim()) {
                            mostrarAvisoInferior('¡Ingresá tu dirección de envío!')
                          } else {
                            setCheckoutStep(3)
                          }
                        }}
                        className="w-full bg-chefsy-500 hover:bg-chefsy-600 active:scale-[0.98] text-white font-extrabold py-3.5 px-4 rounded-xl shadow-[0_4px_20px_rgba(42,99,72,0.3)] transition-[background-color,transform] duration-150 flex items-center justify-center gap-2"
                      >
                        SIGUIENTE PASO <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>

                  {/* PASO 3: PAGO */}
                  <div className={`absolute inset-0 overflow-y-auto scrollbar-hide transition-[opacity,transform] duration-250 ease-out will-change-[opacity,transform] ${checkoutStep === 3 ? 'opacity-100 translate-x-0 pointer-events-auto z-10' : 'opacity-0 translate-x-8 pointer-events-none z-0'}`}>
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
                            className={`w-full border rounded-2xl pl-12 pr-10 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-chefsy-500 bg-[#1a1a1a] appearance-none cursor-pointer ${
                              metodoPago === 'sin_especificar'
                                ? 'border-amber-500/80 text-amber-400'
                                : 'border-[#3d3d3d] text-white'
                            }`}
                          >
                            <option value="sin_especificar" disabled>⚠️ FALTA MÉTODO DE PAGO</option>
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
                          className="w-full border border-[#3d3d3d] rounded-2xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-chefsy-500 bg-[#1a1a1a] text-white placeholder:text-slate-600 resize-none"
                        />
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-[#3d3d3d]">
                      {turnoActivo === false ? (
                        <div className="bg-red-500/15 border border-red-500/40 rounded-2xl p-4 text-center animate-in fade-in space-y-1.5">
                          <p className="text-red-400 font-black text-sm flex items-center justify-center gap-1.5">
                            <span>🔒</span> {esDomingoCerrado ? 'Cerrado los Domingos' : 'Local Cerrado'}
                          </p>
                          <p className="text-slate-200 text-xs font-semibold leading-relaxed">
                            {mensajeCierre}
                          </p>
                        </div>
                      ) : turnoActivo === null ? (
                        <div className="w-full bg-[#252525] text-slate-400 font-bold py-4 px-6 rounded-2xl text-base flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Verificando horario...
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (metodoPago === 'sin_especificar') {
                              mostrarAvisoInferior('¡Elige un método de pago!')
                              return
                            }
                            onProcesarCompra((msg) => mostrarAvisoInferior(msg))
                          }}
                          disabled={procesandoCompra}
                          className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-black py-4 px-6 rounded-2xl text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-[background-color,transform] duration-150 cursor-pointer disabled:opacity-50"
                        >
                          {procesandoCompra ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              PROCESANDO...
                            </>
                          ) : (
                            `CONFIRMAR PEDIDO (${formatearPrecio(totalCarrito)})`
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer de Drawer */}
        {carrito.length > 0 && (
          <div className="p-5 border-t border-[#3d3d3d] bg-[#1a1a1a] space-y-4">
            

            <div className="space-y-1.5 text-xs text-slate-400 text-left">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-white">{formatearPrecio(subtotalCarrito)}</span>
              </div>
              {tipoEntrega === 'delivery' && (
                <div className="flex justify-between items-center">
                  <span>{!coordenadasCliente ? 'Envío (Tarifa base)' : 'Costo de envío'}</span>
                  <span className="font-semibold text-white">
                    {!coordenadasCliente ? `Desde ${formatearPrecio(costoEnvio)}` : formatearPrecio(costoEnvio)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-[#3d3d3d] pt-2 text-sm font-black text-white">
                <span>{!coordenadasCliente && tipoEntrega === 'delivery' ? 'Total apróx. (envío base)' : 'Total a pagar'}</span>
                <span className="text-chefsy-400">{formatearPrecio(totalCarrito)}</span>
              </div>
            </div>

            {turnoActivo === false ? (
              <div className="bg-red-500/15 border border-red-500/40 rounded-2xl p-4 text-center my-2 animate-in fade-in space-y-1.5">
                <p className="text-red-400 font-black text-sm flex items-center justify-center gap-1.5">
                  <span>🔒</span> {esDomingoCerrado ? 'Cerrado los Domingos' : 'Local Cerrado'}
                </p>
                <p className="text-slate-200 text-xs font-semibold leading-relaxed">
                  {mensajeCierre}
                </p>
              </div>
            ) : !mostrarCheckout ? (
              <button
                onClick={() => onSetMostrarCheckout(true)}
                disabled={turnoActivo === null}
                className="w-full bg-chefsy-500 hover:bg-chefsy-600 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs shadow-md transition-[background-color,transform] duration-150 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {turnoActivo === null ? 'Verificando horario...' : 'Iniciar Checkout'}
                {turnoActivo !== null && <ChevronRight size={14} />}
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* Renderizar Modal de Login encima del Drawer */}
      {mostrarLogin && (
        <ModalLoginCliente 
          onCerrar={() => setMostrarLogin(false)} 
        />
      )}

      {/* AVISO FLOTANTE DE ADVERTENCIA (TOAST QUE SALE DESDE ABAJO) */}
      {avisoInferior && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-[92%] max-w-sm pointer-events-none transition-all duration-300 ease-out transform ${
            avisoAnimado
              ? 'translate-y-0 opacity-100 scale-100'
              : 'translate-y-12 opacity-0 scale-95'
          }`}
        >
          <div className="bg-[#181818] border border-amber-500/50 text-white px-5 py-3.5 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.8),0_0_20px_rgba(245,158,11,0.2)] flex items-center gap-3.5 border-l-4 border-l-amber-500">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 text-lg font-bold shadow-inner">
              ⚠️
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest leading-none mb-1">
                Atención
              </p>
              <p className="text-xs font-black text-slate-100 leading-tight truncate">
                {avisoInferior}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

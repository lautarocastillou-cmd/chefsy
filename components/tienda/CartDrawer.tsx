'use client'

import React, { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { Plus, Minus, Trash2, X, ShoppingCart, ChevronRight, Map, Store, Bike, Info, Navigation, Lock, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react'
import { User, Phone, MapPin, CreditCard } from 'lucide-react'
import { formatearPrecio } from '@/lib/utils'
import { buscarSugerenciasDireccion, buscarCoordenadasPorDireccion, SugerenciaDireccion } from '@/lib/ubicacion'

const MapaSelector = dynamic(() => import('@/components/ubicacion/MapaSelector'), { ssr: false })

import { usarCarrito } from '@/contexto/CarritoContexto'
import { usarClienteAuth } from '@/contexto/ClienteAuthContexto'
import { ItemCarrito as TipoItemCarrito } from '@/tipos/tienda'
import ModalLoginCliente from '@/components/auth/ModalLoginCliente'
import { notificarAviso, notificarError } from '@/lib/notificaciones'

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
    distanciaClienteKm,
    coordenadasCliente,
    setCoordenadasCliente: onSetCoordenadasCliente,
    turnoActivo,
    esDomingoCerrado,
    mensajeCierre,
    procesandoCompra
  } = usarCarrito()

  const [estaCerrando, setEstaCerrando] = useState(false)
  const [esMobile, setEsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => setEsMobile(window.innerWidth < 640)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const onCerrar = () => {
    if (estaCerrando) return
    setEstaCerrando(true)
    setTimeout(() => {
      setCartAbierto(false)
      onSetMostrarCheckout(false)
      setCheckoutStep(1)
      setEstaCerrando(false)
    }, 240)
  }
  const cerradoPorAtrasRef = useRef(false)

  const [checkoutStep, setCheckoutStep] = useState(1)
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false)
  const [verificandoDireccion, setVerificandoDireccion] = useState(false)
  const [errorDireccionNoUbicada, setErrorDireccionNoUbicada] = useState<string | null>(null)
  
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
          setCoordsMapa(coords)
          setErrorDireccionNoUbicada(null)
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
    setCoordsMapa(sug.coordenadas)
    setMostrarSugerencias(false)
    setSugerencias([])
    setErrorDireccionNoUbicada(null)
  }

  const [usadoGpsActual, setUsadoGpsActual] = useState(false)

  // Resetear paso cuando se cierra el carrito o se abre el checkout
  useEffect(() => {
    if (!mostrarCheckout) {
      setCheckoutStep(1)
      setErrorDireccionNoUbicada(null)
    }
  }, [mostrarCheckout])

  const obtenerUbicacion = () => {
    if (!navigator.geolocation) {
      notificarAviso('Tu navegador no soporta geolocalización.')
      return
    }
    setBuscandoUbicacion(true)
    setUsadoGpsActual(true)
    setErrorDireccionNoUbicada(null)
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
        setErrorDireccionNoUbicada(null)
      } catch {
        notificarAviso('Obtuvimos tus coordenadas pero no pudimos leer el nombre de la calle. Podés escribirla manualmente.')
        onSetCoordenadasCliente({ latitud: pos.coords.latitude, longitud: pos.coords.longitude })
        setCoordsMapa({ latitud: pos.coords.latitude, longitud: pos.coords.longitude })
        setErrorDireccionNoUbicada(null)
      } finally {
        setBuscandoUbicacion(false)
      }
    }, () => {
      notificarError('No se pudo obtener tu ubicación. Por favor verificá que tengas activado el GPS y permisos.')
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
      setErrorDireccionNoUbicada(null)
    } catch (error) {
      console.error('Error en geocoding inverso del mapa:', error)
      onSetDireccionCliente('Ubicación seleccionada en mapa')
      onSetCoordenadasCliente({ latitud, longitud })
      setErrorDireccionNoUbicada(null)
    } finally {
      setCargandoMapaDir(false)
      setMostrarMapa(false)
    }
  }

  const handleSiguientePaso2 = async () => {
    if (tipoEntrega === 'retiro') {
      setCheckoutStep(3)
      return
    }

    const dirLimpia = (direccionCliente || '').trim()
    if (!dirLimpia) {
      mostrarAvisoInferior('Ingresá tu dirección de entrega')
      return
    }

    // Si ya tenemos coordenadas confirmadas, avanzar de inmediato
    if (coordenadasCliente) {
      setErrorDireccionNoUbicada(null)
      setCheckoutStep(3)
      return
    }

    // Modo Estricto: intentar geocodificar antes de permitir avanzar
    setVerificandoDireccion(true)
    setErrorDireccionNoUbicada(null)
    try {
      const coords = await buscarCoordenadasPorDireccion(dirLimpia)
      if (coords) {
        onSetCoordenadasCliente(coords)
        setCoordsMapa(coords)
        setErrorDireccionNoUbicada(null)
        setCheckoutStep(3)
      } else {
        setErrorDireccionNoUbicada(
          'No pudimos localizar la dirección en el mapa para calcular el costo exacto del envío. Por favor, confirmá la ubicación en el mapa o usá tu GPS.'
        )
        setMostrarMapa(true)
      }
    } catch {
      setErrorDireccionNoUbicada(
        'Ocurrió un inconveniente al verificar la dirección. Por favor, confirmala en el mapa para calcular el costo de tu envío.'
      )
      setMostrarMapa(true)
    } finally {
      setVerificandoDireccion(false)
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
      className="fixed inset-0 z-[99999] flex flex-col justify-end sm:flex-row sm:justify-end"
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      data-lenis-prevent="true"
    >
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: estaCerrando ? 0 : 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm pointer-events-auto" 
        onClick={onCerrar}
      />
      
      <motion.div 
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compras"
        initial={
          esMobile
            ? { y: 70, scale: 0.93, opacity: 0, filter: 'blur(6px)' }
            : { x: 80, scale: 0.94, opacity: 0, filter: 'blur(6px)' }
        }
        animate={
          estaCerrando
            ? (esMobile 
                ? { y: 90, scale: 0.93, opacity: 0, filter: 'blur(4px)', transition: { duration: 0.22, ease: [0.32, 0, 0.67, 0] } }
                : { x: 100, scale: 0.94, opacity: 0, filter: 'blur(4px)', transition: { duration: 0.22, ease: [0.32, 0, 0.67, 0] } }
              )
            : {
                y: 0,
                x: 0,
                scale: 1,
                opacity: 1,
                filter: 'blur(0px)',
                transition: {
                  type: 'spring',
                  damping: 26,
                  stiffness: 270,
                  mass: 0.85
                }
              }
        }
        className="relative w-full sm:max-w-md bg-[#1c1c1c] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_35px_rgba(0,0,0,0.5)] h-[92vh] sm:h-full flex flex-col z-10 rounded-t-[28px] sm:rounded-none border-t sm:border-t-0 sm:border-l border-[#3d3d3d] will-change-transform transform-gpu overscroll-contain overflow-hidden"
      >
        {/* Línea de resplandor flotante sutil de aterrizaje */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-chefsy-500/60 to-transparent pointer-events-none opacity-80 z-20" />

        {/* Barra pill handle táctil para mobile (Bottom Sheet nativo iOS/Android) */}
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0 hover:bg-white/40 transition-colors" />

        {/* Cabecera del Drawer */}
        <div className="px-5 py-3.5 sm:py-4 border-b border-[#3d3d3d] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <motion.div
              initial={{ rotate: -18, scale: 0.75 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', damping: 14, stiffness: 220, delay: 0.1 }}
            >
              <ShoppingCart className="text-chefsy-500" size={20} />
            </motion.div>
            <h2 className="font-extrabold text-white text-sm">Tu Carrito</h2>
            <motion.span 
              initial={{ scale: 0.75, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 15, stiffness: 240, delay: 0.15 }}
              className="bg-[#252525] text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#3d3d3d]"
            >
              {totalProductosCarrito} {totalProductosCarrito === 1 ? 'Producto' : 'Productos'}
            </motion.span>
          </div>
          <button
            onClick={onCerrar}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-[#252525] hover:text-white transition-colors focus:outline-none cursor-pointer"
            aria-label="Cerrar carrito"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido Principal con sutil entrada flotante */}
        <motion.div 
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: 0.08, ease: 'easeOut' }}
          className="flex-1 overflow-hidden flex flex-col"
        >
          {carrito.length === 0 ? (
            <div className="text-center py-20 px-5 text-slate-400 text-xs flex flex-col items-center justify-center">
              <ShoppingCart size={32} className="text-slate-600 mb-2 stroke-[1.5]" />
              Tu carrito está vacío.<br />Agregá algunos platos del menú.
            </div>
          ) : !mostrarCheckout ? (
            <div className="flex-1 overflow-y-auto scrollbar-hide overscroll-contain p-5 space-y-4">
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
            <div className="flex-1 overflow-y-auto scrollbar-hide overscroll-contain p-5">
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
                                setErrorDireccionNoUbicada(null)
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

                          {/* Estado del costo de envío / verificación de ubicación */}
                          {tipoEntrega === 'delivery' && (
                            <div className="mt-2 text-left">
                              {coordenadasCliente ? (
                                <div className="bg-chefsy-950/60 border border-chefsy-500/40 rounded-xl p-3 flex items-center justify-between gap-2.5 animate-in fade-in duration-200">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-xs font-extrabold text-emerald-300 truncate">
                                        Envío confirmado: {formatearPrecio(costoEnvio)}
                                      </p>
                                      {typeof distanciaClienteKm === 'number' && distanciaClienteKm > 0 && (
                                        <p className="text-[11px] text-slate-400 font-medium">
                                          Distancia calculada: ~{distanciaClienteKm.toFixed(1)} km del local
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCoordsMapa(coordenadasCliente)
                                      setMostrarMapa(true)
                                    }}
                                    className="text-[11px] font-bold text-chefsy-400 hover:text-white underline underline-offset-2 shrink-0 cursor-pointer"
                                  >
                                    Ajustar en mapa
                                  </button>
                                </div>
                              ) : (
                                <div className="bg-[#222222] border border-[#3d3d3d] rounded-xl p-2.5 flex items-center gap-2 text-slate-400 text-xs">
                                  <AlertCircle size={15} className="text-amber-400 shrink-0" />
                                  <span className="text-[11px] leading-tight">
                                    Ubicación pendiente de confirmación en el mapa para calcular el costo de envío
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Alerta de error si el sistema no encontró la dirección tipeada */}
                          {errorDireccionNoUbicada && (
                            <div className="mt-2 bg-red-950/50 border border-red-500/50 rounded-xl p-3 text-left animate-in fade-in duration-200">
                              <div className="flex items-start gap-2.5">
                                <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                  <p className="text-xs font-bold text-red-200 leading-snug">
                                    {errorDireccionNoUbicada}
                                  </p>
                                  <p className="text-[11px] text-slate-300">
                                    Arrastrá el marcador a tu casa en el mapa para calcular el valor exacto del viaje.
                                  </p>
                                </div>
                              </div>
                            </div>
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
                              className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
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
                                className="w-full mt-2.5 bg-[#252525] hover:bg-[#3d3d3d] text-white text-xs font-bold py-2 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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
                        onClick={handleSiguientePaso2}
                        disabled={verificandoDireccion}
                        className="w-full bg-chefsy-500 hover:bg-chefsy-600 active:scale-[0.98] text-white font-extrabold py-3.5 px-4 rounded-xl shadow-[0_4px_20px_rgba(42,99,72,0.3)] transition-[background-color,transform] duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                      >
                        {verificandoDireccion ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            <span>Verificando ubicación y envío...</span>
                          </>
                        ) : (
                          <>
                            <span>SIGUIENTE PASO</span>
                            <ChevronRight size={18} />
                          </>
                        )}
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
                            <option value="sin_especificar" disabled>Seleccionar método de pago</option>
                            <option value="efectivo">Efectivo al recibir</option>
                            <option value="tarjeta">Tarjeta (Débito/Crédito)</option>
                            <option value="transferencia">Transferencia Bancaria</option>
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
                            <Lock size={14} className="text-red-400" />
                            <span>{esDomingoCerrado ? 'Cerrado los Domingos' : 'Cocina cerrada'}</span>
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
                              mostrarAvisoInferior('Seleccioná un método de pago')
                              return
                            }
                            if (tipoEntrega === 'delivery' && !coordenadasCliente) {
                              mostrarAvisoInferior('Por favor confirmá la ubicación en el mapa para calcular el costo de envío')
                              setCheckoutStep(2)
                              setMostrarMapa(true)
                              return
                            }
                            onProcesarCompra((msg) => {
                              mostrarAvisoInferior(msg)
                              if (tipoEntrega === 'delivery' && !coordenadasCliente) {
                                setCheckoutStep(2)
                                setMostrarMapa(true)
                              }
                            })
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
        </motion.div>

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
                  <Lock size={14} className="text-red-400" />
                  <span>{esDomingoCerrado ? 'Cerrado los Domingos' : 'Cocina cerrada'}</span>
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
      </motion.div>

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
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
              <AlertTriangle size={18} />
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

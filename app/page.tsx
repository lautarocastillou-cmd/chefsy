'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { usarPedidos } from '@/contexto/PedidosContexto'
import { usarAuth } from '@/contexto/AuthContexto'
import { obtenerFechaNegocio } from '@/lib/tiempo'
import { ProductoCatalogo, ModificadorCatalogo } from '@/tipos/catalogo'
import { Pedido } from '@/tipos'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import ProductCard from '@/components/tienda/ProductCard'
import { SlideButton } from '@/components/ui/slide-button'
import { 
  ShoppingCart, Plus, Minus, Trash2, User, Phone, 
  MapPin, CreditCard, CheckCircle2, MessageCircle, 
  X, Moon, Sun, Lock, ChevronRight, ChevronDown, Sparkles, Search,
  Settings, Wrench, Hammer, HardHat, ArrowLeft
} from 'lucide-react'
import { formatearPrecio } from '@/lib/utils'

interface ItemCarrito {
  idCart: string // Combinación única del ID de producto + IDs de modificadores
  producto: ProductoCatalogo
  cantidad: number
  modificadoresSeleccionados: ModificadorCatalogo[]
  precioUnitario: number
  notaPersonalizacion?: string
}

// --- DESCRIPCIONES E IMÁGENES COMPLEMENTARIAS DE PRODUCTOS ---
const OBTENER_DETALLES_COMPLEMENTARIOS = (categoriaId: string, nombre: string) => {
  const nombreLimpio = nombre.toLowerCase()
  
  if (categoriaId === 'lomos-y-milas') {
    const desc = nombreLimpio.includes('común') ? 'Pan de lomo casero · medallón de carne · lechuga fresca · tomate seleccionado · mayonesa casera.' :
                 nombreLimpio.includes('especial') ? 'Pan de lomo casero · bife premium · jamón cocido · queso derretido · huevo frito · lechuga · tomate · aderezos.' :
                 nombreLimpio.includes('chefsy') ? 'Bife de lomo premium · queso cheddar fundido · panceta crujiente · cebolla caramelizada · aderezo especial de la casa.' :
                 nombreLimpio.includes('american') ? 'Bife de lomo tierno · cheddar premium · panceta ahumada · cebolla crujiente · aderezo barbacoa artesanal.' :
                 'Bife de lomo premium fundido con una fina y cremosa combinación de 4 quesos seleccionados.';
    return {
      desc,
      img: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80'
    }
  }
  
  if (categoriaId === 'patys') {
    const desc = nombreLimpio.includes('común') ? 'Medallón artesanal a la parrilla · lechuga crujiente · rodajas de tomate fresco · mayonesa casera.' :
                 nombreLimpio.includes('especial') ? 'Medallón artesanal · jamón cocido · queso fundido · huevo frito · lechuga · tomate.' :
                 nombreLimpio.includes('chefsy') ? 'Doble medallón de carne · doble queso cheddar · panceta ahumada · cebolla caramelizada suave.' :
                 nombreLimpio.includes('american') ? 'Medallón artesanal · queso cheddar · panceta crujiente · aros de cebolla fritos · salsa barbacoa.' :
                 'Medallón de carne premium fundido con queso azul, provolone, muzzarella y parmesano.';
    return {
      desc,
      img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80'
    }
  }
  
  if (categoriaId === 'pizzas') {
    const desc = nombreLimpio.includes('muzzarella') ? 'Masa de piedra artesanal · salsa de tomate natural · abundante muzzarella fundida · orégano · aceitunas verdes.' :
                 nombreLimpio.includes('especial') ? 'Salsa de tomate casera · muzzarella premium · jamón cocido · morrones asados al horno · aceitunas seleccionadas.' :
                 nombreLimpio.includes('napolitana') ? 'Masa a la piedra · muzzarella · rodajas de tomate natural · ajo fresco · perejil picado · aceite de oliva.' :
                 nombreLimpio.includes('fugazzeta') ? 'Abundante cebolla dulce caramelizada · queso muzzarella premium · orégano · aceite de oliva extra virgen.' :
                 nombreLimpio.includes('calabresa') ? 'Muzzarella fundida · rodajas de longaniza calabresa picante · morrones dulces · orégano.' :
                 'Combinación cremosa de muzzarella, roquefort premium, provolone rallado y parmesano gratinado al horno.';
    return {
      desc,
      img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80'
    }
  }
  
  if (categoriaId === 'zapping') {
    return {
      desc: 'Sándwich tostado gigante en pan lactal especial · jamón cocido · queso fundido · manteca · aderezos clásicos de Chefsy.',
      img: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80'
    }
  }
  
  if (categoriaId === 'choripan') {
    return {
      desc: 'Chorizo parrillero premium abierto al libro · pan de campo crujiente · salsa chimichurri artesanal o salsa criolla fresca.',
      img: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=600&q=80'
    }
  }
  
  if (categoriaId === 'mila-al-plato') {
    return {
      desc: 'Milanesa de ternera gigante frita al momento · acompañado con una porción abundante de papas fritas bastón crujientes.',
      img: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=600&q=80'
    }
  }
  
  if (categoriaId === 'tartas-xl') {
    return {
      desc: 'Tarta casera XL hojaldrada recién horneada · rellena generosamente con ingredientes frescos de la mejor calidad.',
      img: 'https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&w=600&q=80'
    }
  }
  
  if (categoriaId === 'bebidas') {
    return {
      desc: 'Bebida helada de tu elección para acompañar tu menú de Chefsy de la mejor manera.',
      img: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80'
    }
  }
  
  if (categoriaId === 'promos') {
    return {
      desc: 'El combo ideal pensado para compartir en familia o con amigos al mejor precio del mercado.',
      img: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=600&q=80'
    }
  }
  
  return {
    desc: 'Exquisito plato elaborado al instante con ingredientes seleccionados y frescos de la cocina de Chefsy.',
    img: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
  }
}

// --- DETALLES DE CATEGORÍAS (EMOJIS Y DESCRIPCIONES DE ENCABEZADO) ---
const OBTENER_DETALLES_CATEGORIA = (catId: string) => {
  switch (catId) {
    case 'todos': 
      return { nombre: 'Nuestro Menú', subtitulo: 'Elegí, personalizá y pedí 🔥', icono: '🍔' }
    case 'lomos-y-milas': 
      return { nombre: 'Milas', subtitulo: 'Sándwiches gigantes con papas fritas', icono: '🥩' }
    case 'zapping': 
      return { nombre: 'Zapping', subtitulo: 'Tostados gigantes rellenos', icono: '🌯' }
    case 'patys': 
      return { nombre: 'Burgers / Patys', subtitulo: 'Con papas crujientes y aderezo especial', icono: '🍔' }
    case 'pizzas': 
      return { nombre: 'Pizzas', subtitulo: 'Masa casera cocida al horno de piedra', icono: '🍕' }
    case 'choripan': 
      return { nombre: 'Choripanes', subtitulo: 'Chorizos premium en pan de campo crocante', icono: '🌭' }
    case 'mila-al-plato': 
      return { nombre: 'Mila al Plato', subtitulo: 'Milanesas abundantes para compartir', icono: '🍽️' }
    case 'tartas-xl': 
      return { nombre: 'Tartas XL', subtitulo: 'Tartas saladas con masa de hojaldre casera', icono: '🥮' }
    case 'bebidas': 
      return { nombre: 'Bebidas', subtitulo: 'Refrescos, aguas y latas de cerveza heladas', icono: '🥤' }
    case 'promos': 
      return { nombre: 'Promos', subtitulo: 'Los combos perfectos para ahorrar y compartir', icono: '🎁' }
    case 'porciones-de-papas':
    case 'papas':
    case 'papas-fritas':
      return { nombre: 'Porciones de Papas', subtitulo: 'Crujientes y doradas, ideales para compartir', icono: '🍟' }
    default: 
      return { nombre: 'Menú Especial', subtitulo: 'Platos frescos de la cocina', icono: '👨‍🍳' }
  }
}

export default function PaginaTienda() {
  const { 
    productos, 
    categorias, 
    modificadores, 
    agregarPedido, 
    modoOscuro, 
    alternarModoOscuro 
  } = usarPedidos()

  const { usuarioActivo, estaListoAuth } = usarAuth()

  // Estados de la tienda
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [categoriaVisible, setCategoriaVisible] = useState<string>('')
  const [hasInteractedSelect, setHasInteractedSelect] = useState(false)
  const [selectorAbierto, setSelectorAbierto] = useState(false)
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [cartAbierto, setCartAbierto] = useState(false)
  const [metadata, setMetadata] = useState<Record<string, any>>({})
  
  // Palabras animadas para el hero
  const animatedWords = ["LOMOS", "MILAS", "ZAPPING", "BURGERS", "PIZZAS", "PATYS"]
  const [animatedWordIndex, setAnimatedWordIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedWordIndex(prev => (prev + 1) % animatedWords.length)
    }, 1500)
    return () => clearInterval(interval)
  }, [])

  // Cargar metadatos públicos de la tienda
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const res = await fetch('/api/admin/tienda-metadata')
        const data = await res.json()
        if (Array.isArray(data)) {
          const m: Record<string, any> = {}
          data.forEach(d => m[d.producto_id] = d)
          setMetadata(m)
        }
      } catch (err) {
        console.error('Error al cargar metadatos de tienda', err)
      }
    }
    fetchMeta()
  }, [])
  
  // Estado para el modal de personalización
  const [productoAPersonalizar, setProductoAPersonalizar] = useState<ProductoCatalogo | null>(null)
  const [modsSeleccionados, setModsSeleccionados] = useState<ModificadorCatalogo[]>([])
  const [cantidadModal, setCantidadModal] = useState(1)
  const [notaPersonalizacion, setNotaPersonalizacion] = useState('')

  // Estado del flujo de checkout
  const [mostrarCheckout, setMostrarCheckout] = useState(false)
  const [nombreCliente, setNombreCliente] = useState('')
  const [telefonoCliente, setTelefonoCliente] = useState('')
  const [tipoEntrega, setTipoEntrega] = useState<'delivery' | 'retiro'>('delivery')
  const [direccionCliente, setDireccionCliente] = useState('')
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia' | 'sin_especificar'>('efectivo')
  const [observaciones, setObservaciones] = useState('')
  
  // Estado de pedido finalizado
  const [pedidoCompletado, setPedidoCompletado] = useState<Pedido | null>(null)

  // --- FILTROS DE CATÁLOGO (memoizados — deben estar ANTES de los returns condicionales por las reglas de React Hooks) ---
  const categoriasActivas = useMemo(() => {
    return categorias
      .filter(c => c.activa && c.id !== 'burgers')
      .map(c => c.id === 'patys' ? { ...c, nombre: 'Burgers / Patys' } : c)
  }, [categorias])

  const productosFiltrados = useMemo(() => productos.filter(p => {
    const hayBusqueda = busqueda.trim() !== ''
    if (!categoriaSeleccionada && !hayBusqueda) return false

    const matchBusqueda = !hayBusqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const catFiltro = (hayBusqueda && !categoriaSeleccionada) ? 'todos' : (categoriaSeleccionada || 'todos')
    
    const perteneceACategoria = catFiltro === 'todos' || p.categoriaId === catFiltro || (catFiltro === 'patys' && p.categoriaId === 'burgers')
    const esPromoValida = catFiltro === 'promos' ? (p.categoriaId === 'promos' || p.esCombo) : true
    
    return p.activo && (catFiltro === 'promos' ? esPromoValida : perteneceACategoria) && matchBusqueda
  }), [productos, categoriaSeleccionada, busqueda])

  useEffect(() => {
    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (entrada.isIntersecting) {
            setCategoriaVisible(entrada.target.id)
          }
        })
      },
      { rootMargin: '-20% 0px -70% 0px' }
    )

    const elementos = document.querySelectorAll('.categoria-seccion')
    elementos.forEach((el) => observador.observe(el))

    return () => observador.disconnect()
  }, [productosFiltrados])

  // useCallback — también debe ir antes de returns condicionales
  const abrirModalPersonalizacion = useCallback((prod: ProductoCatalogo) => {
    setProductoAPersonalizar(prod)
    setModsSeleccionados([])
    setCantidadModal(1)
    setNotaPersonalizacion('')
  }, [])

  // Validar acceso: Solo el administrador puede entrar a la tienda temporalmente
  if (!estaListoAuth) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center font-sans">
        <div className="w-8 h-8 border-4 border-chefsy border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (usuarioActivo?.rol !== 'admin') {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center justify-center p-6 text-center font-sans relative overflow-hidden">
        {/* Luces estéticas de fondo */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-chefsy/10 rounded-full blur-3xl -z-10 animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -z-10 animate-pulse" style={{ animationDelay: '2s' }} />

        <div className="w-full max-w-md bg-[#161D30]/60 border border-slate-800/80 backdrop-blur-md shadow-2xl rounded-[2.5rem] p-8 space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-chefsy/10 text-chefsy flex items-center justify-center mx-auto shadow-inner">
            <HardHat size={32} className="animate-[bounce_2s_infinite]" />
          </div>

          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-chefsy bg-chefsy/10 px-3 py-1 rounded-full">
              Próximamente
            </span>
            <h2 className="text-2xl font-black tracking-tight text-white pt-1">
              Tienda Online en Camino
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Estamos preparando la mejor experiencia digital para que puedas hacer tus pedidos de forma rápida y sencilla. ¡Muy pronto disponible!
            </p>
          </div>

          <div className="pt-2">
            <Link 
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-bold bg-[#1d273f] hover:bg-[#253252] px-4 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              <Lock size={14} /> Acceso Personal
            </Link>
          </div>
        </div>

        <p className="text-[10px] text-slate-650 absolute bottom-6 font-bold uppercase tracking-wider">
          Chefsy Burger &copy; {new Date().getFullYear()}
        </p>
      </div>
    )
  }

  const costoEnvio = 350 // Costo de envío fijo simulado para delivery

  // --- MÉTODOS DEL MODAL DE PERSONALIZACIÓN ---

  const alternarModificador = (mod: ModificadorCatalogo) => {
    setModsSeleccionados(prev => 
      prev.some(m => m.id === mod.id)
        ? prev.filter(m => m.id !== mod.id)
        : [...prev, mod]
    )
  }

  const calcularPrecioUnitarioModal = (): number => {
    if (!productoAPersonalizar) return 0
    const extra = modsSeleccionados.reduce((acc, curr) => acc + curr.precioExtra, 0)
    return productoAPersonalizar.precio + extra
  }

  const agregarAlCarritoDesdeModal = () => {
    if (!productoAPersonalizar) return

    const precioUnitario = calcularPrecioUnitarioModal()
    
    const modsIdsStr = modsSeleccionados.map(m => m.id).sort().join('-')
    const idCart = modsIdsStr ? `${productoAPersonalizar.id}-${modsIdsStr}` : productoAPersonalizar.id

    setCarrito(prev => {
      const indexExistente = prev.findIndex(item => item.idCart === idCart)
      if (indexExistente > -1) {
        const nuevoCarrito = [...prev]
        nuevoCarrito[indexExistente].cantidad += cantidadModal
        return nuevoCarrito
      } else {
        return [...prev, {
          idCart,
          producto: productoAPersonalizar,
          cantidad: cantidadModal,
          modificadoresSeleccionados: modsSeleccionados,
          precioUnitario,
          notaPersonalizacion: notaPersonalizacion.trim() || undefined
        }]
      }
    })

    setProductoAPersonalizar(null)
  }

  // --- MÉTODOS DEL CARRITO ---
  const actualizarCantidadCarrito = (idCart: string, delta: number) => {
    setCarrito(prev => 
      prev.map(item => {
        if (item.idCart === idCart) {
          const nuevaCantidad = item.cantidad + delta
          return nuevaCantidad > 0 ? { ...item, cantidad: nuevaCantidad } : item
        }
        return item
      }).filter(item => item.cantidad > 0)
    )
  }

  const eliminarDelCarrito = (idCart: string) => {
    setCarrito(prev => prev.filter(item => item.idCart !== idCart))
  }

  const totalProductosCarrito = carrito.reduce((acc, curr) => acc + curr.cantidad, 0)
  const subtotalCarrito = carrito.reduce((acc, curr) => acc + (curr.precioUnitario * curr.cantidad), 0)
  const totalCarrito = subtotalCarrito + (tipoEntrega === 'delivery' ? costoEnvio : 0)

  // --- MÉTODOS DE CHECKOUT ---
  const procesarCompra = (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!nombreCliente.trim() || !telefonoCliente.trim()) {
      alert('Por favor completa tu nombre y número de teléfono de contacto.')
      return
    }

    if (tipoEntrega === 'delivery' && !direccionCliente.trim()) {
      alert('Por favor ingresa la dirección para la entrega del delivery.')
      return
    }

    const nuevoPedido: Pedido = {
      id: 'PED-' + Date.now().toString().slice(-6),
      cliente: nombreCliente.trim(),
      telefono: telefonoCliente.trim(),
      tipoEntrega,
      direccion: tipoEntrega === 'delivery' ? direccionCliente.trim() : 'Retiro por el local',
      productos: carrito.map(item => {
        let nombreFormateado = item.producto.nombre
        const anexos = []
        if (item.modificadoresSeleccionados.length > 0) {
          anexos.push(item.modificadoresSeleccionados.map(m => m.nombre).join(', '))
        }
        if (item.notaPersonalizacion) {
          anexos.push(`"${item.notaPersonalizacion}"`)
        }
        if (anexos.length > 0) {
          nombreFormateado += ` (+ ${anexos.join(' | ')})`
        }
        return {
          id: `${item.producto.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          nombre: nombreFormateado,
          cantidad: item.cantidad,
          precio: item.precioUnitario,
          idCatalogo: item.producto.id,
          categoriaId: item.producto.categoriaId
        }
      }),
      total: totalCarrito,
      costoEnvio: tipoEntrega === 'delivery' ? costoEnvio : 0,
      estado: 'nuevo',
      metodoPago,
      observaciones: observaciones.trim() || undefined,
      hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      fecha: obtenerFechaNegocio(),
      created_at: new Date().toISOString()
    }

    agregarPedido(nuevoPedido)
    setPedidoCompletado(nuevoPedido)
    setCarrito([])
    setMostrarCheckout(false)
    setCartAbierto(false)
  }

  const generarEnlaceWhatsApp = (pedido: Pedido): string => {
    const telefono = process.env.NEXT_PUBLIC_WHATSAPP_NEGOCIO || ''
    let mensaje = `*¡Hola Chefsy!* Hice un pedido online: \n\n`
    mensaje += `*Orden:* #${pedido.id}\n`
    mensaje += `*Cliente:* ${pedido.cliente}\n`
    mensaje += `*Teléfono:* ${pedido.telefono}\n`
    mensaje += `*Entrega:* ${pedido.tipoEntrega === 'delivery' ? `Delivery a "${pedido.direccion}"` : 'Retiro por el local'}\n`
    mensaje += `*Método de Pago:* ${pedido.metodoPago.toUpperCase()}\n`
    if (pedido.observaciones) {
      mensaje += `*Notas:* _${pedido.observaciones}_\n`
    }
    mensaje += `\n*Detalle del pedido:* \n`
    
    pedido.productos.forEach(p => {
      mensaje += `• ${p.cantidad}x ${p.nombre} - ${formatearPrecio(p.precio * p.cantidad)}\n`
    })

    if (pedido.costoEnvio && pedido.costoEnvio > 0) {
      mensaje += `• Costo de Envío - ${formatearPrecio(pedido.costoEnvio)}\n`
    }

    mensaje += `\n*Total a pagar: ${formatearPrecio(pedido.total)}*\n`

    const urlBase = telefono
      ? `https://api.whatsapp.com/send?phone=${telefono}&text=${encodeURIComponent(mensaje)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(mensaje)}`
    return urlBase
  }



  // --- VISTA DE ÉXITO ---
  if (pedidoCompletado) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors font-sans">
        <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-2xl rounded-3xl p-6 md:p-8 space-y-6 text-center animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 size={44} className="animate-bounce" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-850 dark:text-slate-100 tracking-tight">
              ¡Pedido Recibido con Éxito!
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Tu pedido <span className="font-extrabold text-slate-700 dark:text-slate-300">#{pedidoCompletado.id}</span> ha sido ingresado en nuestra cocina.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl p-5 space-y-3.5 text-left text-xs text-slate-700 dark:text-slate-350">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px]">
              📋 Resumen de Entrega
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-slate-400 dark:text-slate-500 text-[9px] uppercase font-bold tracking-wider">Cliente</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{pedidoCompletado.cliente}</p>
              </div>
              <div>
                <p className="text-slate-400 dark:text-slate-500 text-[9px] uppercase font-bold tracking-wider">Teléfono</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{pedidoCompletado.telefono}</p>
              </div>
              <div className="col-span-2">
                <p className="text-slate-400 dark:text-slate-500 text-[9px] uppercase font-bold tracking-wider">Destino</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{pedidoCompletado.direccion}</p>
              </div>
              <div>
                <p className="text-slate-400 dark:text-slate-500 text-[9px] uppercase font-bold tracking-wider">Pago</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{pedidoCompletado.metodoPago}</p>
              </div>
              <div>
                <p className="text-slate-400 dark:text-slate-500 text-[9px] uppercase font-bold tracking-wider">Total</p>
                <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{formatearPrecio(pedidoCompletado.total)}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <a
              href={generarEnlaceWhatsApp(pedidoCompletado)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-green-500 hover:bg-green-600 active:scale-98 text-white font-extrabold py-3.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 transition-all cursor-pointer"
            >
              <MessageCircle size={18} />
              Enviar Pedido por WhatsApp
            </a>
            
            <button
              onClick={() => setPedidoCompletado(null)}
              className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 font-bold py-3.5 px-4 rounded-xl text-sm transition-all active:scale-98"
            >
              Hacer otro Pedido
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- DETALLES DE LA CATEGORÍA ACTIVA ---
  const catDetalles = OBTENER_DETALLES_CATEGORIA(categoriaSeleccionada || 'todos')

  return (
    <div className="text-slate-200 font-sans pb-16" style={{ backgroundColor: '#0d0d0d' }}>
      <style dangerouslySetInnerHTML={{ __html: `html, body { background-color: #0d0d0d !important; overscroll-behavior-y: none; }` }} />

      {/* Fondo fijo removido para mantener el color oscuro que funcionó */}

      {/* Capa de oscurecimiento sutil en toda la página */}
      <div className="fixed inset-0 bg-black/50 pointer-events-none z-0"></div>
      
      <div className="relative z-10">
      
      {/* --- CABECERA DE LA TIENDA --- */}
      <header className="bg-transparent px-4 py-6 sticky top-0 z-40 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden relative">
              <Image 
                src="/logo.jpg" 
                alt="Chefsy" 
                fill
                className="object-cover"
              />
            </div>
            <span className="font-bebas text-2xl md:text-3xl text-white tracking-wider">CHEFSY</span>
              {/* Navegación */}
              <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                <Link href="/" className="text-white font-semibold transition-colors cursor-pointer">Tienda</Link>
                <Link href="/sobre-nosotros" className="text-slate-400 hover:text-white transition-colors cursor-pointer">Nosotros</Link>
              </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Acceso Empleados */}
            <Link
              href="/dashboard"
              className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2 text-xs font-medium"
              title="Acceso Personal"
            >
              <Lock size={16} />
              <span className="hidden sm:inline">Personal</span>
            </Link>
            
            {/* Carrito Flotante Cabecera Desktop */}
            <div className="flex items-center gap-3">
              <span className="hidden md:block text-xs font-medium text-slate-400">
                Tu orden 👉
              </span>
              <button
                onClick={() => setCartAbierto(true)}
                className="relative p-3 bg-white text-black hover:bg-slate-200 rounded-xl transition-all flex items-center gap-2 shadow-xl focus:outline-none active:scale-95"
              >
                <ShoppingCart size={18} />
                {totalProductosCarrito > 0 && (
                  <span className="absolute -top-2 -right-2 bg-white text-chefsy font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-md border-2 border-chefsy">
                    {totalProductosCarrito}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* --- HERO SECTION TIPO SQEW --- */}
      <div className="relative min-h-[80vh] lg:min-h-[85vh] w-full flex flex-col px-6 md:px-12 py-4 lg:py-10 overflow-visible">
        
        {/* Contenedor Principal del Hero */}
<<<<<<< HEAD
        <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-2 pt-4 lg:pt-0 max-w-[1600px] mx-auto w-full gap-x-8 gap-y-4 lg:gap-y-4 items-start lg:items-center">
=======
        <div className="relative z-40 flex-1 grid grid-cols-1 lg:grid-cols-2 pt-16 md:pt-20 lg:pt-24 max-w-[1600px] mx-auto w-full gap-x-8 gap-y-6 lg:gap-y-4 items-center">
>>>>>>> 79c4fbd0a32396ef2f3473668a2ff31901913074
          
          {/* 1. Tipografía Gigante (Hero) */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left pb-0 lg:pb-10 z-30 pointer-events-none order-1">
            <motion.h1 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ 
                delay: 0, 
                duration: 0.8, ease: "easeOut" 
              }}
              className="font-bebas text-[4rem] md:text-[6rem] lg:text-[6.5rem] xl:text-[8rem] 2xl:text-[9rem] text-white tracking-normal leading-[0.85]"
            >
              POCAS PALABRAS.
            </motion.h1>
            <motion.h1 
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ 
                delay: 0.2, 
                duration: 0.8, ease: "easeOut" 
              }}
              className="font-bebas text-[4rem] md:text-[6rem] lg:text-[6.5rem] xl:text-[8rem] 2xl:text-[9rem] text-chefsy tracking-normal leading-[0.85]"
            >
              MUCHO CHEDDAR.
            </motion.h1>
          </div>

          {/* 2. Imagen de Producto Gigante Flotante (Right on Desktop, Middle on Mobile) */}
          <div className="relative w-full flex items-center justify-center lg:justify-end pointer-events-none z-20 order-2 lg:row-span-2">
            <motion.div 
              className="relative w-full max-w-[350px] sm:max-w-[450px] md:max-w-[600px] xl:max-w-[800px] aspect-square drop-shadow-[0_30px_60px_rgba(0,0,0,0.8)]"
              initial={{ opacity: 0, scale: 0.8, y: 50, rotate: -10 }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: [0, -20, 0],
                rotate: [-2, 2, -2] 
              }}
              transition={{
                opacity: { duration: 1, delay: 0.5 },
                scale: { duration: 1, delay: 0.5, type: 'spring', bounce: 0.4 },
                y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
                rotate: { duration: 8, repeat: Infinity, ease: "easeInOut" }
              }}
            >
              <Image 
                src="/burger-loca.png" 
                alt="Chefsy Burger" 
                fill
                priority
                sizes="(max-width: 768px) 100vw, 800px"
                className="object-contain"
              />
            </motion.div>
          </div>

          {/* 3. Selector de Categorías y Subtítulo (Bottom Left on Desktop, Bottom on Mobile) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              delay: 0.4, 
              duration: 0.8 
            }}
            className="flex flex-col gap-5 w-full max-w-lg relative z-40 order-3 lg:self-start"
          >
            <p className="font-bebas text-6xl md:text-7xl text-white tracking-wide leading-none whitespace-nowrap">
              ¿QUÉ PINTA HOY?
            </p>
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Ej. Cheddar, Papas, Mila especial..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full bg-white/5 backdrop-blur-xl border border-white/20 hover:border-white/40 focus:border-chefsy-400 text-white py-4 pl-12 pr-6 rounded-2xl outline-none transition-all shadow-2xl placeholder-slate-400 font-medium"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            </div>
            <div className="flex items-center gap-4 w-full">
              <div className="relative group w-[50%] z-50">
                <button
                  type="button"
                  onClick={() => setSelectorAbierto(!selectorAbierto)}
                  className="w-full flex items-center justify-between bg-white/5 backdrop-blur-xl border border-white/20 hover:border-white/40 text-white py-4 px-4 sm:px-6 rounded-2xl outline-none focus:border-white/60 transition-all cursor-pointer font-medium tracking-wide shadow-2xl"
                >
                  <span className={`truncate mr-2 ${categoriaSeleccionada ? 'text-white' : 'text-slate-300'}`}>
                    {categoriaSeleccionada === 'todos' 
                      ? 'Ver todo el menú' 
                      : categoriasActivas.find(c => c.id === categoriaSeleccionada)?.nombre || 'APRETÁ ACÁ'}
                  </span>
                  <ChevronDown 
                    size={20} 
                    className={`text-chefsy-300 shrink-0 transition-transform duration-300 ${selectorAbierto ? 'rotate-180' : ''}`} 
                  />
                </button>

                <AnimatePresence>
                  {selectorAbierto && (
                    <>
                      {/* Backdrop */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectorAbierto(false)}
                        className="fixed inset-0 bg-black/70 z-[100]"
                      />
                      {/* Wrapper de centrado — independiente del motion.div para evitar conflicto de transforms */}
                      <div className="fixed inset-0 z-[101] flex items-end sm:items-center justify-center pointer-events-none">
                      <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 40 }}
                        transition={{ type: "spring", damping: 30, stiffness: 250 }}
                        className="pointer-events-auto w-full sm:w-96 bg-[#111827] border border-white/10 sm:rounded-3xl rounded-t-[2rem] shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"
                      >
                        <div className="flex justify-center pt-4 pb-2 sm:hidden cursor-grab active:cursor-grabbing" onClick={() => setSelectorAbierto(false)}>
                          <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                        </div>
                        <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
                          <h3 className="text-white font-bebas tracking-wide text-2xl">¿QUÉ PINTA HOY?</h3>
                          <button onClick={() => setSelectorAbierto(false)} className="text-white/50 hover:text-white p-2 bg-white/5 rounded-full transition-colors">
                            <X size={20} />
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setHasInteractedSelect(true)
                              setCategoriaSeleccionada('todos')
                              setSelectorAbierto(false)
                            }}
                            className={`w-full text-left px-6 py-4 rounded-2xl transition-all font-medium border border-transparent ${categoriaSeleccionada === 'todos' || !categoriaSeleccionada ? 'bg-chefsy/20 border-chefsy/50 text-chefsy-200' : 'text-white bg-white/5 hover:bg-white/10'}`}
                          >
                            Ver todo el menú
                          </button>
                          {categoriasActivas.map(cat => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                setHasInteractedSelect(true)
                                setCategoriaSeleccionada(cat.id)
                                setSelectorAbierto(false)
                              }}
                              className={`w-full text-left px-6 py-4 rounded-2xl transition-all font-medium border border-transparent ${categoriaSeleccionada === cat.id ? 'bg-chefsy/20 border-chefsy/50 text-chefsy-200' : 'text-white bg-white/5 hover:bg-white/10'}`}
                            >
                              {cat.nombre}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                      </div>
                    </>
                  )}
                </AnimatePresence>
              </div>
              <div className="w-[50%] relative flex items-center overflow-hidden h-[60px]">
                <AnimatePresence mode="popLayout">
                  <motion.h2 
                    key={animatedWordIndex}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ duration: 0.5, ease: "circOut" }}
                    className="font-bebas text-4xl sm:text-5xl md:text-6xl text-white tracking-wide absolute left-0"
                  >
                    {animatedWords[animatedWordIndex]}
                  </motion.h2>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

        </div>

      </div>
      {/* --- SECCIÓN DEL CONTENIDO CENTRAL --- */}
      <main className="max-w-6xl mx-auto p-4 space-y-6 pt-10">
        
        {/* Encabezado del Menú Seleccionado */}
        {categoriaSeleccionada && (
        <div className="text-left border-b border-white/10 pb-4 flex items-center justify-between">
          <div>
            <h3 className="text-5xl md:text-6xl font-bebas tracking-wide text-white flex items-center gap-3.5 leading-none">
              {catDetalles.icono === '🍔' ? (
                <img src="/burger-icon.png" alt="Burger" className="w-12 h-12 md:w-14 h-14 object-contain drop-shadow-md -translate-y-[2px]" />
              ) : (
                <span>{catDetalles.icono}</span>
              )}
              {catDetalles.nombre === 'Menú Especial' ? (categoriasActivas.find(c => c.id === categoriaSeleccionada)?.nombre.toUpperCase() || catDetalles.nombre) : catDetalles.nombre}
            </h3>
          </div>
        </div>
        )}

        {/* Listado de Productos */}
        {!categoriaSeleccionada && !busqueda ? (
          null
        ) : productosFiltrados.length === 0 ? (
          <div className="text-center py-20 text-slate-300 text-sm bg-black/20 rounded-3xl border border-dashed border-white/20 p-6">
            No encontramos productos activos.
          </div>
        ) : (
          <>
            {/* Barra Scrollspy (solo visible si no hay categoría específica seleccionada o es 'todos') */}
            {(!categoriaSeleccionada || categoriaSeleccionada === 'todos') && (
              <div className="sticky top-[80px] z-30 bg-[#0d0d0d]/90 backdrop-blur-xl py-3 border-b border-white/5 overflow-x-auto no-scrollbar flex gap-2 mb-8 shadow-2xl">
                {categoriasActivas.map(cat => {
                  const tieneProductos = productosFiltrados.some(p => p.categoriaId === cat.id)
                  if (!tieneProductos) return null
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        document.getElementById(cat.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }}
                      className={`whitespace-nowrap px-4 py-1.5 rounded-full font-bold text-sm transition-all ${
                        categoriaVisible === cat.id ? 'bg-chefsy text-white shadow-lg shadow-chefsy/30' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {cat.nombre}
                    </button>
                  )
                })}
              </div>
            )}

            <div className="flex flex-col gap-10">
              {categoriasActivas.map(cat => {
                const productosDeCat = productosFiltrados.filter(p => 
                  p.categoriaId === cat.id || (cat.id === 'patys' && p.categoriaId === 'burgers')
                )
                if (productosDeCat.length === 0) return null

                return (
                  <div key={cat.id} id={cat.id} className="categoria-seccion flex flex-col gap-4 scroll-mt-36">
                    {/* Título de Categoría en la lista */}
                    {(!categoriaSeleccionada || categoriaSeleccionada === 'todos' || busqueda) && (
                      <h3 className="font-bebas text-4xl text-chefsy-300 tracking-wide border-b border-white/10 pb-2 mb-2">
                        {cat.nombre}
                      </h3>
                    )}

                    {productosDeCat.filter(p => !p.esCombo).map((prodOriginal, index) => {
                      const meta = metadata[prodOriginal.id]
                      const prod = meta ? { ...prodOriginal, nombre: meta.nombre_publico || prodOriginal.nombre } : prodOriginal
                      const agotado = (prodOriginal.stock !== undefined && prodOriginal.stock !== null) && (prodOriginal.stock || 0) <= 0
                      const detalles = OBTENER_DETALLES_COMPLEMENTARIOS(prodOriginal.categoriaId, prodOriginal.nombre)
                      return (
                        <ProductCard
                          key={prod.id} prod={prod} meta={meta} detalles={detalles}
                          agotado={agotado || false} imagenFinal={meta?.imagen_url || detalles.img}
                          index={index} onAbrirModal={abrirModalPersonalizacion}
                        />
                      )
                    })}

                    {productosDeCat.some(p => p.esCombo) && (
                      <div className="mt-4 mb-2">
                        <h4 className="font-bebas text-3xl text-white tracking-wide border-b border-white/10 pb-2">
                          COMBOS
                        </h4>
                      </div>
                    )}

                    {productosDeCat.filter(p => p.esCombo).map((prodOriginal, index) => {
                      const meta = metadata[prodOriginal.id]
                      const prod = meta ? { ...prodOriginal, nombre: meta.nombre_publico || prodOriginal.nombre } : prodOriginal
                      const agotado = (prodOriginal.stock !== undefined && prodOriginal.stock !== null) && (prodOriginal.stock || 0) <= 0
                      const detalles = OBTENER_DETALLES_COMPLEMENTARIOS(prodOriginal.categoriaId, prodOriginal.nombre)
                      return (
                        <ProductCard
                          key={prod.id} prod={prod} meta={meta} detalles={detalles}
                          agotado={agotado || false} imagenFinal={meta?.imagen_url || detalles.img}
                          index={index + 100} onAbrirModal={abrirModalPersonalizacion}
                        />
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </main>

      {/* --- CARRITO DE COMPRAS FLOTANTE (BOTÓN MÓVIL Y DESKTOP) --- */}
      {totalProductosCarrito > 0 && (
        <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none animate-in slide-in-from-bottom-10 fade-in duration-300">
          <button
            onClick={() => setCartAbierto(true)}
            className="w-full max-w-sm bg-chefsy hover:bg-chefsy-600 text-white font-extrabold py-3 px-5 rounded-full flex items-center justify-between shadow-[0_10px_40px_rgba(42,99,72,0.5)] active:scale-95 transition-all cursor-pointer border border-chefsy-400/30 pointer-events-auto"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <ShoppingCart size={20} className="text-white" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm leading-tight">Ver Carrito</span>
                <span className="text-[10px] text-chefsy-100 font-semibold">{totalProductosCarrito} {totalProductosCarrito === 1 ? 'producto' : 'productos'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black">{formatearPrecio(subtotalCarrito)}</span>
            </div>
          </button>
        </div>
      )}

      {/* --- CART DRAWER (BARRA DESLIZANTE LATERAL EN CHECKOUT) --- */}
      {cartAbierto && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setCartAbierto(false)}
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
                onClick={() => setCartAbierto(false)}
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
                        onClick={() => eliminarDelCarrito(item.idCart)}
                        className="text-slate-500 hover:text-red-500 p-1 rounded transition-colors focus:outline-none"
                        title="Eliminar ítem"
                      >
                        <Trash2 size={14} />
                      </button>

                      <div className="flex items-center border border-white/10 rounded-lg bg-black/20 overflow-hidden">
                        <button
                          onClick={() => actualizarCantidadCarrito(item.idCart, -1)}
                          className="px-2 py-1 hover:bg-white/10 transition-colors text-slate-400 focus:outline-none"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="px-2.5 text-xs font-bold text-white">
                          {item.cantidad}
                        </span>
                        <button
                          onClick={() => actualizarCantidadCarrito(item.idCart, 1)}
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
                <form onSubmit={procesarCompra} className="space-y-4">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                    <button
                      type="button"
                      onClick={() => setMostrarCheckout(false)}
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
                        onChange={(e) => setNombreCliente(e.target.value)}
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
                        onChange={(e) => setTelefonoCliente(e.target.value)}
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
                        onClick={() => setTipoEntrega('delivery')}
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
                        onClick={() => setTipoEntrega('retiro')}
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
                          onChange={(e) => setDireccionCliente(e.target.value)}
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
                        onChange={(e) => setMetodoPago(e.target.value as any)}
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
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Ej: Sin cebolla, tocar timbre de abajo..."
                      rows={2}
                      className="w-full border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-chefsy-500 bg-black/20 text-white placeholder:text-slate-600 resize-none"
                    />
                  </div>

                  <div className="mt-4 flex w-full">
                    <SlideButton 
                      onAction={() => procesarCompra()}
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
                    onClick={() => setMostrarCheckout(true)}
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
      )}

      {/* --- MODAL DE PERSONALIZACIÓN / MODIFICADORES --- */}
      {productoAPersonalizar && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity"
            onClick={() => setProductoAPersonalizar(null)}
          />

          {/* Modal Panel */}
          <div className="relative w-full sm:max-w-md bg-gradient-to-b from-[#1a1f2e] to-[#0d1117] backdrop-blur-xl shadow-2xl rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden border border-white/10 z-10 flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
            
            {/* Barra decorativa superior (solo mobile) */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Cabecera con imagen del producto si existe */}
            <div className="px-6 pt-4 pb-5 border-b border-white/8 flex items-start justify-between gap-3 text-left relative overflow-hidden">
              {/* Fondo decorativo */}
              <div className="absolute inset-0 bg-gradient-to-br from-chefsy-500/10 via-transparent to-transparent pointer-events-none" />
              
              <div className="relative z-10">
                <p className="text-[10px] font-semibold text-chefsy-400 uppercase tracking-[0.2em] mb-1">Estás pidiendo</p>
                <h3 className="font-bebas text-3xl text-white leading-none tracking-wide">
                  Personalizá tu {productoAPersonalizar.nombre}
                </h3>
              </div>

              <button
                onClick={() => setProductoAPersonalizar(null)}
                className="relative z-10 mt-1 w-8 h-8 flex items-center justify-center rounded-full bg-white/8 hover:bg-white/15 text-slate-400 hover:text-white transition-all shrink-0 focus:outline-none"
              >
                <X size={15} />
              </button>
            </div>

            {/* Cuerpo del Modal */}
            <div className="p-5 overflow-y-auto scrollbar-hide space-y-5 flex-1 text-left">
              
              {/* Precio base — pill estilizada */}
              <div className="flex items-center justify-between bg-white/5 border border-white/8 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-chefsy-400 animate-pulse" />
                  <span className="text-xs font-semibold text-slate-300">Precio base</span>
                </div>
                <span className="font-bebas text-xl text-white tracking-wider">{formatearPrecio(productoAPersonalizar.precio)}</span>
              </div>

              {/* Nota libre */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-300 leading-snug">
                  ¿Querés cambiarle algo a tu <span className="text-chefsy-400">{productoAPersonalizar.nombre}</span>?
                </h4>
                <div className="relative">
                  <textarea
                    value={notaPersonalizacion}
                    onChange={(e) => setNotaPersonalizacion(e.target.value)}
                    placeholder="Ej: Sin cebolla, con extra mayonesa..."
                    className="w-full border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-chefsy-500/60 focus:border-chefsy-500/50 bg-black/30 text-white placeholder:text-slate-600 resize-none transition-all"
                    rows={3}
                  />
                </div>
              </div>

              {/* Modificadores disponibles */}
              {productoAPersonalizar.modificadoresIds && productoAPersonalizar.modificadoresIds.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Extras disponibles</h4>
                  <div className="space-y-2">
                  {productoAPersonalizar.modificadoresIds?.map(modId => {
                    const modObj = modificadores.find(m => m.id === modId)
                    if (!modObj) return null
                    const seleccionado = modsSeleccionados.some(m => m.id === modId)
                    return (
                      <button
                        key={modId}
                        onClick={() => alternarModificador(modObj)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border text-sm font-semibold transition-all cursor-pointer ${
                          seleccionado
                            ? 'bg-chefsy-500/20 text-chefsy-300 border-chefsy-500/60 shadow-[inset_0_0_12px_rgba(255,100,0,0.08)]'
                            : 'border-white/8 bg-white/4 text-slate-400 hover:border-white/20 hover:bg-white/8'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                            seleccionado ? 'bg-chefsy-500 border-transparent' : 'border-slate-600 bg-transparent'
                          }`}>
                            {seleccionado && <span className="text-[7px] text-white font-black">✓</span>}
                          </span>
                          {modObj.nombre}
                        </span>
                        <span className={`text-xs font-bold ${seleccionado ? 'text-chefsy-400' : 'text-slate-500'}`}>
                          + {formatearPrecio(modObj.precioExtra)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="px-5 py-4 border-t border-white/8 bg-black/20 flex items-center gap-3">
              {/* Selector de cantidad */}
              <div className="flex items-center bg-white/8 border border-white/10 rounded-xl overflow-hidden shrink-0">
                <button
                  onClick={() => setCantidadModal(prev => Math.max(1, prev - 1))}
                  className="w-9 h-10 flex items-center justify-center hover:bg-white/10 transition-colors text-slate-300 focus:outline-none"
                >
                  <Minus size={13} />
                </button>
                <span className="w-8 text-center text-sm font-black text-white">
                  {cantidadModal}
                </span>
                <button
                  onClick={() => setCantidadModal(prev => prev + 1)}
                  className="w-9 h-10 flex items-center justify-center hover:bg-white/10 transition-colors text-slate-300 focus:outline-none"
                >
                  <Plus size={13} />
                </button>
              </div>

              {/* Botón agregar */}
              <button
                onClick={agregarAlCarritoDesdeModal}
                className="flex-1 bg-gradient-to-r from-chefsy-500 to-chefsy-600 hover:from-chefsy-400 hover:to-chefsy-500 text-white font-bebas text-xl tracking-wider py-2.5 px-4 rounded-xl shadow-lg shadow-chefsy-500/20 transition-all active:scale-[0.98] cursor-pointer text-center leading-none"
              >
                Agregar · {formatearPrecio(calcularPrecioUnitarioModal() * cantidadModal)}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

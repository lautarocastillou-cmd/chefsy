'use client'

import React, { useState } from 'react'
import { usarPedidos } from '@/contexto/PedidosContexto'
import { obtenerFechaNegocio } from '@/lib/tiempo'
import { ProductoCatalogo, ModificadorCatalogo } from '@/tipos/catalogo'
import { Pedido } from '@/tipos'
import Link from 'next/link'
import { 
  ShoppingCart, Plus, Minus, Trash2, User, Phone, 
  MapPin, CreditCard, CheckCircle2, MessageCircle, 
  X, Moon, Sun, Lock, ChevronRight, Sparkles,
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
      return { nombre: 'Lomos y Milas', subtitulo: 'Sándwiches gigantes con papas fritas', icono: '🥩' }
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

  // Estados de la tienda
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('todos')
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [cartAbierto, setCartAbierto] = useState(false)
  
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
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo')
  const [observaciones, setObservaciones] = useState('')
  
  // Estado de pedido finalizado
  const [pedidoCompletado, setPedidoCompletado] = useState<Pedido | null>(null)

  const costoEnvio = 350 // Costo de envío fijo simulado para delivery

  // --- FILTROS DE CATÁLOGO ---
  const categoriasActivas = categorias.filter(c => c.activa)
  const productosFiltrados = productos.filter(p => {
    const perteneceACategoria = categoriaSeleccionada === 'todos' || p.categoriaId === categoriaSeleccionada
    const esPromoValida = p.categoriaId === 'promos' || p.esCombo
    const cumpleFiltro = categoriaSeleccionada === 'promos' ? esPromoValida : perteneceACategoria
    return p.activo && cumpleFiltro
  })

  // --- MÉTODOS DEL MODAL DE PERSONALIZACIÓN ---
  const abrirModalPersonalizacion = (prod: ProductoCatalogo) => {
    setProductoAPersonalizar(prod)
    setModsSeleccionados([])
    setCantidadModal(1)
    setNotaPersonalizacion('')
  }

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
  const procesarCompra = (e: React.FormEvent) => {
    e.preventDefault()

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
  const catDetalles = OBTENER_DETALLES_CATEGORIA(categoriaSeleccionada)

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors font-sans pb-16">
      
      {/* --- CABECERA DE LA TIENDA (BARRA DE NAVEGACIÓN OSCURA) --- */}
      <header className="bg-[#0B0F19] px-4 py-4 sticky top-0 z-40 transition-colors shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.jpg" 
              alt="Chefsy Logo" 
              className="w-10 h-10 object-contain rounded-xl border border-slate-800 p-0.5 bg-white shadow-sm"
            />
            <div className="flex items-center gap-6">
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                Chefsy
              </h1>
              {/* Navegación al estilo Freddy Burger */}
              <nav className="hidden md:flex items-center gap-5 text-sm font-semibold">
                <span className="text-slate-400 hover:text-white transition-colors cursor-pointer">Inicio</span>
                <span className="text-chefsy-500 font-bold transition-colors cursor-pointer">Menú</span>
              </nav>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Tema Claro/Oscuro */}
            <button
              onClick={alternarModoOscuro}
              className="p-2 rounded-xl text-slate-450 hover:text-white transition-all focus:outline-none"
              title={modoOscuro ? 'Modo claro' : 'Modo oscuro'}
            >
              {modoOscuro ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Acceso Empleados */}
            <Link
              href="/dashboard"
              className="p-2 rounded-xl text-slate-455 hover:text-white transition-all flex items-center gap-1.5 text-xs font-semibold"
              title="Acceso Personal"
            >
              <Lock size={16} />
              <span className="hidden sm:inline">Empleados</span>
            </Link>
            
            {/* Carrito Flotante Cabecera Desktop */}
            <div className="flex items-center gap-2">
              <span className="hidden md:block text-xs font-bold text-chefsy-500 animate-pulse">
                ¿Ya elegiste todo? apretá acá 👉
              </span>
              <button
                onClick={() => setCartAbierto(true)}
                className="relative p-2.5 bg-slate-800 text-white hover:bg-slate-700 rounded-xl transition-all flex items-center gap-1.5 focus:outline-none"
              >
                <ShoppingCart size={18} />
                {totalProductosCarrito > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-chefsy-500 text-white font-extrabold text-[9px] w-5 h-5 rounded-full flex items-center justify-center border border-[#0B0F19] shadow-md">
                    {totalProductosCarrito}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* --- HERO SECTION DE LA TIENDA (FONDO NEGRO AL ESTILO FREDDY BURGER) --- */}
      <div className="bg-[#0B0F19] text-white py-14 px-6 text-left border-b border-slate-900 relative">
        <div className="max-w-6xl mx-auto space-y-2.5 relative z-10">
          <span className="text-chefsy-500 font-black text-xs uppercase tracking-widest flex items-center gap-1.5">
            🔥 CHEFSY BURGER
          </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight">
            Nuestro Menú
          </h2>
          <p className="text-sm text-slate-400 font-medium leading-relaxed">
            Elegí, personalizá y pedí tu plato preferido.
          </p>
        </div>
      </div>

      {/* --- PILL TABS DE CATEGORÍAS (TRASLAPADO EN LA TRANSICIÓN) --- */}
      <div className="relative -mt-7 z-30 max-w-6xl mx-auto px-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 shadow-xl rounded-2xl p-2 flex gap-2 overflow-x-auto scrollbar-none snap-x select-none">
          <button
            onClick={() => setCategoriaSeleccionada('todos')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all snap-start flex-shrink-0 cursor-pointer flex items-center gap-1.5 ${
              categoriaSeleccionada === 'todos'
                ? 'bg-chefsy-500 text-white shadow-md'
                : 'bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350'
            }`}
          >
            🍽️ Todo
          </button>
          {categoriasActivas.map(cat => {
            const icono = cat.id === 'lomos-y-milas' ? '🥩' :
                          cat.id === 'zapping' ? '🌯' :
                          cat.id === 'patys' ? '🍔' :
                          cat.id === 'pizzas' ? '🍕' :
                          cat.id === 'choripan' ? '🌭' :
                          cat.id === 'mila-al-plato' ? '🍽️' :
                          cat.id === 'tartas-xl' ? '🥮' :
                          cat.id === 'bebidas' ? '🥤' :
                          '🎁'
            return (
              <button
                key={cat.id}
                onClick={() => setCategoriaSeleccionada(cat.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all snap-start flex-shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  categoriaSeleccionada === cat.id
                    ? 'bg-chefsy-500 text-white shadow-md'
                    : 'bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350'
                }`}
              >
                <span>{icono}</span>
                {cat.nombre}
              </button>
            )
          })}
        </div>
      </div>

      {/* --- SECCIÓN DEL CONTENIDO CENTRAL --- */}
      <main className="max-w-6xl mx-auto p-4 space-y-6 pt-10">
        
        {/* Encabezado del Menú Seleccionado */}
        <div className="space-y-1 text-left border-b border-slate-200 dark:border-slate-800 pb-3 flex items-baseline justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-850 dark:text-slate-100 flex items-center gap-2">
              <span>{catDetalles.icono}</span>
              {catDetalles.nombre}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-500 font-medium">
              {catDetalles.subtitulo}
            </p>
          </div>
        </div>

        {/* Listado de Productos (Grid de 3 Columnas al estilo Freddy Burger) */}
        {productosFiltrados.length === 0 ? (
          <div className="text-center py-20 text-slate-400 dark:text-slate-500 text-sm bg-white dark:bg-slate-900/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-850 p-6">
            No encontramos productos activos en esta categoría.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {productosFiltrados.map(prod => {
              const tieneStockLimitado = prod.stock !== undefined && prod.stock !== null
              const agotado = tieneStockLimitado && (prod.stock || 0) <= 0
              const detalles = OBTENER_DETALLES_COMPLEMENTARIOS(prod.categoriaId, prod.nombre)
              
              return (
                <div
                  key={prod.id}
                  onClick={() => !agotado && abrirModalPersonalizacion(prod)}
                  className={`bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-850 shadow-sm hover:shadow-md rounded-[2.25rem] overflow-hidden transition-all group flex flex-col justify-between cursor-pointer ${
                    agotado ? 'opacity-65' : 'active:scale-98'
                  }`}
                >
                  <div>
                    {/* Imagen del Producto */}
                    <div className="relative h-56 w-full overflow-hidden bg-slate-100 dark:bg-slate-950">
                      <img 
                        src={detalles.img} 
                        alt={prod.nombre} 
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {prod.esCombo && (
                        <span className="absolute top-4 left-4 text-[9px] font-black bg-chefsy-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Combo
                        </span>
                      )}
                      {agotado && (
                        <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center">
                          <span className="bg-red-650 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl uppercase tracking-wider">
                            Agotado
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Contenido de la Tarjeta */}
                    <div className="p-5 space-y-2 text-left">
                      <div className="flex justify-between items-baseline gap-2">
                        <h4 className="font-extrabold text-sm text-slate-850 dark:text-slate-100 leading-snug uppercase tracking-tight">
                          {prod.nombre}
                        </h4>
                        <span className="font-black text-sm text-chefsy-500 shrink-0">
                          {formatearPrecio(prod.precio)}
                        </span>
                      </div>
                      
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal line-clamp-3">
                        {detalles.desc}
                      </p>
                    </div>
                  </div>

                  {/* Pie de la Tarjeta */}
                  <div className="p-5 pt-0 text-left">
                    <div className="text-xs text-chefsy-500 font-extrabold hover:text-chefsy-655 transition-colors">
                      Personalizar y añadir +
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* --- CARRITO DE COMPRAS FLOTANTE (BOTÓN MÓVIL) --- */}
      {totalProductosCarrito > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 md:hidden">
          <button
            onClick={() => setCartAbierto(true)}
            className="w-full bg-chefsy-500 hover:bg-chefsy-600 text-white font-extrabold py-3.5 px-4 rounded-2xl flex items-center justify-between shadow-lg shadow-chefsy-500/20 active:scale-98 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} />
              <span className="text-xs">Ver Carrito</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-chefsy-600 px-2 py-0.5 rounded-lg text-xs">
                {totalProductosCarrito}
              </span>
              <span className="text-sm font-black">{formatearPrecio(subtotalCarrito)}</span>
            </div>
          </button>
        </div>
      )}

      {/* --- CART DRAWER (BARRA DESLIZANTE LATERAL EN CHECKOUT) --- */}
      {cartAbierto && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
            onClick={() => setCartAbierto(false)}
          />
          
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl h-full flex flex-col z-10 animate-in slide-in-from-right duration-250 border-l border-slate-200/50 dark:border-slate-800">
            {/* Cabecera del Drawer */}
            <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="text-chefsy-500" size={20} />
                <h2 className="font-extrabold text-slate-850 dark:text-slate-100 text-sm">Tu Carrito</h2>
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-350 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {totalProductosCarrito} items
                </span>
              </div>
              <button
                onClick={() => setCartAbierto(false)}
                className="p-1.5 rounded-lg text-slate-450 dark:text-slate-555 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
              >
                <X size={18} />
              </button>
            </div>

            {/* Listado del Carrito */}
            <div className="flex-1 overflow-y-auto scrollbar-hide p-5 space-y-4">
              {carrito.length === 0 ? (
                <div className="text-center py-20 text-slate-400 dark:text-slate-500 text-xs">
                  🛒 Tu carrito está vacío.<br />Agrega algunos platos ricos de la tienda.
                </div>
              ) : !mostrarCheckout ? (
                carrito.map(item => (
                  <div 
                    key={item.idCart}
                    className="flex justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/40 dark:border-slate-850 rounded-2xl transition-all"
                  >
                    <div className="flex-1 space-y-1 text-left">
                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 leading-tight">
                        {item.producto.nombre}
                      </h4>
                      {item.modificadoresSeleccionados.length > 0 && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                          + {item.modificadoresSeleccionados.map(m => `${m.nombre} (${formatearPrecio(m.precioExtra)})`).join(', ')}
                        </p>
                      )}
                      <p className="text-[11px] font-bold text-slate-450 dark:text-slate-400">
                        {formatearPrecio(item.precioUnitario)}
                      </p>
                    </div>

                    <div className="flex flex-col items-end justify-between gap-2.5 min-w-[100px]">
                      <button
                        onClick={() => eliminarDelCarrito(item.idCart)}
                        className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors focus:outline-none"
                        title="Eliminar ítem"
                      >
                        <Trash2 size={14} />
                      </button>

                      <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 overflow-hidden">
                        <button
                          onClick={() => actualizarCantidadCarrito(item.idCart, -1)}
                          className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors text-slate-550 focus:outline-none"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="px-2.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                          {item.cantidad}
                        </span>
                        <button
                          onClick={() => actualizarCantidadCarrito(item.idCart, 1)}
                          className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors text-slate-555 focus:outline-none"
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
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => setMostrarCheckout(false)}
                      className="text-xs text-chefsy-500 hover:underline font-bold cursor-pointer"
                    >
                      ← Volver al carrito
                    </button>
                  </div>

                  {/* Campo Nombre */}
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider block">
                      Nombre Completo
                    </label>
                    <div className="relative flex items-center">
                      <User size={14} className="absolute left-3 text-slate-400 dark:text-slate-500" />
                      <input
                        type="text"
                        required
                        value={nombreCliente}
                        onChange={(e) => setNombreCliente(e.target.value)}
                        placeholder="Ej: Juan Pérez"
                        className="w-full border border-slate-200 dark:border-slate-805 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-chefsy-500 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 placeholder:text-gray-450"
                      />
                    </div>
                  </div>

                  {/* Campo Teléfono */}
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider block">
                      Teléfono de Contacto
                    </label>
                    <div className="relative flex items-center">
                      <Phone size={14} className="absolute left-3 text-slate-400 dark:text-slate-500" />
                      <input
                        type="tel"
                        required
                        value={telefonoCliente}
                        onChange={(e) => setTelefonoCliente(e.target.value)}
                        placeholder="Ej: 1122334455"
                        className="w-full border border-slate-200 dark:border-slate-805 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-chefsy-500 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 placeholder:text-gray-455"
                      />
                    </div>
                  </div>

                  {/* Tipo de Entrega */}
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider block">
                      Modalidad de Entrega
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setTipoEntrega('delivery')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          tipoEntrega === 'delivery'
                            ? 'bg-chefsy-50 dark:bg-chefsy-950/20 text-chefsy-650 dark:text-chefsy-400 border-chefsy-550'
                            : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-450'
                        }`}
                      >
                        🛵 Delivery
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipoEntrega('retiro')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          tipoEntrega === 'retiro'
                            ? 'bg-chefsy-50 dark:bg-chefsy-950/20 text-chefsy-650 dark:text-chefsy-400 border-chefsy-555'
                            : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-455'
                        }`}
                      >
                        🏪 Retiro por local
                      </button>
                    </div>
                  </div>

                  {/* Campo Dirección */}
                  {tipoEntrega === 'delivery' && (
                    <div className="space-y-1 text-left animate-in fade-in slide-in-from-top-2 duration-150">
                      <label className="text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider block">
                        Dirección de Envío
                      </label>
                      <div className="relative flex items-center">
                        <MapPin size={14} className="absolute left-3 text-slate-400 dark:text-slate-500" />
                        <input
                          type="text"
                          required
                          value={direccionCliente}
                          onChange={(e) => setDireccionCliente(e.target.value)}
                          placeholder="Calle, Altura, Piso / Depto"
                          className="w-full border border-slate-200 dark:border-slate-805 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-chefsy-500 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 placeholder:text-gray-455"
                        />
                      </div>
                    </div>
                  )}

                  {/* Método de Pago */}
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider block">
                      Método de Pago
                    </label>
                    <div className="relative flex items-center">
                      <CreditCard size={14} className="absolute left-3 text-slate-400 dark:text-slate-505" />
                      <select
                        value={metodoPago}
                        onChange={(e) => setMetodoPago(e.target.value as any)}
                        className="w-full border border-slate-200 dark:border-slate-805 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-chefsy-550 bg-slate-50 dark:bg-slate-955 text-slate-705 dark:text-slate-205"
                      >
                        <option value="efectivo">💵 Efectivo (Paga al recibir)</option>
                        <option value="tarjeta">💳 Tarjeta (Débito/Crédito)</option>
                        <option value="transferencia">📲 Transferencia Bancaria</option>
                      </select>
                    </div>
                  </div>

                  {/* Observaciones */}
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider block">
                      Aclaraciones / Notas (Opcional)
                    </label>
                    <textarea
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Ej: Sin cebolla, tocar timbre de abajo..."
                      rows={2}
                      className="w-full border border-slate-200 dark:border-slate-805 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-chefsy-550 bg-slate-50 dark:bg-slate-955 text-slate-705 dark:text-slate-205 placeholder:text-gray-455 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-chefsy-500 hover:bg-chefsy-600 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs shadow-md transition-all active:scale-98 mt-4 cursor-pointer"
                  >
                    Confirmar Pedido ({formatearPrecio(totalCarrito)})
                  </button>
                </form>
              )}
            </div>

            {/* Footer de Drawer */}
            {carrito.length > 0 && (
              <div className="p-5 border-t border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 space-y-4">
                <div className="space-y-1.5 text-xs text-slate-650 dark:text-slate-350 text-left">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{formatearPrecio(subtotalCarrito)}</span>
                  </div>
                  {tipoEntrega === 'delivery' && (
                    <div className="flex justify-between">
                      <span>Costo de envío</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{formatearPrecio(costoEnvio)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-2 text-sm font-black text-slate-850 dark:text-slate-100">
                    <span>Total a pagar</span>
                    <span className="text-chefsy-500">{formatearPrecio(totalCarrito)}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setProductoAPersonalizar(null)}
          />

          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl rounded-3xl overflow-hidden border border-slate-200/50 dark:border-slate-850 z-10 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Cabecera */}
            <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-left">
              <div>
                <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-100 leading-tight">
                  Personalizá tu {productoAPersonalizar.nombre}
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Agregá modificadores a tu plato</p>
              </div>
              <button
                onClick={() => setProductoAPersonalizar(null)}
                className="p-1.5 rounded-lg text-slate-450 dark:text-slate-555 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cuerpo del Modal */}
            <div className="p-5 overflow-y-auto scrollbar-hide space-y-4 flex-1 text-left">
              <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200/30 dark:border-slate-850 rounded-2xl p-4 flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-555 dark:text-slate-400">Precio base</span>
                <span className="font-black text-slate-800 dark:text-slate-200">{formatearPrecio(productoAPersonalizar.precio)}</span>
              </div>

              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-slate-550 dark:text-slate-350 uppercase tracking-wider">¿Querés cambiarle algo?</h4>
                <textarea
                  value={notaPersonalizacion}
                  onChange={(e) => setNotaPersonalizacion(e.target.value)}
                  placeholder="Ej: Sin cebolla, con extra mayonesa..."
                  className="w-full border border-slate-200 dark:border-slate-805 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-chefsy-500 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 placeholder:text-gray-400 resize-none"
                  rows={2}
                />
              </div>

              {productoAPersonalizar.modificadoresIds && productoAPersonalizar.modificadoresIds.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-550 dark:text-slate-350 uppercase tracking-wider">Modificadores Disponibles</h4>
                  
                  <div className="space-y-1.5">
                  {productoAPersonalizar.modificadoresIds?.map(modId => {
                    const modObj = modificadores.find(m => m.id === modId)
                    if (!modObj) return null

                    const seleccionado = modsSeleccionados.some(m => m.id === modId)

                    return (
                      <button
                        key={modId}
                        onClick={() => alternarModificador(modObj)}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                          seleccionado
                            ? 'bg-chefsy-50/50 dark:bg-chefsy-950/20 text-chefsy-655 dark:text-chefsy-400 border-chefsy-500 shadow-sm'
                            : 'border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 text-slate-655 dark:text-slate-350 hover:bg-slate-50'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[8px] text-white ${
                            seleccionado ? 'bg-chefsy-500 border-transparent' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                          }`}>
                            {seleccionado && '✓'}
                          </span>
                          {modObj.nombre}
                        </span>
                        <span className="text-slate-455 dark:text-slate-500">
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
            <div className="p-5 border-t border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-between gap-4">
              <div className="flex items-center border border-slate-250 dark:border-slate-850 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shrink-0">
                <button
                  onClick={() => setCantidadModal(prev => Math.max(1, prev - 1))}
                  className="px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors text-slate-550 focus:outline-none"
                >
                  <Minus size={12} />
                </button>
                <span className="px-3 text-xs font-black text-slate-855 dark:text-slate-200">
                  {cantidadModal}
                </span>
                <button
                  onClick={() => setCantidadModal(prev => prev + 1)}
                  className="px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors text-slate-555 focus:outline-none"
                >
                  <Plus size={12} />
                </button>
              </div>

              <button
                onClick={agregarAlCarritoDesdeModal}
                className="flex-1 bg-chefsy-500 hover:bg-chefsy-600 text-white font-extrabold py-3 px-4 rounded-xl text-xs shadow-md transition-all active:scale-98 cursor-pointer text-center"
              >
                Agregar {formatearPrecio(calcularPrecioUnitarioModal() * cantidadModal)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

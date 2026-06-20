'use client'

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { usarCatalogo } from '@/contexto/CatalogoContexto'
import { usarAuth } from '@/contexto/AuthContexto'
import { obtenerFechaNegocio } from '@/lib/tiempo'
import { ProductoCatalogo, ModificadorCatalogo } from '@/tipos/catalogo'
import { Pedido } from '@/tipos'
import { ItemCarrito } from '@/tipos/tienda'
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart, Lock, HardHat } from 'lucide-react'
import { formatearPrecio } from '@/lib/utils'
import { insertarPedidoLocal } from '@/servicios/supabase/pedidos'
import { OBTENER_DETALLES_COMPLEMENTARIOS } from '@/lib/tienda-helpers'

// Componentes de carga inmediata (siempre visibles al entrar)
import HeroSection from '@/components/tienda/HeroSection'
import CatalogoProductos from '@/components/tienda/CatalogoProductos'

// Componentes lazy: solo se descargan cuando el usuario los necesita
const CartDrawer = lazy(() => import('@/components/tienda/CartDrawer'))
const ModalPersonalizacion = lazy(() => import('@/components/tienda/ModalPersonalizacion'))
const PantallaExito = lazy(() => import('@/components/tienda/PantallaExito'))

export default function PaginaTienda() {
  const { 
    productos, 
    categorias, 
    modificadores,
  } = usarCatalogo()

  const { usuarioActivo, estaListoAuth } = usarAuth()

  // ── Estados de la tienda ──────────────────────────────────────────────
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [hasInteractedSelect, setHasInteractedSelect] = useState(false)
  const [selectorAbierto, setSelectorAbierto] = useState(false)
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [cartAbierto, setCartAbierto] = useState(false)
  const [metadata, setMetadata] = useState<Record<string, any>>({})
  
  // Palabras animadas para el hero
  const animatedWords = ["LOMOS", "MILAS", "ZAPPING", "BURGERS", "PIZZAS", "PATYS"]
  const [animatedWordIndex, setAnimatedWordIndex] = useState(0)

  useEffect(() => {
    const tick = () => setAnimatedWordIndex(prev => (prev + 1) % animatedWords.length)
    let interval = setInterval(tick, 1500)
    const handleVisibility = () => {
      clearInterval(interval)
      if (!document.hidden) interval = setInterval(tick, 1500)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  // Cargar metadatos públicos de la tienda
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        // Ruta pública — no requiere sesión de administrador
        const res = await fetch('/api/tienda-metadata?t=' + Date.now(), {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        })
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

    const onFocus = () => {
      if (!document.hidden) fetchMeta()
    }
    document.addEventListener('visibilitychange', onFocus)
    window.addEventListener('focus', onFocus)

    return () => {
      document.removeEventListener('visibilitychange', onFocus)
      window.removeEventListener('focus', onFocus)
    }
  }, [])
  
  // ── Estado del modal de personalización ──────────────────────────────
  const [productoAPersonalizar, setProductoAPersonalizar] = useState<ProductoCatalogo | null>(null)
  const [modsSeleccionados, setModsSeleccionados] = useState<ModificadorCatalogo[]>([])
  const [cantidadModal, setCantidadModal] = useState(1)
  const [notaPersonalizacion, setNotaPersonalizacion] = useState('')

  // ── Estado del flujo de checkout ──────────────────────────────────────
  const [mostrarCheckout, setMostrarCheckout] = useState(false)
  const [nombreCliente, setNombreCliente] = useState('')
  const [telefonoCliente, setTelefonoCliente] = useState('')
  const [tipoEntrega, setTipoEntrega] = useState<'delivery' | 'retiro'>('delivery')
  const [direccionCliente, setDireccionCliente] = useState('')
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia' | 'sin_especificar'>('efectivo')
  const [observaciones, setObservaciones] = useState('')
  
  // ── Estado de pedido finalizado ───────────────────────────────────────
  const [pedidoCompletado, setPedidoCompletado] = useState<Pedido | null>(null)

  const idPatys = useMemo(() => categorias.find(c => c.nombre.toLowerCase().includes('patys') || c.id === 'patys')?.id || 'patys', [categorias])
  const idBurgers = useMemo(() => categorias.find(c => c.nombre.toLowerCase().includes('burger') || c.id === 'burgers')?.id || 'burgers', [categorias])

  const categoriasActivas = useMemo(() => {
    return categorias
      .filter(c => c.activa && c.id !== idPatys)
      .map(c => c.id === idBurgers ? { ...c, nombre: 'Burgers / Patys' } : c)
  }, [categorias, idPatys, idBurgers])

  const productosFiltrados = useMemo(() => productos.filter(p => {
    const hayBusqueda = busqueda.trim() !== ''
    if (!categoriaSeleccionada && !hayBusqueda) return false

    const matchBusqueda = !hayBusqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const catFiltro = (hayBusqueda && !categoriaSeleccionada) ? 'todos' : (categoriaSeleccionada || 'todos')
    
    const perteneceACategoria = catFiltro === 'todos' || p.categoriaId === catFiltro || (catFiltro === idBurgers && p.categoriaId === idPatys)
    const esPromoValida = catFiltro === 'promos' ? (p.categoriaId === 'promos' || p.esCombo) : true
    
    return p.activo && (catFiltro === 'promos' ? esPromoValida : perteneceACategoria) && matchBusqueda
  }), [productos, categoriaSeleccionada, busqueda, idBurgers, idPatys])

  // ── Callbacks ──────────────────────────────────────────────────────────
  const abrirModalPersonalizacion = useCallback((prod: ProductoCatalogo) => {
    setProductoAPersonalizar(prod)
    setModsSeleccionados([])
    setCantidadModal(1)
    setNotaPersonalizacion('')
  }, [])

  const alternarModificador = useCallback((mod: ModificadorCatalogo) => {
    setModsSeleccionados(prev => 
      prev.some(m => m.id === mod.id)
        ? prev.filter(m => m.id !== mod.id)
        : [...prev, mod]
    )
  }, [])

  const calcularPrecioUnitarioModal = useCallback((): number => {
    if (!productoAPersonalizar) return 0
    const extra = modsSeleccionados.reduce((acc, curr) => acc + curr.precioExtra, 0)
    return productoAPersonalizar.precio + extra
  }, [productoAPersonalizar, modsSeleccionados])

  const agregarAlCarritoDesdeModal = useCallback(() => {
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
  }, [productoAPersonalizar, cantidadModal, modsSeleccionados, notaPersonalizacion, calcularPrecioUnitarioModal])

  const actualizarCantidadCarrito = useCallback((idCart: string, delta: number) => {
    setCarrito(prev => 
      prev.map(item => {
        if (item.idCart === idCart) {
          const nuevaCantidad = item.cantidad + delta
          return nuevaCantidad > 0 ? { ...item, cantidad: nuevaCantidad } : item
        }
        return item
      }).filter(item => item.cantidad > 0)
    )
  }, [])

  const eliminarDelCarrito = useCallback((idCart: string) => {
    setCarrito(prev => prev.filter(item => item.idCart !== idCart))
  }, [])

  // ── Totales ───────────────────────────────────────────────────────────
  const costoEnvio = 350
  const totalProductosCarrito = carrito.reduce((acc, curr) => acc + curr.cantidad, 0)
  const subtotalCarrito = carrito.reduce((acc, curr) => acc + (curr.precioUnitario * curr.cantidad), 0)
  const totalCarrito = subtotalCarrito + (tipoEntrega === 'delivery' ? costoEnvio : 0)

  // ── Checkout ──────────────────────────────────────────────────────────
  useEffect(() => {
    // Autocompletar datos guardados
    const n = localStorage.getItem('chefsy_nombre')
    const t = localStorage.getItem('chefsy_telefono')
    const d = localStorage.getItem('chefsy_direccion')
    if (n) setNombreCliente(n)
    if (t) setTelefonoCliente(t)
    if (d) setDireccionCliente(d)
  }, [])

  const procesarCompra = useCallback(async () => {
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

    try {
      await insertarPedidoLocal({ ...nuevoPedido, archivado: false })
    } catch (err) {
      console.error('Error enviando pedido', err)
      alert('Hubo un error al procesar tu pedido. Por favor intentá de nuevo o contactanos por WhatsApp.')
      return
    }

    // Guardar para próxima compra
    localStorage.setItem('chefsy_nombre', nombreCliente.trim())
    localStorage.setItem('chefsy_telefono', telefonoCliente.trim())
    if (tipoEntrega === 'delivery') {
      localStorage.setItem('chefsy_direccion', direccionCliente.trim())
    }

    setPedidoCompletado(nuevoPedido)
    setCarrito([])
    setMostrarCheckout(false)
    setCartAbierto(false)
  }, [nombreCliente, telefonoCliente, tipoEntrega, direccionCliente, carrito, totalCarrito, costoEnvio, metodoPago, observaciones])

  const generarEnlaceWhatsApp = useCallback((pedido: Pedido): string => {
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
  }, [])

  // ── Handlers del selector de categoría ───────────────────────────────
  const handleToggleSelector = useCallback(() => setSelectorAbierto(prev => !prev), [])
  const handleSeleccionarCategoria = useCallback((id: string | null) => {
    setHasInteractedSelect(true)
    setCategoriaSeleccionada(id)
  }, [])

  // ── Guards de auth ────────────────────────────────────────────────────
  if (!estaListoAuth) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center font-sans">
        <div className="w-8 h-8 border-4 border-chefsy border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }



  // ── Vista de éxito (lazy) ─────────────────────────────────────────────
  if (pedidoCompletado) {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-chefsy border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <PantallaExito
          pedido={pedidoCompletado}
          generarEnlaceWhatsApp={generarEnlaceWhatsApp}
          onNuevoPedido={() => setPedidoCompletado(null)}
        />
      </Suspense>
    )
  }

  // ── Vista principal ───────────────────────────────────────────────────
  return (
    <div className="text-slate-200 font-sans pb-16" style={{ backgroundColor: '#0d0d0d' }}>
      <style dangerouslySetInnerHTML={{ __html: `html, body { background-color: #0d0d0d !important; overscroll-behavior-y: none; }` }} />

      {/* Capa de oscurecimiento sutil en toda la página */}
      <div className="fixed inset-0 bg-black/50 pointer-events-none z-0" />
      
      <div className="relative z-10">

        {/* ── HERO (carga inmediata) ── */}
        <HeroSection
          categoriasActivas={categoriasActivas}
          categoriaSeleccionada={categoriaSeleccionada}
          busqueda={busqueda}
          selectorAbierto={selectorAbierto}
          animatedWordIndex={animatedWordIndex}
          animatedWords={animatedWords}
          onBusquedaChange={setBusqueda}
          onToggleSelector={handleToggleSelector}
          onSeleccionarCategoria={handleSeleccionarCategoria}
        />

        {/* ── CATÁLOGO (carga inmediata) ── */}
        <CatalogoProductos
          categoriasActivas={categoriasActivas}
          productosFiltrados={productosFiltrados}
          categoriaSeleccionada={categoriaSeleccionada}
          busqueda={busqueda}
          metadata={metadata}
          onAbrirModal={abrirModalPersonalizacion}
        />

        {/* ── BOTÓN FLOTANTE DEL CARRITO ── */}
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

        {/* ── CART DRAWER (lazy — se descarga solo cuando se abre el carrito) ── */}
        {cartAbierto && (
          <Suspense fallback={null}>
            <CartDrawer
              carrito={carrito}
              cartAbierto={cartAbierto}
              mostrarCheckout={mostrarCheckout}
              tipoEntrega={tipoEntrega}
              nombreCliente={nombreCliente}
              telefonoCliente={telefonoCliente}
              direccionCliente={direccionCliente}
              metodoPago={metodoPago}
              observaciones={observaciones}
              subtotalCarrito={subtotalCarrito}
              totalCarrito={totalCarrito}
              totalProductosCarrito={totalProductosCarrito}
              costoEnvio={costoEnvio}
              onCerrar={() => setCartAbierto(false)}
              onActualizarCantidad={actualizarCantidadCarrito}
              onEliminar={eliminarDelCarrito}
              onSetMostrarCheckout={setMostrarCheckout}
              onSetTipoEntrega={setTipoEntrega}
              onSetNombreCliente={setNombreCliente}
              onSetTelefonoCliente={setTelefonoCliente}
              onSetDireccionCliente={setDireccionCliente}
              onSetMetodoPago={setMetodoPago}
              onSetObservaciones={setObservaciones}
              onProcesarCompra={procesarCompra}
            />
          </Suspense>
        )}

        {/* ── MODAL PERSONALIZACIÓN (lazy — se descarga solo al tocar un producto) ── */}
        {productoAPersonalizar && (
          <Suspense fallback={null}>
            <ModalPersonalizacion
              producto={productoAPersonalizar}
              imagenFinal={(() => {
                const url = metadata[productoAPersonalizar.id]?.imagen_url
                const fallback = OBTENER_DETALLES_COMPLEMENTARIOS(productoAPersonalizar.categoriaId, productoAPersonalizar.nombre).img
                // No mostrar base64 crudo: falla en Chrome moderno (S24, etc.)
                if (!url || url.startsWith('data:')) return fallback
                return url
              })()}
              modificadoresDisponibles={
                (productoAPersonalizar.modificadoresIds ?? [])
                  .map(id => modificadores.find(m => m.id === id))
                  .filter(Boolean) as ModificadorCatalogo[]
              }
              modsSeleccionados={modsSeleccionados}
              cantidadModal={cantidadModal}
              notaPersonalizacion={notaPersonalizacion}
              precioUnitarioTotal={calcularPrecioUnitarioModal()}
              onCerrar={() => setProductoAPersonalizar(null)}
              onAlternarModificador={alternarModificador}
              onSetCantidad={setCantidadModal}
              onSetNota={setNotaPersonalizacion}
              onAgregar={agregarAlCarritoDesdeModal}
            />
          </Suspense>
        )}

      </div>
    </div>
  )
}

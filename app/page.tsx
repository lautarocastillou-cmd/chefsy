'use client'

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { usarCatalogo } from '@/contexto/CatalogoContexto'
import { usarAuth } from '@/contexto/AuthContexto'
import { usarConfiguracionTienda } from '@/contexto/ConfiguracionTiendaContexto'
import { ProveedorCarrito, usarCarrito } from '@/contexto/CarritoContexto'
import { ProductoCatalogo, ModificadorCatalogo } from '@/tipos/catalogo'
import { Pedido } from '@/tipos'
import { ShoppingCart } from 'lucide-react'
import { formatearPrecio } from '@/lib/utils'
import { OBTENER_DETALLES_COMPLEMENTARIOS } from '@/lib/tienda-helpers'

// Componentes de carga inmediata (siempre visibles al entrar)
import HeroSection from '@/components/tienda/HeroSection'
import CatalogoProductos from '@/components/tienda/CatalogoProductos'

// Componentes lazy: solo se descargan cuando el usuario los necesita
const CartDrawer = lazy(() => import('@/components/tienda/CartDrawer'))
const ModalPersonalizacion = lazy(() => import('@/components/tienda/ModalPersonalizacion'))
const PantallaExito = lazy(() => import('@/components/tienda/PantallaExito'))

function ContenidoTienda() {
  const { productos, categorias, modificadores } = usarCatalogo()
  const { estaListoAuth } = usarAuth()

  // ── Estados de la tienda ──────────────────────────────────────────────
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [hasInteractedSelect, setHasInteractedSelect] = useState(false)
  const [selectorAbierto, setSelectorAbierto] = useState(false)
  const [metadata, setMetadata] = useState<Record<string, any>>({})
  
  const { configuracion } = usarConfiguracionTienda()
  const animatedWords = configuracion?.palabras_animadas || ["LOMOS", "MILAS", "ZAPPING", "BURGERS", "PIZZAS", "PATYS"]
  const [animatedWordIndex, setAnimatedWordIndex] = useState(0)

  const {
    cartAbierto,
    setCartAbierto,
    productoAPersonalizar,
    modsSeleccionados,
    cantidadModal,
    notaPersonalizacion,
    setProductoAPersonalizar,
    setCantidadModal,
    setNotaPersonalizacion,
    abrirModalPersonalizacion,
    alternarModificador,
    calcularPrecioUnitarioModal,
    agregarAlCarritoDesdeModal,
    totalProductosCarrito,
    subtotalCarrito,
    pedidoCompletado,
    setPedidoCompletado
  } = usarCarrito()

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
  }, [animatedWords.length])

  // Cargar metadatos públicos de la tienda
  useEffect(() => {
    let ultimaLlamada = 0

    const fetchMeta = async (esFocus = false) => {
      const ahora = Date.now()
      // Cooldown de 30s solo si proviene de eventos focus/visibility (para no agotar servidor)
      if (esFocus && ahora - ultimaLlamada < 30000) return
      ultimaLlamada = ahora

      try {
        const res = await fetch('/api/tienda-metadata?t=' + ahora, {
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
      if (!document.hidden) fetchMeta(true)
    }
    document.addEventListener('visibilitychange', onFocus)
    window.addEventListener('focus', onFocus)

    return () => {
      document.removeEventListener('visibilitychange', onFocus)
      window.removeEventListener('focus', onFocus)
    }
  }, [])
  
  const categoriasActivas = useMemo(() => {
    return categorias.filter(c => c.activa).sort((a, b) => {
      const isABurger = a.nombre.toLowerCase().includes('burger')
      const isBBurger = b.nombre.toLowerCase().includes('burger')
      const isAPatys = a.nombre.toLowerCase().trim() === 'patys'
      const isBPatys = b.nombre.toLowerCase().trim() === 'patys'
      
      if (isABurger && isBPatys) return -1
      if (isAPatys && isBBurger) return 1
      
      return a.orden - b.orden
    })
  }, [categorias])

  const productosFiltrados = useMemo(() => {
    const idPatys = categorias.find(c => c.nombre.toLowerCase().trim() === 'patys')?.id
    const idBurgers = categorias.find(c => c.nombre.toLowerCase().includes('burger'))?.id
    
    return productos.filter(p => {
      const hayBusqueda = busqueda.trim() !== ''
      if (!categoriaSeleccionada && !hayBusqueda) return false

      const matchBusqueda = !hayBusqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase())
      const catFiltro = (hayBusqueda && !categoriaSeleccionada) ? 'todos' : (categoriaSeleccionada || 'todos')
      
      const esFiltroCombinado = catFiltro === idPatys || catFiltro === idBurgers
      const perteneceACategoria = catFiltro === 'todos' || p.categoriaId === catFiltro || (esFiltroCombinado && (p.categoriaId === idPatys || p.categoriaId === idBurgers))
      const esPromoValida = catFiltro === 'promos' ? (p.categoriaId === 'promos' || p.esCombo) : true
      
      return p.activo && (catFiltro === 'promos' ? esPromoValida : perteneceACategoria) && matchBusqueda
    })
  }, [productos, categoriaSeleccionada, busqueda, categorias])

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

  const handleToggleSelector = useCallback(() => setSelectorAbierto(prev => !prev), [])
  const handleSeleccionarCategoria = useCallback((id: string | null) => {
    setHasInteractedSelect(true)
    setCategoriaSeleccionada(id)
  }, [])

  if (!estaListoAuth) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center font-sans">
        <div className="w-8 h-8 border-4 border-chefsy border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

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

  const fuenteClase = {
    bebas: 'font-bebas',
    montserrat: 'font-montserrat',
    inter: 'font-inter',
    anton: 'font-anton'
  }[configuracion?.fuente_principal || 'bebas'] || 'font-bebas'

  return (
    <div className={`bg-tienda-premium text-slate-200 ${fuenteClase} pb-16`}>
      {configuracion?.banner_promocional && configuracion.banner_promocional.trim() !== '' && (
        <div 
          className="text-black text-sm font-bold uppercase tracking-wider sticky top-0 z-50 shadow-md overflow-hidden flex whitespace-nowrap"
          style={{ backgroundColor: configuracion.banner_color || 'var(--color-chefsy-400)' }}
        >
          {configuracion.banner_animado ? (
            <div className="flex animate-marquee py-2">
              <span className="mx-4">{configuracion.banner_promocional}</span>
              <span className="mx-4">{configuracion.banner_promocional}</span>
              <span className="mx-4">{configuracion.banner_promocional}</span>
              <span className="mx-4">{configuracion.banner_promocional}</span>
              <span className="mx-4">{configuracion.banner_promocional}</span>
              <span className="mx-4">{configuracion.banner_promocional}</span>
              <span className="mx-4">{configuracion.banner_promocional}</span>
              <span className="mx-4">{configuracion.banner_promocional}</span>
            </div>
          ) : (
            <div className="w-full text-center py-2 px-4">
              {configuracion.banner_promocional}
            </div>
          )}
        </div>
      )}
      <div className="fixed inset-0 bg-black/50 pointer-events-none z-0" />
      <div className="relative z-10">
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
        <CatalogoProductos
          categoriasActivas={categoriasActivas}
          productosFiltrados={productosFiltrados}
          categoriaSeleccionada={categoriaSeleccionada}
          busqueda={busqueda}
          metadata={metadata}
          onAbrirModal={abrirModalPersonalizacion}
        />
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
        {cartAbierto && (
          <Suspense fallback={null}>
            <CartDrawer />
          </Suspense>
        )}
        {productoAPersonalizar && (
          <Suspense fallback={null}>
            <ModalPersonalizacion
              producto={productoAPersonalizar}
              imagenFinal={(() => {
                const url = metadata[productoAPersonalizar.id]?.imagen_url
                const fallback = OBTENER_DETALLES_COMPLEMENTARIOS(productoAPersonalizar.categoriaId, productoAPersonalizar.nombre).img
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

export default function PaginaTienda() {
  return (
    <ProveedorCarrito>
      <ContenidoTienda />
    </ProveedorCarrito>
  )
}

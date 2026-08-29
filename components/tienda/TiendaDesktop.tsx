'use client'

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { usarCatalogo } from '@/contexto/CatalogoContexto'
import { usarAuth } from '@/contexto/AuthContexto'
import { usarConfiguracionTienda } from '@/contexto/ConfiguracionTiendaContexto'
import { usarCarrito } from '@/contexto/CarritoContexto'
import { ModificadorCatalogo, MetaProducto } from '@/tipos/catalogo'
import { Pedido } from '@/tipos'
import { ShoppingCart, Instagram } from 'lucide-react'
import { formatearPrecio } from '@/lib/utils'
import { OBTENER_DETALLES_COMPLEMENTARIOS } from '@/lib/tienda-helpers'
import { metadataRespaldo } from '@/datos/productos'
import Fuse from 'fuse.js'
import { useSugerenciaBusqueda } from '@/hooks/useBuscadorInteligente'
import Link from 'next/link'

// Componentes de carga inmediata
import HeroSection from '@/components/tienda/HeroSection'
import CatalogoProductos from '@/components/tienda/CatalogoProductos'
import FooterTienda from '@/components/tienda/FooterTienda'
import BotonPedidoFlotante from '@/components/tienda/BotonPedidoFlotante'

import dynamic from 'next/dynamic'

// Componentes dynamic (code splitting)
const CartDrawer = dynamic(() => import('@/components/tienda/CartDrawer'), { ssr: false })
const ModalPersonalizacion = dynamic(() => import('@/components/tienda/ModalPersonalizacion'), { ssr: false })
const PantallaExito = dynamic(() => import('@/components/tienda/PantallaExito'), { ssr: false })

export default function TiendaDesktop() {
  const { productos, categorias, modificadores } = usarCatalogo()
  const { estaListoAuth } = usarAuth()

  // ── Estados de la tienda ──────────────────────────────────────────────
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [selectorAbierto, setSelectorAbierto] = useState(false)
  const [metadata, setMetadata] = useState<Record<string, MetaProducto>>(metadataRespaldo as Record<string, MetaProducto>)
  
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
          const m: Record<string, MetaProducto> = {}
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

  const sugerenciaBusqueda = useSugerenciaBusqueda(busqueda)

  const productosFiltrados = useMemo(() => {
    const idPatys = categorias.find(c => c.nombre.toLowerCase().trim() === 'patys')?.id
    const idBurgers = categorias.find(c => c.nombre.toLowerCase().includes('burger'))?.id
    
    const hayBusqueda = busqueda.trim() !== ''

    // 1. Filtrar por categoría y estado activo
    const productosPorCategoria = productos.filter(p => {
      if (!p.activo) return false
      if (!categoriaSeleccionada && !hayBusqueda) return false

      const catFiltro = (hayBusqueda && !categoriaSeleccionada) ? 'todos' : (categoriaSeleccionada || 'todos')
      
      const esFiltroCombinado = catFiltro === idPatys || catFiltro === idBurgers
      const perteneceACategoria = catFiltro === 'todos' || p.categoriaId === catFiltro || (esFiltroCombinado && (p.categoriaId === idPatys || p.categoriaId === idBurgers))
      const esPromoValida = catFiltro === 'promos' ? (p.categoriaId === 'promos' || p.esCombo) : true
      
      return catFiltro === 'promos' ? esPromoValida : perteneceACategoria
    })

    // 2. Si hay búsqueda, aplicar Fuse.js para tolerancia a errores tipográficos
    if (!hayBusqueda) return productosPorCategoria

    const fuse = new Fuse(productosPorCategoria, {
      keys: ['nombre', 'descripcion', 'categoriaId'],
      threshold: 0.4, // Tolerancia a errores de tipeo
      ignoreLocation: true
    })

    return fuse.search(busqueda).map(res => res.item)
  }, [productos, categoriaSeleccionada, busqueda, categorias])

  const generarEnlaceWhatsApp = useCallback((pedido: Pedido): string => {
    let rawTel = (configuracion as any)?.telefono_negocio || process.env.NEXT_PUBLIC_WHATSAPP_NEGOCIO || '5493834225445'
    let telLimpio = rawTel.toString().replace(/\D/g, '')
    if (!telLimpio || telLimpio === '5493834554453' || telLimpio === '3834554453') {
      telLimpio = '5493834225445'
    }
    
    let mensaje = configuracion?.whatsapp_mensaje 
      ? `${configuracion.whatsapp_mensaje}\n\n` 
      : `¡Hola Chefsy! Hice un pedido :)\n\n`
    
    mensaje += `Nombre: ${pedido.cliente}\n`
    mensaje += `Teléfono: ${pedido.telefono}\n`
    mensaje += `Entrega: ${pedido.tipoEntrega === 'delivery' ? (pedido.direccion || 'Delivery') : 'Retiro por local'}\n`
    mensaje += `Método de pago: ${pedido.metodoPago?.toUpperCase() || 'NO ESPECIFICADO'}\n`
    if (pedido.observaciones) {
      mensaje += `Notas: ${pedido.observaciones}\n`
    }
    
    mensaje += `\n--------------------------------\n\n`
    mensaje += `Detalle del pedido: \n`
    
    pedido.productos.forEach(p => {
      mensaje += `• ${p.cantidad}x ${p.nombre} - ${formatearPrecio(p.precio * p.cantidad)}\n`
    })

    if (pedido.tipoEntrega === 'delivery') {
      const costo = pedido.costoEnvio || 0
      if (costo === 0) {
        mensaje += `• Costo de envío - envío gratis!\n`
      } else {
        mensaje += `• Costo de envío - ${formatearPrecio(costo)}\n`
      }
    }
    
    const subtotal = pedido.total - (pedido.costoEnvio || 0)
    mensaje += `\nSubtotal: ${formatearPrecio(subtotal)}\n`
    mensaje += `Total: ${formatearPrecio(pedido.total)}\n`
    
    mensaje += `\n--------------------------------\n\n`
    mensaje += `• Datos de pago\n`
    mensaje += `• Alias: chefsy\n`
    mensaje += `• Titular: Hector Alejandro Obregón\n`
    mensaje += `• Banco: Mercado Pago`

    return `https://wa.me/${telLimpio}?text=${encodeURIComponent(mensaje)}`
  }, [configuracion])

  const handleToggleSelector = useCallback(() => setSelectorAbierto(prev => !prev), [])
  const handleSeleccionarCategoria = useCallback((id: string | null) => {
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

  const estiloBordes = configuracion?.estilo_bordes || 'suaves'
  const borderRadiusVars = 
    estiloBordes === 'cuadrados' ? {
      '--radius-lg': '0px',
      '--radius-xl': '0px',
      '--radius-2xl': '0px',
      '--radius-3xl': '0px',
    } : estiloBordes === 'pildora' ? {
      '--radius-lg': '9999px',
      '--radius-xl': '9999px',
      '--radius-2xl': '9999px',
      '--radius-3xl': '9999px',
    } : {
      '--radius-lg': '0.5rem',
      '--radius-xl': '0.75rem',
      '--radius-2xl': '1rem',
      '--radius-3xl': '1.5rem',
    }

  const isVideoBg = configuracion?.textura_fondo_url?.match(/\.(mp4|webm)(\?.*)?$/i)
  const bgImage = (!isVideoBg && configuracion?.textura_fondo_url) ? `url(${configuracion.textura_fondo_url})` : undefined

  return (
    <div 
      className={`bg-tienda-premium text-slate-200 ${fuenteClase} pb-32 min-h-screen relative`}
      style={{ 
        ...borderRadiusVars as React.CSSProperties
      }}
    >
      {/* CAPA DE FONDO FIJA (Optimización de rendimiento) */}
      {(isVideoBg || bgImage) && (
        <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
          {isVideoBg ? (
            <video 
              key={configuracion!.textura_fondo_url!}
              autoPlay 
              loop 
              muted 
              playsInline 
              className="w-full h-full object-cover opacity-100"
            >
              <source src={configuracion!.textura_fondo_url!} type={`video/${configuracion!.textura_fondo_url!.split('.').pop()?.split('?')[0]}`} />
            </video>
          ) : (
            <div 
              className="w-full h-full bg-cover bg-center"
              style={{ backgroundImage: bgImage }}
            />
          )}
        </div>
      )}
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
      <div className="relative z-10">
        <HeroSection
          categoriasActivas={categoriasActivas}
          categoriaSeleccionada={categoriaSeleccionada}
          busqueda={busqueda}
          sugerenciaBusqueda={sugerenciaBusqueda}
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

        <FooterTienda />

        {totalProductosCarrito > 0 && !cartAbierto && (
          <div className="fixed bottom-8 right-8 z-[9999] animate-in slide-in-from-bottom-10 fade-in duration-300">
            <button
              onClick={() => setCartAbierto(true)}
              className="bg-chefsy hover:bg-chefsy-600 text-white font-extrabold py-3 md:py-4 px-6 md:px-8 rounded-full flex items-center shadow-[0_10px_40px_rgba(54,101,74,0.5)] active:scale-95 transition-all cursor-pointer border border-chefsy-400/30 gap-3 md:gap-4 group"
            >
              <div className="relative flex items-center">
                <ShoppingCart size={24} className="text-white group-hover:scale-110 transition-transform" />
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold border-2 border-chefsy-600 shadow-sm">
                  {totalProductosCarrito}
                </span>
              </div>
              <span className="text-sm md:text-lg font-black bg-black/20 px-3 py-1 rounded-full">{formatearPrecio(subtotalCarrito)}</span>
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
                const fallback = OBTENER_DETALLES_COMPLEMENTARIOS(productoAPersonalizar.categoriaId, productoAPersonalizar.nombre, productoAPersonalizar.id).img
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
        <BotonPedidoFlotante />
      </div>
    </div>
  )
}

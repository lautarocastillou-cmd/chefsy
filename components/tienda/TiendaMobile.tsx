'use client'

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense, useRef } from 'react'
import { usarCatalogo } from '@/contexto/CatalogoContexto'
import { usarAuth } from '@/contexto/AuthContexto'
import { usarConfiguracionTienda } from '@/contexto/ConfiguracionTiendaContexto'
import { usarCarrito } from '@/contexto/CarritoContexto'
import { ModificadorCatalogo } from '@/tipos/catalogo'
import { Pedido } from '@/tipos'
import { Search, ChevronRight } from 'lucide-react'
import { formatearPrecio, cn } from '@/lib/utils'
import { OBTENER_DETALLES_COMPLEMENTARIOS } from '@/lib/tienda-helpers'
import Image from 'next/image'

import BottomNav from '@/components/ui/BottomNav'
import CatalogoProductos from '@/components/tienda/CatalogoProductos'

const CartDrawer = lazy(() => import('@/components/tienda/CartDrawer'))
const ModalPersonalizacion = lazy(() => import('@/components/tienda/ModalPersonalizacion'))
const PantallaExito = lazy(() => import('@/components/tienda/PantallaExito'))

export default function TiendaMobile() {
  const { productos, categorias, modificadores } = usarCatalogo()
  const { estaListoAuth } = usarAuth()

  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'profile' | 'cart'>('home')
  const [metadata, setMetadata] = useState<Record<string, any>>({})
  
  const { configuracion } = usarConfiguracionTienda()
  
  const searchInputRef = useRef<HTMLInputElement>(null)

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
    pedidoCompletado,
    setPedidoCompletado
  } = usarCarrito()

  // Cargar metadatos
  useEffect(() => {
    let ultimaLlamada = 0
    const fetchMeta = async (esFocus = false) => {
      const ahora = Date.now()
      if (esFocus && ahora - ultimaLlamada < 30000) return
      ultimaLlamada = ahora
      try {
        const res = await fetch('/api/tienda-metadata?t=' + ahora)
        const data = await res.json()
        if (Array.isArray(data)) {
          const m: Record<string, any> = {}
          data.forEach(d => m[d.producto_id] = d)
          setMetadata(m)
        }
      } catch (err) {}
    }
    fetchMeta()
  }, [])
  
  const categoriasActivas = useMemo(() => {
    return categorias.filter(c => c.activa).sort((a, b) => a.orden - b.orden)
  }, [categorias])

  const productosFiltrados = useMemo(() => {
    return productos.filter(p => {
      const hayBusqueda = busqueda.trim() !== ''
      if (!categoriaSeleccionada && !hayBusqueda) return false

      const matchBusqueda = !hayBusqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase())
      const catFiltro = (hayBusqueda && !categoriaSeleccionada) ? 'todos' : (categoriaSeleccionada || 'todos')
      
      const perteneceACategoria = catFiltro === 'todos' || p.categoriaId === catFiltro
      const esPromoValida = catFiltro === 'promos' ? (p.categoriaId === 'promos' || p.esCombo) : true
      
      return p.activo && (catFiltro === 'promos' ? esPromoValida : perteneceACategoria) && matchBusqueda
    })
  }, [productos, categoriaSeleccionada, busqueda])

  const generarEnlaceWhatsApp = useCallback((pedido: Pedido): string => {
    const telefono = process.env.NEXT_PUBLIC_WHATSAPP_NEGOCIO || ''
    let mensaje = configuracion?.whatsapp_mensaje || `*¡Hola Chefsy!* Hice un pedido online: \n\n`
    mensaje += `*Orden:* #${pedido.id}\n*Total:* ${formatearPrecio(pedido.total)}\n`
    return `https://api.whatsapp.com/send?phone=${telefono}&text=${encodeURIComponent(mensaje)}`
  }, [configuracion?.whatsapp_mensaje])

  const handleNavClick = (tab: 'home' | 'search' | 'profile' | 'cart') => {
    if (tab === 'cart') {
      setCartAbierto(true)
    } else if (tab === 'search') {
      setActiveTab('home') // Mantenemos en home pero enfocamos el buscador
      setTimeout(() => {
        searchInputRef.current?.focus()
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }, 100)
    } else if (tab === 'profile') {
      window.location.href = '/login' // O donde sea tu perfil
    } else {
      setActiveTab(tab)
      setBusqueda('')
      setCategoriaSeleccionada(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  if (!estaListoAuth) return <div className="min-h-screen bg-[#0B0F19]" />

  if (pedidoCompletado) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
        <PantallaExito
          pedido={pedidoCompletado}
          generarEnlaceWhatsApp={generarEnlaceWhatsApp}
          onNuevoPedido={() => setPedidoCompletado(null)}
        />
      </Suspense>
    )
  }

  const fuenteClase = configuracion?.fuente_principal === 'inter' ? 'font-inter' : 'font-bebas'

  return (
    <div className={`bg-[#0B0F19] text-slate-200 ${fuenteClase} min-h-screen pb-24`}>
      {/* Header App-like minimalista */}
      <div className="bg-[#121827] sticky top-0 z-40 px-4 py-3 shadow-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden relative">
            <Image src={configuracion?.logo_url || "/logo.jpg"} alt="Logo" fill className="object-cover" />
          </div>
          <span className="font-bebas text-xl text-white tracking-wider">CHEFSY</span>
        </div>
        
        {/* Barra de búsqueda integrada */}
        <div className="mt-4 relative">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="¿Qué vas a pedir hoy?"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-[#1A2235] border border-white/10 text-white py-3 pl-10 pr-4 rounded-xl text-sm outline-none focus:border-chefsy-400 transition-colors"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        </div>
      </div>

      {/* Categorías Swipeables horizontales */}
      <div className="mt-2 py-3 px-4 flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
        <button
          onClick={() => setCategoriaSeleccionada(null)}
          className={cn(
            "snap-start shrink-0 px-5 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-colors",
            categoriaSeleccionada === null && !busqueda ? "bg-chefsy-500 text-white" : "bg-[#1A2235] text-slate-400 border border-white/5"
          )}
        >
          Destacados
        </button>
        {categoriasActivas.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategoriaSeleccionada(cat.id)}
            className={cn(
              "snap-start shrink-0 px-5 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-colors flex items-center gap-2",
              categoriaSeleccionada === cat.id ? "bg-chefsy-500 text-white" : "bg-[#1A2235] text-slate-400 border border-white/5"
            )}
          >
            {cat.emoji && <span>{cat.emoji}</span>}
            {cat.nombre}
          </button>
        ))}
      </div>

      {/* Catálogo de Productos (Reutiliza el componente original pero se adaptará porque usa Tailwind) */}
      <div className="px-2 mt-4">
        <CatalogoProductos
          categoriasActivas={categoriasActivas}
          productosFiltrados={productosFiltrados}
          categoriaSeleccionada={categoriaSeleccionada}
          busqueda={busqueda}
          metadata={metadata}
          onAbrirModal={abrirModalPersonalizacion}
        />
      </div>

      <BottomNav activeTab={activeTab} onNavClick={handleNavClick} />

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
              if (!url || url.startsWith('data:')) return OBTENER_DETALLES_COMPLEMENTARIOS(productoAPersonalizar.categoriaId, productoAPersonalizar.nombre).img
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
  )
}

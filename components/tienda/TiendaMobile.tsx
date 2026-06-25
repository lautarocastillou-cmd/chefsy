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
import Fuse from 'fuse.js'
import { useSugerenciaBusqueda } from '@/hooks/useBuscadorInteligente'

import BottomNav from '@/components/ui/BottomNav'
import CatalogoProductos from '@/components/tienda/CatalogoProductos'
import { usarClienteAuth } from '@/contexto/ClienteAuthContexto'
import ModalLoginCliente from '@/components/auth/ModalLoginCliente'

const CartDrawer = lazy(() => import('@/components/tienda/CartDrawer'))
const ModalPersonalizacion = lazy(() => import('@/components/tienda/ModalPersonalizacion'))
const PantallaExito = lazy(() => import('@/components/tienda/PantallaExito'))

export default function TiendaMobile() {
  const { productos, categorias, modificadores } = usarCatalogo()
  const { estaListoAuth } = usarAuth()
  const { usuario, perfil } = usarClienteAuth()

  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'profile' | 'cart'>('home')
  const [metadata, setMetadata] = useState<Record<string, any>>({})
  const [imgError, setImgError] = useState(false)
  const [mostrarLogin, setMostrarLogin] = useState(false)
  
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

  const sugerenciaBusqueda = useSugerenciaBusqueda(busqueda)

  const productosFiltrados = useMemo(() => {
    const hayBusqueda = busqueda.trim() !== ''

    // 1. Filtrar primero por categoría y estado activo
    const productosPorCategoria = productos.filter(p => {
      if (!p.activo) return false
      
      const catFiltro = (hayBusqueda && !categoriaSeleccionada) ? 'todos' : (categoriaSeleccionada || 'todos')
      const perteneceACategoria = catFiltro === 'todos' || p.categoriaId === catFiltro
      const esPromoValida = catFiltro === 'promos' ? (p.categoriaId === 'promos' || p.esCombo) : true
      
      return catFiltro === 'promos' ? esPromoValida : perteneceACategoria
    })

    // 2. Si hay búsqueda, aplicar Fuse.js
    if (!hayBusqueda) return productosPorCategoria

    const fuse = new Fuse(productosPorCategoria, {
      keys: ['nombre', 'descripcion', 'categoriaId'],
      threshold: 0.4,
      ignoreLocation: true
    })

    return fuse.search(busqueda).map(res => res.item)
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
      if (!usuario) {
        setMostrarLogin(true)
      } else {
        setActiveTab('profile')
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
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
    <div className={`bg-[#0c0c0c] text-slate-200 ${fuenteClase} min-h-screen pb-24`}>
      {/* Header App-like minimalista */}
      <div className="bg-[#141414] sticky top-0 z-40 px-4 py-3 shadow-md border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden relative">
              <Image src={configuracion?.logo_url || "/logo.jpg"} alt="Logo" fill className="object-cover" />
            </div>
            <span className="font-bebas text-xl text-white tracking-wider">CHEFSY</span>
          </div>

          {usuario && (
            <div className="bg-white/10 px-3 py-1.5 rounded-full border border-white/20 shadow-sm flex items-center gap-2">
              <span className="text-white text-sm font-medium">Hola, {perfil?.nombre?.split(' ')[0] || 'Cliente'}</span>
              <span className="text-chefsy-400 font-bold text-sm whitespace-nowrap">🪙 {perfil?.puntos_actuales || 0} pts</span>
            </div>
          )}
        </div>
        
        {/* Barra de búsqueda integrada */}
        <div className="mt-4 relative mb-2">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="¿Qué vas a pedir hoy?"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-[#222222] border border-white/10 text-white py-3 pl-10 pr-4 rounded-xl text-sm outline-none focus:border-chefsy-400 transition-colors relative z-20"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-20" size={18} />
          
          {/* Sugerencia: ¿Quisiste decir? */}
          {sugerenciaBusqueda && (
            <div className="absolute -bottom-9 left-1 animate-in fade-in slide-in-from-top-2 duration-300 z-10">
              <button
                onClick={() => setBusqueda(sugerenciaBusqueda)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-chefsy-500/20 border border-chefsy-500/40 rounded-b-xl rounded-tr-xl text-[11px] font-medium text-white shadow-lg active:bg-chefsy-500/40 transition-colors pt-2"
              >
                <span className="text-slate-300">¿Quisiste decir</span>
                <span className="text-chefsy-400 font-bold">{sugerenciaBusqueda}</span>
                <span className="text-slate-300">?</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {activeTab === 'profile' ? (
        <div className="flex flex-col items-center justify-center pt-20 px-4 text-center">
          <div className="w-24 h-24 bg-chefsy/20 rounded-full flex items-center justify-center mb-6">
            <span className="text-4xl text-chefsy-400 font-bebas">
              {perfil?.nombre?.charAt(0)?.toUpperCase() || 'C'}
            </span>
          </div>
          <h2 className="text-3xl font-bebas text-white tracking-wider mb-2">¡Hola, {perfil?.nombre || 'Cliente'}!</h2>
          <p className="text-slate-400 mb-8">Acá podés ver tus puntos acumulados.</p>
          
          <div className="bg-[#141414] border border-white/5 rounded-2xl p-6 w-full max-w-sm shadow-xl flex flex-col items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-chefsy/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
            <span className="text-sm text-slate-400 font-bold tracking-widest uppercase mb-2 relative z-10">Tus Puntos</span>
            <span className="text-5xl font-bebas text-chefsy-400 relative z-10 drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]">{perfil?.puntos_actuales || 0}</span>
          </div>
        </div>
      ) : (
        <>
          {/* Hero Section (Visible solo cuando no hay búsqueda ni categoría seleccionada) */}
          {!categoriaSeleccionada && !busqueda && (
            <div className="relative overflow-hidden bg-gradient-to-b from-[#141414] to-[#0c0c0c] px-4 py-10 border-b border-white/5 shadow-2xl h-[calc(100vh-140px)] flex items-center">
              {/* Círculo de fondo animado */}
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-chefsy/5 blur-[100px] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
              
              <div className="relative z-10 w-full flex flex-col pt-2 pb-20">
                
                <div className="relative w-full max-w-[220px] md:max-w-[250px] aspect-square drop-shadow-2xl mx-auto mb-2 z-30">
                  <Image
                    src={imgError ? "/burger-loca.webp" : (configuracion?.hero_image_url?.split('|')[0] || "/burger-loca.webp")}
                    alt="Hero Image"
                    fill
                    priority
                    onError={() => setImgError(true)}
                    className="object-contain"
                    style={{
                      objectPosition: `${configuracion?.hero_pos_x ?? 50}% ${configuracion?.hero_pos_y ?? 50}%`,
                      transform: `scale(${(configuracion?.hero_escala ?? 100) / 100})`
                    }}
                  />
                </div>

                <div className="text-center w-full z-20 relative mb-6 mt-2">
                  <h1 className="font-bebas text-5xl sm:text-6xl text-white tracking-wide uppercase leading-none drop-shadow-md">
                    {configuracion?.hero_linea_1 || 'POCAS PALABRAS.'}
                  </h1>
                  <h2 className="font-bebas text-5xl sm:text-6xl text-chefsy-400 tracking-wide uppercase leading-none drop-shadow-md mt-1">
                    {configuracion?.hero_linea_2 || 'MUCHO CHEDDAR.'}
                  </h2>
                </div>
                
                <div className="flex w-full items-center justify-between relative">
                  <div className="flex flex-col items-start justify-center pl-4 w-[45%] relative z-20 gap-0">
                    {(configuracion?.titulo_principal || '¿QUÉ PINTA HOY?').split(' ').map((word, idx, arr) => (
                      <span key={idx} className={cn(
                        "font-bebas tracking-wider drop-shadow-xl leading-[0.8] uppercase",
                        idx === arr.length - 1 ? "text-[4.5rem] text-chefsy-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.4)]" : "text-[4.5rem] text-white"
                      )}>
                        {word}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex flex-col items-center justify-center w-[55%] relative pr-2">
                    
                    <div className="relative w-[140px] aspect-square drop-shadow-2xl shrink-0 rotate-12 transition-transform duration-500 z-10">
                      {(() => {
                        const url = configuracion?.hero_image_url?.split('|')[1]?.trim() || "/burger-hero.png";
                        let px = 50, py = 50, scale = 100;
                        try {
                          const p = new URL(url.startsWith('http') ? url : `http://localhost${url}`);
                          px = parseInt(p.searchParams.get('px') || '50');
                          py = parseInt(p.searchParams.get('py') || '50');
                          scale = parseInt(p.searchParams.get('scale') || '100');
                        } catch(e) {}
                        
                        return (
                          <Image
                            src={url}
                            alt="Hero Side Image"
                            fill
                            className="object-contain drop-shadow-2xl"
                            style={{
                              objectPosition: `${px}% ${py}%`,
                              transform: `scale(${scale / 100})`
                            }}
                          />
                        )
                      })()}
                    </div>

                  </div>
                </div>
              </div>
            </div>
          )}

      {/* Categorías Swipeables horizontales */}
      <div className="mt-2 py-3 px-4 flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
        <button
          onClick={() => setCategoriaSeleccionada(null)}
          className={cn(
            "snap-start shrink-0 px-5 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-colors",
            categoriaSeleccionada === null && !busqueda ? "bg-chefsy-500 text-white" : "bg-[#222222] text-slate-400 border border-white/5"
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
              categoriaSeleccionada === cat.id ? "bg-chefsy-500 text-white" : "bg-[#222222] text-slate-400 border border-white/5"
            )}
          >
            {cat.nombre}
          </button>
        ))}
      </div>

      {/* Catálogo de Productos (Reutiliza el componente original pero se adaptará porque usa Tailwind) */}
      <div className="px-2 mt-4">
        <CatalogoProductos
          categoriasActivas={categoriasActivas}
          productosFiltrados={productosFiltrados}
          categoriaSeleccionada={categoriaSeleccionada || 'todos'}
          busqueda={busqueda}
          metadata={metadata}
          onAbrirModal={abrirModalPersonalizacion}
        />
      </div>
      </>
      )}

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

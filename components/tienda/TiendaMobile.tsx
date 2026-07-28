'use client'

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense, useRef } from 'react'
import { usarCatalogo } from '@/contexto/CatalogoContexto'
import { usarAuth } from '@/contexto/AuthContexto'
import { usarConfiguracionTienda } from '@/contexto/ConfiguracionTiendaContexto'
import { usarCarrito } from '@/contexto/CarritoContexto'
import { ModificadorCatalogo, MetaProducto } from '@/tipos/catalogo'
import { Pedido } from '@/tipos'
import { Search, ChevronRight, LogOut, User } from 'lucide-react'
import { formatearPrecio, cn } from '@/lib/utils'
import { OBTENER_DETALLES_COMPLEMENTARIOS } from '@/lib/tienda-helpers'
import { metadataRespaldo } from '@/datos/productos'
import Image from 'next/image'
import Fuse from 'fuse.js'
import { useSugerenciaBusqueda } from '@/hooks/useBuscadorInteligente'

import BottomNav from '@/components/ui/BottomNav'
import CatalogoProductos from '@/components/tienda/CatalogoProductos'
import FooterTienda from '@/components/tienda/FooterTienda'
import BotonWhatsAppHeader from '@/components/tienda/BotonWhatsAppHeader'
import BotonPedidoFlotante from '@/components/tienda/BotonPedidoFlotante'
import BotonUbicacionLocal from '@/components/tienda/BotonUbicacionLocal'
import { usarClienteAuth } from '@/contexto/ClienteAuthContexto'
import SelectorCategorias from '@/components/tienda/SelectorCategorias'
import HeroParallax3D from '@/components/tienda/HeroParallax3D'
import dynamic from 'next/dynamic'

const ModalLoginCliente = dynamic(() => import('@/components/auth/ModalLoginCliente'), { ssr: false })
const ModalLogout = dynamic(() => import('@/components/auth/ModalLogout'), { ssr: false })
const ModalHistorialPedidos = dynamic(() => import('@/components/tienda/ModalHistorialPedidos'), { ssr: false })

const CartDrawer = lazy(() => import('@/components/tienda/CartDrawer'))
const ModalPersonalizacion = lazy(() => import('@/components/tienda/ModalPersonalizacion'))
const PantallaExito = lazy(() => import('@/components/tienda/PantallaExito'))

export default function TiendaMobile() {
  const { productos, categorias, modificadores } = usarCatalogo()
  const { estaListoAuth } = usarAuth()
  const { usuario, perfil, cerrarSesion } = usarClienteAuth()

  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'profile' | 'cart'>('home')
  const [metadata, setMetadata] = useState<Record<string, MetaProducto>>(metadataRespaldo as Record<string, MetaProducto>)
  const [imgError, setImgError] = useState(false)
  const [mostrarLogin, setMostrarLogin] = useState(false)
  const [mostrarConfirmLogout, setMostrarConfirmLogout] = useState(false)
  const [mostrarHistorial, setMostrarHistorial] = useState(false)

  const [selectorAbierto, setSelectorAbierto] = useState(false)
  
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

  // Resetear error de carga de portada cuando cambie la URL en el diseño
  useEffect(() => {
    setImgError(false)
  }, [configuracion?.hero_image_url])
  
  const categoriasActivas = useMemo(() => {
    return categorias.filter(c => c.activa).sort((a, b) => a.orden - b.orden)
  }, [categorias])

  const sugerenciaBusqueda = useSugerenciaBusqueda(busqueda)

  const productosFiltrados = useMemo(() => {
    const hayBusqueda = busqueda.trim() !== ''

    // 1. Filtrar primero por categoría y estado activo
    const productosPorCategoria = productos.filter(p => {
      if (!p.activo) return false
      
      const catFiltro = hayBusqueda ? 'todos' : (categoriaSeleccionada || 'todos')
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

  const handleNavClick = (tab: 'home' | 'search' | 'profile' | 'cart') => {
    if (tab !== 'cart') {
      setCartAbierto(false)
    }
    if (tab === 'cart') {
      setCartAbierto(true)
    } else if (tab === 'search') {
      setActiveTab('home') // Mantenemos en home pero enfocamos el buscador
      setTimeout(() => {
        searchInputRef.current?.focus()
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }, 100)
    } else if (tab === 'profile') {
      setActiveTab('profile')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      if (!usuario) {
        setMostrarLogin(true)
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

  const fuenteClase = {
    bebas: 'font-bebas',
    montserrat: 'font-montserrat',
    inter: 'font-inter',
    playfair: 'font-playfair',
    anton: 'font-anton',
  }[configuracion?.fuente_principal || 'bebas'] || 'font-bebas'

  const isVideoBg = Boolean(configuracion?.textura_fondo_url?.match(/\.(mp4|webm)(\?.*)?$/i))
  const bgImage = (!isVideoBg && configuracion?.textura_fondo_url) ? `url(${configuracion.textura_fondo_url})` : undefined

  return (
    <div className={`${(isVideoBg || bgImage) ? 'bg-transparent' : 'bg-[#0c0c0c]'} text-slate-200 ${fuenteClase} min-h-screen pb-24 relative`}>
      {/* CAPA DE FONDO FIJA (Optimización de rendimiento para Mobile) */}
      {(isVideoBg || bgImage) && (
        <div className="fixed inset-0 w-full h-full -z-20 pointer-events-none">
          {isVideoBg ? (
            <video 
              key={configuracion!.textura_fondo_url!}
              autoPlay 
              loop 
              muted 
              playsInline 
              className="w-full h-full object-cover opacity-100 will-change-transform"
            >
              <source src={configuracion!.textura_fondo_url!} type={`video/${configuracion!.textura_fondo_url!.split('.').pop()?.split('?')[0]}`} />
            </video>
          ) : (
            <div 
              className="w-full h-full bg-cover bg-center opacity-100 will-change-transform"
              style={{ backgroundImage: bgImage }}
            />
          )}
        </div>
      )}
      {/* Capa de oscurecimiento si hay textura para asegurar legibilidad */}
      {(isVideoBg || bgImage) && <div className="fixed inset-0 bg-black/75 -z-10 pointer-events-none" />}
      {/* Header App-like minimalista */}
      <div className="bg-[#141414] sticky top-0 z-[100] px-4 py-3 shadow-md border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden relative shadow-sm border border-white/10">
              <Image src={configuracion?.logo_url || "/logo.jpg"} alt="Logo" fill priority sizes="32px" className="object-cover" />
            </div>
            <span className="font-bebas text-xl text-white tracking-wider">CHEFSY</span>
            <BotonUbicacionLocal size="sm" />
            <BotonWhatsAppHeader size="sm" />
          </div>

        </div>
        
        {/* Barra de búsqueda integrada */}
        <div className="mt-4 relative mb-2">
          <input
            id="busqueda_mobile"
            name="busqueda_mobile"
            ref={searchInputRef}
            type="text"
            placeholder="¿Qué vas a pedir hoy?"
            value={busqueda}
            onChange={(e) => {
              const val = e.target.value
              setBusqueda(val)
              if (val.trim() !== '' && categoriaSeleccionada) {
                setCategoriaSeleccionada(null)
              }
            }}
            className="w-full bg-[#222222] border border-white/10 text-white py-3 pl-10 pr-4 rounded-xl text-sm outline-none focus:border-chefsy-400 transition-colors relative z-20"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-20" size={18} />
          
          {/* Sugerencia: ¿Quisiste decir? */}
          {sugerenciaBusqueda && (
            <div className="absolute -bottom-9 left-1 animate-in fade-in slide-in-from-top-2 duration-300 z-10">
              <button
                onClick={() => {
                  setBusqueda(sugerenciaBusqueda)
                  if (categoriaSeleccionada) setCategoriaSeleccionada(null)
                }}
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
        !usuario ? (
          <div className="flex flex-col items-center justify-center pt-20 px-4 text-center animate-in fade-in duration-300">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10 shadow-inner">
              <span className="text-3xl">👤</span>
            </div>
            <h2 className="text-3xl font-bebas text-white tracking-wider mb-2">¡Iniciá sesión para ver tu perfil!</h2>
            <p className="text-slate-400 max-w-xs mb-8 text-sm leading-relaxed">
              Accedé a tu historial de pedidos y datos de cuenta.
            </p>
            <button
              onClick={() => setMostrarLogin(true)}
              className="bg-chefsy hover:bg-chefsy-600 text-white font-bold py-3 px-8 rounded-full shadow-lg active:scale-95 transition-all cursor-pointer text-sm"
            >
              Iniciar sesión / Registrarse
            </button>
            <button
              onClick={() => setMostrarLogin(true)}
              className="mt-3 bg-white/10 hover:bg-white/15 text-white border border-white/15 font-bold py-3 px-8 rounded-full shadow-lg active:scale-95 transition-all cursor-pointer text-sm flex items-center gap-2"
            >
              <span>📜</span>
              <span>Historial de pedidos</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center pt-8 px-4 text-center pb-12">
            <div className="w-20 h-20 bg-chefsy/20 rounded-full flex items-center justify-center mb-4 border border-chefsy/30 shadow-lg">
              <span className="text-3xl text-chefsy-400 font-bebas">
                {perfil?.nombre?.charAt(0)?.toUpperCase() || 'C'}
              </span>
            </div>
            <h2 className="text-2xl font-bebas text-white tracking-wider mb-1">¡HOLA, {perfil?.nombre?.toUpperCase() || 'CLIENTE'}!</h2>
            <p className="text-slate-400 text-sm mb-5">Bienvenido a tu perfil.</p>
            
            <div className="w-full max-w-sm space-y-3">
              <button
                onClick={() => setMostrarHistorial(true)}
                className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold py-3.5 px-6 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3 text-base tracking-wide cursor-pointer"
              >
                <span className="text-xl">📜</span>
                <span>Historial de pedidos</span>
              </button>
            </div>
          </div>
        )
      ) : (
        <>
          {/* Hero Section Parallax 3D & Insignias Flotantes */}
          {!categoriaSeleccionada && !busqueda && (
            <HeroParallax3D
              heroImageUrl={configuracion?.hero_image_url || '/burger-loca.webp'}
              heroLinea1={configuracion?.hero_linea_1 || 'POCAS PALABRAS.'}
              heroLinea2={configuracion?.hero_linea_2 || 'MUCHO CHEDDAR.'}
              heroScale={configuracion?.hero_escala}
              heroPosX={configuracion?.hero_pos_x}
              heroPosY={configuracion?.hero_pos_y}
              isVideoBg={isVideoBg}
              bgImage={bgImage}
              onExplorarClick={() => {
                setSelectorAbierto(true)
                const el = document.getElementById('seccion-menu-categorias')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }}
            />
          )}



          {/* Modal de Selección de Categorías (se activa desde el botón del Hero) */}
          <div id="seccion-menu-categorias">
            <SelectorCategorias
              categoriasActivas={categoriasActivas}
              categoriaSeleccionada={categoriaSeleccionada}
              selectorAbierto={selectorAbierto}
              onToggleSelector={() => setSelectorAbierto(!selectorAbierto)}
              onSeleccionarCategoria={(id) => {
                setCategoriaSeleccionada(id === 'todos' ? null : id)
                setSelectorAbierto(false)
              }}
              soloModal={true}
            />
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
          
          <FooterTienda />
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
              if (!url || url.startsWith('data:')) return OBTENER_DETALLES_COMPLEMENTARIOS(productoAPersonalizar.categoriaId, productoAPersonalizar.nombre, productoAPersonalizar.id).img
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
      {mostrarConfirmLogout && (
        <ModalLogout
          onCancel={() => setMostrarConfirmLogout(false)}
          onConfirm={async () => {
            await cerrarSesion()
            setMostrarConfirmLogout(false)
          }}
        />
      )}

      {mostrarLogin && (
        <ModalLoginCliente 
          onCerrar={() => setMostrarLogin(false)} 
        />
      )}

      <ModalHistorialPedidos
        abierto={mostrarHistorial}
        onCerrar={() => setMostrarHistorial(false)}
      />
      <BotonPedidoFlotante />
    </div>
  )
}

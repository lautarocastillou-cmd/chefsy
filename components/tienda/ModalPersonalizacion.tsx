'use client'

import React, { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { Plus, Minus, X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react'
import { ProductoCatalogo, ModificadorCatalogo } from '@/tipos/catalogo'
import { formatearPrecio, optimizarUrlImagen } from '@/lib/utils'
import { usarCarrito } from '@/contexto/CarritoContexto'
import VisorFotosFullscreen from './VisorFotosFullscreen'

interface ModalPersonalizacionProps {
  producto: ProductoCatalogo
  imagenFinal: string
  modificadoresDisponibles: ModificadorCatalogo[]
  modsSeleccionados: ModificadorCatalogo[]
  cantidadModal: number
  notaPersonalizacion: string
  precioUnitarioTotal: number

  onCerrar: () => void
  onAlternarModificador: (mod: ModificadorCatalogo) => void
  onSetCantidad: (cantidad: number) => void
  onSetNota: (nota: string) => void
  onAgregar: (conPuntos: boolean) => void
}

export default function ModalPersonalizacion({
  producto,
  imagenFinal,
  modificadoresDisponibles,
  modsSeleccionados,
  cantidadModal,
  notaPersonalizacion,
  precioUnitarioTotal,
  onCerrar,
  onAlternarModificador,
  onSetCantidad,
  onSetNota,
  onAgregar,
}: ModalPersonalizacionProps) {
  const { turnoActivo, esDomingoCerrado, mensajeCierre } = usarCarrito()
  const estaCerrado = turnoActivo === false || esDomingoCerrado

  // Lista de fotos
  const listaFotos = imagenFinal
    ? (imagenFinal.includes(' | ') ? imagenFinal.split(' | ') : [imagenFinal])
        .map(url => url.trim())
        .filter(Boolean)
    : []

  const [indiceFoto, setIndiceFoto] = useState(0)
  const [lightboxAbierto, setLightboxAbierto] = useState(false)
  const carruselMobileRef = useRef<HTMLDivElement>(null)

  const cerradoPorAtrasRef = useRef(false)
  const onCerrarRef = useRef(onCerrar)
  const lightboxAbiertoRef = useRef(lightboxAbierto)

  useEffect(() => {
    onCerrarRef.current = onCerrar
  }, [onCerrar])

  useEffect(() => {
    lightboxAbiertoRef.current = lightboxAbierto
  }, [lightboxAbierto])

  useEffect(() => {
    // Interceptar gesto o botón Atrás (iPhone/Android)
    window.history.pushState({ modalProducto: true }, '', window.location.href)

    const handlePopState = () => {
      // Si el visor fullscreen está abierto, el botón Atrás de Android solo cierra el fullscreen
      if (lightboxAbiertoRef.current) {
        setLightboxAbierto(false)
        window.history.pushState({ modalProducto: true }, '', window.location.href)
        return
      }

      cerradoPorAtrasRef.current = true
      onCerrarRef.current()
    }

    window.addEventListener('popstate', handlePopState)

    // Deshabilitar scroll de html y body al montar para evitar que el fondo se mueva
    const origHtmlOverflow = document.documentElement.style.overflow
    const origBodyOverflow = document.body.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('popstate', handlePopState)
      document.documentElement.style.overflow = origHtmlOverflow
      document.body.style.overflow = origBodyOverflow
      if (!cerradoPorAtrasRef.current && window.history.state?.modalProducto) {
        window.history.back()
      }
    }
  }, [])

  // Sincronizar índice en scroll móvil
  const handleScrollMobile = () => {
    if (!carruselMobileRef.current) return
    const { scrollLeft, clientWidth } = carruselMobileRef.current
    if (clientWidth > 0) {
      const nuevoIndice = Math.round(scrollLeft / clientWidth)
      if (nuevoIndice !== indiceFoto && nuevoIndice >= 0 && nuevoIndice < listaFotos.length) {
        setIndiceFoto(nuevoIndice)
      }
    }
  }

  const scrollMobileHacia = (indice: number) => {
    if (!carruselMobileRef.current) return
    const targetLeft = carruselMobileRef.current.clientWidth * indice
    carruselMobileRef.current.scrollTo({ left: targetLeft, behavior: 'smooth' })
    setIndiceFoto(indice)
  }

  const tieneFotos = listaFotos.length > 0
  const fotoActiva = tieneFotos ? (listaFotos[indiceFoto] || listaFotos[0]) : ''
  const fotoActivaDesktop = tieneFotos ? optimizarUrlImagen(fotoActiva, 1200) : ''
  const isCdnDesktop = fotoActiva.includes('res.cloudinary.com') || fotoActiva.includes('supabase.co') || fotoActiva.includes('unsplash.com') || fotoActiva.includes('lh3.googleusercontent.com')

  return (
    <>
      <div 
        className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onCerrar()
        }}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        data-lenis-prevent="true"
      >
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-sm transition-opacity animate-in fade-in duration-250 ease-out pointer-events-auto will-change-opacity"
          onClick={onCerrar}
        />

        {/* Modal Panel */}
        <div 
          className={`relative w-full h-[100dvh] sm:h-auto bg-[#1c1c1c] shadow-2xl rounded-none sm:rounded-[2rem] overflow-hidden sm:border border-[#3d3d3d] z-10 flex flex-col sm:max-h-[88vh] animate-in slide-in-from-bottom-6 sm:zoom-in-95 fade-in duration-250 ease-out pointer-events-auto will-change-transform transform-gpu ${
            tieneFotos ? 'sm:max-w-4xl lg:max-w-5xl' : 'sm:max-w-md'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Si tiene fotos: layout 2 columnas en Desktop, y Hero + scroll en Mobile */}
          {tieneFotos ? (
            <div className="flex flex-col sm:grid sm:grid-cols-12 h-full sm:h-auto sm:max-h-[88vh] overflow-hidden">
              
              {/* ─────────────────────────────────────────────────────────────
                  COLUMNA FOTOS (Desktop: izquierda / Mobile: Hero superior)
                  ───────────────────────────────────────────────────────────── */}
              <div className="sm:col-span-6 lg:col-span-7 flex flex-col justify-between bg-[#141414] border-b sm:border-b-0 sm:border-r border-[#2d2d2d] relative shrink-0">
                
                {/* ── VISTA MOBILE: HERO CAROUSEL ── */}
                <div className="sm:hidden relative w-full aspect-[4/3] max-h-[300px] bg-[#111] overflow-hidden group">
                  {/* Barra decorativa superior (mobile) */}
                  <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                    <div className="w-10 h-1 rounded-full bg-white/40 shadow-sm backdrop-blur-sm" />
                  </div>

                  {/* Botón flotante Cerrar (Mobile) */}
                  <button
                    type="button"
                    onClick={onCerrar}
                    className="absolute top-3 right-3 z-30 w-9 h-9 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md shadow-xl transition-transform active:scale-90 cursor-pointer"
                    aria-label="Cerrar modal"
                  >
                    <X size={18} />
                  </button>

                  {/* Botón flotante "Ampliar HD" (Mobile) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setLightboxAbierto(true)
                    }}
                    className="absolute bottom-3 right-3 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white text-xs font-bold border border-white/25 backdrop-blur-md shadow-xl transition-transform active:scale-95 cursor-pointer"
                  >
                    <Maximize2 size={13} className="text-chefsy-400" />
                    <span>Ampliar</span>
                  </button>

                  {/* Contador de fotos (Mobile si > 1) */}
                  {listaFotos.length > 1 && (
                    <div className="absolute bottom-3 left-3 z-30 px-2.5 py-1 rounded-full bg-black/70 text-[10px] font-bold text-white tracking-wider flex items-center gap-1.5 border border-white/15 backdrop-blur-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-chefsy-400 animate-pulse" />
                      {indiceFoto + 1} / {listaFotos.length}
                    </div>
                  )}

                  {/* Contenedor Carrusel Táctil */}
                  <div
                    ref={carruselMobileRef}
                    onScroll={handleScrollMobile}
                    className="w-full h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide flex scroll-smooth"
                  >
                    {listaFotos.map((imgUrl, i) => {
                      const optimized = optimizarUrlImagen(imgUrl, 1000)
                      const isCdn = imgUrl.includes('res.cloudinary.com') || imgUrl.includes('supabase.co') || imgUrl.includes('unsplash.com') || imgUrl.includes('lh3.googleusercontent.com')
                      return (
                        <div
                          key={i}
                          className="relative w-full h-full shrink-0 snap-center cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setIndiceFoto(i)
                            setLightboxAbierto(true)
                          }}
                        >
                          <Image
                            src={optimized}
                            alt={`${producto.nombre} - Foto ${i + 1}`}
                            fill
                            unoptimized={isCdn}
                            priority={i === 0}
                            className="object-cover"
                            sizes="100vw"
                          />
                        </div>
                      )
                    })}
                  </div>

                  {/* Puntos de paginación inferiores (Mobile) */}
                  {listaFotos.length > 1 && (
                    <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 pointer-events-none">
                      {listaFotos.map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            i === indiceFoto
                              ? 'w-5 bg-chefsy-400 shadow-md shadow-chefsy-400/50'
                              : 'w-1.5 bg-white/40'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* ── VISTA DESKTOP: FOTOGRAFÍA PROTAGONISTA Y MINIATURAS ── */}
                <div className="hidden sm:flex sm:flex-col justify-between h-full p-6">
                  {/* Foto Principal en HD */}
                  <div
                    className="relative w-full aspect-[4/3] lg:aspect-auto lg:h-[440px] rounded-2xl overflow-hidden bg-[#181818] border border-[#2d2d2d] group cursor-zoom-in shadow-xl flex items-center justify-center"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setLightboxAbierto(true)
                    }}
                  >
                    <Image
                      src={fotoActivaDesktop}
                      alt={`${producto.nombre} - Foto ${indiceFoto + 1}`}
                      fill
                      unoptimized={isCdnDesktop}
                      priority
                      className="object-contain p-2 transition-transform duration-500 ease-out group-hover:scale-105"
                      sizes="(max-width: 1024px) 50vw, 600px"
                    />

                    {/* Hint flotante de Zoom en Desktop */}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-1 group-hover:translate-y-0 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 hover:bg-black text-white text-xs font-bold border border-white/20 backdrop-blur-md shadow-xl pointer-events-none">
                      <Maximize2 size={13} className="text-chefsy-400" />
                      <span>Ver en pantalla completa</span>
                    </div>

                    {/* Flechas de navegación Desktop sobre la imagen */}
                    {listaFotos.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setIndiceFoto(prev => (prev - 1 + listaFotos.length) % listaFotos.length)
                          }}
                          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-white/15 backdrop-blur-md shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer opacity-70 group-hover:opacity-100"
                          aria-label="Foto anterior"
                        >
                          <ChevronLeft size={22} />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setIndiceFoto(prev => (prev + 1) % listaFotos.length)
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-white/15 backdrop-blur-md shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer opacity-70 group-hover:opacity-100"
                          aria-label="Foto siguiente"
                        >
                          <ChevronRight size={22} />
                        </button>

                        <div className="absolute bottom-3 left-3 z-20 px-2.5 py-1 rounded-lg bg-black/70 text-[10px] font-bold text-white tracking-wider flex items-center gap-1.5 border border-white/10 backdrop-blur-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-chefsy-400 animate-pulse" />
                          Foto {indiceFoto + 1} de {listaFotos.length}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Fila de Miniaturas (Desktop) */}
                  {listaFotos.length > 1 && (
                    <div className="flex items-center gap-2.5 pt-4 overflow-x-auto scrollbar-hide">
                      {listaFotos.map((foto, idx) => {
                        const mini = optimizarUrlImagen(foto, 160)
                        const isSelect = idx === indiceFoto
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setIndiceFoto(idx)
                            }}
                            className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer active:scale-95 ${
                              isSelect
                                ? 'border-chefsy-400 ring-2 ring-chefsy-400/40 scale-105 shadow-md shadow-chefsy-500/20'
                                : 'border-[#333] opacity-60 hover:opacity-100 hover:border-slate-400'
                            }`}
                          >
                            <Image
                              src={mini}
                              alt={`Miniatura ${idx + 1}`}
                              fill
                              unoptimized={mini.includes('res.cloudinary.com')}
                              className="object-cover"
                            />
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

              </div>

              {/* ─────────────────────────────────────────────────────────────
                  COLUMNA DETALLES & PEDIDO (Desktop: derecha / Mobile: abajo)
                  ───────────────────────────────────────────────────────────── */}
              <div className="sm:col-span-6 lg:col-span-5 flex flex-col justify-between h-full overflow-hidden bg-[#1c1c1c]">
                
                {/* Cabecera de Producto */}
                <div className="px-5 pt-4 sm:pt-6 pb-3 border-b border-[#333] flex items-start justify-between gap-3 text-left relative shrink-0">
                  <div className="relative z-10 flex-1">
                    <p className="text-[10px] font-semibold text-chefsy-400 uppercase tracking-[0.2em] mb-1">
                      Estás pidiendo
                    </p>
                    <h3 className="font-bebas text-2xl sm:text-3xl lg:text-4xl text-white leading-none tracking-wide">
                      {producto.nombre}
                    </h3>
                  </div>

                  <button
                    onClick={onCerrar}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-[#252525] border border-[#3d3d3d] text-slate-400 hover:text-white transition-colors focus:outline-none shrink-0 cursor-pointer shadow-md"
                    aria-label="Cerrar modal"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Cuerpo del Modal con Scroll */}
                <div className="p-4 sm:p-5 overflow-y-auto scrollbar-hide space-y-4 flex-1 text-left">
                  {/* Precio base */}
                  <div className="flex items-center justify-between bg-[#252525] border border-[#3d3d3d] rounded-xl px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-chefsy-400 animate-pulse" />
                      <span className="text-xs font-semibold text-slate-300">Precio base</span>
                    </div>
                    <span className="font-bebas text-lg sm:text-xl text-white tracking-wider">
                      {formatearPrecio(producto.precio)}
                    </span>
                  </div>

                  {/* Nota libre */}
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold text-slate-300 leading-snug">
                      ¿Querés cambiarle algo a tu <span className="text-chefsy-400">{producto.nombre}</span>?
                    </h4>
                    <div className="relative">
                      <textarea
                        value={notaPersonalizacion}
                        onChange={(e) => onSetNota(e.target.value)}
                        placeholder="Ej: Sin cebolla, con extra mayonesa..."
                        className="w-full border border-[#3d3d3d] rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-chefsy-500/60 focus:border-chefsy-500/50 bg-[#161616] text-white placeholder:text-slate-500 resize-none transition-all"
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Modificadores disponibles */}
                  {modificadoresDisponibles.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Extras disponibles</h4>
                      <div className="space-y-1.5">
                        {modificadoresDisponibles.map(modObj => {
                          const seleccionado = modsSeleccionados.some(m => m.id === modObj.id)
                          return (
                            <button
                              key={modObj.id}
                              onClick={() => onAlternarModificador(modObj)}
                              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                                seleccionado
                                  ? 'bg-chefsy-500/20 text-chefsy-300 border-chefsy-500/60 shadow-[inset_0_0_12px_rgba(42,99,72,0.08)]'
                                  : 'border-[#333] bg-[#222] text-slate-400 hover:border-[#4d4d4d]'
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all ${
                                  seleccionado ? 'bg-chefsy-500 border-transparent' : 'border-slate-600 bg-transparent'
                                }`}>
                                  {seleccionado && <span className="text-[6px] text-white font-black">✓</span>}
                                </span>
                                {modObj.nombre}
                              </span>
                              <span className={`text-[11px] font-bold ${seleccionado ? 'text-chefsy-400' : 'text-slate-500'}`}>
                                + {formatearPrecio(modObj.precioExtra)}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer del Modal con Cantidad y Botón de Pedido */}
                <div className="px-5 py-4 border-t border-[#333] bg-[#171717] flex items-center gap-3 shrink-0">
                  {/* Selector de cantidad */}
                  <div className="flex items-center bg-[#252525] border border-[#3d3d3d] rounded-xl overflow-hidden shrink-0">
                    <button
                      onClick={() => onSetCantidad(Math.max(1, cantidadModal - 1))}
                      className="w-10 h-10 flex items-center justify-center hover:bg-[#3d3d3d] transition-colors text-slate-300 focus:outline-none cursor-pointer"
                    >
                      <Minus size={18} />
                    </button>
                    <span className="w-8 text-center text-sm font-black text-white">
                      {cantidadModal}
                    </span>
                    <button
                      onClick={() => onSetCantidad(cantidadModal + 1)}
                      className="w-10 h-10 flex items-center justify-center hover:bg-[#3d3d3d] transition-colors text-slate-300 focus:outline-none cursor-pointer"
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  {/* Botón agregar */}
                  <div className="flex-1 flex flex-col gap-2">
                    <button
                      onClick={() => {
                        if (estaCerrado) {
                          alert(mensajeCierre || 'El local se encuentra cerrado en este momento.')
                          return
                        }
                        onAgregar(false)
                      }}
                      disabled={estaCerrado}
                      className={`w-full font-bebas text-lg tracking-wider py-2.5 px-3 rounded-xl transition-all text-center leading-none ${
                        estaCerrado
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                          : 'bg-gradient-to-r from-chefsy-500 to-chefsy-600 hover:from-chefsy-400 hover:to-chefsy-500 text-white shadow-lg shadow-chefsy-500/20 active:scale-[0.98] cursor-pointer'
                      }`}
                    >
                      {estaCerrado ? '🔒 Local Cerrado' : `Agregar · ${formatearPrecio(precioUnitarioTotal * cantidadModal)}`}
                    </button>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            /* ── CASO SIN FOTO: MODAL COMPACTO Y ELEGANTE ── */
            <div className="flex flex-col h-full sm:h-auto overflow-hidden">
              {/* Barra decorativa superior (mobile) */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 sm:hidden pointer-events-none">
                <div className="w-10 h-1 rounded-full bg-slate-600 shadow-sm" />
              </div>

              {/* Cabecera */}
              <div className="px-5 pt-5 sm:pt-4 pb-3 border-b border-[#3d3d3d] flex items-start justify-between gap-3 text-left relative overflow-hidden shrink-0 mt-4 sm:mt-0">
                <div className="relative z-10 flex-1">
                  <p className="text-[9px] font-semibold text-chefsy-400 uppercase tracking-[0.2em] mb-0.5">Estás pidiendo</p>
                  <h3 className="font-bebas text-2xl sm:text-3xl text-white leading-none tracking-wide">
                    {producto.nombre}
                  </h3>
                </div>
                <button
                  onClick={onCerrar}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-[#252525] border border-[#3d3d3d] text-slate-400 hover:text-white transition-colors focus:outline-none shrink-0 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Cuerpo */}
              <div className="p-4 sm:p-5 overflow-y-auto scrollbar-hide space-y-4 flex-1 text-left">
                {/* Precio base */}
                <div className="flex items-center justify-between bg-[#252525] border border-[#3d3d3d] rounded-xl px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-chefsy-400 animate-pulse" />
                    <span className="text-xs font-semibold text-slate-300">Precio base</span>
                  </div>
                  <span className="font-bebas text-lg sm:text-xl text-white tracking-wider">
                    {formatearPrecio(producto.precio)}
                  </span>
                </div>

                {/* Nota libre */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-300 leading-snug">
                    ¿Querés cambiarle algo a tu <span className="text-chefsy-400">{producto.nombre}</span>?
                  </h4>
                  <div className="relative">
                    <textarea
                      value={notaPersonalizacion}
                      onChange={(e) => onSetNota(e.target.value)}
                      placeholder="Ej: Sin cebolla, con extra mayonesa..."
                      className="w-full border border-[#3d3d3d] rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-chefsy-500/60 focus:border-chefsy-500/50 bg-[#1a1a1a] text-white placeholder:text-slate-500 resize-none transition-all"
                      rows={2}
                    />
                  </div>
                </div>

                {/* Modificadores disponibles */}
                {modificadoresDisponibles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Extras disponibles</h4>
                    <div className="space-y-1.5">
                      {modificadoresDisponibles.map(modObj => {
                        const seleccionado = modsSeleccionados.some(m => m.id === modObj.id)
                        return (
                          <button
                            key={modObj.id}
                            onClick={() => onAlternarModificador(modObj)}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                              seleccionado
                                ? 'bg-chefsy-500/20 text-chefsy-300 border-chefsy-500/60 shadow-[inset_0_0_12px_rgba(42,99,72,0.08)]'
                                : 'border-[#3d3d3d] bg-[#252525] text-slate-400 hover:border-[#4d4d4d]'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all ${
                                seleccionado ? 'bg-chefsy-500 border-transparent' : 'border-slate-600 bg-transparent'
                              }`}>
                                {seleccionado && <span className="text-[6px] text-white font-black">✓</span>}
                              </span>
                              {modObj.nombre}
                            </span>
                            <span className={`text-[11px] font-bold ${seleccionado ? 'text-chefsy-400' : 'text-slate-500'}`}>
                              + {formatearPrecio(modObj.precioExtra)}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-[#3d3d3d] bg-[#1a1a1a] flex items-center gap-2.5 shrink-0">
                <div className="flex items-center bg-[#252525] border border-[#3d3d3d] rounded-xl overflow-hidden shrink-0">
                  <button
                    onClick={() => onSetCantidad(Math.max(1, cantidadModal - 1))}
                    className="w-10 h-10 flex items-center justify-center hover:bg-[#3d3d3d] transition-colors text-slate-300 focus:outline-none"
                  >
                    <Minus size={18} />
                  </button>
                  <span className="w-8 text-center text-sm font-black text-white">
                    {cantidadModal}
                  </span>
                  <button
                    onClick={() => onSetCantidad(cantidadModal + 1)}
                    className="w-10 h-10 flex items-center justify-center hover:bg-[#3d3d3d] transition-colors text-slate-300 focus:outline-none"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                <div className="flex-1 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      if (estaCerrado) {
                        alert(mensajeCierre || 'El local se encuentra cerrado en este momento.')
                        return
                      }
                      onAgregar(false)
                    }}
                    disabled={estaCerrado}
                    className={`w-full font-bebas text-lg tracking-wider py-2.5 px-3 rounded-xl transition-all text-center leading-none ${
                      estaCerrado
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        : 'bg-gradient-to-r from-chefsy-500 to-chefsy-600 hover:from-chefsy-400 hover:to-chefsy-500 text-white shadow-lg shadow-chefsy-500/20 active:scale-[0.98] cursor-pointer'
                    }`}
                  >
                    {estaCerrado ? '🔒 Local Cerrado' : `Agregar · ${formatearPrecio(precioUnitarioTotal * cantidadModal)}`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Visor Fullscreen / Lightbox */}
      {tieneFotos && (
        <VisorFotosFullscreen
          fotos={listaFotos}
          indiceInicial={indiceFoto}
          nombreProducto={producto.nombre}
          abierto={lightboxAbierto}
          onCerrar={() => setLightboxAbierto(false)}
        />
      )}
    </>
  )
}

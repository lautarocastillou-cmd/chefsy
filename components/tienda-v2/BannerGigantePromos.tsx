'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight, Tag, Flame, Plus, Trash2, Edit3, X, Check, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PromoSlide {
  id: string
  titulo: string
  subtitulo: string
  badge: string
  precio?: string
  precioAnterior?: string
  tagDescuento?: string
  imagenUrl: string
  botonTexto: string
  categoriaId?: string
  fondoGradiente?: string
}

const PROMOS_INICIALES: PromoSlide[] = [
  {
    id: 'promo-1',
    titulo: 'DOBLE SMASH + PAPAS CHEDDAR',
    subtitulo: '2 medallones 120g de carne premium, doble cheddar fundido, panceta crocante y papas gigantes.',
    badge: '🔥 MÁS PEDIDO DE LA CASA',
    precio: '$8.900',
    precioAnterior: '$11.500',
    tagDescuento: '20% OFF',
    imagenUrl: '/burger-loca.webp',
    botonTexto: 'Pedir Promo',
    categoriaId: 'burgers',
    fondoGradiente: 'from-amber-950/90 via-slate-950/80 to-slate-950/40',
  },
  {
    id: 'promo-2',
    titulo: '2X1 EN BURGERS CLÁSICAS',
    subtitulo: 'Llevate dos hamburguesas completas con papas al precio de una para compartir.',
    badge: '⚡ PROMO EXCLUSIVA',
    precio: '$9.200',
    precioAnterior: '$14.000',
    tagDescuento: '2x1 HOY',
    imagenUrl: '/burger-hero.png',
    botonTexto: 'Aprovechar 2x1',
    categoriaId: 'burgers',
    fondoGradiente: 'from-red-950/90 via-slate-950/80 to-slate-950/40',
  },
  {
    id: 'promo-3',
    titulo: 'COMBOS NOCTURNOS PARA DOS',
    subtitulo: '2 Lomos Especiales + Gaseosa 1.5L con envío bonificado directo a tu casa.',
    badge: '🛵 DELIVERY BONIFICADO',
    precio: '$12.400',
    tagDescuento: 'ENVÍO GRATIS',
    imagenUrl: '/burger-loca.webp',
    botonTexto: 'Ver Combo',
    categoriaId: 'lomos',
    fondoGradiente: 'from-emerald-950/90 via-slate-950/80 to-slate-950/40',
  },
]

const STORAGE_KEY_PROMOS = 'chefsy_tienda_v2_promos'
const INTERVALO_SLIDE_MS = 5000

interface PropsBannerGigantePromos {
  onSeleccionarCategoria?: (id: string) => void
  onAbrirProducto?: (id: string) => void
}

export default function BannerGigantePromos({
  onSeleccionarCategoria,
}: PropsBannerGigantePromos) {
  const [promos, setPromos] = useState<PromoSlide[]>(PROMOS_INICIALES)
  const [indiceActual, setIndiceActual] = useState(0)
  const [estaPausado, setEstaPausado] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const [modalEditorAbierto, setModalEditorAbierto] = useState(false)

  // Cargar promos desde localStorage si existen
  useEffect(() => {
    try {
      const guardado = localStorage.getItem(STORAGE_KEY_PROMOS)
      if (guardado) {
        const parsed = JSON.parse(guardado)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPromos(parsed)
        }
      }
    } catch {}
  }, [])

  const guardarPromos = (nuevas: PromoSlide[]) => {
    setPromos(nuevas)
    try {
      localStorage.setItem(STORAGE_KEY_PROMOS, JSON.stringify(nuevas))
    } catch {}
  }

  // Timer de rotación con barra de progreso
  useEffect(() => {
    if (estaPausado || promos.length <= 1) return

    const tickMs = 50
    const step = (tickMs / INTERVALO_SLIDE_MS) * 100

    const timer = setInterval(() => {
      setProgreso((prev) => {
        if (prev >= 100) {
          setIndiceActual((idx) => (idx + 1) % promos.length)
          return 0
        }
        return prev + step
      })
    }, tickMs)

    return () => clearInterval(timer)
  }, [estaPausado, promos.length, indiceActual])

  const cambiarSlide = useCallback((nuevoIndice: number) => {
    setProgreso(0)
    setIndiceActual((nuevoIndice + promos.length) % promos.length)
  }, [promos.length])

  // Soporte de Swipe táctil en móvil
  const touchStartX = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    setEstaPausado(true)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    setEstaPausado(false)
    if (touchStartX.current === null) return
    const diffX = touchStartX.current - e.changedTouches[0].clientX
    if (diffX > 40) {
      cambiarSlide(indiceActual + 1)
    } else if (diffX < -40) {
      cambiarSlide(indiceActual - 1)
    }
    touchStartX.current = null
  }

  const slideActual = promos[indiceActual] || promos[0]

  const handleAccionPromo = (slide: PromoSlide) => {
    if (slide.categoriaId && onSeleccionarCategoria) {
      onSeleccionarCategoria(slide.categoriaId)
    }
    const catalogo = document.getElementById('catalogo-productos')
    if (catalogo) {
      catalogo.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="w-full px-3 sm:px-4 md:px-6 py-2 sm:py-4">
      <div className="max-w-6xl mx-auto">
        {/* Contenedor principal del Banner Gigante */}
        <div
          onMouseEnter={() => setEstaPausado(true)}
          onMouseLeave={() => setEstaPausado(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="relative w-full h-[280px] sm:h-[360px] md:h-[420px] lg:h-[460px] rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-slate-950 select-none group"
        >
          {/* Imágenes de fondo con fade suave */}
          {promos.map((slide, idx) => {
            const esActivo = idx === indiceActual
            return (
              <div
                key={slide.id}
                className={cn(
                  'absolute inset-0 transition-opacity duration-700 ease-out will-change-opacity',
                  esActivo ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                )}
              >
                {/* Imagen del plato / promo */}
                <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[65%] md:w-[60%] h-full">
                  <Image
                    src={slide.imagenUrl}
                    alt={slide.titulo}
                    fill
                    priority={idx === 0}
                    sizes="(max-width: 768px) 100vw, 1200px"
                    className="object-cover object-center scale-105 group-hover:scale-100 transition-transform duration-1000 ease-out"
                  />
                  {/* Gradiente sutil sobre la imagen */}
                  <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-slate-950 via-slate-950/70 sm:via-slate-950/40 to-transparent" />
                </div>

                {/* Capa de atmósfera de color del slide */}
                <div className={cn('absolute inset-0 bg-gradient-to-r', slide.fondoGradiente || 'from-slate-950 via-slate-950/80 to-transparent')} />

                {/* Contenido textual y badges del Banner */}
                <div className="absolute inset-0 z-20 flex flex-col justify-between p-5 sm:p-8 md:p-12 max-w-xl">
                  {/* Badge superior */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 bg-amber-500 text-slate-950 text-[10px] sm:text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
                      <Flame size={13} className="text-red-600 fill-red-600" />
                      {slide.badge}
                    </span>
                    {slide.tagDescuento && (
                      <span className="inline-flex items-center gap-1 bg-red-600 text-white text-[10px] sm:text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md animate-pulse">
                        <Tag size={12} />
                        {slide.tagDescuento}
                      </span>
                    )}
                  </div>

                  {/* Título y descripción */}
                  <div className="space-y-2 sm:space-y-3 my-auto">
                    <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white uppercase tracking-tight leading-[1.05] drop-shadow-md">
                      {slide.titulo}
                    </h2>
                    <p className="text-xs sm:text-sm md:text-base text-slate-300 font-medium leading-relaxed max-w-md line-clamp-2 sm:line-clamp-3">
                      {slide.subtitulo}
                    </p>
                  </div>

                  {/* Precios y Botón Call To Action */}
                  <div className="flex items-center gap-4 flex-wrap pt-2">
                    {slide.precio && (
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl sm:text-3xl font-black text-emerald-400">
                          {slide.precio}
                        </span>
                        {slide.precioAnterior && (
                          <span className="text-xs sm:text-base text-slate-400 line-through font-semibold">
                            {slide.precioAnterior}
                          </span>
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleAccionPromo(slide)}
                      className="bg-chefsy hover:bg-chefsy-600 active:scale-95 text-white font-extrabold text-xs sm:text-sm px-5 sm:px-6 py-2.5 sm:py-3 rounded-2xl shadow-xl shadow-chefsy/30 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <span>{slide.botonTexto}</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Flechas de navegación (visibles en hover o tablet/desktop) */}
          {promos.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => cambiarSlide(indiceActual - 1)}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-slate-950/60 hover:bg-slate-900 border border-white/10 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:scale-110 cursor-pointer backdrop-blur-xs"
                title="Promo anterior"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={() => cambiarSlide(indiceActual + 1)}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-slate-950/60 hover:bg-slate-900 border border-white/10 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:scale-110 cursor-pointer backdrop-blur-xs"
                title="Siguiente promo"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}

          {/* Indicadores de diapositiva (Pills con progreso animado) */}
          {promos.length > 1 && (
            <div className="absolute bottom-4 right-4 sm:right-8 z-30 flex items-center gap-2">
              {promos.map((slide, idx) => {
                const esActivo = idx === indiceActual
                return (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => cambiarSlide(idx)}
                    className="relative h-2 rounded-full overflow-hidden transition-all duration-300 cursor-pointer bg-white/20"
                    style={{ width: esActivo ? '36px' : '10px' }}
                    title={`Ir a promo ${idx + 1}`}
                  >
                    {esActivo && (
                      <div
                        className="absolute inset-0 bg-amber-400 rounded-full transition-all ease-linear"
                        style={{ width: `${progreso}%` }}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Botón flotante para editar promos (Laboratorio V2) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setModalEditorAbierto(true)
            }}
            className="absolute top-3 right-3 z-30 bg-slate-900/80 hover:bg-slate-900 border border-white/15 text-slate-300 hover:text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-xs"
            title="Administrar las promos de este banner"
          >
            <Edit3 size={13} className="text-amber-400" />
            <span>Editar Promos</span>
          </button>
        </div>
      </div>

      {/* Modal Editor de Promos en Vivo */}
      {modalEditorAbierto && (
        <ModalEditorPromos
          promos={promos}
          onGuardar={(nuevas) => {
            guardarPromos(nuevas)
            setModalEditorAbierto(false)
          }}
          onCerrar={() => setModalEditorAbierto(false)}
        />
      )}
    </div>
  )
}

// ── Modal para que el dueño agregue o modifique las promos sin tocar código ───
function ModalEditorPromos({
  promos,
  onGuardar,
  onCerrar,
}: {
  promos: PromoSlide[]
  onGuardar: (nuevas: PromoSlide[]) => void
  onCerrar: () => void
}) {
  const [lista, setLista] = useState<PromoSlide[]>(promos)
  const [editandoId, setEditandoId] = useState<string | null>(null)

  const eliminarPromo = (id: string) => {
    if (lista.length <= 1) {
      alert('Tenés que mantener al menos una promo activa en el banner.')
      return
    }
    setLista(lista.filter((p) => p.id !== id))
  }

  const agregarPromo = () => {
    const nueva: PromoSlide = {
      id: `promo-${Date.now()}`,
      titulo: 'NUEVA PROMO DE LA CASA',
      subtitulo: 'Describí tu promo acá para que tiente a los clientes.',
      badge: '🔥 PROMO ESPECIAL',
      precio: '$7.500',
      tagDescuento: 'OFERTA',
      imagenUrl: '/burger-loca.webp',
      botonTexto: 'Pedir Ahora',
      fondoGradiente: 'from-amber-950/90 via-slate-950/80 to-slate-950/40',
    }
    setLista([...lista, nueva])
    setEditandoId(nueva.id)
  }

  const actualizarCampo = (id: string, campo: keyof PromoSlide, valor: string) => {
    setLista(
      lista.map((p) => (p.id === id ? { ...p, [campo]: valor } : p))
    )
  }

  const restablecerDefault = () => {
    setLista(PROMOS_INICIALES)
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 text-slate-100 w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 px-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-amber-400" />
            <h3 className="font-bold text-base text-white">
              Administrar Promos del Banner Gigante
            </h3>
          </div>
          <button
            onClick={onCerrar}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Lista de Promos */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {lista.map((promo, idx) => (
            <div
              key={promo.id}
              className="p-3.5 bg-slate-800/60 border border-slate-700/80 rounded-xl space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                  Promo #{idx + 1}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditandoId(editandoId === promo.id ? null : promo.id)}
                    className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-xs font-bold rounded-lg text-slate-200 transition-all flex items-center gap-1"
                  >
                    <Edit3 size={12} />
                    <span>{editandoId === promo.id ? 'Listo' : 'Editar'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminarPromo(promo.id)}
                    className="p-1.5 text-red-400 hover:bg-red-950/40 rounded-lg transition-colors"
                    title="Eliminar promo"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Vista previa simplificada */}
              <div className="text-sm font-black text-white truncate">
                {promo.titulo}
              </div>
              <p className="text-xs text-slate-400 truncate">
                {promo.subtitulo}
              </p>

              {/* Campos editables si está expandido */}
              {editandoId === promo.id && (
                <div className="pt-2 border-t border-slate-700 space-y-2.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Título Principal:
                    </label>
                    <input
                      type="text"
                      value={promo.titulo}
                      onChange={(e) => actualizarCampo(promo.id, 'titulo', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Subtítulo / Descripción:
                    </label>
                    <textarea
                      rows={2}
                      value={promo.subtitulo}
                      onChange={(e) => actualizarCampo(promo.id, 'subtitulo', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Badge Superior:
                      </label>
                      <input
                        type="text"
                        value={promo.badge}
                        onChange={(e) => actualizarCampo(promo.id, 'badge', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Etiqueta Descuento:
                      </label>
                      <input
                        type="text"
                        value={promo.tagDescuento || ''}
                        placeholder="Ej: 20% OFF / 2x1"
                        onChange={(e) => actualizarCampo(promo.id, 'tagDescuento', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Precio Promo:
                      </label>
                      <input
                        type="text"
                        value={promo.precio || ''}
                        placeholder="Ej: $8.900"
                        onChange={(e) => actualizarCampo(promo.id, 'precio', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Precio Anterior (Tachado):
                      </label>
                      <input
                        type="text"
                        value={promo.precioAnterior || ''}
                        placeholder="Ej: $11.000"
                        onChange={(e) => actualizarCampo(promo.id, 'precioAnterior', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      URL de Imagen (o archivo en /public):
                    </label>
                    <input
                      type="text"
                      value={promo.imagenUrl}
                      onChange={(e) => actualizarCampo(promo.id, 'imagenUrl', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Texto del Botón:
                      </label>
                      <input
                        type="text"
                        value={promo.botonTexto}
                        onChange={(e) => actualizarCampo(promo.id, 'botonTexto', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Filtrar Categoría (ID opcional):
                      </label>
                      <input
                        type="text"
                        value={promo.categoriaId || ''}
                        placeholder="Ej: burgers / pizzas"
                        onChange={(e) => actualizarCampo(promo.id, 'categoriaId', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={agregarPromo}
            className="w-full py-2.5 border-2 border-dashed border-slate-700 hover:border-amber-400/50 hover:bg-amber-400/5 text-slate-300 hover:text-amber-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} />
            <span>Agregar otra promo al banner</span>
          </button>
        </div>

        {/* Footer */}
        <div className="p-3.5 px-5 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={restablecerDefault}
            className="text-xs text-slate-500 hover:text-slate-300 font-medium underline cursor-pointer"
          >
            Restablecer promos de ejemplo
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCerrar}
              className="px-3 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onGuardar(lista)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check size={14} />
              <span>Guardar y Ver en Vivo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

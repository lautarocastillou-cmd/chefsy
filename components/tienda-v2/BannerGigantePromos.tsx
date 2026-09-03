'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit3, X, Check, ImageIcon, Smartphone, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PromoSlide {
  id: string
  titulo: string
  imagenUrl: string // Desktop (Banner horizontal)
  imagenUrlMobile?: string // Mobile (Historia vertical 9:16)
  categoriaId?: string
}

const PROMOS_INICIALES: PromoSlide[] = [
  {
    id: 'promo-1',
    titulo: 'Doble Smash Promo',
    imagenUrl: '/burger-loca.webp',
    imagenUrlMobile: '/burger-loca.webp',
    categoriaId: 'burgers',
  },
  {
    id: 'promo-2',
    titulo: 'Promo Burgers 2x1',
    imagenUrl: '/burger-hero.png',
    imagenUrlMobile: '/burger-hero.png',
    categoriaId: 'burgers',
  },
  {
    id: 'promo-3',
    titulo: 'Combos Nocturnos',
    imagenUrl: '/burger-loca.webp',
    imagenUrlMobile: '/burger-loca.webp',
    categoriaId: 'lomos',
  },
]

const STORAGE_KEY_PROMOS = 'chefsy_tienda_v2_promos'
const INTERVALO_SLIDE_MS = 5000

interface PropsBannerGigantePromos {
  onSeleccionarCategoria?: (id: string) => void
}

export default function BannerGigantePromos({
  onSeleccionarCategoria,
}: PropsBannerGigantePromos) {
  const [promos, setPromos] = useState<PromoSlide[]>(PROMOS_INICIALES)
  const [indiceActual, setIndiceActual] = useState(0)
  const [estaPausado, setEstaPausado] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const [modalEditorAbierto, setModalEditorAbierto] = useState(false)

  // Cargar promos desde localStorage si existen y escuchar cambios en tiempo real
  useEffect(() => {
    const cargar = () => {
      try {
        const guardado = localStorage.getItem(STORAGE_KEY_PROMOS)
        if (guardado) {
          const parsed = JSON.parse(guardado)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPromos(parsed)
          }
        }
      } catch {}
    }

    cargar()

    const handleCustom = () => cargar()
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_PROMOS) cargar()
    }

    window.addEventListener('chefsy:promos-actualizadas', handleCustom)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener('chefsy:promos-actualizadas', handleCustom)
      window.removeEventListener('storage', handleStorage)
    }
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
    <div className="w-full px-2 sm:px-4 md:px-6 py-2 sm:py-4">
      <div className="max-w-7xl mx-auto">
        {/* 
          Contenedor Adaptativo:
          - Móvil: Formato Historia de Instagram (aspect-[9/16], máx 80vh para que se vea el inicio del menú)
          - PC: Formato Panorámico / Banner YouTube (aspect-[21/9] o altura 400px - 480px, ancho completo)
        */}
        <div
          onMouseEnter={() => setEstaPausado(true)}
          onMouseLeave={() => setEstaPausado(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={() => handleAccionPromo(slideActual)}
          className="relative w-full aspect-[9/16] max-h-[78vh] md:aspect-[21/9] md:max-h-[460px] md:h-[420px] rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-slate-950 select-none group cursor-pointer"
        >
          {promos.map((slide, idx) => {
            const esActivo = idx === indiceActual
            const imgDesktop = slide.imagenUrl
            const imgMobile = slide.imagenUrlMobile || slide.imagenUrl

            return (
              <div
                key={slide.id}
                className={cn(
                  'absolute inset-0 transition-opacity duration-700 ease-out will-change-opacity',
                  esActivo ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                )}
              >
                {/* Imagen para Celular (Formato Historia 9:16) */}
                <div className="block md:hidden absolute inset-0 w-full h-full">
                  <Image
                    src={imgMobile}
                    alt={slide.titulo}
                    fill
                    priority={idx === 0}
                    sizes="(max-width: 768px) 100vw, 1px"
                    className="object-cover object-center"
                  />
                </div>

                {/* Imagen para PC / Tablet (Formato Panorámico YouTube Banner) */}
                <div className="hidden md:block absolute inset-0 w-full h-full">
                  <Image
                    src={imgDesktop}
                    alt={slide.titulo}
                    fill
                    priority={idx === 0}
                    sizes="(min-width: 769px) 100vw, 1400px"
                    className="object-cover object-center scale-100 group-hover:scale-101 transition-transform duration-700 ease-out"
                  />
                </div>
              </div>
            )
          })}

          {/* Flechas de navegación (Desktop en hover) */}
          {promos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  cambiarSlide(indiceActual - 1)
                }}
                className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:scale-110 cursor-pointer backdrop-blur-xs"
                title="Banner anterior"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  cambiarSlide(indiceActual + 1)
                }}
                className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:scale-110 cursor-pointer backdrop-blur-xs"
                title="Siguiente banner"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          {/* Indicadores de diapositiva (Pills con progreso sutil) */}
          {promos.length > 1 && (
            <div className="absolute bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 md:gap-2 bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-xs border border-white/10">
              {promos.map((slide, idx) => {
                const esActivo = idx === indiceActual
                return (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      cambiarSlide(idx)
                    }}
                    className="relative h-1.5 md:h-2 rounded-full overflow-hidden transition-all duration-300 cursor-pointer bg-white/30"
                    style={{ width: esActivo ? '28px' : '7px' }}
                    title={`Ir a banner ${idx + 1}`}
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

          {/* Botón flotante para editar banners */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setModalEditorAbierto(true)
            }}
            className="absolute top-3 right-3 z-30 bg-black/70 hover:bg-black/90 border border-white/20 text-slate-200 hover:text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-xs opacity-75 hover:opacity-100"
            title="Administrar imágenes de los banners"
          >
            <Edit3 size={13} className="text-amber-400" />
            <span>Editar Banners</span>
          </button>
        </div>
      </div>

      {/* Modal Editor de Banners */}
      {modalEditorAbierto && (
        <ModalEditorBanners
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

// ── Modal para cargar o cambiar las imágenes de los banners ───────────────────
function ModalEditorBanners({
  promos,
  onGuardar,
  onCerrar,
}: {
  promos: PromoSlide[]
  onGuardar: (nuevas: PromoSlide[]) => void
  onCerrar: () => void
}) {
  const [lista, setLista] = useState<PromoSlide[]>(promos)

  const eliminarBanner = (id: string) => {
    if (lista.length <= 1) {
      alert('Tenés que mantener al menos un banner activo.')
      return
    }
    setLista(lista.filter((p) => p.id !== id))
  }

  const agregarBanner = () => {
    const nueva: PromoSlide = {
      id: `banner-${Date.now()}`,
      titulo: 'Nuevo Banner',
      imagenUrl: '/burger-loca.webp',
      imagenUrlMobile: '/burger-loca.webp',
      categoriaId: '',
    }
    setLista([...lista, nueva])
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
      <div className="bg-slate-900 border border-slate-700 text-slate-100 w-full max-w-xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 px-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon size={18} className="text-amber-400" />
            <h3 className="font-bold text-base text-white">
              Administrar Banners de Promos
            </h3>
          </div>
          <button
            onClick={onCerrar}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Lista de Banners */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {lista.map((banner, idx) => (
            <div
              key={banner.id}
              className="p-3.5 bg-slate-800/60 border border-slate-700/80 rounded-xl space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                  Banner #{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => eliminarBanner(banner.id)}
                  className="p-1.5 text-red-400 hover:bg-red-950/40 rounded-lg transition-colors"
                  title="Eliminar este banner"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Nombre de referencia:
                  </label>
                  <input
                    type="text"
                    value={banner.titulo}
                    onChange={(e) => actualizarCampo(banner.id, 'titulo', e.target.value)}
                    placeholder="Ej: Promo 2x1 Burgers"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-bold"
                  />
                </div>

                {/* Imagen para PC / Banner YouTube */}
                <div>
                  <label className="block text-[11px] font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                    <Monitor size={13} />
                    <span>Imagen para PC (Panorámica 1920x600 o YouTube Banner):</span>
                  </label>
                  <input
                    type="text"
                    value={banner.imagenUrl}
                    onChange={(e) => actualizarCampo(banner.id, 'imagenUrl', e.target.value)}
                    placeholder="Ej: /burger-loca.webp o URL externa"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-[11px]"
                  />
                </div>

                {/* Imagen para Celular / Historia Instagram */}
                <div>
                  <label className="block text-[11px] font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                    <Smartphone size={13} />
                    <span>Imagen para Celular (Historia Instagram 9:16 / 1080x1920):</span>
                  </label>
                  <input
                    type="text"
                    value={banner.imagenUrlMobile || ''}
                    onChange={(e) => actualizarCampo(banner.id, 'imagenUrlMobile', e.target.value)}
                    placeholder="Opcional: Si se deja vacío, usa la de PC"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    ID de Categoría al hacer click (opcional):
                  </label>
                  <input
                    type="text"
                    value={banner.categoriaId || ''}
                    placeholder="Ej: burgers, lomos, pizzas"
                    onChange={(e) => actualizarCampo(banner.id, 'categoriaId', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={agregarBanner}
            className="w-full py-2.5 border-2 border-dashed border-slate-700 hover:border-amber-400/50 hover:bg-amber-400/5 text-slate-300 hover:text-amber-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} />
            <span>Agregar otro banner</span>
          </button>
        </div>

        {/* Footer */}
        <div className="p-3.5 px-5 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={restablecerDefault}
            className="text-xs text-slate-500 hover:text-slate-300 font-medium underline cursor-pointer"
          >
            Restablecer banners por defecto
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

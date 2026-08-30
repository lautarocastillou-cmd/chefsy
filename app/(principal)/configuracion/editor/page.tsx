'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { ConfiguracionContext } from '@/contexto/ConfiguracionTiendaContexto'
import {
  ConfiguracionTienda,
  CarruselSlide,
  obtenerConfiguracionTienda,
  actualizarConfiguracionTienda,
} from '@/servicios/supabase/configuracion'
import {
  Save,
  ArrowLeft,
  Image as ImageIcon,
  Type,
  Palette,
  Upload,
  Loader2,
  Share2,
  Square,
  Smartphone,
  Monitor,
  Layout,
  Video,
  Sparkles,
  Plus,
  Trash2,
  Star,
  Sliders,
  CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'
import PaginaTienda from '@/app/page'
import { cn } from '@/lib/utils'

export default function EditorTienda() {
  const [configLive, setConfigLive] = useState<ConfiguracionTienda | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [subiendoImagen, setSubiendoImagen] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [isMobilePreview, setIsMobilePreview] = useState(false)
  const [toastGuardado, setToastGuardado] = useState(false)

  // Almacenamiento temporal del input de palabras animadas (separadas por coma)
  const [palabrasText, setPalabrasText] = useState('')

  useEffect(() => {
    async function init() {
      const dbConfig = await obtenerConfiguracionTienda()
      setConfigLive(dbConfig)
      setPalabrasText(dbConfig.palabras_animadas.join(', '))
      setCargando(false)
    }
    init()
  }, [])

  // Inyectar el color primario en vivo para previsualización (incluyendo colores de textos)
  useEffect(() => {
    if (configLive?.color_principal) {
      const parts = configLive.color_principal.split('|')
      const brandColor = parts[0] || '#2A6348'
      const textHero1 = parts[1] || '#ffffff'
      const textHero2 = parts[2] || brandColor
      const textMenu = parts[3] || '#ffffff'

      document.documentElement.style.setProperty('--chefsy-main', brandColor)
      document.documentElement.style.setProperty('--chefsy-text-hero-1', textHero1)
      document.documentElement.style.setProperty('--chefsy-text-hero-2', textHero2)
      document.documentElement.style.setProperty('--chefsy-text-menu', textMenu)
    }
  }, [configLive?.color_principal])

  // Atajo de teclado: Ctrl + S / Cmd + S para guardar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [configLive, palabrasText])

  const handleSave = async () => {
    if (!configLive || guardando) return
    setGuardando(true)
    const success = await actualizarConfiguracionTienda({
      ...configLive,
      palabras_animadas: palabrasText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    })
    setGuardando(false)
    if (success) {
      setToastGuardado(true)
      setTimeout(() => setToastGuardado(false), 3000)
    } else {
      alert('Error al guardar el diseño.')
    }
  }

  const optimizarImagenCliente = (file: File, maxWidth = 1200, quality = 0.82): Promise<File> => {
    return new Promise((resolve) => {
      if (
        !file.type.startsWith('image/') ||
        file.type.includes('svg') ||
        file.type.includes('gif') ||
        file.type.includes('video')
      ) {
        resolve(file)
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            resolve(file)
            return
          }

          ctx.drawImage(img, 0, 0, width, height)

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file)
                return
              }
              const nombreSinExt =
                file.name.substring(0, file.name.lastIndexOf('.')) || file.name
              const compressedFile = new File([blob], `${nombreSinExt}_opt.webp`, {
                type: 'image/webp',
                lastModified: Date.now(),
              })
              resolve(compressedFile)
            },
            'image/webp',
            quality
          )
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  const procesarYSubirArchivo = async (file: File, campoDestino: string) => {
    try {
      setSubiendoImagen(campoDestino)

      const isVideo = file.type.startsWith('video/')
      const maxWidth = campoDestino === 'logo_url' ? 600 : 1200
      const fileParaSubir = isVideo ? file : await optimizarImagenCliente(file, maxWidth, 0.82)

      const uploadRes = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          'Content-Type': fileParaSubir.type || 'application/octet-stream',
          'X-File-Name': encodeURIComponent(fileParaSubir.name),
        },
        body: fileParaSubir,
      })

      const uploadData = await uploadRes.json()
      if (uploadData.error) throw new Error(uploadData.error)

      const nuevaUrl = uploadData.urlOriginal || uploadData.urlTransformada

      if (campoDestino.startsWith('slide_img_')) {
        const slideId = campoDestino.replace('slide_img_', '')
        actualizarSlide(slideId, 'imagen_url', nuevaUrl)
      } else if (campoDestino === 'hero_image_secundaria') {
        const img1 = configLive?.hero_image_url?.split('|')[0]?.trim() || ''
        handleChange('hero_image_url', `${img1}|${nuevaUrl}`)
      } else if (campoDestino === 'hero_image_url') {
        const img2 = configLive?.hero_image_url?.split('|')[1]?.trim() || ''
        handleChange('hero_image_url', `${nuevaUrl}${img2 ? '|' + img2 : ''}`)
      } else {
        handleChange(campoDestino as keyof ConfiguracionTienda, nuevaUrl)
      }
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Error al subir el archivo.')
    } finally {
      setSubiendoImagen(null)
    }
  }

  const handleDrop = async (e: React.DragEvent, campoDestino: string) => {
    e.preventDefault()
    setDragOver(null)
    const file = e.dataTransfer.files[0]
    if (!file) return
    await procesarYSubirArchivo(file, campoDestino)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, campoDestino: string) => {
    const file = e.target.files?.[0]
    if (!file) return
    await procesarYSubirArchivo(file, campoDestino)
  }

  const handleChange = (field: keyof ConfiguracionTienda, value: any) => {
    if (configLive) {
      setConfigLive({ ...configLive, [field]: value })
    }
  }

  // Helpers para Carrusel Slides
  const agregarSlide = () => {
    const slidesActuales = configLive?.hero_carrusel_slides || []
    const nuevoSlide: CarruselSlide = {
      id: `slide-${Date.now()}`,
      titulo: 'NUEVA PROMO CHEFSY',
      subtitulo: 'Describí los ingredientes y el descuento de tu promo aquí',
      badge: '🔥 PROMO ESPECIAL',
      imagen_url: '/burger-loca.webp',
      boton_texto: 'Explorar Menú',
    }
    handleChange('hero_carrusel_slides', [...slidesActuales, nuevoSlide])
  }

  const actualizarSlide = (slideId: string, campo: keyof CarruselSlide, valor: any) => {
    const slidesActuales = configLive?.hero_carrusel_slides || []
    const slidesModificados = slidesActuales.map((s) =>
      s.id === slideId ? { ...s, [campo]: valor } : s
    )
    handleChange('hero_carrusel_slides', slidesModificados)
  }

  const eliminarSlide = (slideId: string) => {
    const slidesActuales = configLive?.hero_carrusel_slides || []
    if (slidesActuales.length <= 1) {
      alert('Debe haber al menos 1 slide en el carrusel.')
      return
    }
    handleChange(
      'hero_carrusel_slides',
      slidesActuales.filter((s) => s.id !== slideId)
    )
  }

  if (cargando || !configLive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-bold gap-3">
        <Loader2 className="animate-spin text-emerald-500" size={24} />
        <span>Cargando Chefsy Studio...</span>
      </div>
    )
  }

  const heroLayoutActual = configLive.hero_layout || 'parallax_doble'

  return (
    <div className="flex h-screen w-full bg-slate-950 overflow-hidden font-sans">
      
      {/* ── PANEL LATERAL DEL EDITOR (STUDIO CONTROLS) ──────────────── */}
      <div className="w-88 sm:w-96 bg-zinc-950 border-r border-slate-800/80 flex flex-col z-50 shadow-2xl relative shrink-0">
        
        {/* Cabecera Superior del Panel */}
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-zinc-900/60 backdrop-blur-md">
          <Link
            href="/configuracion"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all active:scale-95 shadow-sm"
            title="Volver a Configuración"
          >
            <ArrowLeft size={16} />
          </Link>

          <div className="text-center">
            <h2 className="font-black text-white text-xs tracking-wider uppercase flex items-center gap-1.5 justify-center">
              <Sparkles size={13} className="text-emerald-400" />
              <span>Visual Studio</span>
            </h2>
            <span className="text-[10px] text-slate-400 block font-medium">
              Ctrl + S para guardar
            </span>
          </div>

          <button
            onClick={handleSave}
            disabled={guardando}
            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white px-3.5 py-1.5 rounded-xl text-xs font-black transition-all disabled:opacity-50 active:scale-95 shadow-md shadow-emerald-600/30 cursor-pointer"
          >
            {guardando ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Save size={13} />
            )}
            <span>{guardando ? '...' : 'Publicar'}</span>
          </button>
        </div>

        {/* Contenido Scrolleable de Controles */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-none">
          
          {/* ══════════════════════════════════════════════════════════ */}
          {/* 1. SECCIÓN: ESTILO DE PORTADA (HERO LAYOUTS) ───────────── */}
          {/* ══════════════════════════════════════════════════════════ */}
          <div className="space-y-3.5 bg-zinc-900/50 p-3.5 rounded-2xl border border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300 text-xs font-black uppercase tracking-wider">
                <Layout size={15} className="text-emerald-400" />
                <span>Estilo de Portada (Hero)</span>
              </div>
              <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded-full font-bold">
                4 Variantes
              </span>
            </div>

            {/* Selector de 4 Layouts con Tarjetas Visuales */}
            <div className="grid grid-cols-2 gap-2">
              
              {/* Opción 1: Parallax Doble */}
              <button
                type="button"
                onClick={() => handleChange('hero_layout', 'parallax_doble')}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all relative cursor-pointer select-none',
                  heroLayoutActual === 'parallax_doble'
                    ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-sm'
                    : 'bg-zinc-900 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                )}
              >
                <div className="text-lg mb-1">🍔</div>
                <div className="text-xs font-black text-slate-200">Doble Parallax</div>
                <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                  2 productos flotantes
                </div>
              </button>

              {/* Opción 2: Carrusel Promocional */}
              <button
                type="button"
                onClick={() => handleChange('hero_layout', 'carrusel_promo')}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all relative cursor-pointer select-none',
                  heroLayoutActual === 'carrusel_promo'
                    ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-sm'
                    : 'bg-zinc-900 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                )}
              >
                <div className="text-lg mb-1">🎠</div>
                <div className="text-xs font-black text-slate-200">Carrusel Promo</div>
                <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                  Banners deslizantes
                </div>
              </button>

              {/* Opción 3: Video Cinemático */}
              <button
                type="button"
                onClick={() => handleChange('hero_layout', 'cinematic_video')}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all relative cursor-pointer select-none',
                  heroLayoutActual === 'cinematic_video'
                    ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-sm'
                    : 'bg-zinc-900 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                )}
              >
                <div className="text-lg mb-1">🎬</div>
                <div className="text-xs font-black text-slate-200">Cinemático</div>
                <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                  Video / textura en bucle
                </div>
              </button>

              {/* Opción 4: Centrado Minimalista */}
              <button
                type="button"
                onClick={() => handleChange('hero_layout', 'centrado_minimalista')}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all relative cursor-pointer select-none',
                  heroLayoutActual === 'centrado_minimalista'
                    ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-sm'
                    : 'bg-zinc-900 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                )}
              >
                <div className="text-lg mb-1">⭐</div>
                <div className="text-xs font-black text-slate-200">Minimalista</div>
                <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                  Logo, rating & badges
                </div>
              </button>

            </div>

            {/* ── Controles Específicos para Carrusel Promocional ────── */}
            {heroLayoutActual === 'carrusel_promo' && (
              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">
                    Banners y Promociones ({configLive.hero_carrusel_slides?.length || 0})
                  </label>
                  <button
                    type="button"
                    onClick={agregarSlide}
                    className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>Agregar Slide</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {(configLive.hero_carrusel_slides || []).map((slide, idx) => (
                    <div
                      key={slide.id}
                      className="p-3 bg-zinc-900 border border-slate-800 rounded-xl space-y-2 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-slate-400 uppercase">
                          Slide #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => eliminarSlide(slide.id)}
                          className="text-slate-500 hover:text-red-400 p-1 rounded-md"
                          title="Eliminar slide"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* Título y Badge del Slide */}
                      <input
                        type="text"
                        value={slide.titulo}
                        onChange={(e) => actualizarSlide(slide.id, 'titulo', e.target.value)}
                        placeholder="Título del Slide..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                      />

                      <input
                        type="text"
                        value={slide.subtitulo}
                        onChange={(e) =>
                          actualizarSlide(slide.id, 'subtitulo', e.target.value)
                        }
                        placeholder="Subtítulo / descripción..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={slide.badge || ''}
                          onChange={(e) =>
                            actualizarSlide(slide.id, 'badge', e.target.value)
                          }
                          placeholder="Badge (ej: 🔥 2x1)"
                          className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-amber-300 focus:outline-none focus:border-emerald-500"
                        />
                        <input
                          type="text"
                          value={slide.boton_texto || ''}
                          onChange={(e) =>
                            actualizarSlide(slide.id, 'boton_texto', e.target.value)
                          }
                          placeholder="Texto botón (ej: Pedir)"
                          className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* Subida de Imagen del Slide */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={slide.imagen_url || ''}
                          onChange={(e) =>
                            actualizarSlide(slide.id, 'imagen_url', e.target.value)
                          }
                          placeholder="URL de imagen..."
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 focus:outline-none"
                        />
                        <label className="cursor-pointer bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 p-1.5 rounded-lg text-[10px] font-bold shrink-0">
                          <Upload size={12} />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileChange(e, `slide_img_${slide.id}`)}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Controles Específicos para Video Cinemático ────────── */}
            {heroLayoutActual === 'cinematic_video' && (
              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>URL del Video (MP4 / WebM)</span>
                    <label className="cursor-pointer text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-950/40 px-2 py-0.5 rounded text-[10px] border border-emerald-800/40">
                      <Upload size={10} /> Subir Video
                      <input
                        type="file"
                        accept="video/mp4,video/webm"
                        className="hidden"
                        onChange={(e) => handleFileChange(e, 'hero_video_url')}
                      />
                    </label>
                  </label>
                  <input
                    type="text"
                    value={configLive.hero_video_url || ''}
                    onChange={(e) => handleChange('hero_video_url', e.target.value)}
                    placeholder="https://.../video.mp4"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Slider de Oscurecimiento Overlay */}
                <div className="space-y-1 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <div className="flex justify-between text-xs font-bold text-slate-300">
                    <span>Oscurecimiento de Video</span>
                    <span className="text-emerald-400 font-mono">
                      {configLive.hero_video_overlay_opacity ?? 65}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="90"
                    value={configLive.hero_video_overlay_opacity ?? 65}
                    onChange={(e) =>
                      handleChange('hero_video_overlay_opacity', parseInt(e.target.value))
                    }
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Más Transparente</span>
                    <span>Más Oscuro</span>
                  </div>
                </div>

                {/* Badge Gourmet */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    Badge de Texto Superior
                  </label>
                  <input
                    type="text"
                    value={configLive.hero_badge_texto || ''}
                    onChange={(e) => handleChange('hero_badge_texto', e.target.value)}
                    placeholder="Ej. COCINA EN VIVO • SABOR ARTESANAL"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

            {/* ── Controles Específicos para Centrado Minimalista ─────── */}
            {heroLayoutActual === 'centrado_minimalista' && (
              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    Texto del Badge de Calificación (Google)
                  </label>
                  <input
                    type="text"
                    value={configLive.hero_badge_texto || ''}
                    onChange={(e) => handleChange('hero_badge_texto', e.target.value)}
                    placeholder="⭐ 4.9 en Google (+500 reseñas)"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <input
                    type="checkbox"
                    id="hero_mostrar_horario"
                    checked={configLive.hero_mostrar_horario !== false}
                    onChange={(e) =>
                      handleChange('hero_mostrar_horario', e.target.checked)
                    }
                    className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-emerald-500"
                  />
                  <label
                    htmlFor="hero_mostrar_horario"
                    className="text-xs text-slate-300 font-semibold cursor-pointer"
                  >
                    Mostrar insignia de estado en vivo (Abierto/Cerrado)
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════ */}
          {/* 2. SECCIÓN COLORES Y PALETA ────────────────────────────── */}
          {/* ══════════════════════════════════════════════════════════ */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <Palette size={14} /> Colores de Marca
              </div>
            </div>
            {(() => {
              const colorParts = (configLive.color_principal || '#2A6348').split('|')
              const brandColor = colorParts[0] || '#2A6348'
              const textHero1 = colorParts[1] || '#ffffff'
              const textHero2 = colorParts[2] || brandColor
              const textMenu = colorParts[3] || '#ffffff'

              const handleColorChange = (index: number, val: string) => {
                const newParts = [...colorParts]
                while (newParts.length < 4) {
                  newParts.push(
                    newParts.length === 2
                      ? newParts[0]
                      : newParts.length === 1 || newParts.length === 3
                      ? '#ffffff'
                      : newParts[0]
                  )
                }
                newParts[index] = val
                handleChange('color_principal', newParts.join('|'))
              }

              return (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 block">
                      Color Principal de la Marca
                    </label>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="color"
                        value={brandColor}
                        onChange={(e) => handleColorChange(0, e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                      />
                      <input
                        type="text"
                        value={brandColor}
                        onChange={(e) => handleColorChange(0, e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 block">
                      Color de Texto Gigante: Línea 1
                    </label>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="color"
                        value={textHero1}
                        onChange={(e) => handleColorChange(1, e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                      />
                      <input
                        type="text"
                        value={textHero1}
                        onChange={(e) => handleColorChange(1, e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 block">
                      Color de Texto Gigante: Línea 2
                    </label>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="color"
                        value={textHero2}
                        onChange={(e) => handleColorChange(2, e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                      />
                      <input
                        type="text"
                        value={textHero2}
                        onChange={(e) => handleColorChange(2, e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>

          <hr className="border-slate-800/80" />

          {/* ══════════════════════════════════════════════════════════ */}
          {/* 3. SECCIÓN TIPOGRAFÍAS ─────────────────────────────────── */}
          {/* ══════════════════════════════════════════════════════════ */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <Type size={14} /> Tipografía
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                Fuente de Títulos y Portada
              </label>
              <select
                value={configLive.fuente_hero || 'bebas'}
                onChange={(e) => handleChange('fuente_hero', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold cursor-pointer"
              >
                <option value="bebas">Bebas Neue (Urbana / Impactante)</option>
                <option value="montserrat">Montserrat (Moderna / Limpia)</option>
                <option value="inter">Inter (Minimalista / Legible)</option>
                <option value="anton">Anton (Gruesa / Callejera)</option>
              </select>
            </div>
          </div>

          <hr className="border-slate-800/80" />

          {/* ══════════════════════════════════════════════════════════ */}
          {/* 4. SECCIÓN TEXTOS DEL INICIO ───────────────────────────── */}
          {/* ══════════════════════════════════════════════════════════ */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <Type size={14} /> Textos del Inicio
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">
                Texto Gigante: Línea 1
              </label>
              <input
                type="text"
                value={configLive.hero_linea_1}
                onChange={(e) => handleChange('hero_linea_1', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">
                Texto Gigante: Línea 2
              </label>
              <input
                type="text"
                value={configLive.hero_linea_2}
                onChange={(e) => handleChange('hero_linea_2', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">
                Frase del Menú (Ej. ¿Qué pinta hoy?)
              </label>
              <input
                type="text"
                value={configLive.titulo_principal}
                onChange={(e) => handleChange('titulo_principal', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <hr className="border-slate-800/80" />

          {/* ══════════════════════════════════════════════════════════ */}
          {/* 5. SECCIÓN LOGO & IMÁGENES FLOTANTES ───────────────────── */}
          {/* ══════════════════════════════════════════════════════════ */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <ImageIcon size={14} /> Logo e Imágenes
            </div>

            {/* Logo URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>URL del Logo</span>
                <label className="cursor-pointer text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-950/40 px-2 py-0.5 rounded text-[10px] border border-emerald-800/40">
                  <Upload size={10} /> Subir
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, 'logo_url')}
                  />
                </label>
              </label>
              <input
                type="text"
                value={configLive.logo_url}
                onChange={(e) => handleChange('logo_url', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Portada Principal (si aplica a Parallax) */}
            {heroLayoutActual === 'parallax_doble' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Plato Estrella Principal (PNG Transparente)</span>
                    <label className="cursor-pointer text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-950/40 px-2 py-0.5 rounded text-[10px] border border-emerald-800/40">
                      <Upload size={10} /> Subir
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileChange(e, 'hero_image_url')}
                      />
                    </label>
                  </label>
                  <input
                    type="text"
                    value={configLive.hero_image_url?.split('|')[0]?.trim() || ''}
                    onChange={(e) => {
                      const img2 = configLive.hero_image_url?.split('|')[1]?.trim() || ''
                      handleChange('hero_image_url', `${e.target.value}${img2 ? '|' + img2 : ''}`)
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Portada Secundaria */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Plato Secundario (Acompañamiento)</span>
                    <label className="cursor-pointer text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-950/40 px-2 py-0.5 rounded text-[10px] border border-emerald-800/40">
                      <Upload size={10} /> Subir
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileChange(e, 'hero_image_secundaria')}
                      />
                    </label>
                  </label>
                  <input
                    type="text"
                    value={configLive.hero_image_url?.split('|')[1]?.trim() || ''}
                    onChange={(e) => {
                      const img1 = configLive.hero_image_url?.split('|')[0]?.trim() || ''
                      handleChange('hero_image_url', `${img1}|${e.target.value}`)
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Sliders Canva */}
                <div className="space-y-3 pt-2 border border-slate-800 rounded-xl p-3 bg-slate-900/40">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Sliders size={13} className="text-emerald-400" />
                    <span>Ajustes de Posición y Escala</span>
                  </label>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Horizontal (X)</span>
                      <span>{configLive.hero_pos_x ?? 50}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={configLive.hero_pos_x ?? 50}
                      onChange={(e) => handleChange('hero_pos_x', parseInt(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Vertical (Y)</span>
                      <span>{configLive.hero_pos_y ?? 50}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={configLive.hero_pos_y ?? 50}
                      onChange={(e) => handleChange('hero_pos_y', parseInt(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Zoom / Escala</span>
                      <span>{configLive.hero_escala ?? 100}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      value={configLive.hero_escala ?? 100}
                      onChange={(e) => handleChange('hero_escala', parseInt(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <hr className="border-slate-800/80" />

          {/* ══════════════════════════════════════════════════════════ */}
          {/* 6. SECCIÓN REDES & WHATSAPP ────────────────────────────── */}
          {/* ══════════════════════════════════════════════════════════ */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <Share2 size={14} /> Redes y WhatsApp
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">
                Link de Instagram
              </label>
              <input
                type="text"
                value={configLive.link_instagram || ''}
                onChange={(e) => handleChange('link_instagram', e.target.value)}
                placeholder="https://instagram.com/tu_tienda"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">
                Link de TikTok
              </label>
              <input
                type="text"
                value={configLive.link_tiktok || ''}
                onChange={(e) => handleChange('link_tiktok', e.target.value)}
                placeholder="https://tiktok.com/@tu_tienda"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

        </div>
      </div>

      {/* ── ÁREA CENTRAL DE PREVISUALIZACIÓN EN VIVO (CANVAS) ───────── */}
      <div
        className={cn(
          'flex-1 relative overflow-y-auto flex flex-col',
          isMobilePreview
            ? 'bg-[#0B0F19] items-center justify-center p-6 md:p-10'
            : 'bg-black'
        )}
      >
        {/* Barra Flotante de Selector de Dispositivo */}
        <div className="absolute top-4 right-6 z-50 flex items-center gap-2 bg-zinc-900/90 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl shadow-2xl">
          <button
            type="button"
            onClick={() => setIsMobilePreview(false)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer select-none',
              !isMobilePreview
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            )}
          >
            <Monitor size={14} />
            <span>Escritorio</span>
          </button>
          <button
            type="button"
            onClick={() => setIsMobilePreview(true)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer select-none',
              isMobilePreview
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            )}
          >
            <Smartphone size={14} />
            <span>Celular</span>
          </button>
        </div>

        {/* Notificación Toast de Guardado */}
        {toastGuardado && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-2.5 rounded-2xl shadow-2xl font-black text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
            <CheckCircle2 size={16} />
            <span>¡Diseño guardado y publicado en vivo con éxito!</span>
          </div>
        )}

        <ConfiguracionContext.Provider
          value={{
            configuracion: {
              ...configLive,
              palabras_animadas: palabrasText
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            },
            setConfiguracion: setConfigLive,
            cargando: false,
          }}
        >
          {isMobilePreview ? (
            <div className="w-[380px] h-[780px] max-h-full rounded-[44px] border-[12px] border-zinc-900 shadow-2xl relative overflow-hidden bg-black shrink-0 transition-all duration-300">
              {/* Dynamic Island / Notch */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-5 bg-zinc-900 rounded-full z-50 pointer-events-none" />
              <div className="w-full h-full overflow-y-auto scrollbar-none">
                <PaginaTienda isMobileOverride={true} />
              </div>
            </div>
          ) : (
            <div className="w-full h-full">
              <PaginaTienda />
            </div>
          )}
        </ConfiguracionContext.Provider>

        {/* Badge Flotante "En Vivo" */}
        <div className="absolute bottom-6 right-6 flex items-center gap-3 pointer-events-none">
          <div className="bg-zinc-900/90 border border-white/10 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-2xl backdrop-blur-md">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Previsualización en tiempo real</span>
          </div>
        </div>
      </div>

    </div>
  )
}

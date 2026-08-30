'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
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
  Smartphone,
  Monitor,
  Tablet,
  Layout,
  Video,
  Sparkles,
  Plus,
  Trash2,
  Star,
  Sliders,
  CheckCircle2,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  History,
  Layers,
  Flame,
  Leaf,
  CreditCard,
  Eye,
  Check,
} from 'lucide-react'
import Link from 'next/link'
import PaginaTienda from '@/app/page'
import BancoTexturasModal from '@/components/editor/BancoTexturasModal'
import HistorialVersionesModal from '@/components/editor/HistorialVersionesModal'
import { cn } from '@/lib/utils'

type DeviceType = 'desktop' | 'ios' | 'android' | 'tablet'
type TabType = 'hero' | 'tarjetas' | 'colores' | 'tipografia' | 'recursos' | 'redes'

const GOOGLE_FONTS_CATALOG = [
  { id: 'bebas', nombre: 'Bebas Neue', categoria: 'Urbana / Impacto', cssVar: 'font-bebas' },
  { id: 'anton', nombre: 'Anton', categoria: 'Gruesa / Cartel', cssVar: 'font-anton' },
  { id: 'syne', nombre: 'Syne', categoria: 'Brutalista / Moderna', cssVar: 'font-syne' },
  { id: 'permanent_marker', nombre: 'Permanent Marker', categoria: 'Handwritten / Callejera', cssVar: 'font-permanent-marker' },
  { id: 'inter', nombre: 'Inter', categoria: 'Clean / Minimalista', cssVar: 'font-inter' },
  { id: 'montserrat', nombre: 'Montserrat', categoria: 'Moderna / Geométrica', cssVar: 'font-montserrat' },
  { id: 'plus_jakarta', nombre: 'Plus Jakarta Sans', categoria: 'Moderna / Tech', cssVar: 'font-plus-jakarta' },
  { id: 'outfit', nombre: 'Outfit', categoria: 'Elegante / Vanguardista', cssVar: 'font-outfit' },
  { id: 'playfair', nombre: 'Playfair Display', categoria: 'Gourmet / Clásica', cssVar: 'font-playfair' },
  { id: 'cinzel', nombre: 'Cinzel', categoria: 'Majestuosa / Premium', cssVar: 'font-cinzel' },
]

export default function EditorTienda() {
  const [configLive, setConfigLive] = useState<ConfiguracionTienda | null>(null)
  const [history, setHistory] = useState<ConfiguracionTienda[]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)
  
  const [activeTab, setActiveTab] = useState<TabType>('hero')
  const [dispositivo, setDispositivo] = useState<DeviceType>('desktop')
  const [zoomCanvas, setZoomCanvas] = useState<number>(100)

  const [guardando, setGuardando] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [subiendoImagen, setSubiendoImagen] = useState<string | null>(null)
  const [toastGuardado, setToastGuardado] = useState(false)
  
  const [modalTexturasAbierto, setModalTexturasAbierto] = useState(false)
  const [modalHistorialAbierto, setModalHistorialAbierto] = useState(false)

  // Almacenamiento temporal de palabras animadas
  const [palabrasText, setPalabrasText] = useState('')

  useEffect(() => {
    async function init() {
      const dbConfig = await obtenerConfiguracionTienda()
      setConfigLive(dbConfig)
      setHistory([dbConfig])
      setHistoryIndex(0)
      setPalabrasText(dbConfig.palabras_animadas.join(', '))
      setCargando(false)
    }
    init()
  }, [])

  // Inyectar colores de marca en variables CSS
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

  // Deshacer / Rehacer
  const registrarCambio = useCallback((nuevaConfig: ConfiguracionTienda) => {
    setConfigLive(nuevaConfig)
    setHistory((prev) => {
      const cortado = prev.slice(0, historyIndex + 1)
      return [...cortado, nuevaConfig].slice(-30) // Guardar hasta 30 estados
    })
    setHistoryIndex((prev) => Math.min(prev + 1, 29))
  }, [historyIndex])

  const undo = () => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1
      setHistoryIndex(newIdx)
      setConfigLive(history[newIdx])
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIdx = historyIndex + 1
      setHistoryIndex(newIdx)
      setConfigLive(history[newIdx])
    }
  }

  // Atajos de teclado: Ctrl+Z (Undo), Ctrl+Y (Redo), Ctrl+S (Save)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [history, historyIndex, configLive, palabrasText])

  const handleChange = (field: keyof ConfiguracionTienda, value: any) => {
    if (!configLive) return
    const nueva = { ...configLive, [field]: value }
    registrarCambio(nueva)
  }

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
      setTimeout(() => setToastGuardado(false), 3500)
    } else {
      alert('Error al guardar y publicar el diseño.')
    }
  }

  const optimizarImagen = (file: File, maxWidth = 1200, quality = 0.82): Promise<File> => {
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
          if (!ctx) return resolve(file)
          ctx.drawImage(img, 0, 0, width, height)
          canvas.toBlob((blob) => {
            if (!blob) return resolve(file)
            const nombreSinExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
            resolve(new File([blob], `${nombreSinExt}_opt.webp`, { type: 'image/webp' }))
          }, 'image/webp', quality)
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  const subirArchivo = async (file: File, campoDestino: string) => {
    try {
      setSubiendoImagen(campoDestino)
      const isVideo = file.type.startsWith('video/')
      const maxWidth = campoDestino === 'logo_url' ? 600 : 1200
      const fileParaSubir = isVideo ? file : await optimizarImagen(file, maxWidth)

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

  // Carrusel slides helpers
  const agregarSlide = () => {
    const slides = configLive?.hero_carrusel_slides || []
    const nuevoSlide: CarruselSlide = {
      id: `slide-${Date.now()}`,
      titulo: 'NUEVA PROMO CHEFSY',
      subtitulo: 'Aprovechá nuestra promo especial de hoy',
      badge: '🔥 2x1',
      imagen_url: '/burger-loca.webp',
      boton_texto: 'Pedir Ahora',
    }
    handleChange('hero_carrusel_slides', [...slides, nuevoSlide])
  }

  const actualizarSlide = (slideId: string, campo: keyof CarruselSlide, val: any) => {
    const slides = (configLive?.hero_carrusel_slides || []).map((s) =>
      s.id === slideId ? { ...s, [campo]: val } : s
    )
    handleChange('hero_carrusel_slides', slides)
  }

  const eliminarSlide = (slideId: string) => {
    const slides = configLive?.hero_carrusel_slides || []
    if (slides.length <= 1) return alert('Debe quedar al menos 1 slide.')
    handleChange('hero_carrusel_slides', slides.filter((s) => s.id !== slideId))
  }

  if (cargando || !configLive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-bold gap-3">
        <Loader2 className="animate-spin text-emerald-400" size={26} />
        <span>Cargando Chefsy Visual Studio Pro...</span>
      </div>
    )
  }

  const heroLayoutActual = configLive.hero_layout || 'parallax_doble'
  const estiloTarjetaActual = configLive.estilo_tarjetas || 'glassmorphism'

  return (
    <div className="flex h-screen w-full bg-slate-950 overflow-hidden font-sans select-none">
      
      {/* ── PANEL LATERAL DE EDICIÓN PROFESIONAL ─────────────────────── */}
      <div className="w-88 sm:w-96 bg-zinc-950 border-r border-slate-800/80 flex flex-col z-50 shadow-2xl relative shrink-0">
        
        {/* Cabecera Superior del Panel */}
        <div className="p-3 border-b border-slate-800/80 flex items-center justify-between shrink-0 bg-zinc-900/80 backdrop-blur-md">
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
              <span>Studio Pro</span>
            </h2>
            <span className="text-[10px] text-slate-400 block font-mono">
              v2.5 • Chefsy
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setModalHistorialAbierto(true)}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all"
              title="Historial de Versiones"
            >
              <History size={15} />
            </button>
            <button
              onClick={handleSave}
              disabled={guardando}
              className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white px-3.5 py-1.5 rounded-xl text-xs font-black transition-all disabled:opacity-50 active:scale-95 shadow-md shadow-emerald-600/30 cursor-pointer"
            >
              {guardando ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              <span>{guardando ? '...' : 'Publicar'}</span>
            </button>
          </div>
        </div>

        {/* Pestañas Ergonómicas de Navegación */}
        <div className="grid grid-cols-6 border-b border-slate-800/80 bg-zinc-900/40 p-1 gap-1 text-center shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('hero')}
            className={cn(
              'py-2 px-1 rounded-xl text-[10px] font-black uppercase transition-all flex flex-col items-center gap-1 cursor-pointer',
              activeTab === 'hero' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50' : 'text-slate-400 hover:text-slate-200'
            )}
            title="Portada y Hero"
          >
            <Layout size={14} />
            <span>Hero</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tarjetas')}
            className={cn(
              'py-2 px-1 rounded-xl text-[10px] font-black uppercase transition-all flex flex-col items-center gap-1 cursor-pointer',
              activeTab === 'tarjetas' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50' : 'text-slate-400 hover:text-slate-200'
            )}
            title="Estilos de Tarjetas"
          >
            <CreditCard size={14} />
            <span>Cards</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('colores')}
            className={cn(
              'py-2 px-1 rounded-xl text-[10px] font-black uppercase transition-all flex flex-col items-center gap-1 cursor-pointer',
              activeTab === 'colores' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50' : 'text-slate-400 hover:text-slate-200'
            )}
            title="Colores y Marca"
          >
            <Palette size={14} />
            <span>Color</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tipografia')}
            className={cn(
              'py-2 px-1 rounded-xl text-[10px] font-black uppercase transition-all flex flex-col items-center gap-1 cursor-pointer',
              activeTab === 'tipografia' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50' : 'text-slate-400 hover:text-slate-200'
            )}
            title="Tipografías y Efectos"
          >
            <Type size={14} />
            <span>Fonts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('recursos')}
            className={cn(
              'py-2 px-1 rounded-xl text-[10px] font-black uppercase transition-all flex flex-col items-center gap-1 cursor-pointer',
              activeTab === 'recursos' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50' : 'text-slate-400 hover:text-slate-200'
            )}
            title="Texturas HD y Fondos"
          >
            <ImageIcon size={14} />
            <span>Fondo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('redes')}
            className={cn(
              'py-2 px-1 rounded-xl text-[10px] font-black uppercase transition-all flex flex-col items-center gap-1 cursor-pointer',
              activeTab === 'redes' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50' : 'text-slate-400 hover:text-slate-200'
            )}
            title="Redes Sociales y WhatsApp"
          >
            <Share2 size={14} />
            <span>Redes</span>
          </button>
        </div>

        {/* Controles de la Pestaña Activa */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-none">
          
          {/* ══════════════ TAB 1: HERO & PORTADAS ════════════════════ */}
          {activeTab === 'hero' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-300 uppercase tracking-wider">
                  Layout de Portada
                </label>
                <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded-full font-bold">
                  4 Diseños
                </span>
              </div>

              {/* 4 Tarjetas de Layouts */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleChange('hero_layout', 'parallax_doble')}
                  className={cn(
                    'p-3 rounded-2xl border text-left transition-all cursor-pointer',
                    heroLayoutActual === 'parallax_doble'
                      ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                      : 'bg-zinc-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  )}
                >
                  <div className="text-xl mb-1">🍔</div>
                  <div className="text-xs font-black text-slate-200">Doble Parallax</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">2 platos flotantes</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleChange('hero_layout', 'carrusel_promo')}
                  className={cn(
                    'p-3 rounded-2xl border text-left transition-all cursor-pointer',
                    heroLayoutActual === 'carrusel_promo'
                      ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                      : 'bg-zinc-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  )}
                >
                  <div className="text-xl mb-1">🎠</div>
                  <div className="text-xs font-black text-slate-200">Carrusel Promo</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Banners rotativos</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleChange('hero_layout', 'cinematic_video')}
                  className={cn(
                    'p-3 rounded-2xl border text-left transition-all cursor-pointer',
                    heroLayoutActual === 'cinematic_video'
                      ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                      : 'bg-zinc-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  )}
                >
                  <div className="text-xl mb-1">🎬</div>
                  <div className="text-xs font-black text-slate-200">Cinemático</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Video / textura</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleChange('hero_layout', 'centrado_minimalista')}
                  className={cn(
                    'p-3 rounded-2xl border text-left transition-all cursor-pointer',
                    heroLayoutActual === 'centrado_minimalista'
                      ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                      : 'bg-zinc-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  )}
                >
                  <div className="text-xl mb-1">⭐</div>
                  <div className="text-xs font-black text-slate-200">Minimalista</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Logo y rating</div>
                </button>
              </div>

              {/* Controles Dinámicos según el Layout */}
              {heroLayoutActual === 'carrusel_promo' && (
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">
                      Slides ({configLive.hero_carrusel_slides?.length || 0})
                    </span>
                    <button
                      type="button"
                      onClick={agregarSlide}
                      className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-lg flex items-center gap-1"
                    >
                      <Plus size={12} />
                      <span>Agregar Promo</span>
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {(configLive.hero_carrusel_slides || []).map((slide, idx) => (
                      <div key={slide.id} className="p-3 bg-zinc-900 border border-slate-800 rounded-xl space-y-2">
                        <div className="flex justify-between items-center text-[11px] font-bold text-slate-400">
                          <span>Slide #{idx + 1}</span>
                          <button onClick={() => eliminarSlide(slide.id)} className="text-red-400 hover:text-red-300 p-1">
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={slide.titulo}
                          onChange={(e) => actualizarSlide(slide.id, 'titulo', e.target.value)}
                          placeholder="Título..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold"
                        />
                        <input
                          type="text"
                          value={slide.subtitulo}
                          onChange={(e) => actualizarSlide(slide.id, 'subtitulo', e.target.value)}
                          placeholder="Subtítulo..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={slide.badge || ''}
                            onChange={(e) => actualizarSlide(slide.id, 'badge', e.target.value)}
                            placeholder="Badge (ej: 🔥 2x1)"
                            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-amber-300"
                          />
                          <input
                            type="text"
                            value={slide.boton_texto || ''}
                            onChange={(e) => actualizarSlide(slide.id, 'boton_texto', e.target.value)}
                            placeholder="Texto Botón"
                            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-white"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {heroLayoutActual === 'cinematic_video' && (
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 flex justify-between">
                      <span>URL de Video (MP4/WebM)</span>
                      <label className="cursor-pointer text-emerald-400 text-[10px] bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                        <Upload size={10} className="inline mr-1" /> Subir
                        <input type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && subirArchivo(e.target.files[0], 'hero_video_url')} />
                      </label>
                    </label>
                    <input
                      type="text"
                      value={configLive.hero_video_url || ''}
                      onChange={(e) => handleChange('hero_video_url', e.target.value)}
                      placeholder="https://.../video.mp4"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <div className="flex justify-between text-xs font-bold text-slate-300">
                      <span>Oscurecimiento</span>
                      <span className="text-emerald-400 font-mono">{configLive.hero_video_overlay_opacity ?? 65}%</span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="90"
                      value={configLive.hero_video_overlay_opacity ?? 65}
                      onChange={(e) => handleChange('hero_video_overlay_opacity', parseInt(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                </div>
              )}

              {heroLayoutActual === 'parallax_doble' && (
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 flex justify-between">
                      <span>Plato Principal (PNG)</span>
                      <label className="cursor-pointer text-emerald-400 text-[10px] bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                        <Upload size={10} className="inline mr-1" /> Subir
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && subirArchivo(e.target.files[0], 'hero_image_url')} />
                      </label>
                    </label>
                    <input
                      type="text"
                      value={configLive.hero_image_url?.split('|')[0] || ''}
                      onChange={(e) => {
                        const img2 = configLive.hero_image_url?.split('|')[1] || ''
                        handleChange('hero_image_url', `${e.target.value}${img2 ? '|' + img2 : ''}`)
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 flex justify-between">
                      <span>Plato Secundario (Acompañamiento)</span>
                      <label className="cursor-pointer text-emerald-400 text-[10px] bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                        <Upload size={10} className="inline mr-1" /> Subir
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && subirArchivo(e.target.files[0], 'hero_image_secundaria')} />
                      </label>
                    </label>
                    <input
                      type="text"
                      value={configLive.hero_image_url?.split('|')[1] || ''}
                      onChange={(e) => {
                        const img1 = configLive.hero_image_url?.split('|')[0] || ''
                        handleChange('hero_image_url', `${img1}|${e.target.value}`)
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>

                  {/* Sliders Canva */}
                  <div className="space-y-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <div className="flex justify-between text-[11px] text-slate-300 font-bold">
                      <span>Posición Horizontal (X)</span>
                      <span className="font-mono text-emerald-400">{configLive.hero_pos_x ?? 50}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={configLive.hero_pos_x ?? 50}
                      onChange={(e) => handleChange('hero_pos_x', parseInt(e.target.value))}
                      className="w-full accent-emerald-500"
                    />

                    <div className="flex justify-between text-[11px] text-slate-300 font-bold pt-1">
                      <span>Zoom / Escala</span>
                      <span className="font-mono text-emerald-400">{configLive.hero_escala ?? 100}%</span>
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
              )}

              {/* Textos del Hero */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-xs font-black text-slate-300 uppercase">Textos Principales</label>
                <input
                  type="text"
                  value={configLive.hero_linea_1}
                  onChange={(e) => handleChange('hero_linea_1', e.target.value)}
                  placeholder="Línea 1..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-bold"
                />
                <input
                  type="text"
                  value={configLive.hero_linea_2}
                  onChange={(e) => handleChange('hero_linea_2', e.target.value)}
                  placeholder="Línea 2..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-bold"
                />
                <input
                  type="text"
                  value={configLive.titulo_principal}
                  onChange={(e) => handleChange('titulo_principal', e.target.value)}
                  placeholder="Frase de Menú (¿Qué pinta hoy?)..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
          )}

          {/* ══════════════ TAB 2: TARJETAS DE MENÚ ═══════════════════ */}
          {activeTab === 'tarjetas' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-300 uppercase tracking-wider">
                  Estilos de Tarjeta (Card Styler)
                </label>
                <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded-full font-bold">
                  4 Estilos
                </span>
              </div>

              {/* Selector de 4 Estilos de Tarjeta */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleChange('estilo_tarjetas', 'glassmorphism')}
                  className={cn(
                    'p-3 rounded-2xl border text-left transition-all cursor-pointer',
                    estiloTarjetaActual === 'glassmorphism'
                      ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                      : 'bg-zinc-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  )}
                >
                  <div className="text-xl mb-1">💎</div>
                  <div className="text-xs font-black text-slate-200">Glassmorphism</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Cristal traslúcido</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleChange('estilo_tarjetas', 'neon_glow')}
                  className={cn(
                    'p-3 rounded-2xl border text-left transition-all cursor-pointer',
                    estiloTarjetaActual === 'neon_glow'
                      ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                      : 'bg-zinc-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  )}
                >
                  <div className="text-xl mb-1">✨</div>
                  <div className="text-xs font-black text-slate-200">Borde Neón</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Resplandor de marca</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleChange('estilo_tarjetas', 'minimalista_clean')}
                  className={cn(
                    'p-3 rounded-2xl border text-left transition-all cursor-pointer',
                    estiloTarjetaActual === 'minimalista_clean'
                      ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                      : 'bg-zinc-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  )}
                >
                  <div className="text-xl mb-1">🧼</div>
                  <div className="text-xs font-black text-slate-200">Minimalista</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Limpio y fotográfico</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleChange('estilo_tarjetas', 'compacto_lista')}
                  className={cn(
                    'p-3 rounded-2xl border text-left transition-all cursor-pointer',
                    estiloTarjetaActual === 'compacto_lista'
                      ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                      : 'bg-zinc-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  )}
                >
                  <div className="text-xl mb-1">⚡</div>
                  <div className="text-xs font-black text-slate-200">Lista Rápida</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Compacto con [+]</div>
                </button>
              </div>

              {/* Toggles de Badges Automáticos y Descuentos */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <label className="text-xs font-black text-slate-300 uppercase">Insignias y Etiquetas</label>
                
                <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2">
                    <Flame size={16} className="text-amber-400" />
                    <div>
                      <div className="text-xs font-bold text-slate-200">Badges Automáticos</div>
                      <div className="text-[10px] text-slate-400">🔥 Más Pedido, ⭐ Chef, 🌱 Veggie</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={configLive.mostrar_badges_automaticos !== false}
                    onChange={(e) => handleChange('mostrar_badges_automaticos', e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-red-400" />
                    <div>
                      <div className="text-xs font-bold text-slate-200">Tag de Descuento (% OFF)</div>
                      <div className="text-[10px] text-slate-400">Calcula y muestra % en productos con promo</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={configLive.mostrar_badge_descuento !== false}
                    onChange={(e) => handleChange('mostrar_badge_descuento', e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ TAB 3: COLORES & EFECTOS ═══════════════════ */}
          {activeTab === 'colores' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <label className="text-xs font-black text-slate-300 uppercase tracking-wider block">
                Paleta de Colores de Marca
              </label>

              {(() => {
                const colorParts = (configLive.color_principal || '#2A6348').split('|')
                const brandColor = colorParts[0] || '#2A6348'
                const textHero1 = colorParts[1] || '#ffffff'
                const textHero2 = colorParts[2] || brandColor

                const handleColorChange = (index: number, val: string) => {
                  const newParts = [...colorParts]
                  while (newParts.length < 4) {
                    newParts.push(newParts.length === 2 ? newParts[0] : '#ffffff')
                  }
                  newParts[index] = val
                  handleChange('color_principal', newParts.join('|'))
                }

                return (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Color Primario (Botones y Acentos)</label>
                      <div className="flex items-center gap-2.5">
                        <input
                          type="color"
                          value={brandColor}
                          onChange={(e) => handleColorChange(0, e.target.value)}
                          className="w-9 h-9 rounded-xl cursor-pointer bg-transparent border-0 p-0"
                        />
                        <input
                          type="text"
                          value={brandColor}
                          onChange={(e) => handleColorChange(0, e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Color Texto Línea 1</label>
                      <div className="flex items-center gap-2.5">
                        <input
                          type="color"
                          value={textHero1}
                          onChange={(e) => handleColorChange(1, e.target.value)}
                          className="w-9 h-9 rounded-xl cursor-pointer bg-transparent border-0 p-0"
                        />
                        <input
                          type="text"
                          value={textHero1}
                          onChange={(e) => handleColorChange(1, e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Color Texto Línea 2</label>
                      <div className="flex items-center gap-2.5">
                        <input
                          type="color"
                          value={textHero2}
                          onChange={(e) => handleColorChange(2, e.target.value)}
                          className="w-9 h-9 rounded-xl cursor-pointer bg-transparent border-0 p-0"
                        />
                        <input
                          type="text"
                          value={textHero2}
                          onChange={(e) => handleColorChange(2, e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Efectos de Texto Especiales */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-xs font-black text-slate-300 uppercase">Efecto Especial en Títulos</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'none', nombre: 'Sólido Clásico', desc: 'Sombra limpia' },
                    { id: 'gradient', nombre: 'Degradado Fuego', desc: 'Gradiente de 2 tonos' },
                    { id: 'neon_glow', nombre: 'Brillo Neón', desc: 'Resplandor luminoso' },
                    { id: 'stroke', nombre: 'Trazo Urbano', desc: 'Contorno exterior' },
                  ].map((ef) => (
                    <button
                      key={ef.id}
                      type="button"
                      onClick={() => handleChange('efecto_titulo_hero', ef.id)}
                      className={cn(
                        'p-2.5 rounded-xl border text-left transition-all cursor-pointer',
                        (configLive.efecto_titulo_hero || 'none') === ef.id
                          ? 'bg-emerald-950/50 border-emerald-500 text-white'
                          : 'bg-zinc-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      )}
                    >
                      <div className="text-xs font-bold text-slate-200">{ef.nombre}</div>
                      <div className="text-[10px] text-slate-400">{ef.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ TAB 4: TIPOGRAFÍA ══════════════════════════ */}
          {activeTab === 'tipografia' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-300 uppercase tracking-wider">
                  Catálogo Google Fonts
                </label>
                <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded-full font-bold">
                  10 Fuentes
                </span>
              </div>

              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {GOOGLE_FONTS_CATALOG.map((f) => {
                  const seleccionada = (configLive.fuente_hero || 'bebas') === f.id
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleChange('fuente_hero', f.id)}
                      className={cn(
                        'w-full p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between group',
                        seleccionada
                          ? 'bg-emerald-950/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                          : 'bg-zinc-900 border-slate-800 hover:border-slate-700'
                      )}
                    >
                      <div>
                        <div className={cn('text-lg leading-tight text-white uppercase', f.cssVar)}>
                          {f.nombre}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{f.categoria}</div>
                      </div>
                      {seleccionada && (
                        <div className="p-1 bg-emerald-500 text-white rounded-full">
                          <Check size={12} className="stroke-[3]" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ══════════════ TAB 5: RECURSOS & TEXTURAS ═════════════════ */}
          {activeTab === 'recursos' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-300 uppercase tracking-wider">
                  Textura y Fondo del Sitio
                </label>
              </div>

              {/* Botón Lanzador del Banco de Texturas */}
              <button
                type="button"
                onClick={() => setModalTexturasAbierto(true)}
                className="w-full p-4 bg-gradient-to-br from-emerald-950/60 to-zinc-900 border border-emerald-700/40 hover:border-emerald-500 rounded-2xl text-left transition-all shadow-xl group cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl group-hover:scale-110 transition-transform">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white">Banco de Texturas HD</div>
                    <div className="text-[10px] text-slate-400">Madera, Cemento, Mármol, Papel Kraft</div>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-500 text-white font-black px-2.5 py-1 rounded-lg shadow-sm">
                  Explorar
                </span>
              </button>

              {/* URL Personalizada o Subida Directa */}
              <div className="space-y-1 pt-2 border-t border-slate-800">
                <label className="text-xs font-bold text-slate-300 flex justify-between">
                  <span>URL de Textura Personalizada</span>
                  <label className="cursor-pointer text-emerald-400 text-[10px] bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                    <Upload size={10} className="inline mr-1" /> Subir Imagen
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && subirArchivo(e.target.files[0], 'textura_fondo_url')} />
                  </label>
                </label>
                <input
                  type="text"
                  value={configLive.textura_fondo_url || ''}
                  onChange={(e) => handleChange('textura_fondo_url', e.target.value)}
                  placeholder="https://.../textura.webp"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              {/* Logo URL */}
              <div className="space-y-1 pt-2 border-t border-slate-800">
                <label className="text-xs font-bold text-slate-300 flex justify-between">
                  <span>Logo de la Tienda</span>
                  <label className="cursor-pointer text-emerald-400 text-[10px] bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                    <Upload size={10} className="inline mr-1" /> Subir Logo
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && subirArchivo(e.target.files[0], 'logo_url')} />
                  </label>
                </label>
                <input
                  type="text"
                  value={configLive.logo_url}
                  onChange={(e) => handleChange('logo_url', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
          )}

          {/* ══════════════ TAB 6: REDES Y CONTACTO ═══════════════════ */}
          {activeTab === 'redes' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <label className="text-xs font-black text-slate-300 uppercase tracking-wider block">
                Integración de Redes Sociales
              </label>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Mensaje de WhatsApp</label>
                <textarea
                  value={configLive.whatsapp_mensaje || ''}
                  onChange={(e) => handleChange('whatsapp_mensaje', e.target.value)}
                  placeholder="¡Hola Chefsy! Hice un pedido online:"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white h-20 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Link de Instagram</label>
                <input
                  type="text"
                  value={configLive.link_instagram || ''}
                  onChange={(e) => handleChange('link_instagram', e.target.value)}
                  placeholder="https://instagram.com/tu_tienda"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Link de TikTok</label>
                <input
                  type="text"
                  value={configLive.link_tiktok || ''}
                  onChange={(e) => handleChange('link_tiktok', e.target.value)}
                  placeholder="https://tiktok.com/@tu_tienda"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── ÁREA CENTRAL DE PREVISUALIZACIÓN STUDIO (CANVAS PRO) ─────── */}
      <div className="flex-1 relative overflow-hidden flex flex-col bg-[#07090E]">
        
        {/* BARRA SUPERIOR STUDIO: EMULADORES, ZOOM, UNDO/REDO */}
        <div className="h-14 border-b border-slate-800/80 bg-zinc-950/90 backdrop-blur-xl px-6 flex items-center justify-between shrink-0 z-40">
          
          {/* Deshacer / Rehacer */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
              title="Deshacer (Ctrl + Z)"
            >
              <Undo2 size={15} />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
              title="Rehacer (Ctrl + Y)"
            >
              <Redo2 size={15} />
            </button>
          </div>

          {/* Emuladores Multi-Dispositivo */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-slate-800 p-1 rounded-2xl shadow-inner">
            <button
              type="button"
              onClick={() => setDispositivo('desktop')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                dispositivo === 'desktop' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              )}
            >
              <Monitor size={14} />
              <span className="hidden md:inline">Escritorio</span>
            </button>

            <button
              type="button"
              onClick={() => setDispositivo('ios')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                dispositivo === 'ios' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              )}
            >
              <Smartphone size={14} />
              <span>iPhone 16 Pro</span>
            </button>

            <button
              type="button"
              onClick={() => setDispositivo('android')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                dispositivo === 'android' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              )}
            >
              <Smartphone size={14} />
              <span>Android Galaxy</span>
            </button>

            <button
              type="button"
              onClick={() => setDispositivo('tablet')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                dispositivo === 'tablet' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              )}
            >
              <Tablet size={14} />
              <span className="hidden sm:inline">iPad Tablet</span>
            </button>
          </div>

          {/* Zoom del Canvas */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setZoomCanvas((prev) => Math.max(50, prev - 15))}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
              title="Alejar"
            >
              <ZoomOut size={14} />
            </button>
            <span className="text-xs font-mono font-bold text-slate-300 w-10 text-center">
              {zoomCanvas}%
            </span>
            <button
              type="button"
              onClick={() => setZoomCanvas((prev) => Math.min(125, prev + 15))}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
              title="Acercar"
            >
              <ZoomIn size={14} />
            </button>
          </div>
        </div>

        {/* Notificación Toast de Guardado */}
        {toastGuardado && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl font-black text-xs flex items-center gap-2.5 animate-in fade-in slide-in-from-top-4 duration-300 border border-emerald-400/40">
            <CheckCircle2 size={18} />
            <span>¡Diseño guardado y publicado en la tienda en vivo!</span>
          </div>
        )}

        {/* CONTENEDOR DEL CANVAS CON ZOOM Y MARCOS REALISTAS */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-6 md:p-10 relative">
          
          <ConfiguracionContext.Provider
            value={{
              configuracion: {
                ...configLive,
                palabras_animadas: palabrasText.split(',').map((s) => s.trim()).filter(Boolean),
              },
              setConfiguracion: setConfigLive,
              cargando: false,
            }}
          >
            <div
              style={{
                transform: `scale(${zoomCanvas / 100})`,
                transformOrigin: 'center center',
                transition: 'transform 0.2s ease-out',
              }}
              className="shrink-0 flex items-center justify-center"
            >
              
              {/* VISTA 1: ESCRITORIO (100% WIDTH) */}
              {dispositivo === 'desktop' && (
                <div className="w-[1280px] h-[820px] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden bg-black flex flex-col">
                  <div className="h-7 bg-zinc-900 border-b border-slate-800 px-4 flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    <span className="text-[10px] text-slate-400 font-mono mx-auto">https://chefsy.xyz</span>
                  </div>
                  <div className="flex-1 overflow-y-auto scrollbar-none">
                    <PaginaTienda isMobileOverride={false} />
                  </div>
                </div>
              )}

              {/* VISTA 2: IPHONE 16 PRO (CON DYNAMIC ISLAND Y MARCO DE TITANIO) */}
              {dispositivo === 'ios' && (
                <div className="w-[390px] h-[844px] rounded-[52px] border-[12px] border-zinc-800 shadow-2xl relative overflow-hidden bg-black shrink-0 ring-1 ring-white/20">
                  {/* Dynamic Island */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-50 pointer-events-none flex items-center justify-end px-3">
                    <div className="w-3 h-3 rounded-full bg-slate-900/80 border border-slate-800" />
                  </div>
                  <div className="w-full h-full overflow-y-auto scrollbar-none pt-4">
                    <PaginaTienda isMobileOverride={true} />
                  </div>
                </div>
              )}

              {/* VISTA 3: ANDROID GALAXY (CON PUNCH HOLE) */}
              {dispositivo === 'android' && (
                <div className="w-[412px] h-[860px] rounded-[40px] border-[10px] border-zinc-900 shadow-2xl relative overflow-hidden bg-black shrink-0 ring-1 ring-slate-800">
                  {/* Camera Punch Hole */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-black rounded-full z-50 pointer-events-none border border-slate-800" />
                  <div className="w-full h-full overflow-y-auto scrollbar-none pt-3">
                    <PaginaTienda isMobileOverride={true} />
                  </div>
                </div>
              )}

              {/* VISTA 4: TABLET / IPAD */}
              {dispositivo === 'tablet' && (
                <div className="w-[768px] h-[900px] rounded-[36px] border-[14px] border-zinc-900 shadow-2xl relative overflow-hidden bg-black shrink-0 ring-1 ring-slate-800">
                  <div className="w-full h-full overflow-y-auto scrollbar-none">
                    <PaginaTienda isMobileOverride={false} />
                  </div>
                </div>
              )}

            </div>
          </ConfiguracionContext.Provider>
        </div>

        {/* Badge Flotante "Live Canvas" */}
        <div className="absolute bottom-5 right-6 flex items-center gap-2 pointer-events-none z-30">
          <div className="bg-zinc-900/90 border border-white/10 text-white px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-2xl backdrop-blur-md">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Chefsy Engine Activo</span>
          </div>
        </div>
      </div>

      {/* MODAL: BANCO DE TEXTURAS HD */}
      <BancoTexturasModal
        abierto={modalTexturasAbierto}
        texturaActual={configLive.textura_fondo_url}
        onCerrar={() => setModalTexturasAbierto(false)}
        onSeleccionarTextura={(url) => handleChange('textura_fondo_url', url)}
      />

      {/* MODAL: HISTORIAL DE VERSIONES */}
      <HistorialVersionesModal
        abierto={modalHistorialAbierto}
        configActual={configLive}
        onCerrar={() => setModalHistorialAbierto(false)}
        onRestaurarVersion={(config) => registrarCambio(config)}
      />

    </div>
  )
}

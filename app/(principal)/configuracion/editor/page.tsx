'use client'

import React, { useState, useEffect } from 'react'
import { ConfiguracionContext } from '@/contexto/ConfiguracionTiendaContexto'
import { ConfiguracionTienda, obtenerConfiguracionTienda, actualizarConfiguracionTienda } from '@/servicios/supabase/configuracion'
import { Save, ArrowLeft, Image as ImageIcon, Type, Palette, Upload, Loader2 } from 'lucide-react'
import Link from 'next/link'
import PaginaTienda from '@/app/page'

export default function EditorTienda() {
  const [configLive, setConfigLive] = useState<ConfiguracionTienda | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [subiendoImagen, setSubiendoImagen] = useState<'logo_url' | 'hero_image_url' | null>(null)
  const [dragOver, setDragOver] = useState<'logo_url' | 'hero_image_url' | null>(null)

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

  // Inyectar el color primario en vivo para previsualización
  useEffect(() => {
    if (configLive?.color_principal) {
      document.documentElement.style.setProperty('--chefsy-main', configLive.color_principal)
    }
  }, [configLive?.color_principal])

  const handleSave = async () => {
    if (!configLive) return
    setGuardando(true)
    const success = await actualizarConfiguracionTienda({
      ...configLive,
      palabras_animadas: palabrasText.split(',').map(s => s.trim()).filter(Boolean)
    })
    setGuardando(false)
    if (success) {
      alert('¡Diseño guardado exitosamente y publicado en vivo!')
    } else {
      alert('Error al guardar el diseño.')
    }
  }

  const handleDrop = async (e: React.DragEvent, tipo: 'logo_url' | 'hero_image_url') => {
    e.preventDefault()
    setDragOver(null)
    const file = e.dataTransfer.files[0]
    if (!file) return
    await procesarYSubirImagen(file, tipo)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, tipo: 'logo_url' | 'hero_image_url') => {
    const file = e.target.files?.[0]
    if (!file) return
    await procesarYSubirImagen(file, tipo)
  }

  const procesarYSubirImagen = async (file: File, tipo: 'logo_url' | 'hero_image_url') => {
    try {
      setSubiendoImagen(tipo)
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const uploadRes = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagen: base64Data })
      })

      const uploadData = await uploadRes.json()
      if (uploadData.error) throw new Error(uploadData.error)
      
      const nuevaUrl = uploadData.urlOriginal || uploadData.urlTransformada
      handleChange(tipo, nuevaUrl)
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Error al subir la imagen.')
    } finally {
      setSubiendoImagen(null)
    }
  }

  const handleChange = (field: keyof ConfiguracionTienda, value: any) => {
    if (configLive) {
      setConfigLive({ ...configLive, [field]: value })
    }
  }

  if (cargando || !configLive) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-bold">Cargando Editor...</div>
  }

  return (
    <div className="flex h-screen w-full bg-slate-900 overflow-hidden">
      {/* PANEL LATERAL DEL EDITOR */}
      <div className="w-80 bg-zinc-950 border-r border-slate-800 flex flex-col z-50 shadow-2xl relative">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <Link href="/configuracion" className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <h2 className="font-extrabold text-white text-sm">Editor en Vivo</h2>
          <button 
            onClick={handleSave} 
            disabled={guardando}
            className="flex items-center gap-1.5 bg-chefsy hover:bg-chefsy-400 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
          >
            <Save size={14} />
            {guardando ? '...' : 'Guardar'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
          
          {/* SECCIÓN COLORES */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <Palette size={14} /> Colores
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Color Principal de la Marca</label>
              <div className="flex items-center gap-3">
                <input 
                  type="color" 
                  value={configLive.color_principal}
                  onChange={(e) => handleChange('color_principal', e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0"
                />
                <input 
                  type="text" 
                  value={configLive.color_principal}
                  onChange={(e) => handleChange('color_principal', e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-chefsy-400"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-800" />

          {/* SECCIÓN TIPOGRAFÍA */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <Type size={14} /> Tipografía
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Fuente del Menú y Tienda</label>
              <select 
                value={configLive.fuente_principal || 'bebas'}
                onChange={(e) => handleChange('fuente_principal', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-chefsy-400"
              >
                <option value="bebas">Bebas Neue (Urbana / Impactante)</option>
                <option value="montserrat">Montserrat (Moderna / Limpia)</option>
                <option value="inter">Inter (Minimalista / Legible)</option>
                <option value="anton">Anton (Gruesa / Callejera)</option>
              </select>
            </div>
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-slate-300">Fuente del Hero (Texto Gigante)</label>
              <select 
                value={configLive.fuente_hero || 'bebas'}
                onChange={(e) => handleChange('fuente_hero', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-chefsy-400"
              >
                <option value="bebas">Bebas Neue (Urbana / Impactante)</option>
                <option value="montserrat">Montserrat (Moderna / Limpia)</option>
                <option value="inter">Inter (Minimalista / Legible)</option>
                <option value="anton">Anton (Gruesa / Callejera)</option>
              </select>
            </div>
          </div>

          <hr className="border-slate-800" />

          {/* SECCIÓN TEXTOS */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <Type size={14} /> Textos del Inicio
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Banner Promocional (Aparece arriba de todo)</label>
              <input 
                type="text" 
                value={configLive.banner_promocional || ''}
                onChange={(e) => handleChange('banner_promocional', e.target.value)}
                placeholder="Ej: 🔥 Envío gratis superando los $15.000"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-chefsy-400 mb-2"
              />
              <div className="flex items-center gap-2 mb-2">
                <input 
                  type="checkbox" 
                  id="banner_animado"
                  checked={configLive.banner_animado || false}
                  onChange={(e) => handleChange('banner_animado', e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-800 text-chefsy-400 focus:ring-chefsy-400"
                />
                <label htmlFor="banner_animado" className="text-xs text-slate-300 cursor-pointer">Texto en movimiento (Marquesina)</label>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-300">Color del Banner:</label>
                <input 
                  type="color" 
                  value={configLive.banner_color || '#2A6348'}
                  onChange={(e) => handleChange('banner_color', e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-2">Dejalo vacío para ocultarlo.</p>
            </div>
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-slate-300">Texto Gigante: Línea 1</label>
              <input 
                type="text" 
                value={configLive.hero_linea_1}
                onChange={(e) => handleChange('hero_linea_1', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-chefsy-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Texto Gigante: Línea 2</label>
              <input 
                type="text" 
                value={configLive.hero_linea_2}
                onChange={(e) => handleChange('hero_linea_2', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-chefsy-400"
              />
            </div>
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-slate-300">Frase Menú (Ej. ¿Qué pinta hoy?)</label>
              <input 
                type="text" 
                value={configLive.titulo_principal}
                onChange={(e) => handleChange('titulo_principal', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-chefsy-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Palabras Animadas (separadas por coma)</label>
              <textarea 
                value={palabrasText}
                onChange={(e) => setPalabrasText(e.target.value)}
                rows={3}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-chefsy-400 resize-none"
              />
            </div>
          </div>

          <hr className="border-slate-800" />

          {/* SECCIÓN IMÁGENES */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <ImageIcon size={14} /> Imágenes (URLs)
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                URL del Logo
                <label className="cursor-pointer text-chefsy-400 hover:text-chefsy-300 flex items-center gap-1 bg-chefsy-400/10 px-2 py-1 rounded text-[10px] transition-colors">
                  <Upload size={10} /> Subir
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'logo_url')} />
                </label>
              </label>
              <div 
                className={`relative w-full rounded-lg border-2 transition-all ${dragOver === 'logo_url' ? 'border-chefsy-400 bg-chefsy-400/10 border-dashed scale-[1.02]' : 'border-transparent'}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver('logo_url') }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => handleDrop(e, 'logo_url')}
              >
                <input 
                  type="text" 
                  value={configLive.logo_url}
                  onChange={(e) => handleChange('logo_url', e.target.value)}
                  disabled={subiendoImagen === 'logo_url'}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-chefsy-400 disabled:opacity-50"
                  placeholder="Arrastrá una imagen acá o pegá la URL..."
                />
                {subiendoImagen === 'logo_url' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 rounded-lg backdrop-blur-sm">
                    <Loader2 size={16} className="animate-spin text-chefsy-400" />
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                URL de la Portada
                <label className="cursor-pointer text-chefsy-400 hover:text-chefsy-300 flex items-center gap-1 bg-chefsy-400/10 px-2 py-1 rounded text-[10px] transition-colors">
                  <Upload size={10} /> Subir
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'hero_image_url')} />
                </label>
              </label>
              <div 
                className={`relative w-full rounded-lg border-2 transition-all ${dragOver === 'hero_image_url' ? 'border-chefsy-400 bg-chefsy-400/10 border-dashed scale-[1.02]' : 'border-transparent'}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver('hero_image_url') }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => handleDrop(e, 'hero_image_url')}
              >
                <input 
                  type="text" 
                  value={configLive.hero_image_url}
                  onChange={(e) => handleChange('hero_image_url', e.target.value)}
                  disabled={subiendoImagen === 'hero_image_url'}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-chefsy-400 disabled:opacity-50"
                  placeholder="Arrastrá una imagen acá o pegá la URL..."
                />
                {subiendoImagen === 'hero_image_url' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 rounded-lg backdrop-blur-sm">
                    <Loader2 size={16} className="animate-spin text-chefsy-400" />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 pt-2 border border-slate-800 rounded-xl p-3 bg-slate-900/50">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                Posicionamiento de Imagen (Estilo Canva)
              </label>
              
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Izquierda</span>
                  <span>Horizontal (X)</span>
                  <span>Derecha</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="100" 
                  value={configLive.hero_pos_x ?? 50} 
                  onChange={(e) => handleChange('hero_pos_x', parseInt(e.target.value))}
                  className="w-full accent-chefsy-400"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Arriba</span>
                  <span>Vertical (Y)</span>
                  <span>Abajo</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="100" 
                  value={configLive.hero_pos_y ?? 50} 
                  onChange={(e) => handleChange('hero_pos_y', parseInt(e.target.value))}
                  className="w-full accent-chefsy-400"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Alejar</span>
                  <span>Zoom / Escala</span>
                  <span>Acercar</span>
                </div>
                <input 
                  type="range" 
                  min="50" max="150" 
                  value={configLive.hero_escala ?? 100} 
                  onChange={(e) => handleChange('hero_escala', parseInt(e.target.value))}
                  className="w-full accent-chefsy-400"
                />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ÁREA DE PREVISUALIZACIÓN EN VIVO */}
      <div className="flex-1 relative overflow-y-auto bg-black">
        {/* Usamos el Provider pero con nuestro estado 'en vivo' inyectado artificialmente */}
        <ConfiguracionContext.Provider value={{
          configuracion: {
            ...configLive,
            palabras_animadas: palabrasText.split(',').map(s => s.trim()).filter(Boolean)
          },
          setConfiguracion: setConfigLive,
          cargando: false
        }}>
          {/* Desactivamos interacciones molestas en el editor para enfocarnos en visuales */}
          <div className="pointer-events-none-if-needed">
            <PaginaTienda />
          </div>
        </ConfiguracionContext.Provider>
        
        {/* Etiqueta flotante */}
        <div className="absolute bottom-6 right-6 bg-slate-900/80 backdrop-blur border border-white/10 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 pointer-events-none">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Previsualización en vivo
        </div>
      </div>

    </div>
  )
}

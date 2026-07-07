'use client'

import React, { useState, useEffect } from 'react'
import { ConfiguracionContext } from '@/contexto/ConfiguracionTiendaContexto'
import { ConfiguracionTienda, obtenerConfiguracionTienda, actualizarConfiguracionTienda } from '@/servicios/supabase/configuracion'
import { Save, ArrowLeft, Image as ImageIcon, Type, Palette, Upload, Loader2, Share2, Square, Smartphone } from 'lucide-react'
import Link from 'next/link'
import PaginaTienda from '@/app/page'

export default function EditorTienda() {
  const [configLive, setConfigLive] = useState<ConfiguracionTienda | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [subiendoImagen, setSubiendoImagen] = useState<'logo_url' | 'hero_image_url' | 'hero_image_secundaria' | 'textura_fondo_url' | null>(null)
  const [dragOver, setDragOver] = useState<'logo_url' | 'hero_image_url' | 'hero_image_secundaria' | 'textura_fondo_url' | null>(null)
  const [isMobilePreview, setIsMobilePreview] = useState(false)

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

  const handleDrop = async (e: React.DragEvent, tipo: 'logo_url' | 'hero_image_url' | 'hero_image_secundaria' | 'textura_fondo_url') => {
    e.preventDefault()
    setDragOver(null)
    const file = e.dataTransfer.files[0]
    if (!file) return
    await procesarYSubirImagen(file, tipo)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, tipo: 'logo_url' | 'hero_image_url' | 'hero_image_secundaria' | 'textura_fondo_url') => {
    const file = e.target.files?.[0]
    if (!file) return
    await procesarYSubirImagen(file, tipo)
  }

  const optimizarImagenCliente = (file: File, maxWidth = 1200, quality = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/') || file.type.includes('svg') || file.type.includes('gif')) {
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

          canvas.toBlob((blob) => {
            if (!blob) {
              resolve(file)
              return
            }
            const nombreSinExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
            const compressedFile = new File([blob], `${nombreSinExt}_opt.webp`, {
              type: 'image/webp',
              lastModified: Date.now()
            })
            resolve(compressedFile)
          }, 'image/webp', quality)
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  const procesarYSubirImagen = async (file: File, tipo: 'logo_url' | 'hero_image_url' | 'hero_image_secundaria' | 'textura_fondo_url') => {
    try {
      setSubiendoImagen(tipo)

      const maxWidth = tipo === 'logo_url' ? 600 : 1200
      const fileParaSubir = await optimizarImagenCliente(file, maxWidth, 0.82)

      let oldUrl = ''
      if (tipo === 'hero_image_secundaria') {
        oldUrl = configLive?.hero_image_url?.split('|')[1]?.trim() || ''
      } else if (tipo === 'hero_image_url') {
        oldUrl = configLive?.hero_image_url?.split('|')[0]?.trim() || ''
      } else {
        oldUrl = configLive?.[tipo as keyof ConfiguracionTienda] as string
      }

      const oldUrlParam = oldUrl && typeof oldUrl === 'string' && oldUrl.includes('supabase.co') 
        ? `?oldUrl=${encodeURIComponent(oldUrl)}` 
        : ''

      const uploadRes = await fetch(`/api/admin/upload${oldUrlParam}`, {
        method: 'POST',
        headers: {
          'Content-Type': fileParaSubir.type || 'application/octet-stream',
          'X-File-Name': encodeURIComponent(fileParaSubir.name)
        },
        body: fileParaSubir
      })

      const uploadData = await uploadRes.json()
      if (uploadData.error) throw new Error(uploadData.error)
      
      const nuevaUrl = uploadData.urlOriginal || uploadData.urlTransformada
      
      if (tipo === 'hero_image_secundaria') {
         const img1 = configLive?.hero_image_url?.split('|')[0]?.trim() || ''
         handleChange('hero_image_url', `${img1}|${nuevaUrl}`)
      } else if (tipo === 'hero_image_url') {
         const img2 = configLive?.hero_image_url?.split('|')[1]?.trim() || ''
         handleChange('hero_image_url', `${nuevaUrl}${img2 ? '|' + img2 : ''}`)
      } else {
         handleChange(tipo as keyof ConfiguracionTienda, nuevaUrl)
      }
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
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <Palette size={14} /> Colores
              </div>
              <button 
                onClick={() => setIsMobilePreview(!isMobilePreview)}
                title={isMobilePreview ? 'Volver a Escritorio' : 'Emular Celular'}
                className={`p-1.5 rounded-md transition-all shadow-sm ${
                  isMobilePreview 
                    ? 'bg-chefsy text-white' 
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                <Smartphone size={14} />
              </button>
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
                  newParts.push(newParts.length === 2 ? newParts[0] : (newParts.length === 1 || newParts.length === 3 ? '#ffffff' : newParts[0]))
                }
                newParts[index] = val
                handleChange('color_principal', newParts.join('|'))
              }

              return (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-300 block">Color Principal de la Marca</label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="color" 
                        value={brandColor}
                        onChange={(e) => handleColorChange(0, e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                      />
                      <input 
                        type="text" 
                        value={brandColor}
                        onChange={(e) => handleColorChange(0, e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-chefsy-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-300 block">Color de Texto Gigante: Línea 1</label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="color" 
                        value={textHero1}
                        onChange={(e) => handleColorChange(1, e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                      />
                      <input 
                        type="text" 
                        value={textHero1}
                        onChange={(e) => handleColorChange(1, e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-chefsy-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-300 block">Color de Texto Gigante: Línea 2</label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="color" 
                        value={textHero2}
                        onChange={(e) => handleColorChange(2, e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                      />
                      <input 
                        type="text" 
                        value={textHero2}
                        onChange={(e) => handleColorChange(2, e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-chefsy-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-300 block">Color de Frase/Títulos del Menú</label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="color" 
                        value={textMenu}
                        onChange={(e) => handleColorChange(3, e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                      />
                      <input 
                        type="text" 
                        value={textMenu}
                        onChange={(e) => handleColorChange(3, e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-chefsy-400"
                      />
                    </div>
                  </div>
                </div>
              )
            })()}

            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-slate-300">Textura de Fondo (Opcional)</label>
              <div className="flex items-center justify-between text-[10px] text-slate-500 pb-1">
                <span>Formatos: JPG, PNG, WEBP, MP4, WEBM</span>
              </div>
              <label className="block w-full cursor-pointer">
                <div className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 px-4 rounded-lg text-xs font-bold transition-colors">
                  <Upload size={10} /> Subir Textura o Video
                  <input type="file" accept="image/*,video/mp4,video/webm" className="hidden" onChange={(e) => handleFileChange(e, 'textura_fondo_url')} />
                </div>
              </label>
              <div 
                className={`relative w-full rounded-lg border-2 transition-all ${dragOver === 'textura_fondo_url' ? 'border-chefsy-400 bg-chefsy-400/10 border-dashed scale-[1.02]' : 'border-transparent'}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver('textura_fondo_url') }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => handleDrop(e, 'textura_fondo_url')}
              >
                <input 
                  type="text" 
                  value={configLive.textura_fondo_url || ''}
                  onChange={(e) => handleChange('textura_fondo_url', e.target.value)}
                  disabled={subiendoImagen === 'textura_fondo_url'}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-chefsy-400 disabled:opacity-50"
                  placeholder="Arrastrá textura acá o pegá la URL..."
                />
                {subiendoImagen === 'textura_fondo_url' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 rounded-lg backdrop-blur-sm">
                    <Loader2 size={16} className="animate-spin text-chefsy-400" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <hr className="border-slate-800" />

          {/* SECCIÓN FORMAS Y BORDES */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <Square size={14} /> Botones y Formas
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Estilo de Bordes</label>
              <select 
                value={configLive.estilo_bordes || 'suaves'}
                onChange={(e) => handleChange('estilo_bordes', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-chefsy-400"
              >
                <option value="cuadrados">Cuadrados y Agresivos</option>
                <option value="suaves">Suaves y Amigables</option>
                <option value="pildora">Modernos (Píldora)</option>
              </select>
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
                URL de la Portada Principal
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
                  value={configLive.hero_image_url?.split('|')[0]?.trim() || ''}
                  onChange={(e) => {
                     const img2 = configLive.hero_image_url?.split('|')[1]?.trim() || ''
                     handleChange('hero_image_url', `${e.target.value}${img2 ? '|' + img2 : ''}`)
                  }}
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

            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                URL de la Portada Secundaria
                <label className="cursor-pointer text-chefsy-400 hover:text-chefsy-300 flex items-center gap-1 bg-chefsy-400/10 px-2 py-1 rounded text-[10px] transition-colors">
                  <Upload size={10} /> Subir
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'hero_image_secundaria')} />
                </label>
              </label>
              <div 
                className={`relative w-full rounded-lg border-2 transition-all ${dragOver === 'hero_image_secundaria' ? 'border-chefsy-400 bg-chefsy-400/10 border-dashed scale-[1.02]' : 'border-transparent'}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver('hero_image_secundaria') }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => handleDrop(e, 'hero_image_secundaria')}
              >
                <input 
                  type="text" 
                  value={configLive.hero_image_url?.split('|')[1]?.trim() || ''}
                  onChange={(e) => {
                     const img1 = configLive.hero_image_url?.split('|')[0]?.trim() || ''
                     handleChange('hero_image_url', `${img1}|${e.target.value}`)
                  }}
                  disabled={subiendoImagen === 'hero_image_secundaria'}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-chefsy-400 disabled:opacity-50"
                  placeholder="Arrastrá una imagen acá o pegá la URL..."
                />
                {subiendoImagen === 'hero_image_secundaria' && (
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

            <div className="space-y-4 pt-2 border border-slate-800 rounded-xl p-3 bg-slate-900/50">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                Posicionamiento de Portada Secundaria
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
                  value={(() => {
                    const url = configLive.hero_image_url?.split('|')[1]?.trim() || '';
                    if (!url) return 50;
                    try { const p = new URL(url.startsWith('http') ? url : `http://localhost${url}`); return parseInt(p.searchParams.get('px') || '50'); } catch(e) { return 50; }
                  })()} 
                  onChange={(e) => {
                    const img1 = configLive.hero_image_url?.split('|')[0]?.trim() || '';
                    const url = configLive.hero_image_url?.split('|')[1]?.trim() || '';
                    if (!url) return;
                    try {
                      const isRelative = !url.startsWith('http');
                      const p = new URL(isRelative ? `http://localhost${url}` : url);
                      p.searchParams.set('px', e.target.value);
                      handleChange('hero_image_url', `${img1}|${isRelative ? p.pathname + p.search : p.toString()}`);
                    } catch(e) {}
                  }}
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
                  value={(() => {
                    const url = configLive.hero_image_url?.split('|')[1]?.trim() || '';
                    if (!url) return 50;
                    try { const p = new URL(url.startsWith('http') ? url : `http://localhost${url}`); return parseInt(p.searchParams.get('py') || '50'); } catch(e) { return 50; }
                  })()} 
                  onChange={(e) => {
                    const img1 = configLive.hero_image_url?.split('|')[0]?.trim() || '';
                    const url = configLive.hero_image_url?.split('|')[1]?.trim() || '';
                    if (!url) return;
                    try {
                      const isRelative = !url.startsWith('http');
                      const p = new URL(isRelative ? `http://localhost${url}` : url);
                      p.searchParams.set('py', e.target.value);
                      handleChange('hero_image_url', `${img1}|${isRelative ? p.pathname + p.search : p.toString()}`);
                    } catch(e) {}
                  }}
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
                  value={(() => {
                    const url = configLive.hero_image_url?.split('|')[1]?.trim() || '';
                    if (!url) return 100;
                    try { const p = new URL(url.startsWith('http') ? url : `http://localhost${url}`); return parseInt(p.searchParams.get('scale') || '100'); } catch(e) { return 100; }
                  })()} 
                  onChange={(e) => {
                    const img1 = configLive.hero_image_url?.split('|')[0]?.trim() || '';
                    const url = configLive.hero_image_url?.split('|')[1]?.trim() || '';
                    if (!url) return;
                    try {
                      const isRelative = !url.startsWith('http');
                      const p = new URL(isRelative ? `http://localhost${url}` : url);
                      p.searchParams.set('scale', e.target.value);
                      handleChange('hero_image_url', `${img1}|${isRelative ? p.pathname + p.search : p.toString()}`);
                    } catch(e) {}
                  }}
                  className="w-full accent-chefsy-400"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-800" />

          {/* SECCIÓN INTEGRACIONES */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <Share2 size={14} /> Contacto y Redes
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Mensaje predeterminado de WhatsApp</label>
              <textarea 
                value={configLive.whatsapp_mensaje || ''}
                onChange={(e) => handleChange('whatsapp_mensaje', e.target.value)}
                placeholder="Ej: ¡Hola Chefsy! Hice un pedido online:"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-chefsy-400 h-20 resize-none"
              />
              <p className="text-[10px] text-slate-500">Este texto aparecerá primero en el mensaje que te manden.</p>
            </div>
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-slate-300">Link de Instagram</label>
              <input 
                type="text" 
                value={configLive.link_instagram || ''}
                onChange={(e) => handleChange('link_instagram', e.target.value)}
                placeholder="https://instagram.com/tu_tienda"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-chefsy-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Link de TikTok</label>
              <input 
                type="text" 
                value={configLive.link_tiktok || ''}
                onChange={(e) => handleChange('link_tiktok', e.target.value)}
                placeholder="https://tiktok.com/@tu_tienda"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-chefsy-400"
              />
            </div>
          </div>

        </div>
      </div>

      {/* ÁREA DE PREVISUALIZACIÓN EN VIVO */}
      <div className={`flex-1 relative overflow-y-auto ${isMobilePreview ? 'bg-[#0B0F19] flex items-center justify-center p-8' : 'bg-black'}`}>
        <ConfiguracionContext.Provider value={{
          configuracion: {
            ...configLive,
            palabras_animadas: palabrasText.split(',').map(s => s.trim()).filter(Boolean)
          },
          setConfiguracion: setConfigLive,
          cargando: false
        }}>
          {isMobilePreview ? (
            <div className="w-[375px] h-[812px] max-h-full rounded-[40px] border-[14px] border-zinc-900 shadow-2xl relative overflow-hidden bg-black shrink-0 transition-all duration-500">
               {/* "Notch" */}
               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-900 rounded-b-2xl z-50 pointer-events-none"></div>
               <div className="w-full h-full overflow-y-auto no-scrollbar pointer-events-none-if-needed">
                 <PaginaTienda isMobileOverride={true} />
               </div>
            </div>
          ) : (
            <div className="pointer-events-none-if-needed w-full h-full">
              <PaginaTienda />
            </div>
          )}
        </ConfiguracionContext.Provider>
        
        {/* Etiqueta flotante */}
        <div className="absolute bottom-6 right-6 flex items-center gap-3">
          <div className="bg-slate-900/90 backdrop-blur border border-white/10 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 pointer-events-none shadow-xl">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Previsualización en vivo
          </div>
        </div>
      </div>

    </div>
  )
}

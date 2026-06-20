'use client'

import React, { useState, useEffect } from 'react'
import { ConfiguracionContext } from '@/contexto/ConfiguracionTiendaContexto'
import { ConfiguracionTienda, obtenerConfiguracionTienda, actualizarConfiguracionTienda } from '@/servicios/supabase/configuracion'
import { Save, ArrowLeft, Image as ImageIcon, Type, Palette } from 'lucide-react'
import Link from 'next/link'
import PaginaTienda from '@/app/page'

export default function EditorTienda() {
  const [configLive, setConfigLive] = useState<ConfiguracionTienda | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [cargando, setCargando] = useState(true)

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

  const handleChange = (field: keyof ConfiguracionTienda, value: string) => {
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

          {/* SECCIÓN TEXTOS */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <Type size={14} /> Textos del Inicio
            </div>
            <div className="space-y-2">
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
              <label className="text-xs font-bold text-slate-300">URL del Logo</label>
              <input 
                type="text" 
                value={configLive.logo_url}
                onChange={(e) => handleChange('logo_url', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-chefsy-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">URL de la Portada</label>
              <input 
                type="text" 
                value={configLive.hero_image_url}
                onChange={(e) => handleChange('hero_image_url', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-chefsy-400"
              />
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

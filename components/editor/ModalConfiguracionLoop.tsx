'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { X, Plus, Trash2, Upload, Loader2, Sparkles, Clock, Check, RefreshCw, Image as ImageIcon } from 'lucide-react'
import { ImagenLoopHero, IMAGENES_LOOP_DEFAULT } from '@/servicios/supabase/configuracion'
import { cn } from '@/lib/utils'

interface Props {
  abierto: boolean
  imagenes: ImagenLoopHero[]
  onCerrar: () => void
  onGuardar: (imagenes: ImagenLoopHero[]) => void
}

export default function ModalConfiguracionLoop({
  abierto,
  imagenes,
  onCerrar,
  onGuardar,
}: Props) {
  const [lista, setLista] = useState<ImagenLoopHero[]>([])
  const [subiendoIndex, setSubiendoIndex] = useState<number | null>(null)
  const [errorSubida, setErrorSubida] = useState<string | null>(null)
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({})

  useEffect(() => {
    if (abierto) {
      if (imagenes && imagenes.length > 0) {
        setLista(imagenes.map(item => ({ ...item })))
      } else {
        setLista(IMAGENES_LOOP_DEFAULT.map(item => ({ ...item })))
      }
      setErrorSubida(null)
    }
  }, [abierto, imagenes])

  if (!abierto) return null

  const handleAgregarSlot = () => {
    if (lista.length >= 4) return
    const nuevo: ImagenLoopHero = {
      id: `loop-${Date.now()}-${lista.length + 1}`,
      url: '/burger-hero.png',
      duracionSegundos: 4,
    }
    setLista([...lista, nuevo])
  }

  const handleEliminarSlot = (index: number) => {
    if (lista.length <= 1) return
    setLista(lista.filter((_, i) => i !== index))
  }

  const handleActualizarUrl = (index: number, url: string) => {
    setLista(prev => prev.map((item, i) => i === index ? { ...item, url } : item))
  }

  const handleActualizarDuracion = (index: number, duracionSegundos: number) => {
    setLista(prev => prev.map((item, i) => i === index ? { ...item, duracionSegundos } : item))
  }

  const handleSubirArchivo = async (file: File, index: number) => {
    try {
      setSubiendoIndex(index)
      setErrorSubida(null)

      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const urlSubida = data.url || data.urlOriginal || data.urlTransformada
      if (urlSubida) {
        handleActualizarUrl(index, urlSubida)
      }
    } catch (err: any) {
      console.error(err)
      setErrorSubida(err.message || 'Error al subir la imagen.')
    } finally {
      setSubiendoIndex(null)
    }
  }

  const handleRestaurarDefecto = () => {
    setLista(IMAGENES_LOOP_DEFAULT.map(item => ({ ...item })))
  }

  const handleGuardar = () => {
    onGuardar(lista)
    onCerrar()
  }

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="bg-zinc-950 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <RefreshCw size={20} className="animate-spin-slow" />
            </div>
            <div>
              <h3 className="font-black text-white text-base tracking-wide flex items-center gap-2">
                <span>Loop de Imágenes (Marco 9:16)</span>
                <span className="text-[10px] bg-emerald-950 border border-emerald-800 text-emerald-400 px-2 py-0.5 rounded-full font-mono">
                  {lista.length}/4 fotos
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Configura hasta 4 imágenes en rotación continua y define la duración individual de cada una.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mensaje de error si falla subida */}
        {errorSubida && (
          <div className="px-5 py-2.5 bg-red-950/60 border-b border-red-900/50 text-red-300 text-xs flex items-center justify-between">
            <span>{errorSubida}</span>
            <button onClick={() => setErrorSubida(null)} className="text-red-400 hover:text-white">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Contenido / Lista de Slots de Imágenes */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {lista.map((item, index) => {
            const estaSubiendo = subiendoIndex === index
            return (
              <div
                key={item.id || index}
                className="p-4 rounded-2xl bg-zinc-900/80 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
              >
                {/* 1. Miniatura Preview 9:16 */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="relative w-16 h-28 rounded-xl overflow-hidden bg-black border border-white/10 shadow-md shrink-0 flex items-center justify-center">
                    {item.url ? (
                      <Image
                        src={item.url}
                        alt={`Slide ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <ImageIcon className="text-slate-600" size={20} />
                    )}

                    {estaSubiendo && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20">
                        <Loader2 className="animate-spin text-emerald-400" size={18} />
                      </div>
                    )}

                    <span className="absolute bottom-1 right-1 bg-black/80 backdrop-blur-sm text-white text-[9px] font-bold px-1 rounded z-10 font-mono">
                      #{index + 1}
                    </span>
                  </div>

                  <div className="sm:hidden flex flex-col">
                    <span className="text-xs font-bold text-white">Imagen #{index + 1}</span>
                    <span className="text-[11px] text-emerald-400 font-mono">
                      {item.duracionSegundos || 4} segundos
                    </span>
                  </div>
                </div>

                {/* 2. Controles de URL y Carga */}
                <div className="flex-1 w-full space-y-2.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.url}
                      onChange={(e) => handleActualizarUrl(index, e.target.value)}
                      placeholder="https://... o ruta /imagen.jpg"
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono outline-none focus:border-emerald-500 transition-colors"
                    />

                    {/* Botón Subir Archivo */}
                    <input
                      ref={(el) => { fileInputRefs.current[index] = el }}
                      type="file"
                      accept="image/*,.heic,.heif,.hevc,.HEIC,.HEIF"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleSubirArchivo(file, index)
                      }}
                    />

                    <button
                      type="button"
                      disabled={estaSubiendo}
                      onClick={() => fileInputRefs.current[index]?.click()}
                      className="px-3 py-2 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 active:scale-95 disabled:opacity-50 cursor-pointer"
                      title="Subir imagen desde tu dispositivo"
                    >
                      {estaSubiendo ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                      <span className="hidden sm:inline">Subir</span>
                    </button>
                  </div>

                  {/* 3. Slider de Duración Individual */}
                  <div className="bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-300 font-bold shrink-0">
                      <Clock size={13} className="text-emerald-400" />
                      <span>Duración:</span>
                    </div>

                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.5"
                      value={item.duracionSegundos || 4}
                      onChange={(e) => handleActualizarDuracion(index, parseFloat(e.target.value))}
                      className="flex-1 accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />

                    <span className="w-12 text-right font-mono font-bold text-xs text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60 shrink-0">
                      {(item.duracionSegundos || 4).toFixed(1)}s
                    </span>
                  </div>
                </div>

                {/* 4. Botón Eliminar */}
                <div className="shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    disabled={lista.length <= 1}
                    onClick={() => handleEliminarSlot(index)}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-xl transition-all disabled:opacity-20 disabled:hover:text-slate-500 disabled:hover:bg-transparent cursor-pointer"
                    title={lista.length <= 1 ? 'Debe haber al menos 1 imagen' : 'Eliminar imagen'}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })}

          {/* Botón para agregar imagen hasta 4 */}
          {lista.length < 4 && (
            <button
              type="button"
              onClick={handleAgregarSlot}
              className="w-full py-3 border-2 border-dashed border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-950/20 text-slate-400 hover:text-emerald-300 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>Agregar Imagen ({lista.length}/4)</span>
            </button>
          )}
        </div>

        {/* Pie del Modal con Acciones */}
        <div className="p-4 sm:p-5 border-t border-slate-800/80 flex items-center justify-between bg-zinc-900/60 shrink-0">
          <button
            type="button"
            onClick={handleRestaurarDefecto}
            className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-slate-800/60 transition-all cursor-pointer"
          >
            <RefreshCw size={13} />
            <span className="hidden sm:inline">Restaurar 4 fotos por defecto</span>
            <span className="sm:hidden">Por defecto</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCerrar}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleGuardar}
              className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
            >
              <Check size={14} />
              <span>Aplicar Cambios</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

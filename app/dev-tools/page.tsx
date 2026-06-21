'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usarAuth } from '@/contexto/AuthContexto'
import { usarPedidos } from '@/contexto/PedidosContexto'
import { Save, Image as ImageIcon, Loader2, Search, ArrowLeft, RefreshCw } from 'lucide-react'

interface TiendaMetadata {
  producto_id: string
  nombre_publico: string
  descripcion_publica: string
  imagen_url: string
}

export default function DevToolsPage() {
  const router = useRouter()
  const { usuarioActivo, estaListoAuth } = usarAuth()
  const { productos, categorias } = usarPedidos()
  
  const [metadata, setMetadata] = useState<Record<string, TiendaMetadata>>({})
  const [cargandoMetadata, setCargandoMetadata] = useState(true)
  
  const [busqueda, setBusqueda] = useState('')
  const [productoEditando, setProductoEditando] = useState<string | null>(null)
  const [form, setForm] = useState<{
    nombre_publico: string;
    descripcion_publica: string;
    imagenes_nuevas: string[];
    preview_urls: string[];
  }>({ nombre_publico: '', descripcion_publica: '', imagenes_nuevas: [], preview_urls: [] })
  const [guardando, setGuardando] = useState(false)

  // Redirigir si no es admin
  useEffect(() => {
    if (estaListoAuth && (!usuarioActivo || usuarioActivo.rol !== 'admin')) {
      router.push('/dashboard')
    }
  }, [usuarioActivo, estaListoAuth, router])

  // Cargar metadatos
  const cargarMetadata = async () => {
    setCargandoMetadata(true)
    try {
      // Ruta pública — no requiere sesión de admin para leer
      const res = await fetch('/api/tienda-metadata?t=' + Date.now(), {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      const data = await res.json()
      if (Array.isArray(data)) {
        const mapa: Record<string, TiendaMetadata> = {}
        data.forEach(m => mapa[m.producto_id] = m)
        setMetadata(mapa)
      }
    } catch (err) {
      console.error('Error cargando metadata:', err)
    } finally {
      setCargandoMetadata(false)
    }
  }

  useEffect(() => {
    cargarMetadata()
  }, [])

  if (!estaListoAuth || cargandoMetadata) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-chefsy w-10 h-10" /></div>
  }
  if (!usuarioActivo || usuarioActivo.rol !== 'admin') return null

  const handleEdit = (prod: any) => {
    const meta = metadata[prod.id] || { nombre_publico: '', descripcion_publica: '', imagen_url: '' }
    setProductoEditando(prod.id)
    setForm({
      nombre_publico: meta.nombre_publico || '',
      descripcion_publica: meta.descripcion_publica || '',
      imagenes_nuevas: [],
      preview_urls: meta.imagen_url ? (meta.imagen_url.includes(' | ') ? meta.imagen_url.split(' | ') : [meta.imagen_url]) : []
    })
  }

  const comprimirImagen = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new window.Image()
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const MAX_WIDTH = 1200
          const MAX_HEIGHT = 1200
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width
              width = MAX_WIDTH
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height
              height = MAX_HEIGHT
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            resolve(event.target?.result as string) // Fallback al original si falla canvas
            return
          }
          ctx.drawImage(img, 0, 0, width, height)
          // Comprimir a JPEG con 80% de calidad
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
          resolve(dataUrl)
        }
        img.onerror = (err) => reject(err)
      }
      reader.onerror = (err) => reject(err)
    })
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    try {
      const base64s = await Promise.all(files.map(file => comprimirImagen(file)))
      setForm(prev => ({ ...prev, imagenes_nuevas: base64s, preview_urls: base64s }))
    } catch (err) {
      console.error('Error comprimiendo imagen:', err)
      alert('Error al leer la imagen. Intentá con otra o en otro formato.')
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productoEditando) return
    setGuardando(true)

    try {
      let finalImageUrls = form.preview_urls.join(' | ')

      // Si hay una imagen nueva en base64, subir a Cloudinary
      if (form.imagenes_nuevas.length > 0) {
        const subidas = await Promise.all(form.imagenes_nuevas.map(async (base64) => {
          const uploadRes = await fetch('/api/admin/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imagen: base64 })
          })
          const uploadData = await uploadRes.json()
          if (uploadData.error) throw new Error(uploadData.error)
          return uploadData.urlTransformada || uploadData.urlOriginal
        }))
        finalImageUrls = subidas.join(' | ')
      }

      // Guardar en tienda_metadata
      const metaRes = await fetch('/api/admin/tienda-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: productoEditando,
          nombre_publico: form.nombre_publico,
          descripcion_publica: form.descripcion_publica,
          imagen_url: finalImageUrls
        })
      })

      const metaData = await metaRes.json()
      if (metaData.error) throw new Error(metaData.error)

      // Actualizar estado local
      setMetadata(prev => ({
        ...prev,
        [productoEditando]: metaData.data
      }))
      
      setProductoEditando(null)
      alert('¡Guardado con éxito!')
    } catch (err: any) {
      console.error(err)
      alert('Error: ' + err.message)
    } finally {
      setGuardando(false)
    }
  }

  const productosFiltrados = productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/dashboard')} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-colors">
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-black flex items-center gap-2">
                🛠️ Herramienta de Desarrollador
              </h1>
              <p className="text-slate-500 text-sm">Metadatos de la Tienda (Público)</p>
            </div>
          </div>
          <button onClick={cargarMetadata} className="p-3 bg-chefsy-50 text-chefsy hover:bg-chefsy-100 rounded-2xl transition-colors" title="Recargar Metadatos">
            <RefreshCw size={20} />
          </button>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-chefsy focus:border-transparent outline-none font-medium"
          />
        </div>

        {/* Listado */}
        <div className="grid sm:grid-cols-2 gap-4">
          {productosFiltrados.map(prod => {
            const meta = metadata[prod.id]
            const tieneMeta = meta && (meta.nombre_publico || meta.imagen_url)
            
            return (
              <div key={prod.id} className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 border border-slate-200 flex items-center justify-center">
                    {meta?.imagen_url ? (
                      <img src={meta.imagen_url.includes(' | ') ? meta.imagen_url.split(' | ')[0] : meta.imagen_url} alt={prod.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="text-slate-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 leading-tight mb-0.5">{meta?.nombre_publico || prod.nombre}</h3>
                    <div className="flex flex-col gap-0.5 mb-1.5">
                      <p className="text-xs text-slate-500 line-clamp-1">{prod.nombre} <span className="text-[10px] opacity-70">(Interno)</span></p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {categorias.find(c => c.id === prod.categoriaId)?.nombre || 'Categoría general'}
                      </p>
                    </div>
                    {tieneMeta && <span className="inline-block bg-chefsy-100 text-chefsy text-[10px] font-bold px-2 py-0.5 rounded-md">Modificado</span>}
                  </div>
                </div>
                <button
                  onClick={() => handleEdit(prod)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors"
                >
                  Editar Metadatos
                </button>
              </div>
            )
          })}
        </div>

      </div>

      {/* Modal de Edición */}
      {productoEditando && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-black">Editar Visualización</h2>
              <p className="text-sm text-slate-500">Esto solo afectará a la tienda pública, no al panel de empleados.</p>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-5">
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre Público</label>
                <input
                  type="text"
                  value={form.nombre_publico}
                  onChange={e => setForm({...form, nombre_publico: e.target.value})}
                  placeholder="Ej: La Gran Chefsy"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-chefsy outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descripción (Menú)</label>
                <textarea
                  value={form.descripcion_publica}
                  onChange={e => setForm({...form, descripcion_publica: e.target.value})}
                  placeholder="Ej: Doble medallón de carne con cheddar..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-chefsy outline-none resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Galería de Fotos (Álbum)</label>
                <div className="flex flex-col gap-3">
                  {form.preview_urls.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {form.preview_urls.map((url, i) => (
                        <div key={i} className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0">
                          <img src={url} alt={`Preview ${i+1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="flex-1 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl py-3 text-center text-sm font-semibold text-slate-600 transition-colors">
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
                    {form.preview_urls.length > 0 ? `Subir Nuevas Fotos (${form.preview_urls.length} actuales)` : 'Subir Fotos del Producto'}
                  </label>
                  <p className="text-[10px] text-slate-400">Podés seleccionar múltiples fotos a la vez manteniendo presionado Ctrl o Cmd al elegir los archivos.</p>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setProductoEditando(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 py-3 bg-chefsy hover:bg-chefsy-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {guardando ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

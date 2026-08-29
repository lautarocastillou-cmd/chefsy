'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usarAuth } from '@/contexto/AuthContexto'
import { usarPedidos } from '@/contexto/PedidosContexto'
import { formatearPrecio } from '@/lib/utils'
import { OBTENER_DETALLES_COMPLEMENTARIOS } from '@/lib/tienda-helpers'
import {
  Save,
  Image as ImageIcon,
  Loader2,
  Search,
  ArrowLeft,
  RefreshCw,
  Wrench,
  Plus,
  Trash2,
  Star,
  Eye,
  UploadCloud,
  Check,
  X,
  AlertTriangle,
  Sparkles,
  Filter,
  ArrowUpDown,
  Link2,
  RotateCcw,
  Smartphone,
  Laptop,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Scissors,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react'
import ModalImportarGoogleDrive from '@/components/admin/ModalImportarGoogleDrive'

interface TiendaMetadata {
  producto_id: string
  nombre_publico: string
  descripcion_publica: string
  imagen_url: string
}

interface FotoItem {
  id: string
  url: string
  esNueva: boolean
  base64?: string
  archivo?: File
}

interface ToastInfo {
  id: string
  tipo: 'success' | 'error' | 'info'
  mensaje: string
}

function esImagenPlaceholder(url?: string | null): boolean {
  if (!url || !url.trim()) return true
  const lower = url.toLowerCase()
  return (
    lower.includes('ly8iup') ||
    lower.includes('placeholder') ||
    lower.includes('sacandole-fotos') ||
    lower.includes('unsplash.com') // Si usa la foto genérica por defecto de stock
  )
}

function parsearFotosDeUrl(imagenUrl?: string | null): string[] {
  if (!imagenUrl || !imagenUrl.trim()) return []
  return imagenUrl
    .split(' | ')
    .map(u => u.trim())
    .filter(u => u.length > 0)
}

export default function DevToolsPage() {
  const router = useRouter()
  const { usuarioActivo, estaListoAuth } = usarAuth()
  const { productos, categorias, actualizarProductos } = usarPedidos()

  const [metadata, setMetadata] = useState<Record<string, TiendaMetadata>>({})
  const [cargandoMetadata, setCargandoMetadata] = useState(true)

  const [tabActive, setTabActive] = useState<'visual' | 'banco' | 'chefsitos'>('visual')
  const [preciosPuntos, setPreciosPuntos] = useState<Record<string, number>>({})
  const [guardandoPuntosId, setGuardandoPuntosId] = useState<string | null>(null)

  // Filtros y Búsqueda
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'pausados' | 'sin_foto' | 'con_foto' | 'sin_desc'>('todos')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas')
  const [pausandoProductoId, setPausandoProductoId] = useState<string | null>(null)

  // Modo de Visualización (Tarjetas vs Tabla Rápida Excel)
  const [modoVista, setModoVista] = useState<'grid' | 'tabla'>('grid')
  const [edicionesTabla, setEdicionesTabla] = useState<Record<string, { nombre_publico: string; descripcion_publica: string }>>({})
  const [guardandoMasivo, setGuardandoMasivo] = useState(false)
  const [guardandoFilaId, setGuardandoFilaId] = useState<string | null>(null)

  // Banco de Fotos de la Casa
  const [mostrarBancoModal, setMostrarBancoModal] = useState(false)
  const [busquedaBanco, setBusquedaBanco] = useState('')
  const [filtroCategoriaBanco, setFiltroCategoriaBanco] = useState('todas')
  const [fotosLibresBanco, setFotosLibresBanco] = useState<string[]>([])
  const [asignandoFotoUrl, setAsignandoFotoUrl] = useState<string | null>(null)
  const [asignandoProductoId, setAsignandoProductoId] = useState<string>('')

  // Estado del Modal de Edición
  const [productoEditandoId, setProductoEditandoId] = useState<string | null>(null)
  const [nombrePublico, setNombrePublico] = useState('')
  const [descripcionPublica, setDescripcionPublica] = useState('')
  const [galeriaFotos, setGaleriaFotos] = useState<FotoItem[]>([])
  const [fotoZoomUrl, setFotoZoomUrl] = useState<string | null>(null)
  const [urlDirectaInput, setUrlDirectaInput] = useState('')
  const [mostrarInputUrl, setMostrarInputUrl] = useState(false)
  const [mostrarModalGDrive, setMostrarModalGDrive] = useState(false)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [vistaPreview, setVistaPreview] = useState<'mobile' | 'desktop'>('mobile')
  const [guardando, setGuardando] = useState(false)

  // Eliminación de Fondo con IA
  const [recortandoFotoId, setRecortandoFotoId] = useState<string | null>(null)
  const [mensajeRecorte, setMensajeRecorte] = useState<string>('')

  // Drag & Drop directo sobre tarjeta en la grilla
  const [tarjetaArrastradaId, setTarjetaArrastradaId] = useState<string | null>(null)
  const [subiendoFotoTarjetaId, setSubiendoFotoTarjetaId] = useState<string | null>(null)

  // Subida en Lote y Selección Múltiple en Banco de Fotos
  const [subiendoLoteBanco, setSubiendoLoteBanco] = useState(false)
  const [progresoLoteBanco, setProgresoLoteBanco] = useState('')
  const [isDraggingOverBanco, setIsDraggingOverBanco] = useState(false)
  const [bancoSeleccionMultiple, setBancoSeleccionMultiple] = useState<string[]>([])

  // Procesamiento de múltiples fotos en modal
  const [procesandoMultiplesFotos, setProcesandoMultiplesFotos] = useState(false)
  const [progresoMultiplesFotos, setProgresoMultiplesFotos] = useState('')

  // Toasts
  const [toasts, setToasts] = useState<ToastInfo[]>([])

  const mostrarToast = useCallback((mensaje: string, tipo: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts(prev => [...prev, { id, mensaje, tipo }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  // Sincronizar precios de Chefsitos desde el contexto de productos
  useEffect(() => {
    const mapa: Record<string, number> = {}
    productos.forEach(p => (mapa[p.id] = (p as any).precio_puntos || 0))
    setPreciosPuntos(mapa)
  }, [productos])

  // Redirigir si no es admin
  useEffect(() => {
    if (estaListoAuth && (!usuarioActivo || usuarioActivo.rol !== 'admin')) {
      router.push('/dashboard')
    }
  }, [usuarioActivo, estaListoAuth, router])

  // Cargar metadatos desde el servidor
  const cargarMetadata = async () => {
    setCargandoMetadata(true)
    try {
      const res = await fetch('/api/tienda-metadata?t=' + Date.now(), {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      })
      const data = await res.json()
      if (Array.isArray(data)) {
        const mapa: Record<string, TiendaMetadata> = {}
        data.forEach(m => (mapa[m.producto_id] = m))
        setMetadata(mapa)
      }
    } catch (err) {
      console.error('Error cargando metadata:', err)
      mostrarToast('Error al conectar con la base de datos de metadatos', 'error')
    } finally {
      setCargandoMetadata(false)
    }
  }

  // Cargar fotos almacenadas en el bucket de storage
  const cargarFotosStorage = async () => {
    try {
      const res = await fetch('/api/admin/banco-fotos')
      const data = await res.json()
      if (data.fotos && Array.isArray(data.fotos)) {
        setFotosLibresBanco(data.fotos.map((f: any) => f.url))
      }
    } catch (e) {
      console.warn('Error cargando fotos de storage:', e)
    }
  }

  useEffect(() => {
    cargarMetadata()
    cargarFotosStorage()
  }, [])

  // Comprimir imagen a tamaño web óptimo
  const comprimirImagen = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = event => {
        const img = new window.Image()
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const MAX_WIDTH = 900
          const MAX_HEIGHT = 900
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round(height * (MAX_WIDTH / width))
              width = MAX_WIDTH
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round(width * (MAX_HEIGHT / height))
              height = MAX_HEIGHT
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            resolve(event.target?.result as string)
            return
          }
          ctx.drawImage(img, 0, 0, width, height)
          
          // Exportar en WebP 75% ultraliviano con fallback seguro a JPEG 75%
          let dataUrl = canvas.toDataURL('image/webp', 0.75)
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', 0.75)
          }
          resolve(dataUrl)
        }
        img.onerror = err => reject(err)
      }
      reader.onerror = err => reject(err)
    })
  }

  // Abrir editor para un producto
  const handleEdit = (prod: any) => {
    const meta = metadata[prod.id] || { nombre_publico: '', descripcion_publica: '', imagen_url: '' }
    const fallbackDetalles = OBTENER_DETALLES_COMPLEMENTARIOS(prod.categoriaId, prod.nombre, prod.id)
    
    setProductoEditandoId(prod.id)
    setNombrePublico(meta.nombre_publico || prod.nombre)
    setDescripcionPublica(meta.descripcion_publica || fallbackDetalles.desc || '')
    setUrlDirectaInput('')
    setMostrarInputUrl(false)

    // Parsear galería existente
    const urls = parsearFotosDeUrl(meta.imagen_url)
    if (urls.length > 0) {
      setGaleriaFotos(
        urls.map((url, i) => ({
          id: `existente-${i}-${Date.now()}`,
          url,
          esNueva: false,
        }))
      )
    } else {
      setGaleriaFotos([])
    }
  }

  // Anexar fotos nuevas a la galería sin borrar las existentes (soporta 1 o múltiples fotos)
  const anexarArchivos = async (archivos: File[]) => {
    if (!archivos || archivos.length === 0) return

    setProcesandoMultiplesFotos(true)
    setProgresoMultiplesFotos(`Comprimiendo ${archivos.length} ${archivos.length === 1 ? 'foto' : 'fotos'}...`)

    try {
      const fotosProcesadas: FotoItem[] = []
      for (let i = 0; i < archivos.length; i++) {
        const file = archivos[i]
        setProgresoMultiplesFotos(`Comprimiendo foto ${i + 1} de ${archivos.length}...`)
        const base64 = await comprimirImagen(file)
        fotosProcesadas.push({
          id: `nueva-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}`,
          url: base64,
          esNueva: true,
          base64,
          archivo: file,
        })
      }

      setGaleriaFotos(prev => [...prev, ...fotosProcesadas])
      mostrarToast(`¡${archivos.length === 1 ? '1 foto añadida' : `${archivos.length} fotos añadidas`} a la galería! 📸`, 'success')
    } catch (err) {
      console.error('Error procesando fotos:', err)
      mostrarToast('Error al leer o comprimir una de las imágenes.', 'error')
    } finally {
      setProcesandoMultiplesFotos(false)
      setProgresoMultiplesFotos('')
    }
  }

  // Subida en Lote directa de múltiples fotos al Banco de Fotos de la Casa
  const subirLoteArchivosAlBanco = async (archivos: File[]) => {
    if (!archivos || archivos.length === 0) return

    setSubiendoLoteBanco(true)
    setProgresoLoteBanco(`Iniciando carga de ${archivos.length} fotos...`)

    try {
      let completadas = 0
      for (let i = 0; i < archivos.length; i++) {
        const file = archivos[i]
        setProgresoLoteBanco(`Subiendo ${i + 1} de ${archivos.length}: ${file.name.substring(0, 20)}...`)
        const base64 = await comprimirImagen(file)
        const uploadRes = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64, nombreOriginal: file.name }),
        })
        if (uploadRes.ok) {
          completadas++
        }
      }

      mostrarToast(`¡${completadas} fotos subidas con éxito al almacenamiento de Chefsy! 📸`, 'success')
      await cargarMetadata()
    } catch (err: any) {
      console.error(err)
      mostrarToast('Error al subir lote de fotos: ' + (err.message || 'Error desconocido'), 'error')
    } finally {
      setSubiendoLoteBanco(false)
      setProgresoLoteBanco('')
    }
  }

  const handleSubirLoteBancoInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'))
    if (files.length > 0) {
      subirLoteArchivosAlBanco(files)
      e.target.value = ''
    }
  }

  const handleDropBanco = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOverBanco(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    if (files.length > 0) {
      subirLoteArchivosAlBanco(files)
    }
  }

  // Subida instantánea por Drag & Drop directo sobre la tarjeta de la grilla (sin abrir modal)
  const handleDropDirectoEnTarjeta = async (e: React.DragEvent, prod: any) => {
    e.preventDefault()
    e.stopPropagation()
    setTarjetaArrastradaId(null)

    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    if (files.length === 0) {
      mostrarToast('Por favor arrastrá un archivo de imagen válido (JPG, PNG o WebP).', 'info')
      return
    }

    setSubiendoFotoTarjetaId(prod.id)
    try {
      mostrarToast(`Comprimiendo y subiendo ${files.length === 1 ? 'la foto' : `${files.length} fotos`} de "${prod.nombre}"...`, 'info')

      const urlsNuevas: string[] = []
      for (const file of files) {
        const base64 = await comprimirImagen(file)
        const uploadRes = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64, nombreOriginal: file.name }),
        })
        const uploadData = await uploadRes.json()
        if (!uploadRes.ok || uploadData.error) {
          throw new Error(uploadData.error || 'Error al subir una de las imágenes')
        }
        urlsNuevas.push(uploadData.urlTransformada || uploadData.urlOriginal)
      }

      // Obtener metadatos actuales y preservar fotos existentes que no sean placeholder
      const metaActual = metadata[prod.id] || {
        producto_id: prod.id,
        nombre_publico: prod.nombre,
        descripcion_publica: '',
        imagen_url: '',
      }

      const fotosExistentes = parsearFotosDeUrl(metaActual.imagen_url).filter(u => !esImagenPlaceholder(u))
      // Las fotos recién arrastradas pasan a estar primero (la primera es portada)
      const todasLasFotos = [...urlsNuevas, ...fotosExistentes]
      const imagen_url_final = todasLasFotos.join(' | ')

      // Guardar en tienda_metadata
      const metaRes = await fetch('/api/admin/tienda-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: prod.id,
          nombre_publico: metaActual.nombre_publico || prod.nombre,
          descripcion_publica: metaActual.descripcion_publica || '',
          imagen_url: imagen_url_final,
        }),
      })

      const metaData = await metaRes.json()
      if (!metaRes.ok || metaData.error) {
        throw new Error(metaData.error || 'Error al guardar metadatos')
      }

      // Actualizar estado local
      setMetadata(prev => ({
        ...prev,
        [prod.id]: metaData.data,
      }))

      mostrarToast(`¡${files.length === 1 ? 'Foto' : `${files.length} fotos`} de "${prod.nombre}" actualizada${files.length === 1 ? '' : 's'} con éxito! 📸`, 'success')
    } catch (err: any) {
      console.error(err)
      mostrarToast('Error al subir foto: ' + (err.message || 'Error desconocido'), 'error')
    } finally {
      setSubiendoFotoTarjetaId(null)
    }
  }

  // Alternar Visibilidad / Pausa en Tienda Pública (1-Clic)
  const alternarVisibilidadTienda = async (productoId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    const prod = productos.find(p => p.id === productoId)
    if (!prod) return

    const nuevoEstado = prod.activo === false ? true : false
    setPausandoProductoId(productoId)

    try {
      const nuevosProductos = productos.map(p =>
        p.id === productoId ? { ...p, activo: nuevoEstado } : p
      )
      actualizarProductos(nuevosProductos)

      mostrarToast(
        nuevoEstado
          ? `"${prod.nombre}" ahora está VISIBLE en la tienda pública 👁️`
          : `"${prod.nombre}" fue PAUSADO/OCULTADO de la tienda pública ⏸️`,
        'success'
      )
    } catch (err: any) {
      console.error(err)
      mostrarToast('Error al cambiar visibilidad: ' + (err.message || 'Error desconocido'), 'error')
    } finally {
      setPausandoProductoId(null)
    }
  }

  // Quitar Fondo de Comida con Inteligencia Artificial
  const handleQuitarFondoFoto = async (foto: FotoItem, index: number) => {
    setRecortandoFotoId(foto.id)
    setMensajeRecorte('Iniciando IA de recorte...')

    try {
      const { recortarFondoComida } = await import('@/lib/imagen/quitarFondo')
      const pngTransparente = await recortarFondoComida(foto.url, (_pct, msg) => {
        setMensajeRecorte(msg)
      })

      // Actualizar la foto en la galería del producto
      setGaleriaFotos(prev => {
        const copia = [...prev]
        copia[index] = {
          ...copia[index],
          url: pngTransparente,
          base64: pngTransparente,
          esNueva: true,
        }
        return copia
      })

      mostrarToast('¡Fondo eliminado con IA! El plato quedó recortado transparente. ✨', 'success')
    } catch (err: any) {
      console.error(err)
      mostrarToast('Error al recortar fondo: ' + (err.message || 'Error desconocido'), 'error')
    } finally {
      setRecortandoFotoId(null)
      setMensajeRecorte('')
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      anexarArchivos(files)
      e.target.value = '' // Reset para permitir volver a elegir el mismo archivo
    }
  }

  // Soporte de Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    if (files.length > 0) {
      anexarArchivos(files)
    }
  }

  // Soporte de Pegar con Ctrl+V desde el portapapeles
  useEffect(() => {
    if (!productoEditandoId) return

    const handlePaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items || [])
      const imageFiles: File[] = []
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) imageFiles.push(file)
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault()
        anexarArchivos(imageFiles)
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [productoEditandoId])

  // Eliminar foto individual de la galería
  const eliminarFotoDeGaleria = (id: string) => {
    setGaleriaFotos(prev => prev.filter(f => f.id !== id))
    mostrarToast('Foto removida de la galería', 'info')
  }

  // Mover foto para hacerla portada (posición 0)
  const hacerPortada = (index: number) => {
    if (index === 0) return
    setGaleriaFotos(prev => {
      const copia = [...prev]
      const [item] = copia.splice(index, 1)
      copia.unshift(item)
      return copia
    })
    mostrarToast('Foto seleccionada como portada principal ⭐', 'success')
  }

  // Mover foto a la izquierda/derecha
  const moverFoto = (index: number, direccion: 'izq' | 'der') => {
    const destino = direccion === 'izq' ? index - 1 : index + 1
    if (destino < 0 || destino >= galeriaFotos.length) return
    setGaleriaFotos(prev => {
      const copia = [...prev]
      const [item] = copia.splice(index, 1)
      copia.splice(destino, 0, item)
      return copia
    })
  }

  // Anexar foto por URL directa
  const agregarUrlDirecta = () => {
    const url = urlDirectaInput.trim()
    if (!url) return
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      mostrarToast('Ingresá un enlace web válido (https://...)', 'error')
      return
    }

    setGaleriaFotos(prev => [
      ...prev,
      {
        id: `url-${Date.now()}`,
        url,
        esNueva: false,
      },
    ])
    setUrlDirectaInput('')
    setMostrarInputUrl(false)
    mostrarToast('Imagen por enlace añadida a la galería', 'success')
  }

  // Importar Fotos desde Google Drive (1 o múltiples)
  const handleFotosImportadasGoogleDrive = (urls: string[]) => {
    if (urls.length === 0) return

    // Agregar de inmediato a fotos libres del banco para actualizar el contador y la grilla
    setFotosLibresBanco(prev => Array.from(new Set([...urls, ...prev])))

    if (productoEditandoId) {
      setGaleriaFotos(prev => [
        ...prev,
        ...urls.map((u, i) => ({
          id: `gdrive-${Date.now()}-${i}`,
          url: u,
          esNueva: false,
        })),
      ])
      mostrarToast(`¡${urls.length} ${urls.length === 1 ? 'foto' : 'fotos'} de Google Drive añadida${urls.length === 1 ? '' : 's'} a la galería! 📸`, 'success')
    } else {
      mostrarToast(`¡${urls.length} ${urls.length === 1 ? 'foto' : 'fotos'} de Google Drive guardada${urls.length === 1 ? '' : 's'} en el Banco de la Casa! 📸`, 'success')
    }
  }

  // Guardar Metadatos y subir imágenes pendientes
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productoEditandoId) return
    setGuardando(true)

    try {
      // 1) Subir fotos nuevas a /api/admin/upload
      const urlsFinales: string[] = []

      for (const foto of galeriaFotos) {
        if (foto.esNueva && foto.base64) {
          const uploadRes = await fetch('/api/admin/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imagen: foto.base64 }),
          })
          const uploadData = await uploadRes.json()
          if (!uploadRes.ok || uploadData.error) {
            throw new Error(uploadData.error || 'Error al subir una de las imágenes')
          }
          urlsFinales.push(uploadData.urlTransformada || uploadData.urlOriginal)
        } else {
          urlsFinales.push(foto.url)
        }
      }

      const imagen_url_final = urlsFinales.join(' | ')

      // 2) Guardar en tienda_metadata
      const metaRes = await fetch('/api/admin/tienda-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: productoEditandoId,
          nombre_publico: nombrePublico.trim(),
          descripcion_publica: descripcionPublica.trim(),
          imagen_url: imagen_url_final,
        }),
      })

      const metaData = await metaRes.json()
      if (!metaRes.ok || metaData.error) {
        throw new Error(metaData.error || 'Error al guardar metadatos')
      }

      // 3) Actualizar estado local
      setMetadata(prev => ({
        ...prev,
        [productoEditandoId]: metaData.data,
      }))

      setProductoEditandoId(null)
      mostrarToast('¡Metadatos y fotos guardados con éxito!', 'success')
    } catch (err: any) {
      console.error(err)
      mostrarToast('Error al guardar: ' + (err.message || 'Error desconocido'), 'error')
    } finally {
      setGuardando(false)
    }
  }

  // Guardar Precio en Chefsitos
  const guardarPrecioChefsitos = async (id: string) => {
    setGuardandoPuntosId(id)
    try {
      const pts = Number(preciosPuntos[id]) || 0
      const res = await fetch('/api/admin/tienda-chefsitos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ producto_id: id, precio_puntos: pts }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Error al guardar')
      mostrarToast('¡Precio en Chefsitos actualizado con éxito!', 'success')
    } catch (err: any) {
      mostrarToast('Error: ' + err.message, 'error')
    } finally {
      setGuardandoPuntosId(null)
    }
  }

  // ── Helpers y Lógica para Edición Rápida en Tabla (Estilo Excel) ──
  const getValoresFila = useCallback((prodId: string) => {
    const meta = metadata[prodId]
    const edicion = edicionesTabla[prodId]
    return {
      nombre_publico: edicion !== undefined ? edicion.nombre_publico : (meta?.nombre_publico ?? ''),
      descripcion_publica: edicion !== undefined ? edicion.descripcion_publica : (meta?.descripcion_publica ?? '')
    }
  }, [metadata, edicionesTabla])

  const handleCambioFila = (prodId: string, campo: 'nombre_publico' | 'descripcion_publica', valor: string) => {
    setEdicionesTabla(prev => {
      const actual = getValoresFila(prodId)
      return {
        ...prev,
        [prodId]: {
          ...actual,
          [campo]: valor
        }
      }
    })
  }

  const filasConCambios = useMemo(() => {
    return Object.keys(edicionesTabla).filter(prodId => {
      const meta = metadata[prodId]
      const edicion = edicionesTabla[prodId]
      const nombreOriginal = meta?.nombre_publico ?? ''
      const descOriginal = meta?.descripcion_publica ?? ''
      return edicion.nombre_publico !== nombreOriginal || edicion.descripcion_publica !== descOriginal
    })
  }, [edicionesTabla, metadata])

  const guardarTodosLosCambiosTabla = async () => {
    if (filasConCambios.length === 0) {
      mostrarToast('No hay cambios pendientes por guardar', 'info')
      return
    }

    setGuardandoMasivo(true)
    try {
      const itemsAGuardar = filasConCambios.map(prodId => {
        const vals = getValoresFila(prodId)
        const meta = metadata[prodId]
        return {
          producto_id: prodId,
          nombre_publico: vals.nombre_publico.trim() || null,
          descripcion_publica: vals.descripcion_publica.trim() || null,
          imagen_url: meta?.imagen_url || null
        }
      })

      const res = await fetch('/api/admin/tienda-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsAGuardar })
      })

      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Error al guardar cambios masivos')

      setMetadata(prev => {
        const nuevo = { ...prev }
        itemsAGuardar.forEach(item => {
          nuevo[item.producto_id] = {
            producto_id: item.producto_id,
            nombre_publico: item.nombre_publico || '',
            descripcion_publica: item.descripcion_publica || '',
            imagen_url: item.imagen_url || ''
          }
        })
        return nuevo
      })

      setEdicionesTabla({})
      mostrarToast(`¡Se guardaron los textos de ${itemsAGuardar.length} platos con éxito! ⚡`, 'success')
    } catch (err: any) {
      console.error(err)
      mostrarToast('Error al guardar: ' + (err.message || 'Error desconocido'), 'error')
    } finally {
      setGuardandoMasivo(false)
    }
  }

  const guardarFilaIndividual = async (prodId: string) => {
    const vals = getValoresFila(prodId)
    const meta = metadata[prodId]
    setGuardandoFilaId(prodId)

    try {
      const res = await fetch('/api/admin/tienda-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: prodId,
          nombre_publico: vals.nombre_publico.trim() || null,
          descripcion_publica: vals.descripcion_publica.trim() || null,
          imagen_url: meta?.imagen_url || null
        })
      })

      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Error al guardar fila')

      setMetadata(prev => ({
        ...prev,
        [prodId]: data.data
      }))

      setEdicionesTabla(prev => {
        const copia = { ...prev }
        delete copia[prodId]
        return copia
      })

      mostrarToast('Plato guardado con éxito ⚡', 'success')
    } catch (err: any) {
      console.error(err)
      mostrarToast('Error al guardar: ' + (err.message || 'Error desconocido'), 'error')
    } finally {
      setGuardandoFilaId(null)
    }
  }

  const descartarCambiosTabla = () => {
    setEdicionesTabla({})
    mostrarToast('Cambios descartados', 'info')
  }

  // Atajo de Teclado Ctrl+S para Guardar en Modo Tabla
  useEffect(() => {
    if (tabActive !== 'visual' || modoVista !== 'tabla') return

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        guardarTodosLosCambiosTabla()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tabActive, modoVista, filasConCambios, edicionesTabla, metadata])

  // Estadísticas y filtrado dinámico
  const productoActualEditando = useMemo(() => {
    return productos.find(p => p.id === productoEditandoId)
  }, [productos, productoEditandoId])

  const stats = useMemo(() => {
    let sinFoto = 0
    let conFoto = 0
    let sinDesc = 0
    let pausados = 0
    let activos = 0

    productos.forEach(p => {
      if (p.activo === false) {
        pausados++
      } else {
        activos++
      }

      const meta = metadata[p.id]
      const fotos = parsearFotosDeUrl(meta?.imagen_url)
      const tieneFotoPropia = fotos.length > 0 && !esImagenPlaceholder(fotos[0])

      if (tieneFotoPropia) {
        conFoto++
      } else {
        sinFoto++
      }

      const desc = meta?.descripcion_publica || OBTENER_DETALLES_COMPLEMENTARIOS(p.categoriaId, p.nombre, p.id).desc
      if (!desc || !desc.trim()) {
        sinDesc++
      }
    })

    return { total: productos.length, sinFoto, conFoto, sinDesc, pausados, activos }
  }, [productos, metadata])

  // Normalizador para búsqueda insensible a acentos y mayúsculas
  const normalizarParaBusqueda = (texto: string) => {
    return (texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
  }

  const productosFiltrados = useMemo(() => {
    const q = normalizarParaBusqueda(busqueda)

    return productos.filter(p => {
      // 1. Filtro texto (busca en nombre público, nombre interno, descripción y nombre de categoría)
      if (q) {
        const meta = metadata[p.id]
        const nombrePub = normalizarParaBusqueda(meta?.nombre_publico || '')
        const nombreInterno = normalizarParaBusqueda(p.nombre || '')
        const desc = normalizarParaBusqueda(meta?.descripcion_publica || '')
        const catNombre = normalizarParaBusqueda(categorias.find(c => c.id === p.categoriaId)?.nombre || '')

        const coincide =
          nombrePub.includes(q) ||
          nombreInterno.includes(q) ||
          desc.includes(q) ||
          catNombre.includes(q)

        if (!coincide) return false
      }

      // 2. Filtro categoría
      if (filtroCategoria !== 'todas') {
        const catProd = String(p.categoriaId || '').trim()
        const catFiltro = String(filtroCategoria).trim()
        if (catProd !== catFiltro) {
          return false
        }
      }

      // 3. Filtro estado
      const meta = metadata[p.id]
      const fotos = parsearFotosDeUrl(meta?.imagen_url)
      const tieneFotoPropia = fotos.length > 0 && !esImagenPlaceholder(fotos[0])
      const desc = meta?.descripcion_publica || OBTENER_DETALLES_COMPLEMENTARIOS(p.categoriaId, p.nombre, p.id).desc
      const tieneDesc = Boolean(desc && desc.trim().length > 0)

      if (filtroEstado === 'sin_foto' && tieneFotoPropia) return false
      if (filtroEstado === 'con_foto' && !tieneFotoPropia) return false
      if (filtroEstado === 'sin_desc' && tieneDesc) return false
      if (filtroEstado === 'pausados' && p.activo !== false) return false
      if (filtroEstado === 'activos' && p.activo === false) return false

      return true
    })
  }, [productos, metadata, busqueda, filtroCategoria, filtroEstado, categorias])

  // Foto de portada para la vista previa
  const fotoPortadaPreview = useMemo(() => {
    if (galeriaFotos.length > 0) return galeriaFotos[0].url
    if (productoActualEditando) {
      return OBTENER_DETALLES_COMPLEMENTARIOS(
        productoActualEditando.categoriaId,
        productoActualEditando.nombre,
        productoActualEditando.id
      ).img
    }
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
  }, [galeriaFotos, productoActualEditando])

  // Banco de Fotos Únicas de la Casa
  interface FotoBancoItem {
    url: string
    productosUsados: { id: string; nombre: string; categoriaId: string }[]
  }

  const bancoFotos = useMemo(() => {
    const mapa = new Map<string, { id: string; nombre: string; categoriaId: string }[]>()

    productos.forEach(p => {
      const meta = metadata[p.id]
      const fotos = parsearFotosDeUrl(meta?.imagen_url)
      fotos.forEach(url => {
        if (!esImagenPlaceholder(url)) {
          if (!mapa.has(url)) {
            mapa.set(url, [])
          }
          const lista = mapa.get(url)!
          if (!lista.some(item => item.id === p.id)) {
            lista.push({
              id: p.id,
              nombre: meta?.nombre_publico || p.nombre,
              categoriaId: p.categoriaId,
            })
          }
        }
      })
    })

    // 2. Integrar fotos libres subidas a storage / Google Drive / PC que aún no están asignadas a un producto
    fotosLibresBanco.forEach(url => {
      if (!mapa.has(url)) {
        mapa.set(url, [])
      }
    })

    const resultado: FotoBancoItem[] = []
    mapa.forEach((productosUsados, url) => {
      resultado.push({ url, productosUsados })
    })

    return resultado
  }, [productos, metadata, fotosLibresBanco])

  const bancoFotosFiltradas = useMemo(() => {
    const q = normalizarParaBusqueda(busquedaBanco)

    return bancoFotos.filter(item => {
      // 1. Filtro categoría en el banco
      if (filtroCategoriaBanco !== 'todas') {
        const coincideCat = item.productosUsados.some(
          p => String(p.categoriaId).trim() === String(filtroCategoriaBanco).trim()
        )
        if (!coincideCat) return false
      }

      // 2. Filtro búsqueda de texto
      if (q) {
        const coincideProd = item.productosUsados.some(p => {
          const np = normalizarParaBusqueda(p.nombre)
          const nc = normalizarParaBusqueda(categorias.find(c => c.id === p.categoriaId)?.nombre || '')
          return np.includes(q) || nc.includes(q)
        })
        const coincideUrl = normalizarParaBusqueda(item.url).includes(q)
        const coincideSinAsignar =
          item.productosUsados.length === 0 &&
          (q.includes('sin') || q.includes('nueva') || q.includes('libre') || q.includes('banco'))

        if (!coincideProd && !coincideUrl && !coincideSinAsignar) return false
      }

      return true
    })
  }, [bancoFotos, busquedaBanco, filtroCategoriaBanco, categorias])

  // Asignar una foto del banco directamente a otro producto
  const asignarFotoAProductoDirecto = async (fotoUrl: string, productoId: string) => {
    try {
      const prod = productos.find(p => p.id === productoId)
      if (!prod) return

      const metaActual = metadata[productoId] || {
        producto_id: productoId,
        nombre_publico: prod.nombre,
        descripcion_publica: '',
        imagen_url: '',
      }

      const fotosExistentes = parsearFotosDeUrl(metaActual.imagen_url).filter(u => !esImagenPlaceholder(u))
      if (fotosExistentes.includes(fotoUrl)) {
        mostrarToast(`"${prod.nombre}" ya tiene esta foto asignada`, 'info')
        return
      }

      const todasLasFotos = [fotoUrl, ...fotosExistentes]
      const imagen_url_final = todasLasFotos.join(' | ')

      const metaRes = await fetch('/api/admin/tienda-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: productoId,
          nombre_publico: metaActual.nombre_publico || prod.nombre,
          descripcion_publica: metaActual.descripcion_publica || '',
          imagen_url: imagen_url_final,
        }),
      })

      const metaData = await metaRes.json()
      if (!metaRes.ok || metaData.error) {
        throw new Error(metaData.error || 'Error al guardar')
      }

      setMetadata(prev => ({
        ...prev,
        [productoId]: metaData.data,
      }))

      setAsignandoFotoUrl(null)
      setAsignandoProductoId('')
      mostrarToast(`¡Foto asignada a "${prod.nombre}" con éxito! 📸`, 'success')
    } catch (err: any) {
      console.error(err)
      mostrarToast('Error al asignar foto: ' + (err.message || 'Error desconocido'), 'error')
    }
  }

  if (!estaListoAuth || cargandoMetadata) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white gap-3">
        <Loader2 className="animate-spin text-chefsy-400 w-10 h-10" />
        <p className="text-sm font-bold text-slate-400">Cargando gestor de metadatos...</p>
      </div>
    )
  }

  if (!usuarioActivo || usuarioActivo.rol !== 'admin') return null

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans selection:bg-chefsy-500 selection:text-white pb-24">
      {/* Sistema de Toasts */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`p-4 rounded-2xl shadow-2xl border pointer-events-auto flex items-center gap-3 transition-all animate-in slide-in-from-bottom-5 duration-200 ${
              toast.tipo === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-100 backdrop-blur-md'
                : toast.tipo === 'error'
                ? 'bg-rose-950/90 border-rose-500/30 text-rose-100 backdrop-blur-md'
                : 'bg-slate-900/90 border-slate-700 text-slate-200 backdrop-blur-md'
            }`}
          >
            {toast.tipo === 'success' && <CheckCircle2 className="text-emerald-400 shrink-0" size={20} />}
            {toast.tipo === 'error' && <AlertTriangle className="text-rose-400 shrink-0" size={20} />}
            {toast.tipo === 'info' && <Info className="text-blue-400 shrink-0" size={20} />}
            <p className="text-sm font-bold leading-snug flex-1">{toast.mensaje}</p>
          </div>
        ))}
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Cabecera Principal */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 sm:p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-2xl transition-all active:scale-95 cursor-pointer"
              title="Volver al Dashboard"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 tracking-tight">
                <Wrench className="w-6 h-6 text-chefsy-400" />
                <span>Herramienta de Desarrollador</span>
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm font-medium">
                Gestor de Metadatos, Galería de Fotos y Tienda Pública
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={cargarMetadata}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-2xl transition-all text-xs font-bold flex items-center gap-2 cursor-pointer active:scale-95"
              title="Recargar Metadatos"
            >
              <RefreshCw size={16} />
              <span>Sincronizar</span>
            </button>
          </div>
        </div>

        {/* Selector de Pestañas */}
        <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 gap-2 shadow-inner">
          <button
            onClick={() => setTabActive('visual')}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              tabActive === 'visual'
                ? 'bg-chefsy-600 text-white shadow-lg shadow-chefsy-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <span>🎨</span>
            <span>Diseño Visual (Fotos y Textos)</span>
          </button>
          <button
            onClick={() => setTabActive('banco')}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              tabActive === 'banco'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <span>🖼️</span>
            <span>Banco de Fotos de la Casa ({bancoFotos.length})</span>
          </button>
          <button
            onClick={() => setTabActive('chefsitos')}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              tabActive === 'chefsitos'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-lg shadow-yellow-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <span>🪙</span>
            <span>Tienda Chefsitos</span>
          </button>
        </div>

        {/* Pestaña 1: Diseño Visual (Fotos y Textos) */}
        {tabActive === 'visual' && (
          <div className="space-y-6">
            {/* Barra de Estadísticas y Diagnóstico Rápido */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-black">
                  {stats.total}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Menú</p>
                  <p className="text-sm font-black text-slate-200 truncate">Productos</p>
                </div>
              </div>

              <button
                onClick={() => setFiltroEstado(filtroEstado === 'pausados' ? 'todos' : 'pausados')}
                className={`p-3.5 rounded-2xl flex items-center gap-3 transition-all text-left border cursor-pointer ${
                  filtroEstado === 'pausados'
                    ? 'bg-rose-950/60 border-rose-500/50 ring-2 ring-rose-500/20'
                    : stats.pausados > 0
                    ? 'bg-slate-900/60 border-rose-900/40 hover:border-rose-700'
                    : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-black ${
                  stats.pausados > 0
                    ? 'bg-rose-500/20 border-rose-500/30 text-rose-400'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}>
                  {stats.pausados}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">Pausados</p>
                  <p className="text-sm font-black text-slate-200 truncate">Ocultos Tienda</p>
                </div>
              </button>

              <button
                onClick={() => setFiltroEstado(filtroEstado === 'con_foto' ? 'todos' : 'con_foto')}
                className={`p-3.5 rounded-2xl flex items-center gap-3 transition-all text-left border cursor-pointer ${
                  filtroEstado === 'con_foto'
                    ? 'bg-emerald-950/60 border-emerald-500/50 ring-2 ring-emerald-500/20'
                    : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black">
                  {stats.conFoto}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Fotos Propias</p>
                  <p className="text-sm font-black text-slate-200 truncate">Con Galería</p>
                </div>
              </button>

              <button
                onClick={() => setFiltroEstado(filtroEstado === 'sin_foto' ? 'todos' : 'sin_foto')}
                className={`p-3.5 rounded-2xl flex items-center gap-3 transition-all text-left border cursor-pointer ${
                  filtroEstado === 'sin_foto'
                    ? 'bg-rose-950/60 border-rose-500/50 ring-2 ring-rose-500/20'
                    : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 font-black">
                  {stats.sinFoto}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">Faltan Fotos</p>
                  <p className="text-sm font-black text-slate-200 truncate">Placeholder</p>
                </div>
              </button>

              <button
                onClick={() => setFiltroEstado(filtroEstado === 'sin_desc' ? 'todos' : 'sin_desc')}
                className={`p-3.5 rounded-2xl flex items-center gap-3 transition-all text-left border cursor-pointer ${
                  filtroEstado === 'sin_desc'
                    ? 'bg-amber-950/60 border-amber-500/50 ring-2 ring-amber-500/20'
                    : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-black">
                  {stats.sinDesc}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Sin Descripción</p>
                  <p className="text-sm font-black text-slate-200 truncate">Texto pendiente</p>
                </div>
              </button>
            </div>

            {/* Filtros y Buscador de la Tienda */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar por nombre público, interno o descripción..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-900 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-chefsy-500 focus:border-transparent outline-none font-medium text-sm text-white placeholder:text-slate-500 transition-all shadow-inner"
                />
                {busqueda && (
                  <button
                    onClick={() => setBusqueda('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
                {/* Selector de Modo de Vista (Tarjetas vs Tabla Rápida) */}
                <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-2xl shrink-0">
                  <button
                    type="button"
                    onClick={() => setModoVista('grid')}
                    className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      modoVista === 'grid'
                        ? 'bg-chefsy-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Vista en Cuadrícula de Tarjetas"
                  >
                    <LayoutGrid size={15} />
                    <span className="hidden sm:inline">Tarjetas</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoVista('tabla')}
                    className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      modoVista === 'tabla'
                        ? 'bg-chefsy-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Modo Edición Rápida en Tabla (Estilo Excel)"
                  >
                    <TableIcon size={15} />
                    <span className="hidden sm:inline">Tabla Rápida</span>
                  </button>
                </div>

                <select
                  value={filtroCategoria}
                  onChange={e => setFiltroCategoria(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-slate-200 text-xs sm:text-sm font-bold rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-chefsy-500 transition-all cursor-pointer"
                >
                  <option value="todas">Todas las Categorías ({productos.length})</option>
                  {categorias.map(cat => {
                    const cant = productos.filter(p => p.categoriaId === cat.id).length
                    return (
                      <option key={cat.id} value={cat.id}>
                        {cat.nombre} ({cant})
                      </option>
                    )
                  })}
                </select>

                {(filtroEstado !== 'todos' || filtroCategoria !== 'todas' || busqueda) && (
                  <button
                    onClick={() => {
                      setFiltroEstado('todos')
                      setFiltroCategoria('todas')
                      setBusqueda('')
                    }}
                    className="px-3.5 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                    title="Restablecer todos los filtros"
                  >
                    <RotateCcw size={14} />
                    <span>Restablecer</span>
                  </button>
                )}
              </div>
            </div>
            {/* 1. Vista en Cuadrícula de Tarjetas */}
            {modoVista === 'grid' && (
              <div>
                {/* Banner de Tip Rápido */}
                <div className="mb-4 p-3 bg-chefsy-950/40 border border-chefsy-800/40 rounded-2xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-chefsy-300">
                    <Sparkles size={16} className="text-chefsy-400 shrink-0" />
                    <span>
                      <strong>Tip de Alta Velocidad:</strong> Podés arrastrar imágenes directamente desde tu computadora sobre la tarjeta de cualquier plato para actualizar su foto en 1 clic.
                    </span>
                  </div>
                </div>

                {productosFiltrados.length === 0 ? (
                  <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-12 text-center space-y-3">
                    <AlertTriangle className="mx-auto text-slate-500 w-12 h-12" />
                    <h3 className="text-lg font-bold text-slate-300">No se encontraron productos</h3>
                    <p className="text-xs text-slate-500">Probá ajustando la búsqueda o los filtros activos.</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {productosFiltrados.map(prod => {
                      const meta = metadata[prod.id]
                      const fotos = parsearFotosDeUrl(meta?.imagen_url)
                      const tieneFotosPropias = fotos.length > 0 && !esImagenPlaceholder(fotos[0])
                      const fallback = OBTENER_DETALLES_COMPLEMENTARIOS(prod.categoriaId, prod.nombre, prod.id)
                      const fotoAMostrar = tieneFotosPropias ? fotos[0] : (fotos[0] || fallback.img)
                      const descripcion = meta?.descripcion_publica || fallback.desc
                      const tieneDescripcion = Boolean(descripcion && descripcion.trim().length > 0)
                      const nombreAMostrar = meta?.nombre_publico || prod.nombre
                      const esNombreModificado = Boolean(meta?.nombre_publico && meta.nombre_publico !== prod.nombre)

                      const estaSiendoArrastrada = tarjetaArrastradaId === prod.id
                      const estaSubiendoFoto = subiendoFotoTarjetaId === prod.id
                      const estaActivo = prod.activo !== false
                      const estaPausando = pausandoProductoId === prod.id

                      return (
                        <div
                          key={prod.id}
                          onDragOver={e => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (tarjetaArrastradaId !== prod.id) setTarjetaArrastradaId(prod.id)
                          }}
                          onDragLeave={e => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (tarjetaArrastradaId === prod.id) setTarjetaArrastradaId(null)
                          }}
                          onDrop={e => handleDropDirectoEnTarjeta(e, prod)}
                          className={`bg-slate-900/80 border p-4 rounded-3xl shadow-lg flex flex-col justify-between gap-4 transition-all duration-200 relative overflow-hidden ${
                            estaSiendoArrastrada
                              ? 'border-chefsy-400 bg-chefsy-950/60 ring-4 ring-chefsy-500/30 scale-[1.02]'
                              : 'border-slate-800 hover:border-slate-700 hover:-translate-y-0.5'
                          }`}
                        >
                          {/* Overlay de Subida */}
                          {estaSubiendoFoto && (
                            <div className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center gap-2 animate-in fade-in">
                              <Loader2 className="animate-spin text-chefsy-400 w-8 h-8" />
                              <p className="text-xs font-black text-white">Comprimiendo y subiendo foto...</p>
                              <p className="text-[10px] text-slate-400">Asignando a "{nombreAMostrar}"</p>
                            </div>
                          )}

                          {/* Overlay de Drop Target */}
                          {estaSiendoArrastrada && !estaSubiendoFoto && (
                            <div className="absolute inset-0 z-20 bg-chefsy-950/95 border-2 border-dashed border-chefsy-400 rounded-3xl backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center gap-2 animate-in fade-in pointer-events-none">
                              <UploadCloud className="w-10 h-10 text-chefsy-400 animate-bounce" />
                              <p className="text-xs font-black text-white">Soltá la foto acá</p>
                              <p className="text-[10px] text-chefsy-200">Se establecerá como portada de "{nombreAMostrar}"</p>
                            </div>
                          )}

                          <div className="space-y-3">
                            {/* Cabecera de la tarjeta con imagen y datos */}
                            <div className="flex items-start gap-3.5">
                              <div className="relative w-20 h-20 bg-slate-950 rounded-2xl overflow-hidden shrink-0 border border-slate-800 flex items-center justify-center group/img">
                                {fotoAMostrar ? (
                                  <img
                                    src={fotoAMostrar}
                                    alt={nombreAMostrar}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <ImageIcon className="text-slate-600" />
                                )}
                                {fotos.length > 1 && (
                                  <span className="absolute bottom-1 right-1 bg-black/80 backdrop-blur-md text-[9px] font-black text-white px-1.5 py-0.5 rounded-md border border-white/10">
                                    +{fotos.length - 1}
                                  </span>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-1">
                                  <h3 className="font-bold text-white text-base leading-tight truncate" title={nombreAMostrar}>
                                    {nombreAMostrar}
                                  </h3>
                                  <span className="text-xs font-black text-chefsy-400 shrink-0">
                                    {formatearPrecio(prod.precio)}
                                  </span>
                                </div>

                                <p className="text-xs text-slate-400 truncate mt-0.5">
                                  {prod.nombre} <span className="text-[10px] text-slate-500">(Interno)</span>
                                </p>

                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                                  {categorias.find(c => c.id === prod.categoriaId)?.nombre || 'Categoría general'}
                                </p>
                              </div>
                            </div>

                            {/* Badges de Diagnóstico */}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {tieneFotosPropias ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                                  <span>📸</span>
                                  <span>{fotos.length} {fotos.length === 1 ? 'foto' : 'fotos'}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                                  <span>⚠️</span>
                                  <span>Sin foto</span>
                                </span>
                              )}

                              {tieneDescripcion ? (
                                <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                                  <span>📝</span>
                                  <span>Con descripción</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                                  <span>✍️</span>
                                  <span>Falta descripción</span>
                                </span>
                              )}

                              {esNombreModificado && (
                                <span className="inline-flex items-center gap-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                                  <span>✏️</span>
                                  <span>Nombre personalizado</span>
                                </span>
                              )}
                            </div>

                            {/* Extracto de Descripción */}
                            {descripcion ? (
                              <p className="text-xs text-slate-400 line-clamp-2 italic leading-relaxed">
                                "{descripcion}"
                              </p>
                            ) : (
                              <p className="text-xs text-slate-600 italic">
                                Sin descripción cargada en el menú.
                              </p>
                            )}

                            {/* Switch de Visibilidad / Pausa en Tienda */}
                            <div
                              className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all ${
                                estaActivo
                                  ? 'bg-slate-950/60 border-slate-800'
                                  : 'bg-rose-950/40 border-rose-900/60'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${
                                    estaActivo ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                                  }`}
                                ></span>
                                <div>
                                  <p className="text-[11px] font-black text-white leading-none">
                                    {estaActivo ? 'Visible en Tienda' : 'Pausado / Oculto'}
                                  </p>
                                  <p className="text-[9px] text-slate-400 mt-0.5">
                                    {estaActivo ? 'Disponible para compra' : 'Oculto para los clientes'}
                                  </p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={e => alternarVisibilidadTienda(prod.id, e)}
                                disabled={estaPausando}
                                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  estaActivo ? 'bg-chefsy-600' : 'bg-slate-700'
                                }`}
                                title={estaActivo ? 'Pausar/Ocultar de la tienda' : 'Activar/Mostrar en la tienda'}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                    estaActivo ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>

                          {/* Botón de Edición */}
                          <button
                            onClick={() => handleEdit(prod)}
                            className="w-full py-2.5 bg-slate-800 hover:bg-chefsy-600 text-slate-200 hover:text-white text-xs font-black rounded-2xl transition-all border border-slate-700 hover:border-chefsy-500 cursor-pointer flex items-center justify-center gap-2 active:scale-98 shadow-md"
                          >
                            <Wrench size={14} />
                            <span>Editar Fotos y Textos</span>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 2. Vista en Modo Tabla Rápida (Estilo Excel) */}
            {modoVista === 'tabla' && (
              <div className="space-y-4">
                {/* Banner de Ayuda Modo Excel */}
                <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <div className="w-7 h-7 rounded-xl bg-chefsy-500/10 border border-chefsy-500/20 flex items-center justify-center text-chefsy-400 shrink-0">
                      <TableIcon size={15} />
                    </div>
                    <span>
                      <strong>Modo Edición Rápida en Tabla:</strong> Editá nombres y descripciones directamente en cada celda. Usá <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-200">Tab</kbd> para avanzar y <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-200">Ctrl+S</kbd> para guardar todo junto.
                    </span>
                  </div>

                  {filasConCambios.length > 0 && (
                    <button
                      type="button"
                      onClick={guardarTodosLosCambiosTabla}
                      disabled={guardandoMasivo}
                      className="px-4 py-2 bg-chefsy-600 hover:bg-chefsy-500 text-white font-black text-xs rounded-xl shadow-lg shadow-chefsy-600/30 flex items-center gap-2 cursor-pointer transition-all shrink-0"
                    >
                      {guardandoMasivo ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      <span>Guardar {filasConCambios.length} cambios (Ctrl+S)</span>
                    </button>
                  )}
                </div>

                {/* Contenedor de la Tabla */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px] sm:text-[11px]">
                          <th className="py-3.5 px-4 w-16">Foto</th>
                          <th className="py-3.5 px-4 w-44">Nombre Interno</th>
                          <th className="py-3.5 px-4 min-w-[220px]">Nombre Público (Menú)</th>
                          <th className="py-3.5 px-4 min-w-[320px]">Descripción Pública</th>
                          <th className="py-3.5 px-3 w-28 text-right">Precio</th>
                          <th className="py-3.5 px-4 w-28 text-center">Tienda</th>
                          <th className="py-3.5 px-4 w-28 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {productosFiltrados.map(prod => {
                          const meta = metadata[prod.id]
                          const fotos = parsearFotosDeUrl(meta?.imagen_url)
                          const tieneFotosPropias = fotos.length > 0 && !esImagenPlaceholder(fotos[0])
                          const fallback = OBTENER_DETALLES_COMPLEMENTARIOS(prod.categoriaId, prod.nombre, prod.id)
                          const fotoAMostrar = tieneFotosPropias ? fotos[0] : (fotos[0] || fallback.img)
                          
                          const vals = getValoresFila(prod.id)
                          const tieneCambiosPendientes = edicionesTabla[prod.id] !== undefined &&
                            (edicionesTabla[prod.id].nombre_publico !== (meta?.nombre_publico ?? '') ||
                             edicionesTabla[prod.id].descripcion_publica !== (meta?.descripcion_publica ?? ''))
                          
                          const estaActivo = prod.activo !== false
                          const estaPausando = pausandoProductoId === prod.id
                          const estaGuardandoFila = guardandoFilaId === prod.id

                          return (
                            <tr
                              key={`tabla-${prod.id}`}
                              className={`transition-colors ${
                                tieneCambiosPendientes
                                  ? 'bg-amber-500/5 hover:bg-amber-500/10'
                                  : 'hover:bg-slate-800/40'
                              } ${!estaActivo ? 'opacity-70' : ''}`}
                            >
                              {/* 1. Foto Miniatura */}
                              <td className="py-2.5 px-4">
                                <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0 group">
                                  {fotoAMostrar ? (
                                    <img src={fotoAMostrar} alt={prod.nombre} className="w-full h-full object-cover" />
                                  ) : (
                                    <ImageIcon className="text-slate-600 m-auto mt-2" size={16} />
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleEdit(prod)}
                                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                                    title="Editar fotos"
                                  >
                                    <Wrench size={13} />
                                  </button>
                                </div>
                              </td>

                              {/* 2. Nombre Interno & Categoría */}
                              <td className="py-2.5 px-4">
                                <p className="font-bold text-white text-xs truncate max-w-[170px]" title={prod.nombre}>
                                  {prod.nombre}
                                </p>
                                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block truncate">
                                  {categorias.find(c => c.id === prod.categoriaId)?.nombre || 'Categoría'}
                                </span>
                              </td>

                              {/* 3. Input Nombre Público */}
                              <td className="py-2.5 px-4">
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={vals.nombre_publico}
                                    onChange={e => handleCambioFila(prod.id, 'nombre_publico', e.target.value)}
                                    placeholder={prod.nombre}
                                    className={`w-full px-3 py-2 bg-slate-950 border rounded-xl text-xs text-white font-semibold outline-none focus:ring-2 focus:ring-chefsy-500 transition-all ${
                                      tieneCambiosPendientes ? 'border-amber-500/60 bg-amber-950/20' : 'border-slate-800'
                                    }`}
                                  />
                                </div>
                              </td>

                              {/* 4. Input Descripción Pública */}
                              <td className="py-2.5 px-4">
                                <div className="relative">
                                  <textarea
                                    value={vals.descripcion_publica}
                                    onChange={e => handleCambioFila(prod.id, 'descripcion_publica', e.target.value)}
                                    placeholder="Descripción de ingredientes del plato..."
                                    rows={1}
                                    className={`w-full px-3 py-2 bg-slate-950 border rounded-xl text-xs text-slate-200 font-normal outline-none focus:ring-2 focus:ring-chefsy-500 transition-all resize-y min-h-[36px] ${
                                      tieneCambiosPendientes ? 'border-amber-500/60 bg-amber-950/20' : 'border-slate-800'
                                    }`}
                                  />
                                </div>
                              </td>

                              {/* 5. Precio */}
                              <td className="py-2.5 px-3 text-right">
                                <span className="font-black text-chefsy-400 text-xs">
                                  {formatearPrecio(prod.precio)}
                                </span>
                              </td>

                              {/* 6. Switch Visibilidad */}
                              <td className="py-2.5 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={e => alternarVisibilidadTienda(prod.id, e)}
                                  disabled={estaPausando}
                                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                    estaActivo ? 'bg-chefsy-600' : 'bg-slate-700'
                                  }`}
                                  title={estaActivo ? 'Pausar/Ocultar de la tienda' : 'Activar/Mostrar en la tienda'}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                      estaActivo ? 'translate-x-4' : 'translate-x-0'
                                    }`}
                                  />
                                </button>
                              </td>

                              {/* 7. Acciones */}
                              <td className="py-2.5 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {tieneCambiosPendientes ? (
                                    <button
                                      type="button"
                                      onClick={() => guardarFilaIndividual(prod.id)}
                                      disabled={estaGuardandoFila}
                                      className="p-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md cursor-pointer"
                                      title="Guardar fila individual"
                                    >
                                      {estaGuardandoFila ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleEdit(prod)}
                                      className="p-2 bg-slate-800 hover:bg-chefsy-600 text-slate-300 hover:text-white rounded-xl text-xs transition-all cursor-pointer"
                                      title="Editar fotos y detalles completos"
                                    >
                                      <Wrench size={13} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Barra Flotante Sticky de Cambios Pendientes */}
                {filasConCambios.length > 0 && (
                  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md border border-amber-500/50 shadow-2xl p-4 rounded-3xl flex items-center gap-4 animate-in slide-in-from-bottom duration-200">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full bg-amber-400 animate-ping"></div>
                      <p className="text-xs font-bold text-white">
                        <strong className="text-amber-400">{filasConCambios.length}</strong> {filasConCambios.length === 1 ? 'plato modificado' : 'platos modificados'} sin guardar
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={guardarTodosLosCambiosTabla}
                        disabled={guardandoMasivo}
                        className="px-4 py-2 bg-chefsy-600 hover:bg-chefsy-500 text-white font-black text-xs rounded-xl shadow-lg shadow-chefsy-600/30 flex items-center gap-2 cursor-pointer transition-all"
                      >
                        {guardandoMasivo ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        <span>Guardar Todo (Ctrl+S)</span>
                      </button>
                      <button
                        type="button"
                        onClick={descartarCambiosTabla}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        Descartar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Pestaña 2: Banco de Fotos de la Casa */}
        {tabActive === 'banco' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-3xl">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="text"
                  placeholder="Buscar foto por nombre de plato, categoría o 'sin asignar'..."
                  value={busquedaBanco}
                  onChange={e => setBusquedaBanco(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs sm:text-sm text-white placeholder:text-slate-500 transition-all"
                />
                {busquedaBanco && (
                  <button
                    onClick={() => setBusquedaBanco('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 justify-between md:justify-end">
                <select
                  value={filtroCategoriaBanco}
                  onChange={e => setFiltroCategoriaBanco(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-200 text-xs sm:text-sm font-bold rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                >
                  <option value="todas">Todas las Categorías</option>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>

                {(busquedaBanco || filtroCategoriaBanco !== 'todas') && (
                  <button
                    onClick={() => {
                      setBusquedaBanco('')
                      setFiltroCategoriaBanco('todas')
                    }}
                    className="px-3.5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                    title="Restablecer filtros del banco"
                  >
                    <RotateCcw size={14} />
                    <span>Restablecer</span>
                  </button>
                )}

                <div className="text-xs font-bold text-slate-400 shrink-0 px-1">
                  <span>Fotos: <strong className="text-indigo-400">{bancoFotosFiltradas.length}</strong></span>
                </div>

                {/* Input para subir lote de fotos de la PC */}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  id="banco-upload-input"
                  className="hidden"
                  onChange={handleSubirLoteBancoInput}
                />
                <label
                  htmlFor="banco-upload-input"
                  className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-md shadow-emerald-600/20 active:scale-95"
                  title="Seleccionar múltiples fotos a la vez de tu computadora"
                >
                  {subiendoLoteBanco ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>{progresoLoteBanco || 'Subiendo lote...'}</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud size={15} />
                      <span>Subir Fotos (PC)</span>
                    </>
                  )}
                </label>

                <button
                  type="button"
                  onClick={() => setMostrarModalGDrive(true)}
                  className="px-3.5 py-2.5 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 hover:border-blue-500 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
                  title="Importar fotos desde Google Drive"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.71 3.5L1.15 15l3.43 6l6.55-11.5L7.71 3.5zm8.58 0l-6.56 11.5l3.43 6l6.56-11.5l-3.43-6zm-5.15 9l-3.43 6h13.14l3.43-6H11.14z" />
                  </svg>
                  <span>Google Drive</span>
                </button>
              </div>
            </div>

            {/* Zona de Drag & Drop para Arrastrar Lote de Fotos directamente al Banco */}
            <div
              onDragOver={e => {
                e.preventDefault()
                e.stopPropagation()
                setIsDraggingOverBanco(true)
              }}
              onDragLeave={e => {
                e.preventDefault()
                e.stopPropagation()
                setIsDraggingOverBanco(false)
              }}
              onDrop={handleDropBanco}
              className={`p-4 border-2 border-dashed rounded-3xl text-center transition-all ${
                isDraggingOverBanco
                  ? 'border-emerald-400 bg-emerald-500/10 scale-[0.99]'
                  : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <UploadCloud size={16} />
                  <span>Arrastrá un lote de varias fotos juntas acá</span>
                </div>
                <span className="hidden sm:inline text-slate-600">•</span>
                <span>Se procesan, comprimen en WebP y se agregan al banco en vivo</span>
              </div>
            </div>

            {bancoFotosFiltradas.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
                <ImageIcon className="mx-auto text-slate-600 w-12 h-12" />
                <h3 className="text-base font-bold text-slate-300">No se encontraron fotos en el banco</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {busquedaBanco || filtroCategoriaBanco !== 'todas'
                    ? 'No hay fotos que coincidan con la búsqueda o categoría seleccionada.'
                    : 'Subí fotos a los platos del menú para que aparezcan disponibles acá para reutilizar.'}
                </p>
                {(busquedaBanco || filtroCategoriaBanco !== 'todas') && (
                  <button
                    type="button"
                    onClick={() => {
                      setBusquedaBanco('')
                      setFiltroCategoriaBanco('todas')
                    }}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer mt-2"
                  >
                    <RotateCcw size={13} />
                    <span>Ver Todas las Fotos</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {bancoFotosFiltradas.map((item, idx) => (
                  <div
                    key={`${item.url}-${idx}`}
                    className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-lg flex flex-col justify-between group hover:border-slate-700 transition-all"
                  >
                    <div className="relative aspect-video sm:aspect-square bg-slate-950 overflow-hidden">
                      <img
                        src={item.url}
                        alt="Foto de la casa"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <button
                        type="button"
                        onClick={() => setFotoZoomUrl(item.url)}
                        className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black text-white rounded-xl backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Ver en grande"
                      >
                        <Eye size={14} />
                      </button>
                    </div>

                    <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                      <div>
                        {item.productosUsados.length === 0 ? (
                          <div className="flex items-center gap-1.5 py-1">
                            <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-black px-2.5 py-0.5 rounded-md inline-flex items-center gap-1">
                              <span>✨ Nueva en el Banco (Sin asignar)</span>
                            </span>
                          </div>
                        ) : (
                          <>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Usada en ({item.productosUsados.length}):
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1 max-h-16 overflow-y-auto">
                              {item.productosUsados.map(p => (
                                <span
                                  key={p.id}
                                  className="bg-slate-800 text-slate-300 text-[10px] font-semibold px-2 py-0.5 rounded-md truncate max-w-full"
                                  title={p.nombre}
                                >
                                  {p.nombre}
                                </span>
                              ))}
                            </div>
                          </>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-2">
                        {asignandoFotoUrl === item.url ? (
                          <div className="space-y-2 bg-slate-950 p-2.5 rounded-2xl border border-indigo-500/40 animate-in fade-in">
                            <label className="text-[10px] font-bold text-indigo-300">
                              Seleccionar plato a asignar:
                            </label>
                            <select
                              value={asignandoProductoId}
                              onChange={e => setAsignandoProductoId(e.target.value)}
                              className="w-full p-2 bg-slate-900 border border-slate-700 text-white text-xs rounded-xl outline-none"
                            >
                              <option value="">-- Elegir producto --</option>
                              {productos.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.nombre}
                                </option>
                              ))}
                            </select>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  if (asignandoProductoId) {
                                    asignarFotoAProductoDirecto(item.url, asignandoProductoId)
                                  }
                                }}
                                disabled={!asignandoProductoId}
                                className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold disabled:opacity-50 cursor-pointer"
                              >
                                Asignar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAsignandoFotoUrl(null)
                                  setAsignandoProductoId('')
                                }}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-xs cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setAsignandoFotoUrl(item.url)
                                setAsignandoProductoId('')
                              }}
                              className="flex-1 py-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 hover:border-indigo-500 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Plus size={13} />
                              <span>Asignar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(item.url)
                                mostrarToast('Enlace de la imagen copiado al portapapeles', 'info')
                              }}
                              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
                              title="Copiar Enlace Directo"
                            >
                              <Link2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pestaña 3: Tienda Chefsitos (Precios en Puntos) */}
        {tabActive === 'chefsitos' && (
          <div className="space-y-6">
            {/* Toolbar Chefsitos */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar plato para configurar puntos Chefsitos..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-900 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none font-medium text-sm text-white placeholder:text-slate-500 transition-all shadow-inner"
                />
                {busqueda && (
                  <button
                    onClick={() => setBusqueda('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={filtroCategoria}
                  onChange={e => setFiltroCategoria(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-slate-200 text-xs sm:text-sm font-bold rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer"
                >
                  <option value="todas">Todas las Categorías ({productos.length})</option>
                  {categorias.map(cat => {
                    const cant = productos.filter(p => p.categoriaId === cat.id).length
                    return (
                      <option key={cat.id} value={cat.id}>
                        {cat.nombre} ({cant})
                      </option>
                    )
                  })}
                </select>

                {(filtroCategoria !== 'todas' || busqueda) && (
                  <button
                    onClick={() => {
                      setFiltroCategoria('todas')
                      setBusqueda('')
                    }}
                    className="px-3.5 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                    title="Restablecer filtros"
                  >
                    <RotateCcw size={14} />
                    <span>Restablecer</span>
                  </button>
                )}
              </div>
            </div>

            {productosFiltrados.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-12 text-center space-y-4">
                <AlertTriangle className="mx-auto text-amber-500 w-12 h-12" />
                <h3 className="text-lg font-bold text-slate-300">No se encontraron productos</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  No hay platos que coincidan con la búsqueda o categoría seleccionada.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setBusqueda('')
                    setFiltroCategoria('todas')
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw size={14} />
                  <span>Ver Todos los Platos</span>
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {productosFiltrados.map(prod => {
                  const meta = metadata[prod.id]
                  const pts = preciosPuntos[prod.id] ?? 0
                  const fotos = parsearFotosDeUrl(meta?.imagen_url)
                  const fallback = OBTENER_DETALLES_COMPLEMENTARIOS(prod.categoriaId, prod.nombre, prod.id)
                  const fotoAMostrar = fotos[0] || fallback.img

                  return (
                    <div
                      key={prod.id}
                      className="bg-slate-900 border border-amber-500/20 p-4 rounded-3xl shadow-lg flex flex-col justify-between gap-4 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-2xl rounded-full pointer-events-none"></div>
                      
                      <div className="space-y-3 relative z-10">
                        <div className="flex items-start gap-3.5">
                          <div className="w-16 h-16 bg-slate-950 rounded-2xl overflow-hidden shrink-0 border border-slate-800 flex items-center justify-center">
                            {fotoAMostrar ? (
                              <img src={fotoAMostrar} alt={prod.nombre} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="text-slate-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-white leading-tight truncate">
                              {meta?.nombre_publico || prod.nombre}
                            </h3>
                            <p className="text-xs text-slate-400 truncate mt-0.5">Precio normal: {formatearPrecio(prod.precio)}</p>
                          </div>
                        </div>

                        <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-2xl space-y-2">
                          <label className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                            <span>🪙</span>
                            <span>Canje por Chefsitos (Puntos)</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              step="10"
                              value={pts}
                              onChange={e =>
                                setPreciosPuntos({
                                  ...preciosPuntos,
                                  [prod.id]: parseInt(e.target.value) || 0,
                                })
                              }
                              placeholder="0 = No canjeable"
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-bold text-white text-sm"
                            />
                            <span className="text-xs font-black text-amber-400 shrink-0">pts</span>
                          </div>
                          <p className="text-[10px] text-slate-500">
                            {pts > 0 ? 'Visible en la sección de Canje por Puntos.' : 'Oculto de la sección de canje.'}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => guardarPrecioChefsitos(prod.id)}
                        disabled={guardandoPuntosId === prod.id}
                        className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-black rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2 relative z-10"
                      >
                        {guardandoPuntosId === prod.id ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {guardandoPuntosId === prod.id ? 'Guardando...' : 'Guardar Precio Chefsitos'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Modal de Edición Integral con Live Preview */}
      {productoEditandoId && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
            
            {/* Header del Modal */}
            <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-chefsy-500/10 border border-chefsy-500/20 flex items-center justify-center text-chefsy-400">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white">Editar Visualización en Tienda</h2>
                  <p className="text-xs text-slate-400">
                    Personalizá fotos, nombre y descripción para los clientes de la web pública.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setProductoEditandoId(null)}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Cuerpo en 2 Columnas (Formulario + Live Preview) */}
            <div className="grid lg:grid-cols-12 flex-1 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
              
              {/* Columna Izquierda: Formulario y Galería */}
              <form onSubmit={handleSave} className="lg:col-span-7 p-5 sm:p-6 space-y-6">
                
                {/* Switch de Visibilidad / Pausa en Tienda */}
                {productoActualEditando && (
                  <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          productoActualEditando.activo !== false
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        <Eye size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">
                          {productoActualEditando.activo !== false ? 'Producto Activo y Visible' : 'Producto Pausado / Oculto'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {productoActualEditando.activo !== false
                            ? 'Los clientes pueden ver y ordenar este plato en la tienda online'
                            : 'Oculto de la tienda pública por falta de stock o temporada'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={e => alternarVisibilidadTienda(productoActualEditando.id, e)}
                      disabled={pausandoProductoId === productoActualEditando.id}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        productoActualEditando.activo !== false ? 'bg-chefsy-600' : 'bg-slate-700'
                      }`}
                      title="Alternar visibilidad"
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          productoActualEditando.activo !== false ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                )}

                {/* 1. Nombre Público */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-slate-300 uppercase tracking-wider">
                      Nombre Público (Menú)
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Interno: {productoActualEditando?.nombre}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={nombrePublico}
                    onChange={e => setNombrePublico(e.target.value)}
                    placeholder="Ej: La Gran Chefsy Especial"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-chefsy-500 outline-none text-white text-sm font-semibold"
                  />
                </div>

                {/* 2. Descripción */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-slate-300 uppercase tracking-wider">
                      Descripción del Plato
                    </label>
                    <span className="text-[11px] text-slate-500">
                      {descripcionPublica.length} caracteres
                    </span>
                  </div>
                  <textarea
                    value={descripcionPublica}
                    onChange={e => setDescripcionPublica(e.target.value)}
                    placeholder="Ej: Doble medallón smash de 120g, queso cheddar fundido, panceta crocante y salsa secreta en pan brioche artesanal..."
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-chefsy-500 outline-none text-white text-sm font-medium resize-none leading-relaxed"
                  />
                </div>

                {/* 3. Galería de Fotos */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <span>📸 Galería de Fotos</span>
                      <span className="bg-slate-800 text-slate-300 text-[10px] font-black px-2 py-0.5 rounded-md">
                        {galeriaFotos.length} {galeriaFotos.length === 1 ? 'foto' : 'fotos'}
                      </span>
                    </label>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setMostrarModalGDrive(true)}
                        className="text-[11px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1.5 cursor-pointer"
                        title="Importar fotos desde Google Drive"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M7.71 3.5L1.15 15l3.43 6l6.55-11.5L7.71 3.5zm8.58 0l-6.56 11.5l3.43 6l6.56-11.5l-3.43-6zm-5.15 9l-3.43 6h13.14l3.43-6H11.14z" />
                        </svg>
                        <span>Google Drive</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMostrarBancoModal(!mostrarBancoModal)}
                        className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                      >
                        <ImageIcon size={13} />
                        <span>{mostrarBancoModal ? 'Ocultar Banco' : `Banco de Fotos (${bancoFotos.length})`}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMostrarInputUrl(!mostrarInputUrl)}
                        className="text-[11px] font-bold text-chefsy-400 hover:text-chefsy-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Link2 size={13} />
                        <span>{mostrarInputUrl ? 'Ocultar enlace' : 'Pegar enlace URL'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Selector del Banco de Fotos dentro del Modal */}
                  {/* Selector del Banco de Fotos dentro del Modal con Selección Múltiple */}
                  {mostrarBancoModal && (
                    <div className="p-4 bg-slate-950 border border-indigo-500/30 rounded-2xl space-y-3 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <ImageIcon size={16} className="text-indigo-400" />
                          <span className="text-xs font-black text-white">Elegir fotos del Banco de la Casa</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {bancoSeleccionMultiple.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const nuevasParaAgregar = bancoSeleccionMultiple
                                  .filter(url => !galeriaFotos.some(f => f.url === url))
                                  .map((url, i) => ({
                                    id: `banco-multi-${Date.now()}-${i}`,
                                    url,
                                    esNueva: false,
                                  }))

                                setGaleriaFotos(prev => [...prev, ...nuevasParaAgregar])
                                mostrarToast(`¡${nuevasParaAgregar.length} fotos añadidas a la galería! 📸`, 'success')
                                setBancoSeleccionMultiple([])
                              }}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[11px] font-black transition-colors cursor-pointer flex items-center gap-1 shadow-md shadow-indigo-600/30 active:scale-95"
                            >
                              <Plus size={13} />
                              <span>Añadir {bancoSeleccionMultiple.length} seleccionadas</span>
                            </button>
                          )}
                          <span className="text-[10px] font-bold text-slate-400">
                            {bancoFotos.length} fotos disponibles
                          </span>
                        </div>
                      </div>

                      {bancoFotos.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-2">
                          Aún no hay fotos subidas en otros productos.
                        </p>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-52 overflow-y-auto p-1">
                          {bancoFotos.map((item, i) => {
                            const yaEnGaleria = galeriaFotos.some(f => f.url === item.url)
                            const estaSeleccionada = bancoSeleccionMultiple.includes(item.url)

                            return (
                              <button
                                key={`modal-banco-${i}`}
                                type="button"
                                onClick={() => {
                                  if (yaEnGaleria) {
                                    mostrarToast('Esta foto ya está en la galería', 'info')
                                    return
                                  }
                                  if (estaSeleccionada) {
                                    setBancoSeleccionMultiple(prev => prev.filter(u => u !== item.url))
                                  } else {
                                    setBancoSeleccionMultiple(prev => [...prev, item.url])
                                  }
                                }}
                                className={`relative aspect-square rounded-xl overflow-hidden border transition-all text-left group/banco cursor-pointer ${
                                  yaEnGaleria
                                    ? 'border-emerald-500 ring-2 ring-emerald-500/30 opacity-60'
                                    : estaSeleccionada
                                    ? 'border-indigo-400 ring-2 ring-indigo-500/60 scale-95'
                                    : 'border-slate-800 hover:border-indigo-400 hover:scale-105'
                                }`}
                              >
                                <img
                                  src={item.url}
                                  alt="Foto banco"
                                  className="w-full h-full object-cover"
                                />
                                {yaEnGaleria && (
                                  <div className="absolute inset-0 bg-emerald-950/70 flex items-center justify-center">
                                    <Check size={16} className="text-emerald-400 stroke-[3]" />
                                  </div>
                                )}
                                {estaSeleccionada && (
                                  <div className="absolute top-1 right-1 bg-indigo-600 text-white rounded-full p-1 shadow-md">
                                    <Check size={12} className="stroke-[3]" />
                                  </div>
                                )}
                                {!yaEnGaleria && !estaSeleccionada && (
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/banco:opacity-100 flex items-center justify-center transition-opacity">
                                    <Plus size={18} className="text-white" />
                                  </div>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Input opcional para pegar URL directa */}
                  {mostrarInputUrl && (
                    <div className="flex gap-2 p-3 bg-slate-950 border border-slate-800 rounded-2xl animate-in fade-in duration-150">
                      <input
                        type="url"
                        value={urlDirectaInput}
                        onChange={e => setUrlDirectaInput(e.target.value)}
                        placeholder="Pegá un enlace de imagen (https://...)"
                        className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:ring-1 focus:ring-chefsy-500"
                      />
                      <button
                        type="button"
                        onClick={agregarUrlDirecta}
                        className="px-3 py-2 bg-chefsy-600 hover:bg-chefsy-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                      >
                        Añadir
                      </button>
                    </div>
                  )}

                  {/* Lista de fotos en la galería con controles individuales */}
                  {galeriaFotos.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] text-slate-400 font-medium">
                        La primera imagen es la <strong className="text-amber-400">Portada Principal</strong> del menú. Podés cambiarla o eliminar fotos individuales:
                      </p>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {galeriaFotos.map((foto, index) => {
                          const esPortada = index === 0

                          return (
                            <div
                              key={foto.id}
                              className={`relative group bg-slate-950 rounded-2xl overflow-hidden border p-1 flex flex-col justify-between transition-all ${
                                esPortada ? 'border-amber-500/60 ring-2 ring-amber-500/20' : 'border-slate-800'
                              }`}
                            >
                              <div className="relative aspect-video sm:aspect-square w-full rounded-xl overflow-hidden bg-slate-900/80">
                                <img src={foto.url} alt={`Foto ${index + 1}`} className="w-full h-full object-contain sm:object-cover" />
                                
                                {/* Overlay de Recorte IA si está procesando esta foto */}
                                {recortandoFotoId === foto.id && (
                                  <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-2 text-center gap-1.5 animate-in fade-in z-20">
                                    <Loader2 className="animate-spin text-chefsy-400 w-6 h-6" />
                                    <p className="text-[10px] font-black text-white">{mensajeRecorte || 'Recortando fondo...'}</p>
                                  </div>
                                )}

                                {esPortada && (
                                  <div className="absolute top-1.5 left-1.5 bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-md">
                                    <Star size={11} className="fill-slate-950" />
                                    <span>PORTADA</span>
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setFotoZoomUrl(foto.url)}
                                  className="absolute bottom-1.5 right-1.5 p-1.5 bg-black/60 hover:bg-black/90 backdrop-blur-md text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                  title="Ver grande"
                                >
                                  <Eye size={14} />
                                </button>
                              </div>

                              {/* Acciones de la foto */}
                              <div className="flex flex-wrap items-center justify-between gap-1 pt-2 px-1">
                                <div className="flex items-center gap-1">
                                  {!esPortada ? (
                                    <button
                                      type="button"
                                      onClick={() => hacerPortada(index)}
                                      className="text-[10px] font-black text-amber-400 hover:text-amber-300 flex items-center gap-1 py-1 px-1.5 rounded-lg hover:bg-amber-500/10 transition-colors cursor-pointer"
                                      title="Definir como foto de portada"
                                    >
                                      <Star size={12} />
                                      <span>Portada</span>
                                    </button>
                                  ) : (
                                    <span className="text-[10px] font-bold text-slate-500 px-1">Principal</span>
                                  )}

                                  {/* Botón Quitar Fondo con IA */}
                                  <button
                                    type="button"
                                    onClick={() => handleQuitarFondoFoto(foto, index)}
                                    disabled={recortandoFotoId !== null}
                                    className="text-[10px] font-black text-chefsy-400 hover:text-chefsy-300 flex items-center gap-1 py-1 px-1.5 rounded-lg hover:bg-chefsy-500/10 transition-colors cursor-pointer disabled:opacity-50"
                                    title="Quitar fondo de la foto con Inteligencia Artificial"
                                  >
                                    <Scissors size={12} />
                                    <span>Quitar fondo</span>
                                  </button>
                                </div>

                                <div className="flex items-center gap-1">
                                  {index > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => moverFoto(index, 'izq')}
                                      className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
                                      title="Mover antes"
                                    >
                                      <ChevronLeft size={14} />
                                    </button>
                                  )}
                                  {index < galeriaFotos.length - 1 && (
                                    <button
                                      type="button"
                                      onClick={() => moverFoto(index, 'der')}
                                      className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
                                      title="Mover después"
                                    >
                                      <ChevronRight size={14} />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => eliminarFotoDeGaleria(foto.id)}
                                    className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                    title="Eliminar esta foto"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Zona de Carga / Drag & Drop */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-3xl p-6 text-center transition-all ${
                      isDraggingOver
                        ? 'border-chefsy-400 bg-chefsy-500/10 scale-[0.99]'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      id="upload-foto-input"
                      className="hidden"
                      onChange={handleFileInputChange}
                    />
                    <label
                      htmlFor="upload-foto-input"
                      className="cursor-pointer flex flex-col items-center justify-center gap-2.5"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-chefsy-500/10 border border-chefsy-500/20 flex items-center justify-center text-chefsy-400">
                        {procesandoMultiplesFotos ? (
                          <Loader2 size={24} className="animate-spin text-chefsy-400" />
                        ) : (
                          <UploadCloud size={24} />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">
                          {procesandoMultiplesFotos ? (
                            <span>{progresoMultiplesFotos || 'Procesando fotos seleccionadas...'}</span>
                          ) : (
                            <span>Hacé clic para elegir múltiples fotos a la vez o arrastralas juntas acá</span>
                          )}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Podés marcar <strong className="text-chefsy-300">múltiples fotos</strong> con <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-200">Ctrl</kbd> o <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-200">Shift</kbd> en tu explorador, arrastrar en grupo o pegar con <strong className="text-chefsy-300">Ctrl + V</strong>
                        </p>
                      </div>
                      <span className="mt-1 px-5 py-2.5 bg-chefsy-600 hover:bg-chefsy-500 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-chefsy-600/30 flex items-center gap-2">
                        <UploadCloud size={15} />
                        <span>Elegir Múltiples Fotos de tu PC...</span>
                      </span>
                    </label>
                  </div>
                </div>

                {/* Botones Guardar / Cancelar */}
                <div className="pt-4 flex gap-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setProductoEditandoId(null)}
                    className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition-colors cursor-pointer text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardando}
                    className="flex-1 py-3.5 bg-chefsy-600 hover:bg-chefsy-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-chefsy-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95 text-sm"
                  >
                    {guardando ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {guardando ? 'Guardando Cambios...' : 'Guardar y Publicar'}
                  </button>
                </div>
              </form>

              {/* Columna Derecha: Live Preview en Tiempo Real */}
              <div className="lg:col-span-5 p-5 sm:p-6 bg-slate-950 flex flex-col justify-between gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Eye size={16} className="text-chefsy-400" />
                      <span className="text-xs font-black text-slate-300 uppercase tracking-wider">
                        Live Preview (Tienda)
                      </span>
                    </div>
                    <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setVistaPreview('mobile')}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          vistaPreview === 'mobile' ? 'bg-chefsy-600 text-white' : 'text-slate-500 hover:text-slate-300'
                        }`}
                        title="Vista Móvil"
                      >
                        <Smartphone size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setVistaPreview('desktop')}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          vistaPreview === 'desktop' ? 'bg-chefsy-600 text-white' : 'text-slate-500 hover:text-slate-300'
                        }`}
                        title="Vista Desktop"
                      >
                        <Laptop size={15} />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500">
                    Así verán los clientes este producto en el catálogo público:
                  </p>

                  {/* Réplica de Tarjeta de la Tienda */}
                  <div className="bg-[#181818] border border-white/10 rounded-2xl p-4 shadow-2xl text-left space-y-3">
                    <div className="flex items-start gap-4">
                      {/* Imagen con Aspect Ratio del Catálogo */}
                      <div className="relative h-20 w-20 md:h-24 md:w-24 shrink-0 overflow-hidden rounded-xl bg-black/40">
                        <img
                          src={fotoPortadaPreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        {productoActualEditando?.esCombo && (
                          <span className="absolute top-1 left-1 text-[8px] font-black bg-chefsy-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider shadow-lg">
                            Combo
                          </span>
                        )}
                        {galeriaFotos.length > 1 && (
                          <span className="absolute bottom-1 right-1 bg-black/80 backdrop-blur-sm text-[8px] font-black text-white px-1.5 py-0.5 rounded border border-white/10">
                            1/{galeriaFotos.length}
                          </span>
                        )}
                      </div>

                      {/* Textos y Precios */}
                      <div className="flex-1 flex flex-col justify-center py-0.5 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-bebas text-2xl md:text-3xl text-white leading-none tracking-wide truncate">
                            {nombrePublico || productoActualEditando?.nombre || 'Nombre del Producto'}
                          </h4>
                          <span className="font-sans font-bold text-sm text-chefsy-400 shrink-0">
                            {formatearPrecio(productoActualEditando?.precio || 0)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 font-medium leading-snug mt-1 line-clamp-3">
                          {descripcionPublica || 'Sin descripción...'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Resumen de estado para el producto */}
                  <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 space-y-2">
                    <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                      Estado de Sincronización
                    </h5>
                    <ul className="text-xs space-y-1.5 text-slate-300">
                      <li className="flex items-center gap-2">
                        {galeriaFotos.length > 0 ? (
                          <Check size={14} className="text-emerald-400 shrink-0" />
                        ) : (
                          <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                        )}
                        <span>
                          {galeriaFotos.length > 0
                            ? `Galería configurada (${galeriaFotos.length} fotos)`
                            : 'Usará imagen genérica de respaldo'}
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        {descripcionPublica.trim().length > 0 ? (
                          <Check size={14} className="text-emerald-400 shrink-0" />
                        ) : (
                          <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                        )}
                        <span>
                          {descripcionPublica.trim().length > 0
                            ? 'Descripción lista para el menú'
                            : 'Falta descripción informativa'}
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 text-center">
                  Los cambios se aplican de forma inmediata en la tienda pública sin demoras de caché.
                </p>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Lightbox / Zoom de Foto */}
      {fotoZoomUrl && (
        <div
          onClick={() => setFotoZoomUrl(null)}
          className="fixed inset-0 z-[110] bg-black/95 flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-150"
        >
          <div className="relative max-w-4xl max-h-[85vh] w-full flex items-center justify-center">
            <img src={fotoZoomUrl} alt="Zoom" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
            <button
              onClick={() => setFotoZoomUrl(null)}
              className="absolute top-2 right-2 p-2 bg-black/70 text-white rounded-full hover:bg-black transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Modal de Importación desde Google Drive */}
      <ModalImportarGoogleDrive
        abierto={mostrarModalGDrive}
        onCerrar={() => setMostrarModalGDrive(false)}
        onFotosImportadas={handleFotosImportadasGoogleDrive}
        titulo={
          productoEditandoId
            ? `Importar Fotos a "${productoActualEditando?.nombre || 'Plato'}"`
            : 'Importar Fotos al Banco de la Casa'
        }
      />

    </div>
  )
}


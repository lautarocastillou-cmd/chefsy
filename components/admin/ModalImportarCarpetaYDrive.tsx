'use client'

import React, { useState, useMemo, useRef, useCallback } from 'react'
import {
  X,
  UploadCloud,
  Check,
  AlertCircle,
  Loader2,
  Sparkles,
  Folder,
  FolderOpen,
  FileImage,
  Layers,
  HardDrive,
  Eye,
  CheckSquare,
  Square,
  RefreshCw,
  Plus
} from 'lucide-react'
import { extraerGoogleDriveFileIds, obtenerUrlsDirectasGoogleDrive } from '@/lib/gdrive'

export interface FotoEscaneada {
  id: string
  file?: File
  nombre: string
  rutaRelativa: string
  carpetaPadre: string
  tamano: number
  previewUrl: string
  seleccionada: boolean
  driveId?: string
}

interface ModalImportarCarpetaYDriveProps {
  abierto: boolean
  onCerrar: () => void
  onFotosImportadas: (urls: string[]) => void
  titulo?: string
  descripcion?: string
}

// Formatear bytes a KB / MB
function formatearTamano(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// Extensiones de imagen soportadas
const EXTENSIONES_IMAGEN = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'bmp', 'svg'])

function esArchivoImagen(nombre: string, mimeType?: string): boolean {
  if (mimeType && mimeType.startsWith('image/')) return true
  const ext = nombre.split('.').pop()?.toLowerCase() || ''
  return EXTENSIONES_IMAGEN.has(ext)
}

export default function ModalImportarCarpetaYDrive({
  abierto,
  onCerrar,
  onFotosImportadas,
  titulo = 'Importar Fotos (Carpeta PC / Google Drive)',
  descripcion = 'Arrastrá una carpeta entera de Windows / Google Drive para escritorio o subí archivos en lote.',
}: ModalImportarCarpetaYDriveProps) {
  const [tabActiva, setTabActiva] = useState<'carpeta' | 'drive_web'>('carpeta')
  const [fotosEscaneadas, setFotosEscaneadas] = useState<FotoEscaneada[]>([])
  const [carpetaSeleccionadaFiltro, setCarpetaSeleccionadaFiltro] = useState<string>('todas')
  const [arrastrando, setArrastrando] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [progresoActual, setProgresoActual] = useState({ actual: 0, total: 0, porcentaje: 0 })
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [fotoZoom, setFotoZoom] = useState<FotoEscaneada | null>(null)

  // Estado para Tab de Google Drive Web (links)
  const [textoLinks, setTextoLinks] = useState('')

  const inputCarpetaRef = useRef<HTMLInputElement>(null)
  const inputArchivosRef = useRef<HTMLInputElement>(null)

  // Extraer IDs de Google Drive en modo links
  const idsDriveDetectados = useMemo(() => {
    return extraerGoogleDriveFileIds(textoLinks)
  }, [textoLinks])

  // Listado de subcarpetas detectadas
  const carpetasDetectadas = useMemo(() => {
    const setCarpetas = new Set<string>()
    fotosEscaneadas.forEach(f => {
      if (f.carpetaPadre) setCarpetas.add(f.carpetaPadre)
    })
    return Array.from(setCarpetas)
  }, [fotosEscaneadas])

  // Fotos filtradas por carpeta
  const fotosFiltradas = useMemo(() => {
    if (carpetaSeleccionadaFiltro === 'todas') return fotosEscaneadas
    return fotosEscaneadas.filter(f => f.carpetaPadre === carpetaSeleccionadaFiltro)
  }, [fotosEscaneadas, carpetaSeleccionadaFiltro])

  const cantidadSeleccionadas = useMemo(() => {
    return fotosEscaneadas.filter(f => f.seleccionada).length
  }, [fotosEscaneadas])

  const pesoTotalSeleccionado = useMemo(() => {
    return fotosEscaneadas
      .filter(f => f.seleccionada)
      .reduce((acc, f) => acc + f.tamano, 0)
  }, [fotosEscaneadas])

  // Escanear entradas de FileSystem API recursivamente (Drag and Drop)
  const escanearEntryRecursivo = async (entry: any, path: string = ''): Promise<FotoEscaneada[]> => {
    const resultados: FotoEscaneada[] = []

    if (entry.isFile) {
      const file: File = await new Promise((resolve, reject) => entry.file(resolve, reject))
      if (esArchivoImagen(file.name, file.type)) {
        const rutaRelativa = path ? `${path}/${file.name}` : file.name
        const partesRuta = rutaRelativa.split('/')
        const carpetaPadre = partesRuta.length > 1 ? partesRuta[partesRuta.length - 2] : 'Raíz'
        resultados.push({
          id: `scan-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          file,
          nombre: file.name,
          rutaRelativa,
          carpetaPadre,
          tamano: file.size,
          previewUrl: URL.createObjectURL(file),
          seleccionada: true,
        })
      }
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader()
      const leerTodasLasEntradas = async (): Promise<any[]> => {
        let entries: any[] = []
        let batch: any[]
        do {
          batch = await new Promise((resolve, reject) => dirReader.readEntries(resolve, reject))
          entries = entries.concat(batch)
        } while (batch.length > 0)
        return entries
      }

      const childEntries = await leerTodasLasEntradas()
      const nuevoPath = path ? `${path}/${entry.name}` : entry.name
      for (const child of childEntries) {
        const subResultados = await escanearEntryRecursivo(child, nuevoPath)
        resultados.push(...subResultados)
      }
    }

    return resultados
  }

  // Procesar archivos cuando se seleccionan desde <input webkitdirectory>
  const handleSeleccionInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const nuevas: FotoEscaneada[] = []
    files.forEach((file: any) => {
      if (esArchivoImagen(file.name, file.type)) {
        const rutaRelativa = file.webkitRelativePath || file.name
        const partes = rutaRelativa.split('/')
        const carpetaPadre = partes.length > 1 ? partes[partes.length - 2] : 'Raíz'
        nuevas.push({
          id: `input-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          file,
          nombre: file.name,
          rutaRelativa,
          carpetaPadre,
          tamano: file.size,
          previewUrl: URL.createObjectURL(file),
          seleccionada: true,
        })
      }
    })

    if (nuevas.length === 0) {
      setErrorMsg('No se encontraron archivos de imagen válidos (.jpg, .png, .webp) en la selección.')
      return
    }

    setErrorMsg(null)
    setFotosEscaneadas(prev => [...prev, ...nuevas])
    // Resetear input para permitir seleccionar la misma carpeta si se desea
    if (e.target) e.target.value = ''
  }

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setArrastrando(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setArrastrando(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setArrastrando(false)
    setErrorMsg(null)

    const items = e.dataTransfer.items
    if (!items || items.length === 0) return

    setProcesando(true)
    const scanPromises: Promise<FotoEscaneada[]>[] = []

    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        // Usar FileSystem API para soportar carpetas completas
        const entry = (item as any).webkitGetAsEntry ? (item as any).webkitGetAsEntry() : null
        if (entry) {
          scanPromises.push(escanearEntryRecursivo(entry))
        } else {
          const file = item.getAsFile()
          if (file && esArchivoImagen(file.name, file.type)) {
            scanPromises.push(
              Promise.resolve([
                {
                  id: `drop-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                  file,
                  nombre: file.name,
                  rutaRelativa: file.name,
                  carpetaPadre: 'Raíz',
                  tamano: file.size,
                  previewUrl: URL.createObjectURL(file),
                  seleccionada: true,
                },
              ])
            )
          }
        }
      }

      const resultadosAnidados = await Promise.all(scanPromises)
      const fotosTotal = resultadosAnidados.flat()

      if (fotosTotal.length === 0) {
        setErrorMsg('No se encontraron imágenes válidas dentro de los archivos o carpetas arrastrados.')
      } else {
        setFotosEscaneadas(prev => [...prev, ...fotosTotal])
      }
    } catch (err: any) {
      console.error('Error al escanear carpeta:', err)
      setErrorMsg('Ocurrió un error al leer la carpeta. Podés intentar con el botón de selección.')
    } finally {
      setProcesando(false)
    }
  }

  // Alternar selección de una foto individual
  const alternarSeleccion = (id: string) => {
    setFotosEscaneadas(prev =>
      prev.map(f => (f.id === id ? { ...f, seleccionada: !f.seleccionada } : f))
    )
  }

  // Seleccionar / Deseleccionar todas
  const seleccionarTodas = (valor: boolean) => {
    setFotosEscaneadas(prev => prev.map(f => ({ ...f, seleccionada: valor })))
  }

  // Eliminar foto escaneada de la lista previa
  const quitarFoto = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setFotosEscaneadas(prev => prev.filter(f => f.id !== id))
  }

  // Limpiar todo el explorador
  const limpiarTodo = () => {
    fotosEscaneadas.forEach(f => {
      if (f.previewUrl.startsWith('blob:')) URL.revokeObjectURL(f.previewUrl)
    })
    setFotosEscaneadas([])
    setCarpetaSeleccionadaFiltro('todas')
  }

  // SUBIDA CONCURRENTE A SUPABASE STORAGE
  const handleSubirFotosSeleccionadas = async () => {
    const seleccionadas = fotosEscaneadas.filter(f => f.seleccionada && f.file)
    if (seleccionadas.length === 0) {
      setErrorMsg('Seleccioná al menos una foto para subir.')
      return
    }

    setProcesando(true)
    setErrorMsg(null)
    setProgresoActual({ actual: 0, total: seleccionadas.length, porcentaje: 0 })

    const urlsSubidas: string[] = []
    const CONCURRENCIA = 3 // Subir de a 3 en paralelo

    try {
      let completadas = 0

      // Función individual de subida
      const subirUnaFoto = async (foto: FotoEscaneada) => {
        if (!foto.file) return null
        const formData = new FormData()
        formData.append('file', foto.file)

        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || `Error al subir ${foto.nombre}`)
        }

        const data = await res.json()
        completadas++
        setProgresoActual({
          actual: completadas,
          total: seleccionadas.length,
          porcentaje: Math.round((completadas / seleccionadas.length) * 100),
        })

        return data.url as string
      }

      // Pool de concurrencia
      for (let i = 0; i < seleccionadas.length; i += CONCURRENCIA) {
        const chunk = seleccionadas.slice(i, i + CONCURRENCIA)
        const promesas = chunk.map(f => subirUnaFoto(f))
        const resultadosChunk = await Promise.all(promesas)
        resultadosChunk.forEach(url => {
          if (url) urlsSubidas.push(url)
        })
      }

      if (urlsSubidas.length === 0) {
        throw new Error('No se pudo subir ninguna imagen.')
      }

      // Finalizar con éxito
      onFotosImportadas(urlsSubidas)
      limpiarTodo()
      onCerrar()
    } catch (err: any) {
      console.error('Error durante la subida en lote:', err)
      setErrorMsg(err.message || 'Error durante la subida de archivos.')
    } finally {
      setProcesando(false)
    }
  }

  // SUBIDA DESDE ENLACES GOOGLE DRIVE WEB
  const handleImportarDriveWeb = async () => {
    if (idsDriveDetectados.length === 0) {
      setErrorMsg('No se detectaron enlaces válidos de Google Drive.')
      return
    }

    setProcesando(true)
    setErrorMsg(null)
    setProgresoActual({ actual: 0, total: idsDriveDetectados.length, porcentaje: 10 })

    try {
      const res = await fetch('/api/admin/google-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: idsDriveDetectados,
          texto: textoLinks,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Error al descargar fotos de Google Drive.')
      }

      const urlsFinales = data.urls || data.items?.map((item: any) => item.urlPublica) || []
      if (urlsFinales.length === 0) {
        throw new Error('No se pudo procesar ninguna foto. Verificá que los archivos tengan enlace público.')
      }

      onFotosImportadas(urlsFinales)
      setTextoLinks('')
      onCerrar()
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Error al importar desde Google Drive')
    } finally {
      setProcesando(false)
    }
  }

  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* ── Encabezado del Modal ─────────────────────────────────── */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FolderOpen size={22} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>{titulo}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Carpeta & Drive
                </span>
              </h3>
              <p className="text-xs text-slate-400">{descripcion}</p>
            </div>
          </div>

          <button
            onClick={onCerrar}
            disabled={procesando}
            className="p-2.5 text-slate-400 hover:text-white rounded-2xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Pestañas de Modo (Carpeta PC / Drive Escritorio vs Enlaces Drive Web) ─── */}
        <div className="px-6 pt-3 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTabActiva('carpeta')}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              tabActiva === 'carpeta'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDrive size={15} />
            <span>📁 Carpeta de Windows / Drive (Arrastrar o Examinar)</span>
            {fotosEscaneadas.length > 0 && (
              <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                {fotosEscaneadas.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTabActiva('drive_web')}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              tabActiva === 'drive_web'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.71 3.5L1.15 15l3.43 6l6.55-11.5L7.71 3.5zm8.58 0l-6.56 11.5l3.43 6l6.56-11.5l-3.43-6zm-5.15 9l-3.43 6h13.14l3.43-6H11.14z" />
            </svg>
            <span>🔗 Pegar Enlaces Web de Drive</span>
            {idsDriveDetectados.length > 0 && (
              <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                {idsDriveDetectados.length}
              </span>
            )}
          </button>
        </div>

        {/* ── Inputs Ocultos de Selección de Carpeta y Archivos ───── */}
        {/* @ts-ignore: webkitdirectory and directory are non-standard but supported */}
        <input
          ref={inputCarpetaRef}
          type="file"
          // @ts-expect-error
          webkitdirectory=""
          directory=""
          multiple
          className="hidden"
          onChange={handleSeleccionInput}
        />
        <input
          ref={inputArchivosRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleSeleccionInput}
        />

        {/* ── Contenido Principal del Modal ──────────────────────── */}
        <div className="p-5 sm:p-6 flex-1 overflow-y-auto space-y-4">
          
          {tabActiva === 'carpeta' ? (
            <>
              {/* Zona de Drag & Drop de Carpetas */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative rounded-3xl border-2 border-dashed p-6 sm:p-8 text-center transition-all duration-200 flex flex-col items-center justify-center space-y-4 ${
                  arrastrando
                    ? 'border-indigo-400 bg-indigo-500/15 scale-[1.01]'
                    : fotosEscaneadas.length > 0
                    ? 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                    : 'border-slate-700 bg-slate-950/80 hover:border-indigo-500/50'
                }`}
              >
                <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
                  <UploadCloud size={32} className={arrastrando ? 'animate-bounce' : ''} />
                </div>

                <div className="space-y-1 max-w-lg">
                  <h4 className="text-sm sm:text-base font-black text-white">
                    {arrastrando ? '¡Soltá la carpeta o archivos acá!' : 'Arrastrá una carpeta entera de Windows o Google Drive'}
                  </h4>
                  <p className="text-xs text-slate-400">
                    Chefsy escaneará recursivamente todas las fotos (.jpg, .png, .webp) que estén adentro de las subcarpetas.
                  </p>
                </div>

                {/* Botones de Explorador de Archivos */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => inputCarpetaRef.current?.click()}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                  >
                    <Folder size={15} />
                    <span>Seleccionar Carpeta Completa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => inputArchivosRef.current?.click()}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl text-xs font-bold border border-slate-700 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                  >
                    <FileImage size={15} />
                    <span>Seleccionar Archivos Sueltos</span>
                  </button>
                </div>
              </div>

              {/* Explorador Visual de Archivos Escaneados */}
              {fotosEscaneadas.length > 0 && (
                <div className="space-y-3 pt-2">
                  
                  {/* Barra de Control del Explorador */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-white flex items-center gap-1.5">
                        <Layers size={14} className="text-indigo-400" />
                        <span>Explorador de Fotos</span>
                      </span>

                      {/* Filtros por Subcarpeta */}
                      {carpetasDetectadas.length > 1 && (
                        <div className="flex items-center gap-1 overflow-x-auto max-w-md pl-2 border-l border-slate-800">
                          <button
                            type="button"
                            onClick={() => setCarpetaSeleccionadaFiltro('todas')}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                              carpetaSeleccionadaFiltro === 'todas'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-slate-900 text-slate-400 hover:text-white'
                            }`}
                          >
                            Todas ({fotosEscaneadas.length})
                          </button>
                          {carpetasDetectadas.map(c => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setCarpetaSeleccionadaFiltro(c)}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                                carpetaSeleccionadaFiltro === c
                                  ? 'bg-indigo-600 text-white shadow-sm'
                                  : 'bg-slate-900 text-slate-400 hover:text-white'
                              }`}
                            >
                              📁 {c} ({fotosEscaneadas.filter(f => f.carpetaPadre === c).length})
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => seleccionarTodas(cantidadSeleccionadas !== fotosEscaneadas.length)}
                        className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                      >
                        {cantidadSeleccionadas === fotosEscaneadas.length ? (
                          <>
                            <CheckSquare size={13} />
                            <span>Deseleccionar todas</span>
                          </>
                        ) : (
                          <>
                            <Square size={13} />
                            <span>Seleccionar todas</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={limpiarTodo}
                        className="text-[11px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer pl-2 border-l border-slate-800"
                      >
                        <RefreshCw size={12} />
                        <span>Vaciar</span>
                      </button>
                    </div>
                  </div>

                  {/* Cuadrícula de Miniaturas con Checkbox */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-72 overflow-y-auto p-2 bg-slate-950/80 rounded-3xl border border-slate-800">
                    {fotosFiltradas.map(foto => (
                      <div
                        key={foto.id}
                        onClick={() => alternarSeleccion(foto.id)}
                        className={`group relative aspect-square rounded-2xl overflow-hidden border transition-all cursor-pointer select-none ${
                          foto.seleccionada
                            ? 'border-indigo-500 ring-2 ring-indigo-500/40 scale-[0.98] bg-indigo-950/30'
                            : 'border-slate-800 hover:border-slate-600 opacity-60'
                        }`}
                      >
                        <img
                          src={foto.previewUrl}
                          alt={foto.nombre}
                          className="w-full h-full object-cover"
                        />

                        {/* Checkbox en la esquina superior izquierda */}
                        <div className="absolute top-2 left-2 z-10">
                          <div
                            className={`w-5 h-5 rounded-lg flex items-center justify-center shadow-md transition-all ${
                              foto.seleccionada
                                ? 'bg-indigo-600 text-white'
                                : 'bg-black/60 text-transparent border border-white/30'
                            }`}
                          >
                            <Check size={13} className="stroke-[3]" />
                          </div>
                        </div>

                        {/* Botón para ver en grande */}
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation()
                            setFotoZoom(foto)
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          title="Ver en grande"
                        >
                          <Eye size={12} />
                        </button>

                        {/* Pie con nombre y tamaño */}
                        <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black via-black/80 to-transparent">
                          <p className="text-[10px] font-bold text-white truncate">{foto.nombre}</p>
                          <p className="text-[9px] text-slate-400 flex items-center justify-between">
                            <span>{foto.carpetaPadre}</span>
                            <span>{formatearTamano(foto.tamano)}</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Resumen de selección */}
                  <div className="flex items-center justify-between text-xs text-slate-400 px-2">
                    <span>
                      Total:{' '}
                      <strong className="text-white">
                        {cantidadSeleccionadas} de {fotosEscaneadas.length} fotos seleccionadas
                      </strong>
                    </span>
                    <span>
                      Peso total estimado:{' '}
                      <strong className="text-indigo-400">{formatearTamano(pesoTotalSeleccionado)}</strong>
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Tab de Google Drive Web (Enlaces) */
            <div className="space-y-4">
              <div className="p-4 bg-blue-950/30 border border-blue-500/20 rounded-2xl space-y-1.5 text-xs text-blue-200">
                <p className="font-bold flex items-center gap-1.5 text-blue-300">
                  <Sparkles size={14} />
                  <span>¿Cómo importar desde Google Drive Web?</span>
                </p>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Copiá el enlace de la carpeta o de las fotos compartidas en Google Drive (asegurate de que tengan permiso <strong>"Cualquier persona con el enlace"</strong>) y pegalas acá abajo.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-300 uppercase tracking-wider flex justify-between items-center">
                  <span>Pegar Enlaces o IDs de Google Drive</span>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    idsDriveDetectados.length > 0
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'text-slate-500'
                  }`}>
                    {idsDriveDetectados.length} {idsDriveDetectados.length === 1 ? 'foto detectada' : 'fotos detectadas'}
                  </span>
                </label>
                <textarea
                  rows={5}
                  value={textoLinks}
                  onChange={e => setTextoLinks(e.target.value)}
                  placeholder="https://drive.google.com/file/d/1A2B3C4D.../view&#10;https://drive.google.com/open?id=1X2Y3Z...&#10;(Podés pegar 1 o múltiples enlaces juntos, uno debajo del otro)"
                  className="w-full px-4 py-3.5 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-white text-xs font-mono leading-relaxed resize-none"
                />
              </div>

              {/* Previsualización en Vivo de Fotos detectadas */}
              {idsDriveDetectados.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Fotos detectadas listas para descargar ({idsDriveDetectados.length}):
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-44 overflow-y-auto p-2 bg-slate-950 rounded-2xl border border-slate-800">
                    {idsDriveDetectados.map((id, idx) => {
                      const urls = obtenerUrlsDirectasGoogleDrive(id)
                      return (
                        <div
                          key={`${id}-${idx}`}
                          className="relative aspect-square rounded-xl overflow-hidden bg-slate-900 border border-slate-800 group"
                        >
                          <img
                            src={urls.thumbnailUrl}
                            alt={`Drive ${idx + 1}`}
                            className="w-full h-full object-cover"
                            onError={e => {
                              ;(e.target as HTMLElement).style.display = 'none'
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <span className="text-[9px] font-bold text-white bg-black/70 px-1.5 py-0.5 rounded">
                              #{idx + 1}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Barra de Progreso de Subida */}
          {procesando && (
            <div className="p-4 bg-slate-950 border border-indigo-500/40 rounded-2xl space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-white flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-indigo-400" />
                  <span>Subiendo y optimizando a WebP...</span>
                </span>
                <span className="text-indigo-400 font-mono">
                  {progresoActual.actual} / {progresoActual.total} ({progresoActual.porcentaje}%)
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full transition-all duration-300"
                  style={{ width: `${progresoActual.porcentaje}%` }}
                />
              </div>
            </div>
          )}

          {/* Mensaje de Error */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-950/40 border border-rose-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-rose-300 animate-in fade-in">
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* ── Pie de Acción del Modal ────────────────────────────── */}
        <div className="p-5 sm:p-6 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onCerrar}
            disabled={procesando}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          {tabActiva === 'carpeta' ? (
            <button
              type="button"
              onClick={handleSubirFotosSeleccionadas}
              disabled={procesando || cantidadSeleccionadas === 0}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {procesando ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Subiendo {progresoActual.actual}/{progresoActual.total}...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={15} />
                  <span>
                    Subir {cantidadSeleccionadas > 0 ? `${cantidadSeleccionadas} ${cantidadSeleccionadas === 1 ? 'foto' : 'fotos'}` : 'Seleccionadas'} a Chefsy
                  </span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleImportarDriveWeb}
              disabled={procesando || idsDriveDetectados.length === 0}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {procesando ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Descargando de Drive...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={15} />
                  <span>Importar {idsDriveDetectados.length} fotos desde Drive</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>

      {/* Modal Zoom de Foto */}
      {fotoZoom && (
        <div
          onClick={() => setFotoZoom(null)}
          className="fixed inset-0 z-[130] bg-black/95 flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-150"
        >
          <div className="relative max-w-4xl max-h-[85vh] w-full flex items-center justify-center">
            <img
              src={fotoZoom.previewUrl}
              alt={fotoZoom.nombre}
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
            <button
              onClick={() => setFotoZoom(null)}
              className="absolute top-2 right-2 p-2 bg-black/70 text-white rounded-full hover:bg-black transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

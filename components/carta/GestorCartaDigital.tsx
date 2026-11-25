'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  GripVertical,
  Loader2,
  Printer,
  QrCode,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { notificarError, notificarExito } from '@/lib/notificaciones'
import {
  crearConfiguracionCartaDefault,
  formatearFechaActualizacionCarta,
  MAX_HOJAS_CARTA,
  obtenerHojasVisibles,
  reordenarHojasCarta,
  type ConfiguracionCarta,
  type HojaCarta,
} from '@/lib/carta-digital'

const URL_PUBLICA_DISPLAY = 'https://chefsy.xyz/carta'

export default function GestorCartaDigital() {
  const [config, setConfig] = useState<ConfiguracionCarta>(crearConfiguracionCartaDefault)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [hayCambiosPendientes, setHayCambiosPendientes] = useState(false)
  const [subiendoInfo, setSubiendoInfo] = useState<string | null>(null)
  const [reemplazandoId, setReemplazandoId] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [arrastrandoArchivos, setArrastrandoArchivos] = useState(false)
  const [indiceDrag, setIndiceDrag] = useState<number | null>(null)
  const [indiceSobre, setIndiceSobre] = useState<number | null>(null)
  const [urlPublica, setUrlPublica] = useState(URL_PUBLICA_DISPLAY)

  const inputMultipleRef = useRef<HTMLInputElement | null>(null)
  const inputReemplazoRef = useRef<HTMLInputElement | null>(null)
  const idParaReemplazarRef = useRef<string | null>(null)
  const dialogQrRef = useRef<HTMLDialogElement | null>(null)
  const qrContenedorRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.origin) {
      const origin = window.location.origin
      setUrlPublica(
        origin.includes('localhost') || origin.includes('127.0.0.1')
          ? `${origin}/carta`
          : URL_PUBLICA_DISPLAY
      )
    }
  }, [])

  // Fallback de light-dismiss para navegadores sin <dialog closedby="any"> (ej. Safari)
  useEffect(() => {
    const dialog = dialogQrRef.current
    if (!dialog || typeof HTMLDialogElement === 'undefined') return
    if ('closedBy' in HTMLDialogElement.prototype) return

    const estaAfuera = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect()
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom
    }

    let presionoAfuera = false
    const onPointerDown = (e: PointerEvent) => {
      presionoAfuera = estaAfuera(e)
    }
    const onPointerUp = (e: PointerEvent) => {
      if (presionoAfuera && estaAfuera(e)) {
        dialog.close()
      }
      presionoAfuera = false
    }

    dialog.addEventListener('pointerdown', onPointerDown)
    dialog.addEventListener('pointerup', onPointerUp)
    return () => {
      dialog.removeEventListener('pointerdown', onPointerDown)
      dialog.removeEventListener('pointerup', onPointerUp)
    }
  }, [])

  const cargarCarta = useCallback(async () => {
    setCargando(true)
    try {
      const res = await fetch('/api/admin/carta', { cache: 'no-store' })
      if (!res.ok) throw new Error('No se pudo cargar la carta.')
      const data = (await res.json()) as ConfiguracionCarta
      setConfig(data)
      setHayCambiosPendientes(false)
    } catch (err: any) {
      notificarError(err?.message || 'Error al cargar la carta digital.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargarCarta()
  }, [cargarCarta])

  const persistirCarta = useCallback(
    async (siguienteConfig: ConfiguracionCarta, mensajeExito?: string) => {
      setGuardando(true)
      try {
        const res = await fetch('/api/admin/carta', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(siguienteConfig),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data?.error || 'No se pudo guardar la carta.')
        }
        if (data?.carta) {
          setConfig(data.carta)
        }
        setHayCambiosPendientes(false)
        if (mensajeExito) {
          notificarExito(mensajeExito)
        }
        return true
      } catch (err: any) {
        notificarError(err?.message || 'Error al guardar los cambios de la carta.')
        return false
      } finally {
        setGuardando(false)
      }
    },
    []
  )

  const subirArchivoCarta = async (
    archivo: File,
    oldUrl?: string
  ): Promise<{ url: string; ancho?: number; alto?: number }> => {
    const formData = new FormData()
    formData.append('file', archivo)
    formData.append('modo', 'carta')
    if (oldUrl) formData.append('oldUrl', oldUrl)

    const res = await fetch('/api/admin/upload?modo=carta', {
      method: 'POST',
      body: formData,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.url) {
      throw new Error(data?.error || `No se pudo subir "${archivo.name}".`)
    }
    return {
      url: data.url as string,
      ancho: typeof data.ancho === 'number' ? data.ancho : undefined,
      alto: typeof data.alto === 'number' ? data.alto : undefined,
    }
  }

  const manejarSubidaMultiple = async (archivosLista: FileList | File[] | null) => {
    if (!archivosLista || archivosLista.length === 0) return
    const archivos = Array.from(archivosLista).filter(
      (f) => f.type.startsWith('image/') || /\.(heic|heif|webp|png|jpe?g)$/i.test(f.name)
    )
    if (archivos.length === 0) {
      notificarError('Seleccioná archivos de imagen (JPG, PNG, WebP o HEIC).')
      return
    }

    const cupoRestante = MAX_HOJAS_CARTA - config.hojas.length
    if (cupoRestante <= 0) {
      notificarError(`Alcanzaste el límite de ${MAX_HOJAS_CARTA} hojas en la carta.`)
      return
    }

    const aSubir = archivos.slice(0, cupoRestante)
    const nuevasHojas: HojaCarta[] = []
    let fallidas = 0

    for (let i = 0; i < aSubir.length; i++) {
      setSubiendoInfo(`Subiendo hoja ${i + 1} de ${aSubir.length}...`)
      try {
        const subida = await subirArchivoCarta(aSubir[i])
        nuevasHojas.push({
          id: `hoja-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          titulo: '',
          imagenUrl: subida.url,
          ancho: subida.ancho,
          alto: subida.alto,
          activa: true,
          orden: config.hojas.length + nuevasHojas.length,
          creadaEn: new Date().toISOString(),
        })
      } catch (err: any) {
        fallidas++
        console.error('[Carta] Fallo subiendo hoja:', err)
      }
    }

    setSubiendoInfo(null)
    if (inputMultipleRef.current) inputMultipleRef.current.value = ''

    if (nuevasHojas.length > 0) {
      const siguiente: ConfiguracionCarta = {
        ...config,
        hojas: [...config.hojas, ...nuevasHojas].map((h, idx) => ({ ...h, orden: idx })),
      }
      setConfig(siguiente)
      await persistirCarta(
        siguiente,
        nuevasHojas.length === 1
          ? 'Hoja agregada y publicada en /carta.'
          : `${nuevasHojas.length} hojas agregadas y publicadas en /carta.`
      )
    }

    if (fallidas > 0) {
      notificarError(
        fallidas === 1
          ? '1 imagen no pudo subirse. Revisá el archivo e intentá de nuevo.'
          : `${fallidas} imágenes no pudieron subirse.`
      )
    }
  }

  const iniciarReemplazoImagen = (hojaId: string) => {
    idParaReemplazarRef.current = hojaId
    inputReemplazoRef.current?.click()
  }

  const manejarReemplazoImagen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0]
    const hojaId = idParaReemplazarRef.current
    e.target.value = ''
    if (!archivo || !hojaId) return

    const hojaObjetivo = config.hojas.find((h) => h.id === hojaId)
    if (!hojaObjetivo) return

    setReemplazandoId(hojaId)
    try {
      const subida = await subirArchivoCarta(archivo, hojaObjetivo.imagenUrl)
      const siguiente: ConfiguracionCarta = {
        ...config,
        hojas: config.hojas.map((h) =>
          h.id === hojaId
            ? { ...h, imagenUrl: subida.url, ancho: subida.ancho, alto: subida.alto }
            : h
        ),
      }
      setConfig(siguiente)
      await persistirCarta(siguiente, 'Imagen de la hoja actualizada.')
    } catch (err: any) {
      notificarError(err?.message || 'No se pudo reemplazar la imagen.')
    } finally {
      setReemplazandoId(null)
      idParaReemplazarRef.current = null
    }
  }

  const moverHoja = async (desde: number, hacia: number) => {
    const reordenadas = reordenarHojasCarta(config.hojas, desde, hacia)
    if (reordenadas === config.hojas) return
    const siguiente = { ...config, hojas: reordenadas }
    setConfig(siguiente)
    await persistirCarta(siguiente, 'Orden de páginas actualizado.')
  }

  const alternarVisibilidadHoja = async (hojaId: string) => {
    const hoja = config.hojas.find((h) => h.id === hojaId)
    if (!hoja) return
    const siguiente: ConfiguracionCarta = {
      ...config,
      hojas: config.hojas.map((h) => (h.id === hojaId ? { ...h, activa: !h.activa } : h)),
    }
    setConfig(siguiente)
    await persistirCarta(
      siguiente,
      hoja.activa ? 'Hoja ocultada de la carta pública.' : 'Hoja visible nuevamente en /carta.'
    )
  }

  const eliminarHoja = async (hojaId: string, numeroPagina: number) => {
    if (!window.confirm(`¿Eliminar la hoja #${numeroPagina} de la carta?`)) return
    const siguiente: ConfiguracionCarta = {
      ...config,
      hojas: config.hojas
        .filter((h) => h.id !== hojaId)
        .map((h, idx) => ({ ...h, orden: idx })),
    }
    setConfig(siguiente)
    await persistirCarta(siguiente, 'Hoja eliminada de la carta.')
  }

  const actualizarTituloHoja = (hojaId: string, titulo: string) => {
    setConfig((prev) => ({
      ...prev,
      hojas: prev.hojas.map((h) => (h.id === hojaId ? { ...h, titulo } : h)),
    }))
    setHayCambiosPendientes(true)
  }

  const actualizarCampoConfig = <K extends keyof ConfiguracionCarta>(
    campo: K,
    valor: ConfiguracionCarta[K]
  ) => {
    setConfig((prev) => ({ ...prev, [campo]: valor }))
    setHayCambiosPendientes(true)
  }

  const copiarEnlacePublico = async () => {
    try {
      await navigator.clipboard.writeText(urlPublica)
      setCopiado(true)
      notificarExito('Enlace de la carta copiado para WhatsApp.')
      window.setTimeout(() => setCopiado(false), 2000)
    } catch {
      notificarError('No se pudo copiar el enlace.')
    }
  }

  const abrirModalQr = () => {
    dialogQrRef.current?.showModal()
  }

  const cerrarModalQr = () => {
    dialogQrRef.current?.close()
  }

  const descargarQrPng = () => {
    const svg = qrContenedorRef.current?.querySelector('svg')
    if (!svg) return

    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(svg)
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
    const blobUrl = URL.createObjectURL(blob)

    const img = new Image()
    img.onload = () => {
      const ancho = 900
      const alto = 1120
      const canvas = document.createElement('canvas')
      canvas.width = ancho
      canvas.height = alto
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(blobUrl)
        return
      }

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, ancho, alto)

      // Marco sobrio imprimible
      ctx.strokeStyle = '#e5e7eb'
      ctx.lineWidth = 4
      ctx.strokeRect(36, 36, ancho - 72, alto - 72)

      // Título superior
      ctx.fillStyle = '#111827'
      ctx.font = '700 44px system-ui, -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(config.titulo || 'Carta Chefsy', ancho / 2, 130)

      ctx.fillStyle = '#4b5563'
      ctx.font = '500 24px system-ui, -apple-system, sans-serif'
      ctx.fillText('Escaneá para ver nuestra carta actualizada', ancho / 2, 178)

      // QR centrado en alta definición
      const qrSize = 620
      ctx.drawImage(img, (ancho - qrSize) / 2, 235, qrSize, qrSize)

      // URL al pie
      ctx.fillStyle = '#2A6348'
      ctx.font = '700 32px system-ui, -apple-system, sans-serif'
      ctx.fillText(URL_PUBLICA_DISPLAY.replace(/^https?:\/\//, ''), ancho / 2, 955)

      ctx.fillStyle = '#6b7280'
      ctx.font = '500 20px system-ui, -apple-system, sans-serif'
      ctx.fillText('Chefsy · San Fernando del Valle de Catamarca', ancho / 2, 1005)

      const enlace = document.createElement('a')
      enlace.download = 'qr-carta-chefsy.png'
      enlace.href = canvas.toDataURL('image/png')
      enlace.click()
      URL.revokeObjectURL(blobUrl)
    }
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl)
      notificarError('No se pudo generar el PNG del QR.')
    }
    img.src = blobUrl
  }

  const imprimirQr = () => {
    const svg = qrContenedorRef.current?.querySelector('svg')
    if (!svg) return
    const ventana = window.open('', '_blank', 'width=520,height=680')
    if (!ventana) {
      notificarError('Tu navegador bloqueó la ventana de impresión.')
      return
    }
    const svgMarkup = new XMLSerializer().serializeToString(svg)
    ventana.document.write(`<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>QR ${config.titulo}</title>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #fff; color: #111827; }
      .card { text-align: center; padding: 36px 40px; border: 2px solid #e5e7eb; border-radius: 20px; max-width: 360px; }
      h1 { font-size: 24px; margin: 0 0 6px; }
      p { font-size: 13px; color: #4b5563; margin: 0 0 22px; }
      .qr { display: inline-block; padding: 14px; border: 1px solid #e5e7eb; border-radius: 14px; }
      .url { margin-top: 18px; font-weight: 700; font-size: 16px; color: #2A6348; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${config.titulo.replace(/</g, '&lt;')}</h1>
      <p>Escaneá para ver nuestra carta actualizada</p>
      <div class="qr">${svgMarkup}</div>
      <div class="url">${URL_PUBLICA_DISPLAY.replace(/^https?:\/\//, '')}</div>
    </div>
    <script>window.onload = function () { window.print(); };</script>
  </body>
</html>`)
    ventana.document.close()
  }

  const hojasVisibles = useMemo(() => obtenerHojasVisibles(config), [config])
  const portadaPreview = hojasVisibles[0]?.imagenUrl || '/logo.jpg'
  const fechaActualizacion = formatearFechaActualizacionCarta(config.updatedAt)

  if (cargando) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 flex items-center justify-center gap-2.5 text-sm text-slate-500">
        <Loader2 size={16} className="animate-spin text-chefsy" />
        <span>Cargando carta digital...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Cabecera de acceso rápido, link y QR ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
              <FileText size={17} />
            </span>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
              Carta Digital (Visor estilo PDF)
            </h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {hojasVisibles.length} visible{hojasVisibles.length === 1 ? '' : 's'} de {config.hojas.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Link directo para WhatsApp:{' '}
            <code className="font-mono font-semibold text-chefsy dark:text-chefsy-400 select-all">
              {urlPublica}
            </code>
            {fechaActualizacion ? ` · Actualizada el ${fechaActualizacion}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={copiarEnlacePublico}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-chefsy hover:bg-chefsy-700 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            {copiado ? <Check size={14} /> : <Copy size={14} />}
            <span>{copiado ? 'Link copiado' : 'Copiar link'}</span>
          </button>

          <button
            type="button"
            onClick={abrirModalQr}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            <QrCode size={14} />
            <span>QR imprimible</span>
          </button>

          <a
            href="/carta"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-colors"
          >
            <ExternalLink size={14} />
            <span>Ver carta</span>
          </a>
        </div>
      </div>

      {/* ── Layout principal: Hojas (izq) + Ajustes & Preview WhatsApp (der) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
        {/* Columna izquierda: Carga y listado de hojas */}
        <div className="space-y-4">
          {/* Zona de carga múltiple */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              if (e.dataTransfer.types.includes('Files')) {
                setArrastrandoArchivos(true)
              }
            }}
            onDragLeave={() => setArrastrandoArchivos(false)}
            onDrop={(e) => {
              e.preventDefault()
              setArrastrandoArchivos(false)
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                void manejarSubidaMultiple(e.dataTransfer.files)
              }
            }}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-colors ${
              arrastrandoArchivos
                ? 'border-chefsy bg-emerald-50/60 dark:bg-emerald-950/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
            }`}
          >
            <input
              ref={inputMultipleRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
              multiple
              onChange={(e) => void manejarSubidaMultiple(e.target.files)}
              className="hidden"
            />
            <input
              ref={inputReemplazoRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
              onChange={manejarReemplazoImagen}
              className="hidden"
            />

            {subiendoInfo ? (
              <div className="flex flex-col items-center gap-2 py-2">
                <Loader2 size={22} className="animate-spin text-chefsy" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{subiendoInfo}</p>
                <p className="text-[11px] text-slate-400">
                  Optimizando a WebP en alta nitidez para lectura sin zoom...
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                  <Upload size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Subí las imágenes de tu carta
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Podés arrastrar varias juntas (JPG, PNG, WebP o HEIC). Se comprimen livianas manteniendo los precios nítidos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => inputMultipleRef.current?.click()}
                  disabled={guardando}
                  className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Upload size={14} />
                  <span>Seleccionar imágenes</span>
                </button>
              </div>
            )}
          </div>

          {/* Lista de hojas */}
          {config.hojas.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
              Todavía no cargaste hojas. Apenas subas la primera imagen, ya va a quedar disponible en{' '}
              <strong className="text-slate-600 dark:text-slate-300">/carta</strong>.
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Hojas de la carta (en orden de lectura)
                </p>
                {guardando && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-chefsy">
                    <Loader2 size={12} className="animate-spin" />
                    Guardando...
                  </span>
                )}
              </div>

              {config.hojas.map((hoja, idx) => {
                const esPrimero = idx === 0
                const esUltimo = idx === config.hojas.length - 1
                const estaReemplazando = reemplazandoId === hoja.id

                return (
                  <div
                    key={hoja.id}
                    draggable
                    onDragStart={() => setIndiceDrag(idx)}
                    onDragOver={(e) => {
                      e.preventDefault()
                      if (indiceDrag !== null && indiceDrag !== idx) {
                        setIndiceSobre(idx)
                      }
                    }}
                    onDragLeave={() => {
                      if (indiceSobre === idx) setIndiceSobre(null)
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      if (indiceDrag !== null && indiceDrag !== idx) {
                        void moverHoja(indiceDrag, idx)
                      }
                      setIndiceDrag(null)
                      setIndiceSobre(null)
                    }}
                    onDragEnd={() => {
                      setIndiceDrag(null)
                      setIndiceSobre(null)
                    }}
                    className={`bg-white dark:bg-slate-900 border rounded-2xl p-3 flex items-center gap-3 transition-colors ${
                      indiceSobre === idx
                        ? 'border-chefsy ring-2 ring-chefsy/20'
                        : hoja.activa
                          ? 'border-slate-200/90 dark:border-slate-800'
                          : 'border-slate-200/60 dark:border-slate-800/60 opacity-65'
                    }`}
                  >
                    {/* Handle arrastre + número */}
                    <div className="flex flex-col items-center gap-1 shrink-0 text-slate-400">
                      <GripVertical size={16} className="cursor-grab active:cursor-grabbing hidden sm:block" />
                      <span className="text-[10px] font-extrabold tabular-nums px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        #{idx + 1}
                      </span>
                    </div>

                    {/* Miniatura de la lámina */}
                    <div className="relative w-14 h-20 sm:w-16 sm:h-22 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0">
                      <img
                        src={hoja.imagenUrl}
                        alt={hoja.titulo || `Hoja ${idx + 1}`}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                      {estaReemplazando && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Loader2 size={16} className="animate-spin text-white" />
                        </div>
                      )}
                    </div>

                    {/* Título opcional + metadata */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="text"
                          value={hoja.titulo}
                          onChange={(e) => actualizarTituloHoja(hoja.id, e.target.value)}
                          placeholder="Sección opcional (ej: Promos, Lomos, Bebidas)"
                          maxLength={40}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-chefsy/40"
                        />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-400">
                        <span
                          className={`font-bold ${
                            hoja.activa
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {hoja.activa ? 'Visible' : 'Oculta'}
                        </span>
                        {hoja.ancho && hoja.alto && (
                          <>
                            <span>·</span>
                            <span className="tabular-nums">
                              {hoja.ancho} × {hoja.alto} px
                            </span>
                          </>
                        )}
                        {idx === 0 && hoja.activa && (
                          <>
                            <span>·</span>
                            <span className="text-slate-500 dark:text-slate-400 font-medium">
                              Portada en WhatsApp
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Controles de orden, visibilidad, reemplazo y borrado */}
                    <div className="flex flex-col sm:flex-row items-center gap-1 shrink-0">
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => void moverHoja(idx, idx - 1)}
                          disabled={esPrimero || guardando}
                          title="Subir página"
                          aria-label={`Subir hoja ${idx + 1}`}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-25 cursor-pointer"
                        >
                          <ArrowUp size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void moverHoja(idx, idx + 1)}
                          disabled={esUltimo || guardando}
                          title="Bajar página"
                          aria-label={`Bajar hoja ${idx + 1}`}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-25 cursor-pointer"
                        >
                          <ArrowDown size={15} />
                        </button>
                      </div>

                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => void alternarVisibilidadHoja(hoja.id)}
                          disabled={guardando}
                          title={hoja.activa ? 'Ocultar temporalmente sin borrar' : 'Mostrar nuevamente'}
                          aria-label={hoja.activa ? 'Ocultar hoja' : 'Mostrar hoja'}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            hoja.activa
                              ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                              : 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                          }`}
                        >
                          {hoja.activa ? <Eye size={15} /> : <EyeOff size={15} />}
                        </button>

                        <button
                          type="button"
                          onClick={() => iniciarReemplazoImagen(hoja.id)}
                          disabled={guardando || estaReemplazando}
                          title="Reemplazar imagen (conserva orden y título)"
                          aria-label={`Reemplazar imagen de hoja ${idx + 1}`}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-chefsy hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40"
                        >
                          <RefreshCw size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => void eliminarHoja(hoja.id, idx + 1)}
                          disabled={guardando}
                          title="Eliminar hoja"
                          aria-label={`Eliminar hoja ${idx + 1}`}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer disabled:opacity-40"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}

              <p className="text-[11px] text-slate-400 px-1">
                Tip: si completás el título de las secciones (ej. <em>Promos</em>, <em>Lomos</em>, <em>Bebidas</em>), aparece una barrita arriba en la carta para saltar directo a esa hoja.
              </p>
            </div>
          )}
        </div>

        {/* Columna derecha: Ajustes + Preview de link en WhatsApp */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Detalles y WhatsApp
              </h3>
              {hayCambiosPendientes && (
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                  Sin guardar
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label htmlFor="carta-titulo" className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Título de la carta
                </label>
                <input
                  id="carta-titulo"
                  type="text"
                  value={config.titulo}
                  onChange={(e) => actualizarCampoConfig('titulo', e.target.value)}
                  maxLength={80}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-chefsy/40"
                />
              </div>

              <div>
                <label htmlFor="carta-subtitulo" className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Descripción al compartir en WhatsApp
                </label>
                <input
                  id="carta-subtitulo"
                  type="text"
                  value={config.subtitulo}
                  onChange={(e) => actualizarCampoConfig('subtitulo', e.target.value)}
                  maxLength={180}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-chefsy/40"
                />
              </div>

              <div>
                <label htmlFor="carta-wa-tel" className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  WhatsApp para recibir pedidos
                </label>
                <input
                  id="carta-wa-tel"
                  type="tel"
                  value={config.whatsappTelefono}
                  onChange={(e) => actualizarCampoConfig('whatsappTelefono', e.target.value)}
                  placeholder="5493834225445"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-chefsy/40"
                />
              </div>

              <div>
                <label htmlFor="carta-wa-msg" className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Mensaje precargado de WhatsApp
                </label>
                <textarea
                  id="carta-wa-msg"
                  rows={2}
                  value={config.whatsappMensaje}
                  onChange={(e) => actualizarCampoConfig('whatsappMensaje', e.target.value)}
                  maxLength={300}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-chefsy/40 resize-none"
                />
              </div>

              <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <label className="flex items-center justify-between gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                  <span>Mostrar estado (Abierto / Horario)</span>
                  <input
                    type="checkbox"
                    checked={config.mostrarEstadoHorario}
                    onChange={(e) => actualizarCampoConfig('mostrarEstadoHorario', e.target.checked)}
                    className="w-4 h-4 accent-chefsy rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  <span>Mostrar acceso a Tienda Online</span>
                  <input
                    type="checkbox"
                    checked={config.mostrarLinkTienda}
                    onChange={(e) => actualizarCampoConfig('mostrarLinkTienda', e.target.checked)}
                    className="w-4 h-4 accent-chefsy rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void persistirCarta(config, 'Cambios de la carta guardados.')}
              disabled={guardando}
              className="w-full inline-flex items-center justify-center gap-1.5 bg-chefsy hover:bg-chefsy-700 text-white text-xs font-extrabold py-2.5 px-4 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              {guardando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{guardando ? 'Guardando...' : 'Guardar cambios'}</span>
            </button>
          </div>

          {/* Vista previa compacta de cómo se ve el link al mandarlo por WhatsApp */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 space-y-2.5">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Así se ve el link en WhatsApp
            </p>
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <div className="aspect-[1.91/1] bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <img
                  src={portadaPreview}
                  alt="Vista previa de portada"
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3 space-y-0.5">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {config.titulo || 'Carta Chefsy'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                  {config.subtitulo || 'Mirá nuestro menú actualizado.'}
                </p>
                <p className="text-[10px] font-mono text-slate-400 pt-0.5">chefsy.xyz</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Diálogo nativo <dialog> para QR descargable / imprimible ── */}
      <dialog
        ref={dialogQrRef}
        aria-labelledby="qr-carta-titulo"
        {...({ closedby: 'any' } as any)}
        className="chefsy-modal-dialog m-auto p-0 bg-transparent max-w-sm w-[calc(100%-2rem)] rounded-3xl overflow-visible"
      >
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 text-center relative space-y-5">
          <button
            type="button"
            onClick={cerrarModalQr}
            aria-label="Cerrar ventana de código QR"
            className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>

          <div className="space-y-1 pt-1">
            <h1
              id="qr-carta-titulo"
              className="text-lg font-extrabold text-slate-900 dark:text-slate-100"
            >
              QR de la Carta Digital
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Siempre apunta a <span className="font-semibold">chefsy.xyz/carta</span>. Aunque cambies precios o láminas, el QR sigue siendo el mismo.
            </p>
          </div>

          <div
            ref={qrContenedorRef}
            className="inline-block bg-white p-4 rounded-2xl border border-slate-200"
          >
            <QRCodeSVG value={URL_PUBLICA_DISPLAY} size={216} level="M" includeMargin={false} />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={descargarQrPng}
              className="inline-flex items-center justify-center gap-1.5 bg-chefsy hover:bg-chefsy-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition-colors cursor-pointer"
            >
              <Download size={14} />
              <span>Descargar PNG</span>
            </button>
            <button
              type="button"
              onClick={imprimirQr}
              className="inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold py-2.5 px-3 rounded-xl transition-colors cursor-pointer"
            >
              <Printer size={14} />
              <span>Imprimir</span>
            </button>
          </div>

          <form method="dialog" className="pt-1">
            <button
              type="submit"
              autoFocus
              className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </form>
        </div>
      </dialog>
    </div>
  )
}

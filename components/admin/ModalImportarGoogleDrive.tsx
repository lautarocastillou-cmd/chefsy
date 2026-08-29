'use client'

import React, { useState } from 'react'
import {
  X,
  UploadCloud,
  Check,
  AlertCircle,
  Loader2,
  ExternalLink,
  Sparkles,
  Layers,
  Image as ImageIcon
} from 'lucide-react'
import { extraerGoogleDriveFileId, obtenerUrlsDirectasGoogleDrive } from '@/lib/gdrive'

interface ModalImportarGoogleDriveProps {
  abierto: boolean
  onCerrar: () => void
  onFotosImportadas: (urls: string[]) => void
  titulo?: string
  descripcion?: string
}

export default function ModalImportarGoogleDrive({
  abierto,
  onCerrar,
  onFotosImportadas,
  titulo = 'Importar Fotos desde Google Drive',
  descripcion = 'Pegá enlaces públicos de fotos de Google Drive para descargarlas, optimizarlas y guardarlas en tu menú.',
}: ModalImportarGoogleDriveProps) {
  const [textoLinks, setTextoLinks] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [progresoTexto, setProgresoTexto] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!abierto) return null

  // Extraer todos los File IDs detectados en el texto
  const lineas = textoLinks
    .split(/[\n,;\s]+/)
    .map(l => l.trim())
    .filter(Boolean)

  const idsDetectados = lineas
    .map(l => ({ original: l, id: extraerGoogleDriveFileId(l) }))
    .filter((item): item is { original: string; id: string } => Boolean(item.id))

  // Eliminar duplicados
  const idsUnicos = Array.from(new Set(idsDetectados.map(i => i.id))).map(id => {
    return idsDetectados.find(i => i.id === id)!
  })

  const handleImportar = async () => {
    if (idsUnicos.length === 0) {
      setErrorMsg('No se detectaron enlaces válidos de Google Drive.')
      return
    }

    setProcesando(true)
    setErrorMsg(null)
    setProgresoTexto(`Conectando con Google Drive (${idsUnicos.length} fotos)...`)

    try {
      const res = await fetch('/api/admin/google-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: idsUnicos.map(i => i.id),
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Error al descargar fotos de Google Drive.')
      }

      const urlsFinales = (data.items || []).map((item: any) => item.urlPublica)

      if (urlsFinales.length === 0) {
        throw new Error('No se pudo procesar ninguna foto. Verificá que los enlaces sean públicos.')
      }

      onFotosImportadas(urlsFinales)
      setTextoLinks('')
      onCerrar()
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Error al importar desde Google Drive')
    } finally {
      setProcesando(false)
      setProgresoTexto('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.71 3.5L1.15 15l3.43 6l6.55-11.5L7.71 3.5zm8.58 0l-6.56 11.5l3.43 6l6.56-11.5l-3.43-6zm-5.15 9l-3.43 6h13.14l3.43-6H11.14z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-black text-white">{titulo}</h3>
              <p className="text-xs text-slate-400">{descripcion}</p>
            </div>
          </div>

          <button
            onClick={onCerrar}
            disabled={procesando}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {/* Instrucciones de Ayuda */}
          <div className="p-3.5 bg-blue-950/30 border border-blue-500/20 rounded-2xl space-y-1.5 text-xs text-blue-200">
            <p className="font-bold flex items-center gap-1.5 text-blue-300">
              <Sparkles size={14} />
              <span>¿Cómo obtener el enlace en Google Drive?</span>
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
              <li>Hacé clic derecho en la foto en tu Google Drive ➔ <strong>Compartir</strong>.</li>
              <li>Cambiá el acceso general a <strong>"Cualquier persona con el enlace"</strong>.</li>
              <li>Hacé clic en <strong>Copiar enlace</strong> y pegalo acá abajo.</li>
            </ol>
          </div>

          {/* Campo de Texto para Enlaces */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-300 uppercase tracking-wider flex justify-between items-center">
              <span>Pegar Enlaces de Google Drive</span>
              <span className="text-[10px] text-slate-400 font-normal">
                {idsUnicos.length} {idsUnicos.length === 1 ? 'foto detectada' : 'fotos detectadas'}
              </span>
            </label>
            <textarea
              rows={4}
              value={textoLinks}
              onChange={e => setTextoLinks(e.target.value)}
              placeholder="https://drive.google.com/file/d/1A2B3C4D.../view&#10;https://drive.google.com/open?id=1X2Y3Z...&#10;(Podés pegar varios enlaces uno debajo del otro)"
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-white text-xs font-mono leading-relaxed resize-none"
            />
          </div>

          {/* Previsualización en Vivo de Fotos detectadas */}
          {idsUnicos.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Vista previa detectada ({idsUnicos.length}):
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1 bg-slate-950/60 rounded-2xl border border-slate-800">
                {idsUnicos.map((item, idx) => {
                  const urls = obtenerUrlsDirectasGoogleDrive(item.id)
                  return (
                    <div
                      key={`${item.id}-${idx}`}
                      className="relative aspect-square rounded-xl overflow-hidden bg-slate-900 border border-slate-800 group"
                    >
                      <img
                        src={urls.cdnUrl}
                        alt={`Drive ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback si la imagen no cargó directamente
                          (e.target as HTMLElement).style.display = 'none'
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="text-[9px] font-bold text-white bg-black/70 px-1.5 py-0.5 rounded">
                          Foto #{idx + 1}
                        </span>
                      </div>
                    </div>
                  )
                })}
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

        {/* Pie con Botones de Acción */}
        <div className="p-5 sm:p-6 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onCerrar}
            disabled={procesando}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleImportar}
            disabled={procesando || idsUnicos.length === 0}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {procesando ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>{progresoTexto || 'Descargando y subiendo...'}</span>
              </>
            ) : (
              <>
                <UploadCloud size={15} />
                <span>Importar {idsUnicos.length > 0 ? `(${idsUnicos.length})` : ''} a Chefsy</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

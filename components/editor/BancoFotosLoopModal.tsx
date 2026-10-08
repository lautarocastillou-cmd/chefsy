'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Image as ImageIcon, Images, Loader2, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FotoBanco {
  nombre: string
  url: string
  createdAt?: string | null
}

interface Props {
  abierto: boolean
  urlActual?: string
  onCerrar: () => void
  onSeleccionar: (url: string) => void
}

export default function BancoFotosLoopModal({
  abierto,
  urlActual,
  onCerrar,
  onSeleccionar,
}: Props) {
  const [fotos, setFotos] = useState<FotoBanco[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!abierto) return

    const controller = new AbortController()
    setBusqueda('')
    setError(null)
    setCargando(true)

    fetch('/api/admin/banco-fotos', { signal: controller.signal })
      .then(async (respuesta) => {
        if (!respuesta.ok) throw new Error('No se pudo cargar el banco de fotos.')
        const datos = await respuesta.json() as { fotos?: FotoBanco[] }
        setFotos(Array.isArray(datos.fotos) ? datos.fotos : [])
      })
      .catch((motivo: unknown) => {
        if (motivo instanceof DOMException && motivo.name === 'AbortError') return
        setError(motivo instanceof Error ? motivo.message : 'No se pudo cargar el banco de fotos.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false)
      })

    return () => controller.abort()
  }, [abierto])

  useEffect(() => {
    if (!abierto) return
    const cerrarConEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', cerrarConEscape)
    return () => window.removeEventListener('keydown', cerrarConEscape)
  }, [abierto, onCerrar])

  const fotosFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    if (!termino) return fotos
    return fotos.filter((foto) => `${foto.nombre} ${foto.url}`.toLowerCase().includes(termino))
  }, [busqueda, fotos])

  if (!abierto) return null

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-banco-fotos-loop"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onCerrar()
      }}
    >
      <div className="flex max-h-[min(780px,92vh)] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-slate-700/80 bg-zinc-950 shadow-2xl shadow-black/50 animate-in zoom-in-95 duration-200">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-gradient-to-r from-indigo-950/40 via-zinc-900 to-emerald-950/30 p-5 sm:p-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-indigo-400/20 bg-indigo-500/15 text-indigo-300">
              <Images size={22} />
            </div>
            <div className="min-w-0">
              <h2 id="titulo-banco-fotos-loop" className="truncate text-base font-black tracking-wide text-white sm:text-lg">
                Elegir del Banco de Fotos
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Seleccioná una imagen para tu loop vertical 9:16.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Cerrar banco de fotos"
          >
            <X size={19} />
          </button>
        </header>

        <div className="flex shrink-0 items-center gap-3 border-b border-slate-800/80 bg-zinc-900/70 p-4 sm:px-6">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Buscar por nombre o archivo..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-xs text-white outline-none transition-colors placeholder:text-slate-500 focus:border-indigo-400"
              autoFocus
            />
          </div>
          <span className="hidden shrink-0 text-[11px] font-bold text-slate-500 sm:block">
            {fotosFiltradas.length} {fotosFiltradas.length === 1 ? 'imagen' : 'imágenes'}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {cargando ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-sm text-slate-400">
              <Loader2 className="animate-spin text-indigo-400" size={28} />
              <span>Cargando tus fotos...</span>
            </div>
          ) : error ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-500/10 text-rose-400"><ImageIcon size={22} /></div>
              <p className="max-w-sm text-sm font-bold text-white">No pudimos abrir el banco de fotos</p>
              <p className="max-w-sm text-xs text-slate-500">{error}</p>
              <button type="button" onClick={onCerrar} className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700">
                Cerrar
              </button>
            </div>
          ) : fotosFiltradas.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-900 text-slate-600"><ImageIcon size={25} /></div>
              <p className="text-sm font-bold text-white">{fotos.length ? 'No encontramos esa imagen' : 'Tu banco todavía está vacío'}</p>
              <p className="max-w-sm text-xs text-slate-500">
                {fotos.length ? 'Probá con otro nombre o archivo.' : 'Subí fotos desde el Banco de Fotos o usá la opción de carga local.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {fotosFiltradas.map((foto) => {
                const seleccionada = urlActual === foto.url
                return (
                  <button
                    key={foto.url}
                    type="button"
                    onClick={() => onSeleccionar(foto.url)}
                    className={cn(
                      'group relative overflow-hidden rounded-2xl border bg-slate-900 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-950/40',
                      seleccionada ? 'border-emerald-400 ring-2 ring-emerald-400/40' : 'border-slate-800'
                    )}
                    title={`Usar ${foto.nombre}`}
                  >
                    <div className="relative aspect-[4/5] overflow-hidden bg-slate-950">
                      <img
                        src={foto.url}
                        alt={foto.nombre}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-70" />
                      {seleccionada && (
                        <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-white shadow-lg">
                          <Check size={14} strokeWidth={3} />
                        </span>
                      )}
                      <span className="absolute bottom-2 left-2 right-2 truncate text-[10px] font-bold text-white drop-shadow-md">
                        {foto.nombre}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 p-2.5">
                      <span className="truncate text-[10px] font-bold text-slate-400">{seleccionada ? 'En este slot' : 'Usar imagen'}</span>
                      {!seleccionada && <span className="text-[10px] font-black text-indigo-400 opacity-0 transition-opacity group-hover:opacity-100">Elegir</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-800 bg-zinc-900/70 p-4 sm:px-6">
          <p className="hidden text-[11px] text-slate-500 sm:block">Las imágenes se usan sin duplicarlas en el almacenamiento.</p>
          <button type="button" onClick={onCerrar} className="ml-auto rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-slate-700">
            Cancelar
          </button>
        </footer>
      </div>
    </div>
  )
}

'use client'

// ─────────────────────────────────────────────────────
// components/tienda/PanelResultadosBusqueda.tsx
// Panel de resultados anclado al buscador (autocomplete).
// Evita que los productos queden fuera del viewport cuando
// el catálogo está debajo de un hero alto.
//
// Se monta dentro del mismo contenedor `relative` del input,
// así que se posiciona solo y no necesita medir nada.
// ─────────────────────────────────────────────────────

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ArrowDown, Plus, Search, Utensils, X } from 'lucide-react'
import { usarBuscadorTienda } from '@/contexto/BuscadorTiendaContexto'
import { dividirPorCoincidencia } from '@/lib/busqueda-productos'
import { cn, formatearPrecio, optimizarUrlImagen } from '@/lib/utils'
import {
  esImagenValida,
  OBTENER_DETALLES_COMPLEMENTARIOS,
  resolverImagen,
} from '@/lib/tienda-helpers'
import type { MetaProducto, ProductoCatalogo } from '@/tipos/catalogo'

const MINIMO_CARACTERES = 2

interface Props {
  /** `hero`: buscador grande del hero (desktop). `header`: barra sticky mobile. */
  variante?: 'hero' | 'header'
  className?: string
}

export default function PanelResultadosBusqueda({ variante = 'hero', className }: Props) {
  const {
    consulta,
    resultados,
    metadata,
    sugerencia,
    nombreCategoria,
    abrirProducto,
    verTodos,
    limpiar,
    aplicarSugerencia,
  } = usarBuscadorTienda()

  const panelRef = useRef<HTMLDivElement>(null)
  const [descartado, setDescartado] = useState<string | null>(null)
  const [haciaArriba, setHaciaArriba] = useState(false)

  const termino = consulta.trim()
  const abierto = termino.length >= MINIMO_CARACTERES && descartado !== termino

  // En el hero de escritorio el input puede quedar al borde inferior del
  // viewport (títulos grandes): si no hay lugar abajo, el panel se abre hacia
  // arriba. Se mide el contenedor del input, no el panel, para no depender de
  // su altura antes de renderizarse.
  useLayoutEffect(() => {
    if (!abierto) return

    const calcular = () => {
      const ancla = panelRef.current?.parentElement
      if (!ancla) return
      const rect = ancla.getBoundingClientRect()
      const espacioAbajo = window.innerHeight - rect.bottom
      const espacioArriba = rect.top
      setHaciaArriba(espacioAbajo < 340 && espacioArriba > espacioAbajo)
    }

    calcular()
    window.addEventListener('resize', calcular)
    return () => window.removeEventListener('resize', calcular)
  }, [abierto])

  // Al cambiar la consulta se vuelve a abrir aunque el usuario lo haya cerrado.
  useEffect(() => {
    setDescartado(null)
  }, [termino])

  // Cerrar con click afuera, Esc o Enter (Enter = ver todos).
  useEffect(() => {
    if (!abierto) return

    const alPresionar = (evento: PointerEvent) => {
      const panel = panelRef.current
      const objetivo = evento.target as HTMLElement | null
      if (panel?.contains(evento.target as Node)) return
      if (objetivo?.closest?.('[data-buscador-input]')) return
      setDescartado(termino)
    }

    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        setDescartado(termino)
        return
      }
      if (evento.key !== 'Enter') return

      const activo = document.activeElement as HTMLElement | null
      if (!activo?.matches?.('[data-buscador-input]')) return

      evento.preventDefault()
      verTodos()
      setDescartado(termino)
    }

    document.addEventListener('pointerdown', alPresionar)
    document.addEventListener('keydown', alTeclear)
    return () => {
      document.removeEventListener('pointerdown', alPresionar)
      document.removeEventListener('keydown', alTeclear)
    }
  }, [abierto, termino, verTodos])

  // Volver a mostrar los resultados al enfocar el buscador, aunque el usuario
  // los haya cerrado antes con un click afuera.
  useEffect(() => {
    const alEnfocar = (evento: FocusEvent) => {
      const objetivo = evento.target as HTMLElement | null
      if (objetivo?.matches?.('[data-buscador-input]')) {
        setDescartado(null)
      }
    }

    document.addEventListener('focusin', alEnfocar)
    return () => document.removeEventListener('focusin', alEnfocar)
  }, [])

  // En el hero (desktop) el input se va con el scroll, así que el panel se
  // cierra solo. En la barra sticky mobile el input sigue visible: ahí el panel
  // se mantiene anclado y se scrollea por dentro.
  useEffect(() => {
    if (!abierto || variante === 'header') return

    const scrollInicial = window.scrollY
    const alScrollear = () => {
      if (Math.abs(window.scrollY - scrollInicial) > 90) {
        setDescartado(termino)
      }
    }

    window.addEventListener('scroll', alScrollear, { passive: true })
    return () => window.removeEventListener('scroll', alScrollear)
  }, [abierto, termino, variante])

  if (!abierto) return null

  const maxResultados = variante === 'header' ? 4 : 5
  const visibles = resultados.slice(0, maxResultados)

  const cerrar = () => setDescartado(termino)

  const abrir = (producto: ProductoCatalogo) => {
    cerrar()
    abrirProducto(producto)
  }

  const irAlMenuCompleto = () => {
    cerrar()
    limpiar()
    // En mobile el hero reaparece al limpiar la búsqueda: hay que dejar que
    // React aplique ese layout antes de calcular la posición del catálogo.
    window.setTimeout(verTodos, 80)
  }

  return (
    <div
      ref={panelRef}
      data-panel-busqueda
      className={cn(
        'absolute left-0 right-0 z-[120] overflow-hidden rounded-2xl border border-white/10 bg-[#141414] shadow-[0_24px_60px_rgba(0,0,0,0.7)] ring-1 ring-black/40 animate-in fade-in duration-150',
        haciaArriba ? 'bottom-full mb-2 slide-in-from-bottom-1' : 'top-full mt-2 slide-in-from-top-1',
        className
      )}
    >
      {/* Encabezado con el conteo y el botón de limpiar */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <p className="min-w-0 truncate text-[11px] font-semibold text-slate-400" aria-live="polite">
          {resultados.length}{' '}
          {resultados.length === 1 ? 'resultado' : 'resultados'} para{' '}
          <span className="font-bold text-white">«{termino}»</span>
        </p>
        <button
          type="button"
          onClick={limpiar}
          aria-label="Limpiar búsqueda"
          className="shrink-0 rounded-full p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>

      {/* Sugerencia "¿Quisiste decir?" */}
      {sugerencia && (
        <button
          type="button"
          onClick={aplicarSugerencia}
          className="flex w-full items-center gap-1.5 border-b border-white/5 bg-emerald-500/[0.07] px-3 py-2 text-left text-[11px] text-slate-300 transition-colors hover:bg-emerald-500/[0.12]"
        >
          <span>¿Quisiste decir</span>
          <span className="font-bold text-emerald-300">{sugerencia}</span>
          <span>?</span>
        </button>
      )}

      {visibles.length > 0 ? (
        <>
          <ul className="max-h-[42vh] overflow-y-auto overscroll-contain py-1 sm:max-h-[52vh]">
            {visibles.map((producto) => (
              <FilaResultado
                key={producto.id}
                producto={producto}
                consulta={termino}
                metadata={metadata}
                nombreCategoria={nombreCategoria}
                onAbrir={abrir}
              />
            ))}
          </ul>

          <button
            type="button"
            onClick={() => {
              cerrar()
              verTodos()
            }}
            className="flex w-full items-center justify-center gap-1.5 border-t border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-emerald-300 transition-colors hover:bg-white/[0.06]"
          >
            Ver los {resultados.length} en el menú
            <ArrowDown size={13} />
          </button>
        </>
      ) : (
        <div className="px-4 py-7 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-slate-500">
            <Search size={18} />
          </div>
          <p className="text-sm font-bold text-white">No encontramos «{termino}»</p>
          <p className="mt-1 text-[11px] leading-snug text-slate-400">
            Probá con otra palabra o mirá el menú completo.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={limpiar}
              className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-bold text-slate-300 transition-colors hover:bg-white/5"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={irAlMenuCompleto}
              className="rounded-full bg-emerald-700 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-emerald-600"
            >
              Ver el menú
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

interface FilaResultadoProps {
  producto: ProductoCatalogo
  consulta: string
  metadata: Record<string, MetaProducto>
  nombreCategoria: (idCategoria: string) => string
  onAbrir: (producto: ProductoCatalogo) => void
}

function FilaResultado({
  producto,
  consulta,
  metadata,
  nombreCategoria,
  onAbrir,
}: FilaResultadoProps) {
  const meta = metadata[producto.id]
  const detalles = OBTENER_DETALLES_COMPLEMENTARIOS(
    producto.categoriaId,
    producto.nombre,
    producto.id
  )
  const imagen = resolverImagen(meta?.imagen_url, detalles.img)
  // La metadata puede traer varias imágenes separadas por " | ": usamos la primera.
  const imagenBase = (imagen.includes(' | ') ? imagen.split(' | ')[0] : imagen).trim()
  const nombre = meta?.nombre_publico || producto.nombre
  const agotado = producto.stock !== undefined && producto.stock !== null && producto.stock <= 0
  const segmentos = dividirPorCoincidencia(nombre, consulta)
  const esCdn =
    imagenBase.includes('res.cloudinary.com') ||
    imagenBase.includes('supabase.co') ||
    imagenBase.includes('lh3.googleusercontent.com')

  return (
    <li>
      <button
        type="button"
        onClick={() => onAbrir(producto)}
        disabled={agotado}
        className="group flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {esImagenValida(imagenBase) ? (
          <Image
            src={optimizarUrlImagen(imagenBase, 120)}
            alt=""
            width={44}
            height={44}
            unoptimized={esCdn}
            className="h-11 w-11 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/5 text-slate-500">
            <Utensils size={16} />
          </span>
        )}

        <span className="min-w-0 flex-1">
          <span className="block truncate font-bebas text-base leading-tight tracking-wide text-white">
            {segmentos.map((segmento, indice) =>
              segmento.coincide ? (
                <mark key={indice} className="bg-transparent text-emerald-300">
                  {segmento.texto}
                </mark>
              ) : (
                <React.Fragment key={indice}>{segmento.texto}</React.Fragment>
              )
            )}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="truncate">{nombreCategoria(producto.categoriaId)}</span>
            {producto.esCombo && (
              <span className="shrink-0 rounded bg-emerald-600/20 px-1 text-[8px] font-bold uppercase tracking-wide text-emerald-300">
                Combo
              </span>
            )}
          </span>
        </span>

        <span className="shrink-0 text-right">
          {agotado ? (
            <span className="text-[10px] font-bold uppercase tracking-wide text-rose-400">
              Agotado
            </span>
          ) : (
            <span className="font-mono text-xs font-black text-emerald-400">
              {formatearPrecio(producto.precio)}
            </span>
          )}
        </span>

        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600/15 text-emerald-300 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
          <Plus size={13} />
        </span>
      </button>
    </li>
  )
}

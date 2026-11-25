'use client'

import React from 'react'
import { AlignCenter, AlignLeft, AlignRight, Check, Save } from 'lucide-react'
import BannerTituloCarta from '@/components/carta/BannerTituloCarta'
import {
  crearEstiloTituloDefault,
  FUENTES_TITULO_CARTA,
  PRESETS_ESTILO_TITULO,
  type AlineacionTituloCarta,
  type AlturaTituloCarta,
  type DecoracionTituloCarta,
  type EstiloTituloCarta,
  type HojaCarta,
  type TamanoTituloCarta,
} from '@/lib/carta-digital'

interface PropsEditorTituloCarta {
  hoja: HojaCarta
  siguienteImagen?: HojaCarta
  hayCambiosPendientes: boolean
  guardando: boolean
  onCambiarTexto: (campo: 'titulo' | 'subtitulo', valor: string) => void
  onCambiarEstilo: (parcial: Partial<EstiloTituloCarta>) => void
  onGuardar: () => void
}

const OPCIONES_TAMANO: Array<{ id: TamanoTituloCarta; label: string }> = [
  { id: 'sm', label: 'Chico' },
  { id: 'md', label: 'Medio' },
  { id: 'lg', label: 'Grande' },
  { id: 'xl', label: 'Extra' },
]

const OPCIONES_ALTURA: Array<{ id: AlturaTituloCarta; label: string }> = [
  { id: 'compacta', label: 'Fino' },
  { id: 'media', label: 'Medio' },
  { id: 'amplia', label: 'Amplio' },
]

const OPCIONES_DECORACION: Array<{ id: DecoracionTituloCarta; label: string }> = [
  { id: 'ninguna', label: 'Limpio' },
  { id: 'lineas', label: 'Líneas' },
  { id: 'borde-inferior', label: 'Subrayado' },
  { id: 'acento-lateral', label: 'Barra' },
]

const OPCIONES_ALINEACION: Array<{ id: AlineacionTituloCarta; label: string; Icono: typeof AlignLeft }> = [
  { id: 'left', label: 'Izquierda', Icono: AlignLeft },
  { id: 'center', label: 'Centro', Icono: AlignCenter },
  { id: 'right', label: 'Derecha', Icono: AlignRight },
]

export default function EditorTituloCarta({
  hoja,
  siguienteImagen,
  hayCambiosPendientes,
  guardando,
  onCambiarTexto,
  onCambiarEstilo,
  onGuardar,
}: PropsEditorTituloCarta) {
  const estilo = hoja.estiloTitulo || crearEstiloTituloDefault()

  return (
    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-4">
      {/* Vista previa en vivo del separador */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
          <span className="font-bold uppercase tracking-wider">Vista previa</span>
          {siguienteImagen?.ancho && siguienteImagen?.alto ? (
            <span className="tabular-nums text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
              Adaptado a la imagen de abajo ({siguienteImagen.ancho}×{siguienteImagen.alto})
            </span>
          ) : (
            <span className="text-[10px]">Se adapta al ancho y alto de la imagen de abajo</span>
          )}
        </div>
        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs">
          <BannerTituloCarta hoja={hoja} siguienteImagen={siguienteImagen} modoPreview />
        </div>
      </div>

      {/* Texto principal y subtítulo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
            Texto del título
          </label>
          <input
            type="text"
            value={hoja.titulo}
            onChange={(e) => onCambiarTexto('titulo', e.target.value)}
            placeholder="Ej: Nuestras Promos, Hamburguesas..."
            maxLength={80}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-chefsy/40"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
            Subtítulo opcional
          </label>
          <input
            type="text"
            value={hoja.subtitulo || ''}
            onChange={(e) => onCambiarTexto('subtitulo', e.target.value)}
            placeholder="Ej: Todas salen con papas fritas"
            maxLength={120}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-chefsy/40"
          />
        </div>
      </div>

      {/* Selector visual de fuente */}
      <div className="space-y-1.5">
        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
          Tipografía
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {FUENTES_TITULO_CARTA.map((f) => {
            const activa = estilo.fuente === f.id
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onCambiarEstilo({ fuente: f.id })}
                className={`px-2.5 py-2 rounded-xl border text-left transition-colors cursor-pointer ${
                  activa
                    ? 'border-chefsy bg-emerald-50/70 dark:bg-emerald-950/30 text-slate-900 dark:text-white'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span
                  style={{ fontFamily: f.familiaCss }}
                  className="block text-sm font-bold leading-tight truncate"
                >
                  {f.nombre}
                </span>
                <span className="block text-[10px] text-slate-400 mt-0.5">{f.categoria}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tamaño, altura y decoración */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <span className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
            Tamaño letra
          </span>
          <div className="grid grid-cols-4 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {OPCIONES_TAMANO.map((op) => (
              <button
                key={op.id}
                type="button"
                onClick={() => onCambiarEstilo({ tamano: op.id })}
                className={`py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  estilo.tamano === op.id
                    ? 'bg-white dark:bg-slate-900 text-chefsy shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {op.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <span className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
            Alto del bloque
          </span>
          <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {OPCIONES_ALTURA.map((op) => (
              <button
                key={op.id}
                type="button"
                onClick={() => onCambiarEstilo({ altura: op.id })}
                className={`py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  estilo.altura === op.id
                    ? 'bg-white dark:bg-slate-900 text-chefsy shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {op.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <span className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
            Estilo de detalle
          </span>
          <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {OPCIONES_DECORACION.map((op) => (
              <button
                key={op.id}
                type="button"
                onClick={() => onCambiarEstilo({ decoracion: op.id })}
                className={`py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  estilo.decoracion === op.id
                    ? 'bg-white dark:bg-slate-900 text-chefsy shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {op.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alineación + Mayúsculas + Presets de color + Pickers */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Alineación */}
          <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-0.5">
            {OPCIONES_ALINEACION.map(({ id, label, Icono }) => (
              <button
                key={id}
                type="button"
                title={label}
                aria-label={`Alinear ${label}`}
                onClick={() => onCambiarEstilo({ alineacion: id })}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  estilo.alineacion === id
                    ? 'bg-white dark:bg-slate-900 text-chefsy shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icono size={13} />
              </button>
            ))}
          </div>

          {/* Toggle Mayúsculas */}
          <button
            type="button"
            onClick={() => onCambiarEstilo({ mayusculas: !estilo.mayusculas })}
            className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-colors cursor-pointer ${
              estilo.mayusculas
                ? 'border-chefsy bg-emerald-50/70 dark:bg-emerald-950/30 text-chefsy'
                : 'border-slate-200 dark:border-slate-700 text-slate-500'
            }`}
          >
            AA Mayúsculas
          </button>

          {/* Presets rápidos de paleta */}
          <div className="flex items-center gap-1.5">
            {PRESETS_ESTILO_TITULO.map((preset) => {
              const coincide =
                estilo.colorFondo.toLowerCase() === preset.colorFondo.toLowerCase() &&
                estilo.colorTexto.toLowerCase() === preset.colorTexto.toLowerCase()
              return (
                <button
                  key={preset.id}
                  type="button"
                  title={preset.nombre}
                  onClick={() =>
                    onCambiarEstilo({
                      colorFondo: preset.colorFondo,
                      colorTexto: preset.colorTexto,
                      decoracion: preset.decoracion,
                    })
                  }
                  style={{ backgroundColor: preset.colorFondo, color: preset.colorTexto }}
                  className={`w-6 h-6 rounded-full border flex items-center justify-center transition-transform cursor-pointer hover:scale-110 ${
                    coincide ? 'ring-2 ring-chefsy ring-offset-1 border-white' : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {coincide ? <Check size={11} strokeWidth={3} /> : <span className="text-[9px] font-black">A</span>}
                </button>
              )
            })}
          </div>

          {/* Selectores de color personalizados */}
          <div className="flex items-center gap-2 pl-1">
            <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 cursor-pointer">
              <span>Fondo</span>
              <input
                type="color"
                value={estilo.colorFondo}
                onChange={(e) => onCambiarEstilo({ colorFondo: e.target.value })}
                className="w-6 h-6 rounded border border-slate-200 dark:border-slate-700 bg-transparent cursor-pointer"
              />
            </label>
            <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 cursor-pointer">
              <span>Texto</span>
              <input
                type="color"
                value={estilo.colorTexto}
                onChange={(e) => onCambiarEstilo({ colorTexto: e.target.value })}
                className="w-6 h-6 rounded border border-slate-200 dark:border-slate-700 bg-transparent cursor-pointer"
              />
            </label>
          </div>
        </div>

        {hayCambiosPendientes && (
          <button
            type="button"
            onClick={onGuardar}
            disabled={guardando}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-chefsy hover:bg-chefsy-700 text-white text-[11px] font-extrabold transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save size={12} />
            <span>Guardar título</span>
          </button>
        )}
      </div>
    </div>
  )
}

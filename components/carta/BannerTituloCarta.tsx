'use client'

import React from 'react'
import {
  calcularFactorAlturaTitulo,
  crearEstiloTituloDefault,
  obtenerDefinicionFuenteCarta,
  type AlturaTituloCarta,
  type HojaCarta,
  type TamanoTituloCarta,
} from '@/lib/carta-digital'

interface PropsBannerTituloCarta {
  hoja: HojaCarta
  siguienteImagen?: HojaCarta
  /** En modo miniatura/preview del admin reduce los límites máximos para que luzca fiel en cards chicos. */
  modoPreview?: boolean
  className?: string
}

const ESCALA_TEXTO_CQI: Record<TamanoTituloCarta, { minPx: number; cqi: number; maxPx: number }> = {
  sm: { minPx: 16, cqi: 4.2, maxPx: 26 },
  md: { minPx: 20, cqi: 5.4, maxPx: 34 },
  lg: { minPx: 24, cqi: 6.8, maxPx: 44 },
  xl: { minPx: 28, cqi: 8.2, maxPx: 54 },
}

const ESCALA_ALTURA_CQI: Record<AlturaTituloCarta, { pyMin: number; pyCqi: number; pyMax: number }> = {
  compacta: { pyMin: 10, pyCqi: 2.8, pyMax: 22 },
  media: { pyMin: 16, pyCqi: 4.5, pyMax: 36 },
  amplia: { pyMin: 24, pyCqi: 6.8, pyMax: 54 },
}

export default function BannerTituloCarta({
  hoja,
  siguienteImagen,
  modoPreview = false,
  className = '',
}: PropsBannerTituloCarta) {
  const estilo = hoja.estiloTitulo || crearEstiloTituloDefault()
  const defFuente = obtenerDefinicionFuenteCarta(estilo.fuente)
  const factorAltura = calcularFactorAlturaTitulo(siguienteImagen)

  const escalaTexto = ESCALA_TEXTO_CQI[estilo.tamano]
  const escalaAltura = ESCALA_ALTURA_CQI[estilo.altura]

  // Escala vertical modulada por la proporción alto/ancho de la imagen de abajo
  const pyMin = Math.round(escalaAltura.pyMin * factorAltura * (modoPreview ? 0.72 : 1))
  const pyCqi = Number((escalaAltura.pyCqi * factorAltura).toFixed(2))
  const pyMax = Math.round(escalaAltura.pyMax * factorAltura * (modoPreview ? 0.72 : 1))

  const fontMin = Math.round(escalaTexto.minPx * (modoPreview ? 0.78 : 1))
  const fontMax = Math.round(escalaTexto.maxPx * (modoPreview ? 0.72 : 1))

  const alineacionFlex =
    estilo.alineacion === 'left'
      ? 'items-start text-left'
      : estilo.alineacion === 'right'
        ? 'items-end text-right'
        : 'items-center text-center'

  const esAcentoLateral = estilo.decoracion === 'acento-lateral'
  const esBordeInferior = estilo.decoracion === 'borde-inferior'
  const esLineas = estilo.decoracion === 'lineas'

  return (
    <div
      style={{
        containerType: 'inline-size',
        backgroundColor: estilo.colorFondo,
        color: estilo.colorTexto,
      }}
      className={`relative w-full overflow-hidden select-none ${className}`}
    >
      {/* Acento lateral (izquierdo o derecho según alineación) */}
      {esAcentoLateral && (
        <span
          aria-hidden="true"
          style={{ backgroundColor: estilo.colorTexto }}
          className={`absolute top-0 bottom-0 w-1.5 opacity-85 ${
            estilo.alineacion === 'right' ? 'right-0' : 'left-0'
          }`}
        />
      )}

      <div
        style={{
          paddingBlock: `clamp(${pyMin}px, ${pyCqi}cqi, ${pyMax}px)`,
          paddingInline: 'clamp(16px, 5cqi, 40px)',
        }}
        className={`flex flex-col justify-center gap-1 ${alineacionFlex}`}
      >
        <div
          className={`w-full flex items-center gap-3 ${
            estilo.alineacion === 'left'
              ? 'justify-start'
              : estilo.alineacion === 'right'
                ? 'justify-end'
                : 'justify-center'
          }`}
        >
          {esLineas && estilo.alineacion !== 'left' && (
            <span
              aria-hidden="true"
              style={{ backgroundColor: estilo.colorTexto }}
              className="h-px flex-1 max-w-[18cqi] opacity-35"
            />
          )}

          <h2
            style={{
              fontFamily: defFuente.familiaCss,
              fontSize: `clamp(${fontMin}px, ${escalaTexto.cqi}cqi, ${fontMax}px)`,
              letterSpacing: defFuente.tracking,
              lineHeight: 1.08,
            }}
            className={`font-bold break-words ${estilo.mayusculas ? 'uppercase' : ''}`}
          >
            {hoja.titulo.trim() || 'Título de sección'}
          </h2>

          {esLineas && estilo.alineacion !== 'right' && (
            <span
              aria-hidden="true"
              style={{ backgroundColor: estilo.colorTexto }}
              className="h-px flex-1 max-w-[18cqi] opacity-35"
            />
          )}
        </div>

        {hoja.subtitulo?.trim() && (
          <p
            style={{
              fontSize: `clamp(${modoPreview ? 10 : 12}px, 2.3cqi, ${modoPreview ? 13 : 16}px)`,
            }}
            className="opacity-80 font-medium leading-snug max-w-[60ch]"
          >
            {hoja.subtitulo.trim()}
          </p>
        )}

        {esBordeInferior && (
          <span
            aria-hidden="true"
            style={{ backgroundColor: estilo.colorTexto }}
            className="mt-1.5 h-[2px] w-[14cqi] min-w-10 max-w-24 rounded-full opacity-45"
          />
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────
// lib/impresion/tipografia.ts
// Modelo de tipografía para las comandas y tickets ESC/POS.
// Todos los valores se expresan en "dots" de la impresora térmica
// (203 dpi): 80 mm imprimibles = 576 dots, 58 mm = 384 dots.
// ─────────────────────────────────────────────────────

export type FuenteTermica = 'A' | 'B'

export interface TipografiaDocumento {
  /** Fuente A (12x24 dots, estándar) o B (9x17 dots, compacta). */
  fuente: FuenteTermica
  /** Multiplicador horizontal del carácter (1 a 4). */
  ancho: number
  /** Multiplicador vertical del carácter (1 a 4). */
  alto: number
  /** Dots extra entre caracteres (ESC SP). */
  interletrado: number
  /** Dots extra entre líneas, además del alto de la fuente. */
  interlineado: number
  /** Líneas en blanco entre ítems del pedido. */
  espacioItems: number
}

export interface TipografiaImpresion {
  comanda: TipografiaDocumento
  ticket: TipografiaDocumento
}

export const LIMITES_TIPOGRAFIA = {
  ancho: { min: 1, max: 4 },
  alto: { min: 1, max: 4 },
  interletrado: { min: 0, max: 8 },
  interlineado: { min: 0, max: 60 },
  espacioItems: { min: 0, max: 3 },
} as const

/** Alto y ancho de carácter de cada fuente en dots (sin multiplicar). */
export const METRICAS_FUENTE: Record<FuenteTermica, { ancho: number; alto: number }> = {
  A: { ancho: 12, alto: 24 },
  B: { ancho: 9, alto: 17 },
}

/** Ancho imprimible en dots para cada rollo. */
export const DOTS_IMPRIMIBLES = { 80: 576, 58: 384 } as const

/** Valores por defecto alineados con la calibración natural 1x1 de Chefsy. */
export const TIPOGRAFIA_POR_DEFECTO: TipografiaImpresion = {
  comanda: { fuente: 'A', ancho: 1, alto: 1, interletrado: 1, interlineado: 8, espacioItems: 1 },
  ticket: { fuente: 'A', ancho: 1, alto: 1, interletrado: 1, interlineado: 8, espacioItems: 0 },
}

function limitar(valor: unknown, min: number, max: number, porDefecto: number): number {
  const numero = typeof valor === 'number' ? valor : Number(valor)
  if (!Number.isFinite(numero)) return porDefecto
  return Math.max(min, Math.min(max, Math.round(numero)))
}

/** Normaliza un documento de tipografía, recortando valores fuera de rango. */
export function normalizarDocumento(
  valor: unknown,
  porDefecto: TipografiaDocumento = TIPOGRAFIA_POR_DEFECTO.ticket
): TipografiaDocumento {
  const datos = valor && typeof valor === 'object' ? (valor as Record<string, unknown>) : {}
  const fuente = datos.fuente === 'B' ? 'B' : datos.fuente === 'A' ? 'A' : porDefecto.fuente

  return {
    fuente,
    ancho: limitar(datos.ancho, LIMITES_TIPOGRAFIA.ancho.min, LIMITES_TIPOGRAFIA.ancho.max, porDefecto.ancho),
    alto: limitar(datos.alto, LIMITES_TIPOGRAFIA.alto.min, LIMITES_TIPOGRAFIA.alto.max, porDefecto.alto),
    interletrado: limitar(
      datos.interletrado,
      LIMITES_TIPOGRAFIA.interletrado.min,
      LIMITES_TIPOGRAFIA.interletrado.max,
      porDefecto.interletrado
    ),
    interlineado: limitar(
      datos.interlineado,
      LIMITES_TIPOGRAFIA.interlineado.min,
      LIMITES_TIPOGRAFIA.interlineado.max,
      porDefecto.interlineado
    ),
    espacioItems: limitar(
      datos.espacioItems,
      LIMITES_TIPOGRAFIA.espacioItems.min,
      LIMITES_TIPOGRAFIA.espacioItems.max,
      porDefecto.espacioItems
    ),
  }
}

/** Normaliza la tipografía completa (comanda + ticket). */
export function normalizarTipografia(valor: unknown): TipografiaImpresion {
  const datos = valor && typeof valor === 'object' ? (valor as Record<string, unknown>) : {}
  return {
    comanda: normalizarDocumento(datos.comanda, TIPOGRAFIA_POR_DEFECTO.comanda),
    ticket: normalizarDocumento(datos.ticket, TIPOGRAFIA_POR_DEFECTO.ticket),
  }
}

/**
 * Columnas reales que entran en el rollo con esta tipografía.
 * Es la base para separadores y filas de dos columnas: con interletrado o
 * tamaño horizontal alto, 48 columnas ya no entran en 80 mm.
 */
export function anchoColumnas(anchoMm: 58 | 80, documento: TipografiaDocumento): number {
  const dots = DOTS_IMPRIMIBLES[anchoMm] ?? DOTS_IMPRIMIBLES[80]
  const metrica = METRICAS_FUENTE[documento.fuente]
  const anchoCaracter = metrica.ancho * documento.ancho + documento.interletrado
  return Math.max(12, Math.floor(dots / Math.max(1, anchoCaracter)))
}

/** Altura de línea total en dots (alto de fuente + interlineado configurado). */
export function dotsInterlineado(documento: TipografiaDocumento): number {
  const metrica = METRICAS_FUENTE[documento.fuente]
  return Math.max(1, metrica.alto * documento.alto + documento.interlineado)
}

export function tipografiasIguales(a: TipografiaImpresion, b: TipografiaImpresion): boolean {
  return JSON.stringify(normalizarTipografia(a)) === JSON.stringify(normalizarTipografia(b))
}

/** Etiqueta corta para mostrar en la UI. */
export function describirDocumento(documento: TipografiaDocumento, anchoMm: 58 | 80): string {
  return `Fuente ${documento.fuente} · ${documento.ancho}x${documento.alto} · ${anchoColumnas(
    anchoMm,
    documento
  )} columnas · interletrado ${documento.interletrado} dot${documento.interletrado === 1 ? '' : 's'}`
}

/** Estilos aproximados para la vista previa HTML (no son los dots reales). */
export function estiloVistaPrevia(documento: TipografiaDocumento, anchoMm: 58 | 80) {
  const metrica = METRICAS_FUENTE[documento.fuente]
  const altoLinea = dotsInterlineado(documento)
  const tamanoBase = documento.fuente === 'B' ? 10 : 12

  return {
    width: anchoMm === 58 ? 224 : 320,
    fontSize: tamanoBase * documento.alto,
    letterSpacing: documento.interletrado * 0.55,
    lineHeight: (altoLinea / Math.max(1, metrica.alto * documento.alto)) * 1.05,
    fontFamily:
      documento.fuente === 'B'
        ? '"Courier New", ui-monospace, monospace'
        : 'ui-monospace, "Cascadia Mono", "Consolas", monospace',
  }
}

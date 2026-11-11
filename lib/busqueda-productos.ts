// ─────────────────────────────────────────────────────
// lib/busqueda-productos.ts
// Búsqueda difusa de productos y utilidades de resaltado.
// Fuente única de verdad para el filtrado de la tienda:
// la usan tanto la grilla del catálogo como el panel de
// resultados del buscador, para que nunca diverjan.
// ─────────────────────────────────────────────────────

import Fuse from 'fuse.js'
import type { ProductoCatalogo } from '@/tipos/catalogo'

/** Normaliza texto para comparar sin distinguir mayúsculas ni acentos. */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/**
 * Devuelve los productos que mejor coinciden con la consulta, ya ordenados
 * por relevancia (Fuse.js tolera errores de tipeo).
 */
export function buscarProductos(
  productos: ProductoCatalogo[],
  consulta: string
): ProductoCatalogo[] {
  const termino = consulta.trim()
  if (!termino) return productos

  const fuse = new Fuse(productos, {
    keys: ['nombre', 'descripcion', 'categoriaId'],
    threshold: 0.4,
    ignoreLocation: true,
  })

  return fuse.search(termino).map((resultado) => resultado.item)
}

export interface SegmentoTexto {
  texto: string
  coincide: boolean
}

/**
 * Divide un texto en segmentos para resaltar la parte que coincide con la
 * consulta. Si no hay coincidencia literal (típico en matches difusos),
 * devuelve el texto completo sin resaltar.
 */
export function dividirPorCoincidencia(texto: string, consulta: string): SegmentoTexto[] {
  const termino = normalizarTexto(consulta.trim())
  if (!termino) return [{ texto, coincide: false }]

  const indice = normalizarTexto(texto).indexOf(termino)
  if (indice < 0) return [{ texto, coincide: false }]

  return [
    { texto: texto.slice(0, indice), coincide: false },
    { texto: texto.slice(indice, indice + termino.length), coincide: true },
    { texto: texto.slice(indice + termino.length), coincide: false },
  ].filter((segmento) => segmento.texto.length > 0)
}

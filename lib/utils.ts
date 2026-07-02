// ─────────────────────────────────────────────────────
// lib/utils.ts
// Funciones utilitarias reutilizables
// ─────────────────────────────────────────────────────

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { EstadoPedido, TipoEntrega } from '@/tipos'
import { obtenerSiguienteEstado as siguienteEstadoPorTipo } from '@/lib/entrega'

/** Combina clases de Tailwind evitando conflictos */
export function cn(...entradas: ClassValue[]) {
  return twMerge(clsx(entradas))
}

/** @deprecated Preferir lib/entrega con tipoEntrega */
export function obtenerSiguienteEstado(
  estadoActual: EstadoPedido,
  tipoEntrega: TipoEntrega = 'delivery'
): EstadoPedido | null {
  return siguienteEstadoPorTipo(estadoActual, tipoEntrega)
}

/** Formatea un número como precio en pesos argentinos */
export function formatearPrecio(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(valor)
}

/** Genera un ID único para pedidos nuevos */
export function generarId(): string {
  return `ped-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

/** Genera un ID único para productos dentro de un formulario */
export function generarIdProducto(): string {
  return `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

export const BLUR_DATA_URL_DEFAULT = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMyMjIyMjIiLz48L3N2Zz4="

/**
 * Optimiza URLs de imágenes (Cloudinary y generales) reduciendo peso y formato
 */
export function optimizarUrlImagen(url: string, ancho: number = 300): string {
  if (!url) return ''
  const limpia = url.trim()

  if (limpia.includes('res.cloudinary.com') && limpia.includes('/upload/')) {
    const partes = limpia.split('/upload/')
    let resto = partes[1]
    // Limpiamos transformaciones previas (ej. f_auto,q_auto,w_800/ o w_500,h_500/) para que no se encadenen o contradigan
    resto = resto.replace(/^([^/]+\/)*(v\d+\/)/, '$2')
    if (/^(?:[a-z]_[^/]+,)*[a-z]_[^/]+\//i.test(resto)) {
      resto = resto.replace(/^[^/]+\//, '')
    }
    return `${partes[0]}/upload/f_auto,q_auto,w_${ancho},c_limit/${resto}`
  }

  return limpia
}

/**
 * Genera una URL de blur ultraliviana (o base64 por defecto) para placeholder de carga
 */
export function generarBlurUrl(url: string): string {
  if (!url) return BLUR_DATA_URL_DEFAULT
  const limpia = url.trim()
  if (limpia.includes('res.cloudinary.com') && limpia.includes('/upload/')) {
    const partes = limpia.split('/upload/')
    let resto = partes[1]
    resto = resto.replace(/^([^/]+\/)*(v\d+\/)/, '$2')
    if (/^(?:[a-z]_[^/]+,)*[a-z]_[^/]+\//i.test(resto)) {
      resto = resto.replace(/^[^/]+\//, '')
    }
    return `${partes[0]}/upload/w_20,e_blur:1000,q_10,f_auto/${resto}`
  }
  return BLUR_DATA_URL_DEFAULT
}

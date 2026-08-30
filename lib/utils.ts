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
 * Optimiza URLs de imágenes (Cloudinary, Supabase Storage, Unsplash, Google) reduciendo peso y formato
 */
export function optimizarUrlImagen(url: string, ancho: number = 300): string {
  if (!url) return ''
  const limpia = url.trim()

  // 1. Cloudinary
  if (limpia.includes('res.cloudinary.com') && limpia.includes('/upload/')) {
    const partes = limpia.split('/upload/')
    let resto = partes[1]
    resto = resto.replace(/^([^/]+\/)*(v\d+\/)/, '$2')
    if (/^(?:[a-z]_[^/]+,)*[a-z]_[^/]+\//i.test(resto)) {
      resto = resto.replace(/^[^/]+\//, '')
    }
    return `${partes[0]}/upload/f_auto,q_auto,w_${ancho},c_limit/${resto}`
  }

  // 2. Supabase Storage (Transformación dinámica on-the-fly)
  if (limpia.includes('.supabase.co/storage/v1/')) {
    let baseUrl = limpia
    // Si apunta al endpoint crudo object/public, pasamos a render/image/public
    if (baseUrl.includes('/object/public/')) {
      baseUrl = baseUrl.replace('/object/public/', '/render/image/public/')
    }
    const separador = baseUrl.includes('?') ? '&' : '?'
    // Limpiamos query params previos de width/quality si existían
    const urlLimpiaParams = baseUrl.replace(/[?&](width|quality|resize)=[^&]*/g, '')
    const sepFinal = urlLimpiaParams.includes('?') ? '&' : '?'
    return `${urlLimpiaParams}${sepFinal}width=${ancho}&quality=80&resize=contain`
  }

  // 3. Unsplash
  if (limpia.includes('images.unsplash.com')) {
    const separador = limpia.includes('?') ? '&' : '?'
    return `${limpia}${separador}w=${ancho}&q=80&auto=format`
  }

  // 4. Google Drive / LH3 CDN
  if (limpia.includes('lh3.googleusercontent.com/d/')) {
    const base = limpia.split('=')[0]
    return `${base}=w${ancho}-rw`
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

  if (limpia.includes('.supabase.co/storage/v1/')) {
    let baseUrl = limpia.replace('/object/public/', '/render/image/public/')
    const urlLimpiaParams = baseUrl.replace(/[?&](width|quality|resize)=[^&]*/g, '')
    const sepFinal = urlLimpiaParams.includes('?') ? '&' : '?'
    return `${urlLimpiaParams}${sepFinal}width=20&quality=10&resize=contain`
  }

  return BLUR_DATA_URL_DEFAULT
}

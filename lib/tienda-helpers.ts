// ─────────────────────────────────────────────────────
// lib/tienda-helpers.ts
// Funciones helper puras de la tienda (sin estado React).
// Extraídas de page.tsx para reutilizarse en múltiples componentes.
// ─────────────────────────────────────────────────────

import { metadataRespaldo } from '@/datos/productos'

// --- VALIDACIÓN Y RESOLUCIÓN DE IMÁGENES ---

/**
 * Valida si una URL es una imagen propia cargada por el negocio (Supabase, Cloudinary, Drive, etc.).
 * Rechaza URLs nulas, vacías, de stock de Unsplash, placeholders de prueba y base64 corruptos.
 */
export function esImagenValida(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false
  const limpia = url.trim()
  if (!limpia) return false
  const lower = limpia.toLowerCase()
  if (
    lower.includes('unsplash.com') ||
    lower.includes('ly8iup') ||
    lower.includes('placeholder') ||
    lower.includes('sacandole-fotos') ||
    lower.startsWith('data:')
  ) {
    return false
  }
  return true
}

/**
 * Resuelve la imagen final de un producto. Si no tiene foto propia válida, retorna '' (vacío)
 * para que se muestre el logo/icono oficial de Chefsy para productos sin imagen.
 */
export function resolverImagen(imagenUrl: string | null | undefined, fallback?: string): string {
  if (esImagenValida(imagenUrl)) {
    return imagenUrl!.trim()
  }
  if (fallback && esImagenValida(fallback)) {
    return fallback.trim()
  }
  return ''
}

// --- DESCRIPCIONES E IMÁGENES COMPLEMENTARIAS DE PRODUCTOS ---
export const OBTENER_DETALLES_COMPLEMENTARIOS = (categoriaId: string, nombre: string, idProducto?: string) => {
  if (idProducto && metadataRespaldo[idProducto]) {
    const meta = metadataRespaldo[idProducto]
    if (meta.descripcion_publica || esImagenValida(meta.imagen_url)) {
      return {
        desc: meta.descripcion_publica || '',
        img: esImagenValida(meta.imagen_url) ? meta.imagen_url.trim() : ''
      }
    }
  }
  const foundMeta = Object.entries(metadataRespaldo).find(([k, v]) => k.startsWith(categoriaId) && v.nombre_publico?.toLowerCase().trim() === nombre.toLowerCase().trim())?.[1]
  if (foundMeta && (foundMeta.descripcion_publica || esImagenValida(foundMeta.imagen_url))) {
    return {
      desc: foundMeta.descripcion_publica || '',
      img: esImagenValida(foundMeta.imagen_url) ? foundMeta.imagen_url.trim() : ''
    }
  }

  // Sin foto genérica de stock ni IA — devuelve imagen vacía para usar el logo de producto sin imagen
  return {
    desc: '',
    img: ''
  }
}

// --- DETALLES DE CATEGORÍAS (EMOJIS Y DESCRIPCIONES DE ENCABEZADO) ---
export const OBTENER_DETALLES_CATEGORIA = (catId: string) => {
  switch (catId) {
    case 'todos': 
      return { nombre: 'Nuestro Menú', subtitulo: 'Elegí, personalizá y pedí 🔥', icono: '/burger-icon.png' }
    case 'lomos':
    case 'milas':
    case 'cat-1780506096615':
      return { nombre: 'Lomos', subtitulo: 'Sándwiches gigantes con papas fritas', icono: '/lomos-icon.png' }
    case 'lomos-y-milas': 
      return { nombre: 'Milas', subtitulo: 'Milanesas completas con papas fritas', icono: '/lomos-icon.png' }
    case 'zapping': 
      return { nombre: 'Zapping', subtitulo: 'Tostados gigantes rellenos', icono: '/zapping-icon.png' }
    case 'patys': 
    case 'cat-1781570568487':
      return { nombre: 'Burgers / Patys', subtitulo: 'Con papas crujientes y aderezo especial', icono: '/patys-icon.png' }
    case 'pizzas': 
      return { nombre: 'Pizzas', subtitulo: 'Masa casera cocida al horno de piedra', icono: '/pizzas-icon.png' }
    case 'choripan': 
      return { nombre: 'Choripanes', subtitulo: 'Chorizos premium en pan de campo crocante', icono: '/choripan-icon.png' }
    case 'mila-al-plato': 
      return { nombre: 'Mila al Plato', subtitulo: 'Milanesas abundantes para compartir', icono: '/mila-plato-icon.png' }
    case 'tartas-xl': 
      return { nombre: 'Tartas XL', subtitulo: 'Tartas saladas con masa de hojaldre casera', icono: '/tartas-icon.png' }
    case 'bebidas': 
      return { nombre: 'Bebidas', subtitulo: 'Refrescos, aguas y latas de cerveza heladas', icono: '/bebidas-icon.png' }
    case 'promos': 
      return { nombre: 'Promos', subtitulo: 'Los combos perfectos para ahorrar y compartir', icono: '/promos-icon.png' }
    case 'porciones-de-papas':
    case 'porciones_de_papas':
    case 'papas':
    case 'papas-fritas':
    case 'papas_fritas':
    case 'cat-1781574714354':
      return { nombre: 'Porciones de Papas', subtitulo: 'Crujientes y doradas, ideales para compartir', icono: '/papas-icon.png' }
    default: 
      return { nombre: 'Menú Especial', subtitulo: 'Platos frescos de la cocina', icono: '/especial-icon.png' }
  }
}

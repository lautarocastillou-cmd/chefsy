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
      const primeraImg = (meta.imagen_url || '').split('|')[0].trim()
      return {
        desc: meta.descripcion_publica || '',
        img: esImagenValida(primeraImg) ? primeraImg : ''
      }
    }
  }
  const foundMeta = Object.entries(metadataRespaldo).find(([k, v]) => k.startsWith(categoriaId) && v.nombre_publico?.toLowerCase().trim() === nombre.toLowerCase().trim())?.[1]
  if (foundMeta && (foundMeta.descripcion_publica || esImagenValida(foundMeta.imagen_url))) {
    const primeraImg = (foundMeta.imagen_url || '').split('|')[0].trim()
    return {
      desc: foundMeta.descripcion_publica || '',
      img: esImagenValida(primeraImg) ? primeraImg : ''
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
      return { nombre: 'Nuestro Menú', subtitulo: 'Elegí, personalizá y hacé tu pedido', icono: '/burger-icon.png' }
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

// --- NAVEGACIÓN Y SCROLL EXACTO A CATEGORÍAS ---

/**
 * Desplaza suavemente la ventana hacia la categoría indicada en el catálogo,
 * compensando la cabecera fija/sticky para que el título de la categoría
 * y sus productos queden perfectamente visibles al inicio de la pantalla.
 */
export function scrollHaciaCategoria(catId: string | null) {
  if (typeof window === 'undefined') return

  // Asegurar que el scroll del body no esté bloqueado
  if (document.body.style.overflow === 'hidden') {
    document.body.style.overflow = ''
    document.documentElement.style.overflow = ''
  }

  // 1. Si es null o 'todos', scrollear suavemente al inicio absoluto
  if (!catId || catId === 'todos') {
    const lenis = (window as any).__lenis
    if (lenis && typeof lenis.scrollTo === 'function') {
      lenis.scrollTo(0, { duration: 0.8, force: true })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    return
  }

  // 2. Localizar el elemento contenedor de la sección de la categoría
  let el = document.getElementById(catId)

  // Búsqueda inteligente por alias si el id no coincide directamente
  if (!el) {
    const idLower = catId.toLowerCase()
    if (idLower.includes('papa')) {
      el = document.getElementById('cat-1781574714354') || 
           document.getElementById('papas') || 
           document.getElementById('porciones-de-papas') ||
           (document.querySelector('[id*="papa"]') as HTMLElement | null)
    } else if (idLower.includes('mila-al-plato') || idLower.includes('mila al plato') || (idLower.includes('mila') && idLower.includes('plato'))) {
      el = document.getElementById('mila-al-plato') || 
           (document.querySelector('[id*="mila-al-plato"], [id*="plato"]') as HTMLElement | null)
    } else if (idLower.includes('burger') || idLower.includes('paty')) {
      el = document.getElementById('patys') || 
           document.getElementById('cat-1781570568487') ||
           (document.querySelector('[id*="burger"], [id*="paty"]') as HTMLElement | null)
    } else if (idLower.includes('lomo')) {
      el = document.getElementById('cat-1780506096615') ||
           document.getElementById('lomos') ||
           (document.querySelector('[id*="lomo"]') as HTMLElement | null)
    } else if (idLower.includes('pizza')) {
      el = document.getElementById('pizzas') || 
           (document.querySelector('[id*="pizza"]') as HTMLElement | null)
    } else if (idLower.includes('bebida')) {
      el = document.getElementById('bebidas') || 
           (document.querySelector('[id*="bebida"]') as HTMLElement | null)
    } else if (idLower.includes('promo')) {
      el = document.getElementById('promos') || 
           (document.querySelector('[id*="promo"]') as HTMLElement | null)
    } else if (idLower.includes('tarta')) {
      el = document.getElementById('tartas-xl') ||
           (document.querySelector('[id*="tarta"]') as HTMLElement | null)
    } else if (idLower.includes('zapping')) {
      el = document.getElementById('zapping') ||
           (document.querySelector('[id*="zapping"]') as HTMLElement | null)
    }
  }

  // Si todavía no se encuentra, buscar por coincidencia en el texto del h3
  if (!el) {
    const todosH3 = Array.from(document.querySelectorAll('.categoria-seccion h3, h3')) as HTMLElement[]
    const targetH3 = todosH3.find(h3 => h3.textContent?.trim().toLowerCase().includes(catId.toLowerCase()))
    if (targetH3) {
      el = (targetH3.closest('.categoria-seccion') as HTMLElement) || targetH3
    }
  }

  if (!el) return

  // 3. Localizar el título h3 exacto de la categoría (o el elemento contenedor)
  const targetTitle = (el.querySelector('h3') || el) as HTMLElement

  // 4. Medir dinámicamente la altura real de la cabecera sticky si está presente
  const isMobile = window.innerWidth < 768
  const stickyHeader = document.getElementById('tienda-sticky-header') || 
                       (document.querySelector('.sticky.top-0, header.sticky, [class*="sticky top-0"]') as HTMLElement | null)
  let headerHeight = 0
  if (stickyHeader) {
    const headerRect = stickyHeader.getBoundingClientRect()
    // Solo se computa si está ubicado en el margen superior del viewport
    if (headerRect.top <= 10) {
      headerHeight = Math.round(headerRect.height)
    }
  }

  // Margen estético para que el título respire justo debajo de la barra o del borde
  const margenRespirable = isMobile ? 12 : 24

  // 5. Coordenada absoluta del título invariante tanto al subir como al bajar
  const currentScroll = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0
  const titleRect = targetTitle.getBoundingClientRect()
  const absoluteTitleTop = currentScroll + titleRect.top

  // targetY exacto donde debe aterrizar el scroll
  const targetY = Math.max(0, Math.round(absoluteTitleTop - headerHeight - margenRespirable))

  // 6. Ejecutar scroll suave (utilizando Lenis si está activo o nativo)
  const lenis = (window as any).__lenis
  if (lenis && typeof lenis.scrollTo === 'function') {
    lenis.scrollTo(targetY, { duration: 0.85, force: true })
  } else {
    window.scrollTo({ top: targetY, behavior: 'smooth' })
  }
}


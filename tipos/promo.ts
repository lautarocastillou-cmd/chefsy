import { ModificadorCatalogo, ProductoCatalogo } from '@/tipos/catalogo'

export interface PromoPopupConfig {
  activo: boolean
  titulo?: string
  subtitulo?: string
  descripcion?: string
  badge?: string
  productos_ids?: string[]
  bebidas?: string[]
}

export const MOD_PROMO_FANTA: ModificadorCatalogo = {
  id: 'promo-regalo-fanta-375',
  nombre: 'Bebida de regalo: Fanta 375cc',
  precioExtra: 0,
}

export const MOD_PROMO_SPRITE: ModificadorCatalogo = {
  id: 'promo-regalo-sprite-375',
  nombre: 'Bebida de regalo: Sprite 375cc',
  precioExtra: 0,
}

// Compatibilidad con pedidos ya creados con Coca
export const MOD_PROMO_COCA: ModificadorCatalogo = {
  id: 'promo-regalo-coca-375',
  nombre: 'Bebida de regalo: Coca-Cola 375cc',
  precioExtra: 0,
}

export const PROMO_POPUP_DEFAULT: PromoPopupConfig = {
  activo: true,
  titulo: 'PROMO DE HOY',
  subtitulo: 'Bebida sin cargo',
  descripcion: 'Comprando cualquier Burger, Lomo o Mila individual de la carta, sumás una Fanta o Sprite de 375cc de regalo (no incluye combos ni promos).',
  badge: '',
  productos_ids: ['patys-especial', 'prod-1780506120462-538', 'lomos-y-milas-especial'],
  bebidas: ['Fanta 375cc', 'Sprite 375cc'],
}

/**
 * Determina si un producto aplica a la promoción de bebida de regalo (Fanta o Sprite 375cc).
 * Aplica a cualquier burger, lomo o mila individual de la carta.
 * Excluye explícitamente combos y promociones (ej: "2 BURGERS", "BURGER + COCA", combos, etc.).
 */
export function esProductoPromo(
  productoOrId?: ProductoCatalogo | string,
  nombre?: string | boolean,
  configPromoActiva: boolean = true,
  esCombo?: boolean,
  categoriaId?: string
): boolean {
  let id = ''
  let nom = ''
  let cat = ''
  let combo = false
  let activo = true

  if (typeof productoOrId === 'object' && productoOrId !== null) {
    id = (productoOrId.id || '').toLowerCase().trim()
    nom = (productoOrId.nombre || '').toLowerCase().trim()
    cat = (productoOrId.categoriaId || '').toLowerCase().trim()
    combo = productoOrId.esCombo === true
    activo = typeof nombre === 'boolean' ? nombre : configPromoActiva
  } else {
    id = (productoOrId || '').toLowerCase().trim()
    nom = (typeof nombre === 'string' ? nombre : '').toLowerCase().trim()
    cat = (categoriaId || '').toLowerCase().trim()
    combo = esCombo === true
    activo = typeof configPromoActiva === 'boolean' ? configPromoActiva : true
  }

  if (!activo) return false
  if (!id && !nom) return false

  // 1. Si está marcado como combo, NO califica (solo individuales)
  if (combo) return false

  // 2. Exclusiones explícitas de combos / promociones por patrón de texto en el nombre
  if (
    nom.includes('+') ||
    nom.includes('combo') ||
    nom.includes('promo') ||
    nom.includes('2x1') ||
    nom.includes('x2') ||
    /^\s*[1-9]\s+/i.test(nom) || // Empieza con número (ej: "2 BURGERS", "1 LOMO", "2 CHEESE")
    /\b(2|dos)\s+(burgers?|patys?|lomos?|milas?|cheese)/i.test(nom)
  ) {
    return false
  }

  // 3. Exclusión por categorías que no corresponden a burgers, lomos ni milas
  const catsExcluidas = ['zapping', 'pizzas', 'tartas-xl', 'bebidas', 'cat-1781574714354']
  if (cat && catsExcluidas.includes(cat)) {
    return false
  }

  // 4. Inclusión directa por categorías reconocidas de burgers, patys, lomos y milas
  const catsValidas = [
    'patys',               // Burgers
    'cat-1781570568487',   // Patys
    'cat-1780506096615',   // Lomos
    'lomos-y-milas',       // Milas
    'mila-al-plato',       // Mila al plato
    'hamburguesas',        // Hamburguesas
  ]

  if (cat && catsValidas.includes(cat)) {
    return true
  }

  // 5. Inclusión por coincidencia léxica en nombre o id si no vino categoría o es genérica
  const palabrasValidas = ['burger', 'paty', 'lomo', 'lomito', 'mila']
  return palabrasValidas.some((p) => nom.includes(p) || id.includes(p))
}

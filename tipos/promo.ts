import { ModificadorCatalogo } from '@/tipos/catalogo'

export interface PromoPopupConfig {
  activo: boolean
  titulo?: string
  subtitulo?: string
  descripcion?: string
  badge?: string
  productos_ids?: string[]
  bebidas?: string[]
}

export const MOD_PROMO_COCA: ModificadorCatalogo = {
  id: 'promo-regalo-coca-375',
  nombre: '🎁 Regalo: Coca-Cola 375cc',
  precioExtra: 0,
}

export const MOD_PROMO_SPRITE: ModificadorCatalogo = {
  id: 'promo-regalo-sprite-375',
  nombre: '🎁 Regalo: Sprite 375cc',
  precioExtra: 0,
}

export const PROMO_POPUP_DEFAULT: PromoPopupConfig = {
  activo: true,
  titulo: 'PROMO DE HOY',
  subtitulo: '¡Te regalamos la bebida!',
  descripcion: 'Comprando una Burger Especial o un Lomito de Pollo, ¡te llevás una Coca-Cola o Sprite de 375cc de regalo!',
  badge: 'SOLO POR HOY',
  productos_ids: ['patys-especial', 'prod-1779840756425-936'],
  bebidas: ['Coca-Cola 375cc', 'Sprite 375cc'],
}

export function esProductoPromo(productoId?: string, nombre?: string): boolean {
  if (!productoId && !nombre) return false
  const id = (productoId || '').toLowerCase().trim()
  const nom = (nombre || '').toLowerCase().trim()

  // Evitar falsos positivos en combos que ya tienen bebida en el nombre como "BURGER ESPECIAL + COCA 375ml"
  if (nom.includes('+') || nom.includes('2 burgers')) return false

  return (
    id === 'patys-especial' ||
    id === 'prod-1779840756425-936' ||
    nom === 'burger especial' ||
    nom === 'lomito de pollo' ||
    nom.includes('burger especial') ||
    nom.includes('lomito de pollo') ||
    nom === 'paty especial'
  )
}

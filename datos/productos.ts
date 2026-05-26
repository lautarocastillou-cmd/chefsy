// ─────────────────────────────────────────────────────
// datos/productos.ts
// Catálogo centralizado de productos Chefsy.
// Fuente única de verdad para nombres y precios base.
// ─────────────────────────────────────────────────────

import { CategoriaCatalogo, ProductoCatalogo, ModificadorCatalogo } from '@/tipos/catalogo'

// ── Categorías ───────────────────────────────────────

export const categoriasCatalogo: CategoriaCatalogo[] = [
  { id: 'lomos-y-milas',  nombre: 'Lomos y Milas',  orden: 1,  activa: true },
  { id: 'zapping',        nombre: 'Zapping',        orden: 2,  activa: true },
  { id: 'patys',          nombre: 'Patys',          orden: 3,  activa: true },
  { id: 'pizzas',         nombre: 'Pizzas',         orden: 4,  activa: true },
  { id: 'choripan',       nombre: 'Choripán',       orden: 5,  activa: true },
  { id: 'mila-al-plato',  nombre: 'Mila al Plato',  orden: 6,  activa: true },
  { id: 'tartas-xl',      nombre: 'Tartas XL',      orden: 7,  activa: true },
  { id: 'bebidas',        nombre: 'Bebidas',        orden: 8,  activa: true },
  { id: 'promos',         nombre: 'Promos',         orden: 9,  activa: true },
]

// ── Sándwiches: misma variedad, distinto precio por categoría ──

const variedadesSandwich = [
  { slug: 'comun',    nombre: 'Común' },
  { slug: 'especial', nombre: 'Especial' },
  { slug: 'chefsy',   nombre: 'Chefsy' },
  { slug: 'american', nombre: 'American' },
  { slug: '4-quesos', nombre: '4 Quesos' },
] as const

const preciosSandwich: Record<string, Record<string, number>> = {
  'lomos-y-milas': {
    comun: 10500, especial: 11500, chefsy: 13500, american: 13000, '4-quesos': 11500,
  },
  zapping: {
    comun: 10000, especial: 11000, chefsy: 13000, american: 12500, '4-quesos': 12000,
  },
  patys: {
    comun: 8000, especial: 8500, chefsy: 10000, american: 9500, '4-quesos': 9000,
  },
}

// ── Resto del menú: productos propios por categoría ──

type ItemCatalogo = { slug: string; nombre: string; precio: number; esCombo?: boolean }

const productosPorCategoria: Record<string, ItemCatalogo[]> = {
  pizzas: [
    { slug: 'muzzarella',  nombre: 'Muzzarella',  precio: 9000 },
    { slug: 'especial',    nombre: 'Especial',    precio: 10000 },
    { slug: 'napolitana',  nombre: 'Napolitana',  precio: 10000 },
    { slug: 'fugazzeta',   nombre: 'Fugazzeta',   precio: 10000 },
    { slug: 'calabresa',   nombre: 'Calabresa',   precio: 11000 },
    { slug: 'roquefort',   nombre: 'Roquefort',   precio: 11000 },
    { slug: '4-quesos',    nombre: '4 Quesos',    precio: 11000 },
    { slug: 'argentina',   nombre: 'Argentina',   precio: 13000 },
  ],
  choripan: [
    { slug: 'comun',         nombre: 'Común',         precio: 7500 },
    { slug: 'a-la-pomarola', nombre: 'A la pomarola', precio: 8500 },
  ],
  'mila-al-plato': [
    { slug: 'napolitana-con-papas', nombre: 'Napolitana con papas', precio: 9500 },
    { slug: 'a-caballo-con-papas',  nombre: 'A caballo con papas',  precio: 9500 },
  ],
  'tartas-xl': [
    { slug: 'jamon-y-muzza',  nombre: 'Jamón y Muzza',  precio: 6000 },
    { slug: 'salame-y-muzza', nombre: 'Salame y Muzza', precio: 7000 },
  ],
  bebidas: [
    { slug: 'coca-fanta-sprite-375', nombre: 'Coca / Fanta / Sprite 375cc', precio: 2000 },
    { slug: 'aquarius-375',          nombre: 'Aquarius 375cc',              precio: 2000 },
    { slug: 'agua-500',              nombre: 'Agua mineral 500cc',          precio: 2000 },
    { slug: 'coca-fanta-sprite-15',  nombre: 'Coca / Fanta / Sprite 1.5lts', precio: 4500 },
    { slug: 'aquarius-15',           nombre: 'Aquarius 1.5lts',             precio: 3500 },
    { slug: 'agua-15',               nombre: 'Agua mineral 1.5lts',         precio: 3000 },
    { slug: 'coca-fanta-sprite-225', nombre: 'Coca / Fanta / Sprite 2.25lts', precio: 5500 },
    { slug: 'cerveza-lata-500',      nombre: 'Cerveza lata 500cc',          precio: 2500 },
    { slug: 'cerveza-laton-710',     nombre: 'Cerveza latón 710cc',         precio: 3500 },
  ],
  promos: [
    { slug: 'promo-2-lomos',         nombre: 'Promo: 2 Lomos Completos + Gaseosa 1.5L', precio: 22000, esCombo: true },
    { slug: 'promo-pizza-cerveza',   nombre: 'Promo: Pizza Especial + Cerveza 710cc',   precio: 11500, esCombo: true },
  ],
}

function construirProductosSandwich(): ProductoCatalogo[] {
  const lista: ProductoCatalogo[] = []
  const idsSandwich = ['lomos-y-milas', 'zapping', 'patys'] as const

  for (const categoriaId of idsSandwich) {
    const precios = preciosSandwich[categoriaId]
    for (const variedad of variedadesSandwich) {
      lista.push({
        id: `${categoriaId}-${variedad.slug}`,
        categoriaId,
        nombre: variedad.nombre,
        precio: precios[variedad.slug],
        activo: true,
      })
    }
  }

  return lista
}

function construirProductosMenu(): ProductoCatalogo[] {
  const lista: ProductoCatalogo[] = []

  for (const [categoriaId, items] of Object.entries(productosPorCategoria)) {
    for (const item of items) {
      lista.push({
        id: `${categoriaId}-${item.slug}`,
        categoriaId,
        nombre: item.nombre,
        precio: item.precio,
        activo: true,
        esCombo: item.esCombo,
      })
    }
  }

  return lista
}

export const productosCatalogo: ProductoCatalogo[] = [
  ...construirProductosSandwich(),
  ...construirProductosMenu(),
]

export const modificadoresCatalogo: ModificadorCatalogo[] = [
  { id: 'mod-huevo',          nombre: 'Extra Huevo',          precioExtra: 500 },
  { id: 'mod-queso',          nombre: 'Extra Queso',          precioExtra: 800 },
  { id: 'mod-bacon',          nombre: 'Extra Bacon',          precioExtra: 1000 },
  { id: 'mod-papas',          nombre: 'Extra Papas Fritas',   precioExtra: 1200 },
  { id: 'mod-sin-cebolla',    nombre: 'Sin Cebolla',          precioExtra: 0 },
  { id: 'mod-sin-aderezo',    nombre: 'Sin Aderezos',         precioExtra: 0 },
]

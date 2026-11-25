// ─────────────────────────────────────────────────────
// lib/promo-flash.ts
// Motor puro de la Promo Flash "Burger Cheese a $5.000 — SOLO POR HOY".
// Incluye tipos, valores por defecto, sanitización, detección de ítems,
// conteo de unidades vendidas y evaluación automática de vencimiento/límite.
// ─────────────────────────────────────────────────────

import type { ProductoCatalogo } from '@/tipos/catalogo'

export const PROMO_FLASH_PRODUCTO_ID = 'promo-flash-burger-cheese-5000'
export const PROMO_FLASH_PRECIO_DEFAULT = 5000
export const PROMO_FLASH_PRECIO_REGULAR_DEFAULT = 8500
export const PROMO_FLASH_LIMITE_DEFAULT = 30
export const PROMO_FLASH_MAX_POR_PEDIDO_DEFAULT = 3

/** Fecha de lanzamiento por defecto (hoy en Argentina, YYYY-MM-DD). */
export function obtenerFechaHoyArgentinaSimple(ref: Date = new Date()): string {
  const utc = ref.getTime() + ref.getTimezoneOffset() * 60000
  const arg = new Date(utc - 3 * 3600000)
  if (arg.getHours() < 5) {
    arg.setDate(arg.getDate() - 1)
  }
  const anio = arg.getFullYear()
  const mes = String(arg.getMonth() + 1).padStart(2, '0')
  const dia = String(arg.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

export interface ConfiguracionPromoFlash {
  id: string
  activa: boolean
  /** Fecha de negocio YYYY-MM-DD en la que rige (solo por hoy). */
  fechaVigencia: string
  titulo: string
  subtitulo: string
  badge: string
  nombreProducto: string
  descripcionProducto: string
  imagenUrl: string
  precioPromo: number
  precioRegular: number
  /** Cantidad total máxima de hamburguesas promo permitidas; al superarla se desactiva sola. */
  limiteTotal: number
  /** Máximo de unidades promo que un cliente puede llevar en un solo pedido. */
  maxPorPedido: number
  desactivadaAutomaticamente: boolean
  agotadaEn?: string
  updatedAt: string
}

export type MotivoEstadoPromoFlash =
  | 'activa'
  | 'pausada'
  | 'agotada'
  | 'vencida'

export interface EstadoPromoFlash {
  disponible: boolean
  agotada: boolean
  vencida: boolean
  motivo: MotivoEstadoPromoFlash
  vendidas: number
  restantes: number
  porcentajeConsumido: number
  fechaHoy: string
  config: ConfiguracionPromoFlash
}

export function crearConfiguracionPromoFlashDefault(
  fechaHoy: string = obtenerFechaHoyArgentinaSimple()
): ConfiguracionPromoFlash {
  return {
    id: PROMO_FLASH_PRODUCTO_ID,
    activa: true,
    fechaVigencia: fechaHoy,
    titulo: 'BURGER CHEESE A $5.000',
    subtitulo: '¡Locura cheddar solo por hoy! Pan de papa artesanal, medallón smash jugoso y doble cheddar fundido.',
    badge: 'SOLO POR HOY',
    nombreProducto: 'Promo Burger Cheese ($5.000)',
    descripcionProducto: 'Medallón smash jugoso + doble cheddar fundido en pan de papa. ¡Edición limitada solo por hoy!',
    imagenUrl: '/burger-loca.webp',
    precioPromo: PROMO_FLASH_PRECIO_DEFAULT,
    precioRegular: PROMO_FLASH_PRECIO_REGULAR_DEFAULT,
    limiteTotal: PROMO_FLASH_LIMITE_DEFAULT,
    maxPorPedido: PROMO_FLASH_MAX_POR_PEDIDO_DEFAULT,
    desactivadaAutomaticamente: false,
    updatedAt: '',
  }
}

function limpiarTexto(valor: unknown, max: number, fallback: string): string {
  if (typeof valor !== 'string') return fallback
  const limpio = valor.replace(/\s+/g, ' ').trim()
  return limpio ? limpio.slice(0, max) : fallback
}

function esFechaYmd(valor: unknown): valor is string {
  return typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor.trim())
}

function sanitizarEntero(valor: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(valor))
  if (!Number.isFinite(n) || n < min || n > max) return fallback
  return n
}

function esUrlImagenSegura(valor: unknown): valor is string {
  if (typeof valor !== 'string') return false
  const v = valor.trim()
  if (!v || v.length > 1024) return false
  if (v.startsWith('/')) return !v.startsWith('//')
  try {
    const u = new URL(v)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

export function normalizarConfiguracionPromoFlash(
  entrada: any,
  fechaHoy: string = obtenerFechaHoyArgentinaSimple()
): ConfiguracionPromoFlash {
  const base = crearConfiguracionPromoFlashDefault(fechaHoy)
  if (!entrada || typeof entrada !== 'object') return base

  const precioPromo = sanitizarEntero(entrada.precioPromo, 500, 500000, base.precioPromo)
  const precioRegularRaw = sanitizarEntero(entrada.precioRegular, precioPromo, 500000, base.precioRegular)
  const limiteTotal = sanitizarEntero(entrada.limiteTotal, 1, 1000, base.limiteTotal)
  const maxPorPedido = sanitizarEntero(entrada.maxPorPedido, 1, Math.min(20, limiteTotal), base.maxPorPedido)

  return {
    id: PROMO_FLASH_PRODUCTO_ID,
    activa: entrada.activa !== false,
    fechaVigencia: esFechaYmd(entrada.fechaVigencia) ? entrada.fechaVigencia.trim() : base.fechaVigencia,
    titulo: limpiarTexto(entrada.titulo, 70, base.titulo),
    subtitulo: limpiarTexto(entrada.subtitulo, 180, base.subtitulo),
    badge: limpiarTexto(entrada.badge, 32, base.badge),
    nombreProducto: limpiarTexto(entrada.nombreProducto, 80, base.nombreProducto),
    descripcionProducto: limpiarTexto(entrada.descripcionProducto, 200, base.descripcionProducto),
    imagenUrl: esUrlImagenSegura(entrada.imagenUrl) ? entrada.imagenUrl.trim() : base.imagenUrl,
    precioPromo,
    precioRegular: Math.max(precioRegularRaw, precioPromo),
    limiteTotal,
    maxPorPedido: Math.min(maxPorPedido, limiteTotal),
    desactivadaAutomaticamente: entrada.desactivadaAutomaticamente === true,
    agotadaEn: typeof entrada.agotadaEn === 'string' && entrada.agotadaEn.trim() ? entrada.agotadaEn.trim() : undefined,
    updatedAt: typeof entrada.updatedAt === 'string' && entrada.updatedAt.trim() ? entrada.updatedAt.trim() : '',
  }
}

/** Determina si un ítem de pedido corresponde a la Promo Flash Burger Cheese. */
export function esItemPromoFlash(item: any): boolean {
  if (!item || typeof item !== 'object') return false
  const idCat = typeof item.idCatalogo === 'string' ? item.idCatalogo.trim().toLowerCase() : ''
  const id = typeof item.id === 'string' ? item.id.trim().toLowerCase() : ''
  const nombre = typeof item.nombre === 'string' ? item.nombre.trim().toLowerCase() : ''

  if (idCat === PROMO_FLASH_PRODUCTO_ID || id === PROMO_FLASH_PRODUCTO_ID) return true
  if (id.startsWith(`${PROMO_FLASH_PRODUCTO_ID}-`)) return true
  if (nombre.includes('promo burger cheese')) return true
  return false
}

/** Suma cuántas unidades de la Promo Flash se vendieron en una lista de pedidos (ignorando cancelados y de prueba). */
export function contarUnidadesPromoFlashEnPedidos(pedidos: Array<any>): number {
  let total = 0
  for (const pedido of pedidos) {
    if (!pedido || typeof pedido !== 'object') continue
    const estado = String(pedido.estado || '').toLowerCase()
    if (estado === 'cancelado' || estado === 'anulado') continue
    if (pedido.es_prueba === true || pedido.turno_tipo === 'prueba') continue

    const items = Array.isArray(pedido.productos) ? pedido.productos : []
    for (const item of items) {
      if (!esItemPromoFlash(item)) continue
      const cant = Math.max(0, Math.floor(Number(item.cantidad) || 0))
      total += cant
    }
  }
  return total
}

/** Suma cuántas unidades de la Promo Flash hay dentro de un único pedido o carrito. */
export function contarUnidadesPromoFlashEnItems(items: Array<any>): number {
  let total = 0
  for (const item of items) {
    if (!esItemPromoFlash(item)) continue
    total += Math.max(0, Math.floor(Number(item.cantidad) || 0))
  }
  return total
}

/** Evalúa el estado en vivo de la promo combinando fecha de vigencia, toggle manual y cupo consumido. */
export function evaluarEstadoPromoFlash(
  config: ConfiguracionPromoFlash,
  vendidasRaw: number,
  fechaHoy: string = obtenerFechaHoyArgentinaSimple()
): EstadoPromoFlash {
  const vendidas = Math.max(0, Math.floor(Number(vendidasRaw) || 0))
  const restantes = Math.max(0, config.limiteTotal - vendidas)
  const porcentajeConsumido = Math.min(
    100,
    Math.round((vendidas / Math.max(1, config.limiteTotal)) * 100)
  )

  const vencida = config.fechaVigencia !== fechaHoy
  const agotada = restantes <= 0 || config.desactivadaAutomaticamente

  let motivo: MotivoEstadoPromoFlash = 'activa'
  let disponible = true

  if (vencida) {
    motivo = 'vencida'
    disponible = false
  } else if (agotada) {
    motivo = 'agotada'
    disponible = false
  } else if (!config.activa) {
    motivo = 'pausada'
    disponible = false
  }

  return {
    disponible,
    agotada,
    vencida,
    motivo,
    vendidas,
    restantes,
    porcentajeConsumido,
    fechaHoy,
    config,
  }
}

/** Construye el objeto ProductoCatalogo compatible con CarritoContexto y Checkout. */
export function construirProductoPromoFlash(config: ConfiguracionPromoFlash): ProductoCatalogo {
  return {
    id: PROMO_FLASH_PRODUCTO_ID,
    categoriaId: 'patys',
    nombre: config.nombreProducto,
    precio: config.precioPromo,
    activo: true,
    esCombo: true, // Excluye la promo de bebida gratis para evitar doble acumulación
    stock: null,
    modificadoresIds: [],
  }
}

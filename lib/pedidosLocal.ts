// ─────────────────────────────────────────────────────
// lib/pedidosLocal.ts
// Persistencia de pedidos en localStorage (solo cliente).
// ─────────────────────────────────────────────────────

import { pedidosMock } from '@/datos/pedidosMock'
import { normalizarPedido } from '@/lib/entrega'
import { EstadoPedido, MetodoPago, Pedido, ProductoPedido, TipoEntrega } from '@/tipos'

/** Clave única en localStorage para Chefsy */
export const CLAVE_PEDIDOS_LOCAL = 'chefsy-pedidos-v1'

const estadosValidos: EstadoPedido[] = [
  'nuevo',
  'en_cocina',
  'listo',
  'en_reparto',
  'entregado',
  'cancelado',
]

const metodosPagoValidos: MetodoPago[] = ['efectivo', 'tarjeta', 'transferencia']

const tiposEntregaValidos: TipoEntrega[] = ['delivery', 'retiro', 'consumo_local']

function esProductoPedidoValido(valor: unknown): valor is ProductoPedido {
  if (!valor || typeof valor !== 'object') return false
  const p = valor as Record<string, unknown>
  return (
    typeof p.id === 'string' &&
    typeof p.nombre === 'string' &&
    typeof p.cantidad === 'number' &&
    typeof p.precio === 'number' &&
    p.cantidad > 0 &&
    p.precio >= 0
  )
}

function esPedidoValido(valor: unknown): valor is Pedido {
  if (!valor || typeof valor !== 'object') return false
  const p = valor as Record<string, unknown>

  if (
    typeof p.id !== 'string' ||
    typeof p.cliente !== 'string' ||
    typeof p.telefono !== 'string' ||
    typeof p.direccion !== 'string' ||
    typeof p.total !== 'number' ||
    typeof p.hora !== 'string' ||
    typeof p.fecha !== 'string' ||
    !estadosValidos.includes(p.estado as EstadoPedido) ||
    !metodosPagoValidos.includes(p.metodoPago as MetodoPago) ||
    !Array.isArray(p.productos) ||
    p.productos.length === 0
  ) {
    return false
  }

  if (!p.productos.every(esProductoPedidoValido)) return false

  if (p.coordenadas !== undefined) {
    const c = p.coordenadas as Record<string, unknown>
    if (typeof c.latitud !== 'number' || typeof c.longitud !== 'number') return false
  }

  if (p.observaciones !== undefined && typeof p.observaciones !== 'string') return false

  const tipoEntrega = p.tipoEntrega as TipoEntrega | undefined
  if (tipoEntrega !== undefined && !tiposEntregaValidos.includes(tipoEntrega)) {
    return false
  }

  return true
}

function normalizarListaPedidos(pedidos: Pedido[]): Pedido[] {
  return pedidos.map(normalizarPedido)
}

/** Pedidos de ejemplo para primera visita o datos corruptos */
export function obtenerPedidosIniciales(): Pedido[] {
  return normalizarListaPedidos([...pedidosMock])
}

/**
 * Guarda pedidos en localStorage.
 * Solo debe llamarse en el navegador (después de hidratar).
 */
export function guardarPedidosLocalmente(pedidos: Pedido[]): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(CLAVE_PEDIDOS_LOCAL, JSON.stringify(pedidos))
  } catch (error) {
    console.warn('[Chefsy] No se pudieron guardar los pedidos:', error)
  }
}

/**
 * Carga pedidos desde localStorage.
 * - Sin datos guardados → mock inicial
 * - JSON inválido o corrupto → mock inicial
 * - Array vacío guardado válido → [] (el local vació sus pedidos)
 */
export function cargarPedidosLocales(): Pedido[] {
  if (typeof window === 'undefined') {
    return obtenerPedidosIniciales()
  }

  const crudo = localStorage.getItem(CLAVE_PEDIDOS_LOCAL)

  // Primera visita: nunca se guardó nada
  if (crudo === null) {
    return obtenerPedidosIniciales()
  }

  if (crudo.trim() === '') {
    return obtenerPedidosIniciales()
  }

  try {
    const parseado: unknown = JSON.parse(crudo)

    if (!Array.isArray(parseado)) {
      console.warn('[Chefsy] Datos locales no son un array. Se usan datos de ejemplo.')
      return obtenerPedidosIniciales()
    }

    const pedidosValidos = parseado.filter(esPedidoValido)

    // Todo el contenido era inválido
    if (parseado.length > 0 && pedidosValidos.length === 0) {
      console.warn('[Chefsy] Datos locales corruptos. Se usan datos de ejemplo.')
      return obtenerPedidosIniciales()
    }

    return normalizarListaPedidos(pedidosValidos)
  } catch (error) {
    console.warn('[Chefsy] Error al leer pedidos locales:', error)
    return obtenerPedidosIniciales()
  }
}

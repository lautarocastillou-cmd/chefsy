// ─────────────────────────────────────────────────────
// lib/entrega.ts
// Utilidades para tipo de entrega del pedido.
// ─────────────────────────────────────────────────────

import { EstadoPedido, Pedido, TipoEntrega } from '@/tipos'

export const opcionesTipoEntrega: {
  valor: TipoEntrega
  etiqueta: string
  icono: string
  descripcion: string
}[] = [
  {
    valor: 'delivery',
    etiqueta: 'Delivery',
    icono: '🛵',
    descripcion: 'Envío a domicilio con dirección',
  },
  {
    valor: 'retiro',
    etiqueta: 'Retiro',
    icono: '🏪',
    descripcion: 'El cliente retira en el local',
  },
  {
    valor: 'consumo_local',
    etiqueta: 'Consumo en local',
    icono: '🍽️',
    descripcion: 'Para comer en el local',
  },
]

export function requiereDireccion(tipoEntrega: TipoEntrega): boolean {
  return tipoEntrega === 'delivery'
}

export function obtenerEtiquetaTipoEntrega(tipoEntrega: TipoEntrega): string {
  return opcionesTipoEntrega.find((o) => o.valor === tipoEntrega)?.etiqueta ?? 'Delivery'
}

export function obtenerIconoTipoEntrega(tipoEntrega: TipoEntrega): string {
  return opcionesTipoEntrega.find((o) => o.valor === tipoEntrega)?.icono ?? '🛵'
}

/** Texto a mostrar donde antes iba solo la dirección */
export function obtenerResumenEntrega(pedido: Pedido): string {
  if (pedido.tipoEntrega === 'retiro') return 'Retiro en el local'
  if (pedido.tipoEntrega === 'consumo_local') return 'Consumo en el local'
  return pedido.direccion.trim() || 'Sin dirección'
}

export function esPedidoDelivery(pedido: Pedido): boolean {
  return pedido.tipoEntrega === 'delivery'
}

/** Pedidos antiguos sin campo: se tratan como delivery */
export function normalizarTipoEntrega(
  tipoEntrega: TipoEntrega | undefined
): TipoEntrega {
  if (tipoEntrega === 'retiro' || tipoEntrega === 'consumo_local') return tipoEntrega
  return 'delivery'
}

export function normalizarPedido(pedido: Pedido): Pedido {
  const tipoEntrega = normalizarTipoEntrega(pedido.tipoEntrega)
  return {
    ...pedido,
    tipoEntrega,
    direccion: requiereDireccion(tipoEntrega) ? pedido.direccion : '',
    coordenadas: requiereDireccion(tipoEntrega) ? pedido.coordenadas : undefined,
  }
}

export function obtenerSiguienteEstado(
  estadoActual: EstadoPedido,
  tipoEntrega: TipoEntrega
): EstadoPedido | null {
  if (tipoEntrega === 'delivery') {
    const flujo: Record<EstadoPedido, EstadoPedido | null> = {
      nuevo: 'en_cocina',
      en_cocina: 'listo',
      listo: 'en_reparto',
      en_reparto: 'entregado',
      entregado: null,
      cancelado: null,
    }
    return flujo[estadoActual]
  }

  const flujoLocal: Record<EstadoPedido, EstadoPedido | null> = {
    nuevo: 'en_cocina',
    en_cocina: 'listo',
    listo: 'entregado',
    en_reparto: 'entregado',
    entregado: null,
    cancelado: null,
  }
  return flujoLocal[estadoActual]
}

export function obtenerEtiquetaAccionEstado(
  siguienteEstado: EstadoPedido,
  tipoEntrega: TipoEntrega
): string {
  if (siguienteEstado === 'en_cocina') return 'Enviar a Cocina'
  if (siguienteEstado === 'listo') return 'Marcar como Listo'

  if (siguienteEstado === 'en_reparto') return 'Enviar a Reparto'

  if (siguienteEstado === 'entregado') {
    if (tipoEntrega === 'retiro') return 'Marcar como Retirado'
    if (tipoEntrega === 'consumo_local') return 'Marcar como Servido'
    return 'Marcar Entregado'
  }

  return 'Avanzar estado'
}

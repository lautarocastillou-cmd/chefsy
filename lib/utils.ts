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

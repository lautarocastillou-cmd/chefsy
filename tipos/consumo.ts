// ─────────────────────────────────────────────────────
// tipos/consumo.ts
// Tipos para el registro y gestión de consumos internos del personal.
// ─────────────────────────────────────────────────────

export interface ConsumoPersonal {
  id: string
  fecha: string // ISO string timestamp (ej: 2026-08-28T20:25:00.000Z)
  producto_id: string
  producto_nombre: string
  categoria_nombre?: string
  precio: number // precio unitario aplicado al consumo
  cantidad: number
  total: number // precio * cantidad
  persona_nombre: string // Nombre del empleado / cadete / personal
  tipo_pago: 'anotado' | 'pagado' // 'anotado' = se descuenta del sueldo; 'pagado' = abonado en el acto
  saldado: boolean // true si ya fue descontado del sueldo o liquidado
  descontar_stock: boolean // Si se descontó del stock de inventario
  notas?: string
  creado_por?: string
}

export interface NuevoConsumoPayload {
  producto_id: string
  producto_nombre: string
  categoria_nombre?: string
  precio: number
  cantidad: number
  persona_nombre: string
  tipo_pago: 'anotado' | 'pagado'
  descontar_stock?: boolean
  notas?: string
}

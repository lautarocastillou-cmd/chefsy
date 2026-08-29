export interface CategoriaInsumo {
  id: string
  nombre: string
}

export interface Insumo {
  id: string
  nombre: string
  categoria_id: string
  stock_actual: number
  unidad_medida: string // 'unidades', 'litros', 'kg', etc.
  activo?: boolean
}

export interface RecetaInsumo {
  insumo_id: string
  cantidad: number
}

export interface RecetaProducto {
  producto_id: string
  insumos: RecetaInsumo[]
}

/**
 * Tipos de movimientos auditables en el Kardex de Stock
 */
export type TipoMovimientoStock =
  | 'ingreso_mercaderia' // Compra / Reposición de proveedor
  | 'venta_automatica'   // Descuento automático por pedido/comanda
  | 'consumo_personal'   // Comida de personal
  | 'merma_vencimiento'  // Caducidad / Vencimiento
  | 'merma_rotura'       // Rotura / Caída / Accidente
  | 'merma_cocina'       // Error de preparación / Quemado
  | 'ajuste_inventario'  // Conteo físico / Auditoría de cierre
  | 'ajuste_manual'      // Corrección manual directa

export interface MovimientoStock {
  id: string
  created_at: string
  insumo_id: string
  insumo_nombre: string
  tipo_movimiento: TipoMovimientoStock
  cantidad_delta: number
  stock_anterior: number
  stock_nuevo: number
  unidad_medida: string
  motivo?: string | null
  usuario_nombre: string
  referencia_id?: string | null
}

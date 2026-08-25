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

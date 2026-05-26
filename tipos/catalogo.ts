// ─────────────────────────────────────────────────────
// tipos/catalogo.ts
// Tipos del catálogo centralizado de productos.
// ─────────────────────────────────────────────────────

export interface CategoriaCatalogo {
  id: string
  nombre: string
  orden: number
  activa: boolean
}

export interface ProductoCatalogo {
  id: string
  categoriaId: string
  nombre: string
  precio: number
  activo: boolean
  stock?: number | null
  esCombo?: boolean
  modificadoresIds?: string[]
}

export interface FilaProductoPedido {
  id: string
  idCategoria: string
  idProductoCatalogo: string
  cantidad: number
  precio: number
  modificadoresSeleccionadosIds?: string[]
}

export interface ModificadorCatalogo {
  id: string
  nombre: string
  precioExtra: number
}

// ─────────────────────────────────────────────────────
// tipos/catalogo.ts
// Tipos del catálogo centralizado de productos.
// ─────────────────────────────────────────────────────

/**
 * Metadata pública de un producto almacenada en la tabla `tienda_metadata`.
 * Enriquece a ProductoCatalogo con datos editables desde el panel admin.
 */
export interface MetaProducto {
  producto_id:        string
  nombre_publico:     string | null
  descripcion_publica: string | null
  imagen_url:         string | null
}

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
  precio_puntos?: number
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

/**
 * Detalles complementarios resueltos por OBTENER_DETALLES_COMPLEMENTARIOS.
 * Nunca serán undefined: siempre tienen imagen y descripción fallback.
 */
export interface DetallesComplementarios {
  desc: string
  img:  string
}

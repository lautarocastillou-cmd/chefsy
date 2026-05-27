// ─────────────────────────────────────────────────────
// tipos/index.ts
// Todos los tipos del sistema Chefsy
// ─────────────────────────────────────────────────────

/** Estados posibles de un pedido, en orden de flujo */
export type EstadoPedido =
  | 'nuevo'
  | 'en_cocina'
  | 'listo'
  | 'en_reparto'
  | 'entregado'
  | 'cancelado'

/** Métodos de pago aceptados */
export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia'

/** Forma en que el cliente recibe el pedido */
export type TipoEntrega = 'delivery' | 'retiro' | 'consumo_local'

/** Coordenadas geográficas de entrega */
export interface Coordenadas {
  latitud: number
  longitud: number
}

/** Un producto dentro de un pedido */
export interface ProductoPedido {
  id: string
  nombre: string
  cantidad: number
  precio: number
  idCatalogo?: string
  categoriaId?: string
}

/** Estructura completa de un pedido */
export interface Pedido {
  id: string
  cliente: string
  telefono: string
  tipoEntrega: TipoEntrega
  direccion: string
  coordenadas?: Coordenadas
  productos: ProductoPedido[]
  total: number
  costoEnvio?: number
  distanciaKm?: number
  estado: EstadoPedido
  metodoPago: MetodoPago
  observaciones?: string
  hora: string
  fecha: string
  created_at?: string
  cocina_at?: string | null
  listo_at?: string | null
  entregado_at?: string | null
  cadete_coordenadas?: Coordenadas | null
  pago_confirmado?: boolean
}

export type { CategoriaCatalogo, ProductoCatalogo, FilaProductoPedido } from './catalogo'

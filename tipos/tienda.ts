// ─────────────────────────────────────────────────────
// tipos/tienda.ts
// Tipos compartidos entre los componentes de la tienda.
// ─────────────────────────────────────────────────────

import { ProductoCatalogo, ModificadorCatalogo } from '@/tipos/catalogo'

export interface ItemCarrito {
  idCart: string // Combinación única del ID de producto + IDs de modificadores
  producto: ProductoCatalogo
  cantidad: number
  modificadoresSeleccionados: ModificadorCatalogo[]
  precioUnitario: number
  notaPersonalizacion?: string
}

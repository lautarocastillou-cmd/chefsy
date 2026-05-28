// ─────────────────────────────────────────────────────
// modules/malu/tipos.ts
// Tipos del sistema Malú Clothing — completamente
// independientes de los tipos de Chefsy.
// ─────────────────────────────────────────────────────

export interface ClientaMalu {
  id: string
  nombre: string
  telefono?: string | null
  notas?: string | null
  fecha_nacimiento?: string | null // YYYY-MM-DD
  talle_general?: string | null    // e.g. "M", "L", "38"
  creada_en: string
  activa: boolean
  // Calculados en el cliente
  deudaTotal?: number
  ultimaActividad?: string | null
}

export interface VentaFiada {
  id: string
  clienta_id: string
  descripcion: string
  monto: number
  fecha: string        // YYYY-MM-DD
  nota?: string | null
  creada_en: string
}

export interface PagoMalu {
  id: string
  clienta_id: string
  monto: number
  metodo: 'efectivo' | 'transferencia' | 'otro'
  fecha: string        // YYYY-MM-DD
  nota?: string | null
  creada_en: string
}

export type MetodoPagoMalu = PagoMalu['metodo']

export interface ResumenClienta {
  clienta: ClientaMalu
  ventas: VentaFiada[]
  pagos: PagoMalu[]
  totalVentas: number
  totalPagos: number
  saldo: number        // totalVentas - totalPagos (positivo = debe)
}

export interface SesionMalu {
  autenticada: boolean
  expiraEn: number
}

export interface ProductoMalu {
  id: string
  codigo?: string | null
  nombre: string
  descripcion?: string | null
  precio: number
  stock: number
  imagen_url?: string | null
  categoria?: string | null
  talle?: string | null
  color?: string | null
  external_id?: string | null
  creado_en: string
  activo: boolean
}

export interface VentaMostrador {
  id: string
  producto_id?: string | null
  descripcion: string
  talle?: string | null
  cantidad: number
  monto: number
  metodo: 'efectivo' | 'transferencia'
  fecha: string // YYYY-MM-DD
  creada_en?: string
}

export interface ApartadoMalu {
  id: string
  clienta_id: string
  producto_id?: string | null
  descripcion: string
  talle?: string | null
  cantidad: number
  monto_total: number
  monto_senado: number
  metodo_seña: 'efectivo' | 'transferencia'
  fecha: string // YYYY-MM-DD
  estado: 'pendiente' | 'retirado' | 'cancelado'
  creado_en?: string
}

export interface GastoMalu {
  id: string
  descripcion: string
  monto: number
  fecha: string // YYYY-MM-DD
  creado_en?: string
}





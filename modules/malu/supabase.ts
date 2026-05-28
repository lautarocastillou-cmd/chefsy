// ─────────────────────────────────────────────────────
// modules/malu/supabase.ts
// Capa de acceso a datos de Malú Clothing.
// Todas las operaciones van a /api/malu/datos (service_role).
// Solo toca tablas malu_*. Aislado de Chefsy.
// ─────────────────────────────────────────────────────

import type { ClientaMalu, VentaFiada, PagoMalu, ProductoMalu, VentaMostrador, ApartadoMalu, GastoMalu } from './tipos'



// Lee la contraseña guardada en localStorage para autenticar las requests
function obtenerAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const sesion = localStorage.getItem('malu-sesion-pass')
  return sesion ? { 'x-malu-auth': sesion } : {}
}

async function maluApi(payload: object): Promise<any> {
  const res = await fetch('/api/malu/datos', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...obtenerAuthHeader(),
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Error ${res.status}`)
  }
  return res.json()
}

// ── Clientas ────────────────────────────────────────

export async function obtenerClientas(): Promise<ClientaMalu[]> {
  return maluApi({ tabla: 'malu_clientas', accion: 'listar', filtros: { activa: true, order: { column: 'nombre', ascending: true } } })
}

export async function crearClienta(
  datos: Pick<ClientaMalu, 'nombre' | 'telefono' | 'notas' | 'fecha_nacimiento' | 'talle_general'>
): Promise<ClientaMalu> {
  return maluApi({ tabla: 'malu_clientas', accion: 'crear', datos: { ...datos, activa: true } })
}

export async function actualizarClienta(
  id: string,
  datos: Partial<Pick<ClientaMalu, 'nombre' | 'telefono' | 'notas' | 'fecha_nacimiento' | 'talle_general' | 'activa'>>
): Promise<ClientaMalu> {
  return maluApi({ tabla: 'malu_clientas', accion: 'actualizar', id, datos })
}

// ── Ventas Fiadas ────────────────────────────────────

export async function obtenerTodasLasVentas(): Promise<VentaFiada[]> {
  return maluApi({ tabla: 'malu_ventas_fiadas', accion: 'listar', filtros: { order: { column: 'fecha', ascending: false } } })
}

export async function crearVenta(
  datos: Pick<VentaFiada, 'clienta_id' | 'descripcion' | 'monto' | 'fecha' | 'nota'>
): Promise<VentaFiada> {
  return maluApi({ tabla: 'malu_ventas_fiadas', accion: 'crear', datos })
}

export async function actualizarVenta(
  id: string,
  datos: Partial<Pick<VentaFiada, 'descripcion' | 'monto' | 'fecha' | 'nota'>>
): Promise<VentaFiada> {
  return maluApi({ tabla: 'malu_ventas_fiadas', accion: 'actualizar', id, datos })
}

export async function eliminarVenta(id: string): Promise<void> {
  await maluApi({ tabla: 'malu_ventas_fiadas', accion: 'eliminar', id })
}

// ── Pagos ────────────────────────────────────────────

export async function obtenerTodosLosPagos(): Promise<PagoMalu[]> {
  return maluApi({ tabla: 'malu_pagos', accion: 'listar', filtros: { order: { column: 'fecha', ascending: false } } })
}

export async function crearPago(
  datos: Pick<PagoMalu, 'clienta_id' | 'monto' | 'metodo' | 'fecha' | 'nota'>
): Promise<PagoMalu> {
  return maluApi({ tabla: 'malu_pagos', accion: 'crear', datos })
}

export async function eliminarPago(id: string): Promise<void> {
  await maluApi({ tabla: 'malu_pagos', accion: 'eliminar', id })
}

// ── Productos (Stock) ────────────────────────────────
export async function obtenerProductos(): Promise<ProductoMalu[]> {
  return maluApi({ tabla: 'malu_productos', accion: 'listar', filtros: { activo: true, order: { column: 'nombre', ascending: true } } })
}

export async function crearProducto(
  datos: Pick<ProductoMalu, 'codigo' | 'nombre' | 'descripcion' | 'precio' | 'stock' | 'imagen_url' | 'categoria' | 'talle' | 'color' | 'external_id'>
): Promise<ProductoMalu> {
  return maluApi({ tabla: 'malu_productos', accion: 'crear', datos: { ...datos, activo: true } })
}

export async function actualizarProducto(
  id: string,
  datos: Partial<Pick<ProductoMalu, 'codigo' | 'nombre' | 'descripcion' | 'precio' | 'stock' | 'imagen_url' | 'categoria' | 'talle' | 'color' | 'external_id' | 'activo'>>
): Promise<ProductoMalu> {
  return maluApi({ tabla: 'malu_productos', accion: 'actualizar', id, datos })
}

export async function eliminarProducto(id: string): Promise<void> {
  await maluApi({ tabla: 'malu_productos', accion: 'eliminar', id })
}

// ── Ventas Mostrador (Caja) ─────────────────────────
export async function obtenerVentasMostrador(): Promise<VentaMostrador[]> {
  return maluApi({ tabla: 'malu_ventas_mostrador', accion: 'listar', filtros: { order: { column: 'creada_en', ascending: false } } })
}

export async function crearVentaMostrador(
  datos: Pick<VentaMostrador, 'producto_id' | 'descripcion' | 'talle' | 'cantidad' | 'monto' | 'metodo' | 'fecha'>
): Promise<VentaMostrador> {
  return maluApi({ tabla: 'malu_ventas_mostrador', accion: 'crear', datos })
}

// ── Apartados ─────────────────────────────────────────
export async function obtenerApartados(): Promise<ApartadoMalu[]> {
  return maluApi({ tabla: 'malu_apartados', accion: 'listar', filtros: { order: { column: 'creado_en', ascending: false } } })
}

export async function crearApartado(
  datos: Pick<ApartadoMalu, 'clienta_id' | 'producto_id' | 'descripcion' | 'talle' | 'cantidad' | 'monto_total' | 'monto_senado' | 'metodo_seña' | 'fecha' | 'estado'>
): Promise<ApartadoMalu> {
  return maluApi({ tabla: 'malu_apartados', accion: 'crear', datos })
}

export async function actualizarApartado(
  id: string,
  datos: Partial<Pick<ApartadoMalu, 'estado'>>
): Promise<ApartadoMalu> {
  return maluApi({ tabla: 'malu_apartados', accion: 'actualizar', id, datos })
}

// ── Gastos ───────────────────────────────────────────
export async function obtenerGastos(): Promise<GastoMalu[]> {
  return maluApi({ tabla: 'malu_gastos', accion: 'listar', filtros: { order: { column: 'fecha', ascending: false } } })
}

export async function crearGasto(
  datos: Pick<GastoMalu, 'descripcion' | 'monto' | 'fecha'>
): Promise<GastoMalu> {
  return maluApi({ tabla: 'malu_gastos', accion: 'crear', datos })
}

export async function eliminarGasto(id: string): Promise<void> {
  await maluApi({ tabla: 'malu_gastos', accion: 'eliminar', id })
}



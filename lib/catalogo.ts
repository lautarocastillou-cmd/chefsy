// ─────────────────────────────────────────────────────
// lib/catalogo.ts
// Funciones de consulta sobre el catálogo.
// ─────────────────────────────────────────────────────

import { categoriasCatalogo, productosCatalogo, modificadoresCatalogo } from '@/datos/productos'
import { CategoriaCatalogo, FilaProductoPedido, ProductoCatalogo, ModificadorCatalogo } from '@/tipos/catalogo'
import { ProductoPedido } from '@/tipos'

// Funciones para cargar dinámicamente desde localStorage en cliente, con fallback estático para SSR/hidratación inicial
function cargarCategoriasDinamicas(): CategoriaCatalogo[] {
  if (typeof window === 'undefined') return categoriasCatalogo
  const crudo = localStorage.getItem('chefsy-categorias-v1')
  if (crudo) {
    try {
      return JSON.parse(crudo)
    } catch {
      return categoriasCatalogo
    }
  }
  return categoriasCatalogo
}

function cargarProductosDinamicos(): ProductoCatalogo[] {
  if (typeof window === 'undefined') return productosCatalogo
  const crudo = localStorage.getItem('chefsy-productos-v1')
  if (crudo) {
    try {
      return JSON.parse(crudo)
    } catch {
      return productosCatalogo
    }
  }
  return productosCatalogo
}

export function cargarModificadoresDinamicos(): ModificadorCatalogo[] {
  if (typeof window === 'undefined') return modificadoresCatalogo
  const crudo = localStorage.getItem('chefsy-modificadores-v1')
  if (crudo) {
    try {
      return JSON.parse(crudo)
    } catch {
      return modificadoresCatalogo
    }
  }
  return modificadoresCatalogo
}

export function obtenerCategoriasActivas(): CategoriaCatalogo[] {
  return cargarCategoriasDinamicas()
    .filter((c) => c.activa)
    .sort((a, b) => a.orden - b.orden)
}

export function obtenerProductosPorCategoria(categoriaId: string): ProductoCatalogo[] {
  return cargarProductosDinamicos().filter(
    (p) => p.categoriaId === categoriaId && p.activo
  )
}

export function obtenerCategoriaPorId(id: string): CategoriaCatalogo | undefined {
  return cargarCategoriasDinamicas().find((c) => c.id === id)
}

export function obtenerProductoCatalogoPorId(
  id: string
): ProductoCatalogo | undefined {
  return cargarProductosDinamicos().find((p) => p.id === id)
}

export function obtenerModificadorPorId(id: string): ModificadorCatalogo | undefined {
  return cargarModificadoresDinamicos().find((m) => m.id === id)
}

export function construirNombreProductoPedido(
  categoriaId: string,
  productoCatalogoId: string
): string {
  const categoria = obtenerCategoriaPorId(categoriaId)
  const producto = obtenerProductoCatalogoPorId(productoCatalogoId)
  if (!categoria || !producto) return producto?.nombre ?? 'Producto'
  return `${categoria.nombre} - ${producto.nombre}`
}

export function calcularTotalFilas(filas: FilaProductoPedido[]): number {
  return filas.reduce((acc, fila) => acc + fila.cantidad * fila.precio, 0)
}

export function filasAProductosPedido(
  filas: FilaProductoPedido[],
  generarId: () => string
): ProductoPedido[] {
  return filas
    .filter((f) => f.idProductoCatalogo && f.idCategoria)
    .map((fila) => {
      const categoria = obtenerCategoriaPorId(fila.idCategoria)
      const producto = obtenerProductoCatalogoPorId(fila.idProductoCatalogo)
      
      let nombreFinal = producto?.nombre ?? 'Producto'
      if (categoria && producto) {
        nombreFinal = `${categoria.nombre} - ${producto.nombre}`
      }

      if (fila.modificadoresSeleccionadosIds && fila.modificadoresSeleccionadosIds.length > 0) {
        const modsNombres: string[] = []
        fila.modificadoresSeleccionadosIds.forEach((idMod) => {
          const mod = obtenerModificadorPorId(idMod)
          if (mod) {
            modsNombres.push(mod.nombre)
          }
        })
        if (modsNombres.length > 0) {
          nombreFinal += ` (+ ${modsNombres.join(', ')})`
        }
      }

      return {
        id: generarId(),
        nombre: nombreFinal,
        cantidad: fila.cantidad,
        precio: fila.precio,
        idCatalogo: fila.idProductoCatalogo,
        categoriaId: fila.idCategoria,
      }
    })
}

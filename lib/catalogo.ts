// ─────────────────────────────────────────────────────
// lib/catalogo.ts
// Funciones de consulta sobre el catálogo.
// ─────────────────────────────────────────────────────

import { categoriasCatalogo, productosCatalogo, modificadoresCatalogo } from '@/datos/productos'
import { CategoriaCatalogo, FilaProductoPedido, ProductoCatalogo, ModificadorCatalogo } from '@/tipos/catalogo'
import { ProductoPedido } from '@/tipos'

import { getCache } from '@/lib/localCache'

// Funciones para cargar dinámicamente desde localStorage en cliente, con fallback estático para SSR/hidratación inicial
function cargarCategoriasDinamicas(): CategoriaCatalogo[] {
  if (typeof window === 'undefined') return categoriasCatalogo
  const cacheData = getCache<CategoriaCatalogo[]>('chefsy-categorias-v1', 2)
  if (Array.isArray(cacheData)) return cacheData

  try {
    const crudo = localStorage.getItem('chefsy-categorias-v1')
    if (crudo) {
      const parsed = JSON.parse(crudo)
      if (Array.isArray(parsed)) return parsed
      if (parsed && Array.isArray(parsed.v)) return parsed.v
    }
  } catch {}
  return categoriasCatalogo
}

function cargarProductosDinamicos(): ProductoCatalogo[] {
  if (typeof window === 'undefined') return productosCatalogo
  const cacheData = getCache<ProductoCatalogo[]>('chefsy-productos-v1', 2)
  if (Array.isArray(cacheData)) return cacheData

  try {
    const crudo = localStorage.getItem('chefsy-productos-v1')
    if (crudo) {
      const parsed = JSON.parse(crudo)
      if (Array.isArray(parsed)) return parsed
      if (parsed && Array.isArray(parsed.v)) return parsed.v
    }
  } catch {}
  return productosCatalogo
}

export function cargarModificadoresDinamicos(): ModificadorCatalogo[] {
  if (typeof window === 'undefined') return modificadoresCatalogo
  const cacheData = getCache<ModificadorCatalogo[]>('chefsy-modificadores-v1', 2)
  if (Array.isArray(cacheData)) return cacheData

  try {
    const crudo = localStorage.getItem('chefsy-modificadores-v1')
    if (crudo) {
      const parsed = JSON.parse(crudo)
      if (Array.isArray(parsed)) return parsed
      if (parsed && Array.isArray(parsed.v)) return parsed.v
    }
  } catch {}
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
  productoCatalogoId: string,
  catalogoContexto?: ProductoCatalogo[],
  categoriasContexto?: CategoriaCatalogo[]
): string {
  const categoria = categoriasContexto?.find(c => c.id === categoriaId) || obtenerCategoriaPorId(categoriaId)
  const producto = catalogoContexto?.find(p => p.id === productoCatalogoId) || obtenerProductoCatalogoPorId(productoCatalogoId)
  if (!categoria || !producto) return producto?.nombre ?? 'Producto'
  if (producto.nombre.toLowerCase().startsWith(categoria.nombre.toLowerCase())) {
    return producto.nombre
  }
  return `${categoria.nombre} - ${producto.nombre}`
}

export function calcularTotalFilas(filas: FilaProductoPedido[]): number {
  return filas.reduce((acc, fila) => acc + fila.cantidad * fila.precio, 0)
}

export function filasAProductosPedido(
  filas: FilaProductoPedido[],
  generarId: () => string,
  catalogoContexto?: ProductoCatalogo[],
  categoriasContexto?: CategoriaCatalogo[]
): ProductoPedido[] {
  return filas
    .filter((f) => f.idProductoCatalogo && f.idCategoria)
    .map((fila) => {
      // Buscar primero en el catálogo en memoria del contexto (siempre fresco), luego en caché
      const producto = catalogoContexto?.find((p) => p.id === fila.idProductoCatalogo) 
        || obtenerProductoCatalogoPorId(fila.idProductoCatalogo)
      
      const categoria = categoriasContexto?.find((c) => c.id === fila.idCategoria) 
        || obtenerCategoriaPorId(fila.idCategoria)

      // Resolver nombre de producto: fila.nombreProducto > catálogo en memoria > nombre guardado
      let nombreProducto = fila.nombreProducto
      if (!nombreProducto || nombreProducto.trim().toLowerCase() === 'producto') {
        nombreProducto = producto?.nombre || fila.nombreProducto || 'Producto'
      }

      // Si el nombre del producto ya tiene prefijo "Categoria - ", extraerlo
      const nombreCat = fila.nombreCategoria || categoria?.nombre
      if (nombreCat && nombreProducto.toLowerCase().startsWith(`${nombreCat.toLowerCase()} - `)) {
        nombreProducto = nombreProducto.slice(nombreCat.length + 3).trim()
      }

      let nombreFinal = nombreCat
        ? `${nombreCat} - ${nombreProducto}`
        : nombreProducto

      // Protección final contra '... - Producto': si tenemos el producto real, restaurarlo
      if (nombreFinal.endsWith(' - Producto') && producto?.nombre) {
        nombreFinal = nombreCat ? `${nombreCat} - ${producto.nombre}` : producto.nombre
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
        coccion: fila.coccion,
      }
    })
}





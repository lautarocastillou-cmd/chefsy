import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { productosCatalogo } from '@/datos/productos'
import { generarSlug, formatearPrecio } from '@/lib/utils'

export interface DatosProductoEnlace {
  id: string
  nombre: string
  precio: number
  precioFormateado: string
  precio_puntos?: number
  activo: boolean
  descripcion: string
  imagen: string
}

/**
 * Consulta un producto por ID o slug para vistas previas de OpenGraph (Instagram, WhatsApp, Facebook)
 * y redirecciones seguras.
 * Se ejecuta exclusivamente en el servidor (Server Component o Route Handler).
 */
export async function obtenerDatosProductoParaLink(idOrSlug: string): Promise<DatosProductoEnlace | null> {
  if (!idOrSlug) return null
  const buscado = decodeURIComponent(idOrSlug).trim().toLowerCase()
  if (!buscado) return null

  // 1. Intentar buscar en la base de datos oficial de Supabase
  try {
    const supabaseAdmin = obtenerSupabaseAdmin()

    // Búsqueda directa por ID
    let { data: prodDb } = await supabaseAdmin
      .from('productos')
      .select('id, nombre, precio, precio_puntos, activo')
      .eq('id', buscado)
      .maybeSingle()

    // Si no coincide exactamente con el ID, buscar por coincidencia de slug o nombre
    if (!prodDb) {
      const { data: todos } = await supabaseAdmin
        .from('productos')
        .select('id, nombre, precio, precio_puntos, activo')
      
      if (todos && todos.length > 0) {
        prodDb =
          todos.find((p: any) => p.id.toLowerCase() === buscado) ||
          todos.find((p: any) => generarSlug(p.nombre) === buscado) ||
          todos.find((p: any) => p.nombre.toLowerCase() === buscado) ||
          todos.find((p: any) => p.nombre.toLowerCase().includes(buscado)) ||
          null
      }
    }

    if (prodDb) {
      // Obtener imagen y descripción pública de tienda_metadata
      const { data: meta } = await supabaseAdmin
        .from('tienda_metadata')
        .select('descripcion_publica, imagen_url')
        .eq('producto_id', prodDb.id)
        .maybeSingle()

      const imgRaw = meta?.imagen_url || ''
      const primeraImg = imgRaw ? imgRaw.split('|')[0].trim() : ''

      return {
        id: prodDb.id,
        nombre: prodDb.nombre,
        precio: Number(prodDb.precio) || 0,
        precioFormateado: formatearPrecio(Number(prodDb.precio) || 0),
        precio_puntos: prodDb.precio_puntos,
        activo: Boolean(prodDb.activo),
        descripcion: meta?.descripcion_publica || '',
        imagen: primeraImg || '/logo.jpg',
      }
    }
  } catch (err) {
    console.error('[DeepLink] Error consultando Supabase:', err)
  }

  // 2. Fallback local desde datos estáticos de catálogo
  const estatico =
    productosCatalogo.find((p) => p.id.toLowerCase() === buscado) ||
    productosCatalogo.find((p) => generarSlug(p.nombre) === buscado) ||
    productosCatalogo.find((p) => p.nombre.toLowerCase().includes(buscado))

  if (estatico) {
    return {
      id: estatico.id,
      nombre: estatico.nombre,
      precio: estatico.precio,
      precioFormateado: formatearPrecio(estatico.precio),
      precio_puntos: estatico.precio_puntos,
      activo: estatico.activo,
      descripcion: '',
      imagen: '/logo.jpg',
    }
  }

  return null
}

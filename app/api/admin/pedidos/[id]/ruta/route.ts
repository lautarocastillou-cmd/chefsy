// ─────────────────────────────────────────────────────
// app/api/admin/pedidos/[id]/ruta/route.ts
// Historial GPS de un pedido (el breadcrumb que ve el cadete).
// ─────────────────────────────────────────────────────
//
// Se movió acá desde el navegador porque `pedidos` se cierra a `anon`:
// `ruta_historial` es un array de coordenadas que corre por la calle donde
// vive el cliente. ModalBreadcrumbTrail.tsx lo leía directo con la anon key.

import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { verificarRateLimit, obtenerIpCliente } from '@/lib/rate-limit'

/**
 * ¿Este pedido es de este cadete?
 *
 * La identidad del cadete no está normalizada: según cómo entró, la sesión
 * trae `usuario` en minúsculas ('leonel') o el nombre con mayúsculas
 * ('Leonel'), y el pedido guarda los dos. Se comparan ambos, sin distinguir
 * mayúsculas, y un pedido sin cadete asignado se rechaza (fail-closed).
 */
function perteneceAlCadete(
  pedido: { cadete_id: string | null; cadete_nombre: string | null },
  usuario: string,
  nombre: string
): boolean {
  const candidatos = [pedido.cadete_id, pedido.cadete_nombre]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim().toLowerCase())

  if (candidatos.length === 0) return false

  return [usuario, nombre]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .some((v) => candidatos.includes(v.trim().toLowerCase()))
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const sesion = await obtenerSesion()
    if (!sesion) {
      return NextResponse.json({ error: 'Acceso denegado. No autenticado.' }, { status: 401 })
    }

    const { id } = await Promise.resolve(params)

    // El id viene de la URL: sin esto, un cadete podría recorrer ids ajenos
    // leyendo el recorrido de la casa de otro cliente.
    if (sesion.rol === 'cadete') {
      const supabase = obtenerSupabaseAdmin()
      const { data: pedido } = await supabase
        .from('pedidos')
        .select('cadete_id, cadete_nombre')
        .eq('id', id)
        .maybeSingle()

      if (!pedido || !perteneceAlCadete(pedido, sesion.usuario, sesion.nombre)) {
        return NextResponse.json({ error: 'No autorizado para este pedido.' }, { status: 403 })
      }
    }

    // `ruta_historial` puede traer cientos de puntos por pedido. Un cadete
    // abriendo repetidamente el modal no debería generar una tabla entera
    // de lecturas de GPS.
    const ip = obtenerIpCliente(request)
    if (!verificarRateLimit(`ruta-pedido:${sesion.usuario}:${ip}`, 60, 60).permitido) {
      return NextResponse.json({ error: 'Demasiadas consultas. Probá en un momento.' }, { status: 429 })
    }

    const supabase = obtenerSupabaseAdmin()
    const { data, error } = await supabase
      .from('pedidos')
      .select('ruta_historial')
      .eq('id', id)
      .maybeSingle()

    if (error) throw error

    // null (no existe o sin datos) es una respuesta válida, no un error:
    // el llamador distingue con `=== null`.
    return NextResponse.json({ ruta: data?.ruta_historial ?? null })
  } catch (error) {
    console.error('[API Pedidos Ruta] Error:', error)
    return NextResponse.json({ error: 'Error interno al obtener el recorrido.' }, { status: 500 })
  }
}

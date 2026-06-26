// ─────────────────────────────────────────────────────
// app/api/admin/catalogo/route.ts
// Endpoint seguro para sincronizar el catálogo.
// Escribe en las 3 tablas normalizadas Y mantiene el blob
// legacy actualizado como respaldo de emergencia.
// ─────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { CategoriaCatalogo, ProductoCatalogo, ModificadorCatalogo } from '@/tipos/catalogo'

export async function POST(request: Request) {
  // 1. Validar sesión de admin
  const sesion = await obtenerSesion()
  if (!sesion || sesion.rol !== 'admin') {
    return NextResponse.json(
      { error: 'Acceso denegado. Se requiere sesión de administrador.' },
      { status: 403 }
    )
  }

  try {
    const payload = await request.json()
    const { categorias, productos, modificadores } = payload as {
      categorias:    CategoriaCatalogo[]
      productos:     ProductoCatalogo[]
      modificadores: ModificadorCatalogo[]
    }

    if (!categorias || !productos || !modificadores) {
      return NextResponse.json({ error: 'Datos de catálogo incompletos.' }, { status: 400 })
    }

    const supabaseAdmin = obtenerSupabaseAdmin()

    // ── 2. Escribir en tablas normalizadas ────────────

    // 2a. Categorías — upsert + eliminar las que ya no existen
    const idsCategoriasNuevas = categorias.map((c) => c.id)

    const { error: errCatUpsert } = await supabaseAdmin
      .from('categorias')
      .upsert(
        categorias.map((c) => ({
          id:     c.id,
          nombre: c.nombre,
          orden:  c.orden,
          activa: c.activa,
        })),
        { onConflict: 'id' }
      )
    if (errCatUpsert) throw new Error(`categorias upsert: ${errCatUpsert.message}`)

    const { error: errCatDel } = await supabaseAdmin
      .from('categorias')
      .delete()
      .not('id', 'in', `(${idsCategoriasNuevas.map((id) => `'${id}'`).join(',')})`)
    if (errCatDel) console.warn('[API Catalogo] No se pudo limpiar categorías obsoletas:', errCatDel.message)

    // 2b. Modificadores — upsert + eliminar los que ya no existen
    const idsModificadoresNuevos = modificadores.map((m) => m.id)

    const { error: errModUpsert } = await supabaseAdmin
      .from('modificadores')
      .upsert(
        modificadores.map((m) => ({
          id:          m.id,
          nombre:      m.nombre,
          precio_extra: m.precioExtra,
        })),
        { onConflict: 'id' }
      )
    if (errModUpsert) throw new Error(`modificadores upsert: ${errModUpsert.message}`)

    if (idsModificadoresNuevos.length > 0) {
      const { error: errModDel } = await supabaseAdmin
        .from('modificadores')
        .delete()
        .not('id', 'in', `(${idsModificadoresNuevos.map((id) => `'${id}'`).join(',')})`)
      if (errModDel) console.warn('[API Catalogo] No se pudo limpiar modificadores obsoletos:', errModDel.message)
    }

    // 2c. Productos — upsert + eliminar los que ya no existen
    const idsProductosNuevos = productos.map((p) => p.id)

    const { error: errProdUpsert } = await supabaseAdmin
      .from('productos')
      .upsert(
        productos.map((p) => ({
          id:               p.id,
          categoria_id:     p.categoriaId,
          nombre:           p.nombre,
          precio:           p.precio,
          precio_puntos:    p.precio_puntos ?? null,
          activo:           p.activo,
          es_combo:         p.esCombo ?? false,
          stock:            p.stock ?? null,
          modificadores_ids: p.modificadoresIds ?? [],
        })),
        { onConflict: 'id' }
      )
    if (errProdUpsert) throw new Error(`productos upsert: ${errProdUpsert.message}`)

    const { error: errProdDel } = await supabaseAdmin
      .from('productos')
      .delete()
      .not('id', 'in', `(${idsProductosNuevos.map((id) => `'${id}'`).join(',')})`)
    if (errProdDel) console.warn('[API Catalogo] No se pudo limpiar productos obsoletos:', errProdDel.message)

    // ── 3. Mantener blob legacy actualizado (respaldo) ──
    await supabaseAdmin
      .from('catalogo')
      .upsert({
        id: 'principal',
        categorias,
        productos,
        modificadores,
        updated_at: new Date().toISOString(),
      })
      .then(({ error }) => {
        if (error) console.warn('[API Catalogo] No se pudo actualizar blob legacy:', error.message)
      })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[API Catalogo] Error al sincronizar:', error)
    return NextResponse.json(
      { error: 'Error al guardar el catálogo en el servidor.' },
      { status: 500 }
    )
  }
}

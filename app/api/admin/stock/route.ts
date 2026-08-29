import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { TipoMovimientoStock } from '@/tipos/stock'

export async function POST(request: Request) {
  const sesion = await obtenerSesion()
  if (!sesion || sesion.rol !== 'admin') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  const usuarioNombre = sesion.nombre || sesion.usuario || 'Admin'

  try {
    const { accion, payload } = await request.json()
    const supabaseAdmin = obtenerSupabaseAdmin()

    switch (accion) {
      case 'upsert_categoria': {
        const { error } = await supabaseAdmin.from('stock_categorias').upsert(payload)
        if (error) throw error
        return NextResponse.json({ ok: true })
      }
      case 'delete_categoria': {
        const { error } = await supabaseAdmin.from('stock_categorias').delete().eq('id', payload.id)
        if (error) throw error
        return NextResponse.json({ ok: true })
      }
      case 'upsert_insumo': {
        const { error } = await supabaseAdmin.from('stock_insumos').upsert(payload)
        if (error) throw error
        return NextResponse.json({ ok: true })
      }
      case 'delete_insumo': {
        const { error } = await supabaseAdmin.from('stock_insumos').delete().eq('id', payload.id)
        if (error) throw error
        return NextResponse.json({ ok: true })
      }
      case 'update_stock': {
        // Actualización de stock con registro inmutable en el Kardex
        const {
          id,
          stock_actual,
          delta,
          tipo_movimiento = 'ajuste_manual',
          motivo,
          referencia_id,
        } = payload

        // 1. Obtener estado actual del insumo
        const { data: insumo, error: errorInsumo } = await supabaseAdmin
          .from('stock_insumos')
          .select('id, nombre, stock_actual, unidad_medida')
          .eq('id', id)
          .single()

        if (errorInsumo || !insumo) {
          throw new Error('Insumo no encontrado')
        }

        const stockAnterior = Number(insumo.stock_actual) || 0
        let stockNuevo: number
        let cantidadDelta: number

        if (delta !== undefined && delta !== null) {
          cantidadDelta = Number(delta)
          stockNuevo = Math.max(0, stockAnterior + cantidadDelta)
        } else if (stock_actual !== undefined && stock_actual !== null) {
          stockNuevo = Math.max(0, Number(stock_actual))
          cantidadDelta = stockNuevo - stockAnterior
        } else {
          throw new Error('Debe especificar un stock_actual o un delta')
        }

        // Si no hubo cambio numérico, no hacer nada
        if (cantidadDelta === 0) {
          return NextResponse.json({ ok: true, stock_actual: stockAnterior })
        }

        // Determinar tipo de movimiento inteligente si no se pasó uno explícito
        let tipoFinal: TipoMovimientoStock = tipo_movimiento
        if (!tipo_movimiento || tipo_movimiento === 'ajuste_manual') {
          if (cantidadDelta > 0) {
            tipoFinal = 'ingreso_mercaderia'
          } else {
            tipoFinal = 'ajuste_manual'
          }
        }

        // 2. Actualizar stock en la tabla de insumos
        const { error: errorUpdate } = await supabaseAdmin
          .from('stock_insumos')
          .update({ stock_actual: stockNuevo, updated_at: new Date().toISOString() })
          .eq('id', id)

        if (errorUpdate) throw errorUpdate

        // 3. Insertar registro inmutable de Kardex en stock_movimientos
        const { error: errorMov } = await supabaseAdmin.from('stock_movimientos').insert({
          insumo_id: insumo.id,
          insumo_nombre: insumo.nombre,
          tipo_movimiento: tipoFinal,
          cantidad_delta: cantidadDelta,
          stock_anterior: stockAnterior,
          stock_nuevo: stockNuevo,
          unidad_medida: insumo.unidad_medida || 'unidades',
          motivo: motivo || (cantidadDelta > 0 ? 'Reposición manual de stock' : 'Ajuste manual de stock'),
          usuario_nombre: usuarioNombre,
          referencia_id: referencia_id || null,
        })

        if (errorMov) {
          console.warn('[API Stock] Error al registrar movimiento de Kardex:', errorMov)
        }

        return NextResponse.json({ ok: true, stock_actual: stockNuevo })
      }
      case 'registrar_movimiento_masivo': {
        // Ingreso masivo de remito / factura de compra
        const { movimientos, motivoGeneral } = payload
        if (!Array.isArray(movimientos) || movimientos.length === 0) {
          return NextResponse.json({ error: 'Array de movimientos requerido' }, { status: 400 })
        }

        const resultados: any[] = []
        for (const item of movimientos) {
          const { id, delta, tipo_movimiento = 'ingreso_mercaderia', motivo } = item
          const { data: insumo } = await supabaseAdmin
            .from('stock_insumos')
            .select('id, nombre, stock_actual, unidad_medida')
            .eq('id', id)
            .single()

          if (insumo) {
            const stockAnterior = Number(insumo.stock_actual) || 0
            const cantidadDelta = Number(delta) || 0
            const stockNuevo = Math.max(0, stockAnterior + cantidadDelta)

            await supabaseAdmin
              .from('stock_insumos')
              .update({ stock_actual: stockNuevo, updated_at: new Date().toISOString() })
              .eq('id', id)

            await supabaseAdmin.from('stock_movimientos').insert({
              insumo_id: insumo.id,
              insumo_nombre: insumo.nombre,
              tipo_movimiento,
              cantidad_delta: cantidadDelta,
              stock_anterior: stockAnterior,
              stock_nuevo: stockNuevo,
              unidad_medida: insumo.unidad_medida || 'unidades',
              motivo: motivo || motivoGeneral || 'Ingreso masivo de mercadería',
              usuario_nombre: usuarioNombre,
            })

            resultados.push({ id, stock_actual: stockNuevo })
          }
        }

        return NextResponse.json({ ok: true, resultados })
      }
      case 'obtener_kardex': {
        const { insumo_id, tipo, desde, hasta, limite = 100 } = payload || {}

        let query = supabaseAdmin
          .from('stock_movimientos')
          .select('*')
          .order('created_at', { ascending: false })

        if (insumo_id && insumo_id !== 'todos') {
          query = query.eq('insumo_id', insumo_id)
        }

        if (tipo && tipo !== 'todos') {
          query = query.eq('tipo_movimiento', tipo)
        }

        if (desde) {
          query = query.gte('created_at', desde)
        }

        if (hasta) {
          query = query.lte('created_at', hasta)
        }

        query = query.limit(limite)

        const { data, error } = await query
        if (error) throw error

        return NextResponse.json({ ok: true, movimientos: data || [] })
      }
      case 'upsert_receta': {
        // Reemplaza toda la receta de un producto
        const { producto_id, insumos } = payload
        // 1. Borrar vieja
        await supabaseAdmin.from('stock_recetas').delete().eq('producto_id', producto_id)
        // 2. Insertar nuevos
        if (insumos && insumos.length > 0) {
          const insertData = insumos.map((i: any) => ({
            producto_id,
            insumo_id: i.insumo_id,
            cantidad: i.cantidad,
          }))
          const { error } = await supabaseAdmin.from('stock_recetas').insert(insertData)
          if (error) throw error
        }
        return NextResponse.json({ ok: true })
      }
      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('[API Stock] Error:', error)
    return NextResponse.json({ error: error.message || 'Error del servidor' }, { status: 500 })
  }
}

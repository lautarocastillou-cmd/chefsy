import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { TipoMovimientoStock } from '@/tipos/stock'

export interface ItemVendido {
  idCatalogo?: string
  id?: string
  cantidad: number
  nombre?: string
}

/**
 * Registra automáticamente la deducción de stock y el asiento inmutable en el Kardex
 * cuando una comanda/pedido pasa a estado "entregado".
 * Optimizado en batch: solo 1 consulta de recetas, 1 de insumos y 1 inserción masiva.
 */
export async function registrarVentaKardex(
  productos: ItemVendido[],
  referenciaPedidoId: string,
  clienteNombre?: string,
  fechaIso?: string
): Promise<void> {
  if (!Array.isArray(productos) || productos.length === 0) return

  try {
    const supabase = obtenerSupabaseAdmin()

    // 1. Consolidar cantidades por idCatalogo
    const cantidadesPorProducto = new Map<string, { cantidad: number; nombre?: string }>()
    for (const p of productos) {
      const idProd = p.idCatalogo || p.id
      if (!idProd) continue
      const cant = Math.max(1, Number(p.cantidad) || 1)
      const prev = cantidadesPorProducto.get(idProd)
      if (prev) {
        prev.cantidad += cant
      } else {
        cantidadesPorProducto.set(idProd, { cantidad: cant, nombre: p.nombre })
      }
    }

    const idsCatalogo = Array.from(cantidadesPorProducto.keys())
    if (idsCatalogo.length === 0) return

    // 2. Buscar recetas asociadas en 1 sola consulta
    const { data: recetas, error: errRecetas } = await supabase
      .from('stock_recetas')
      .select('producto_id, insumo_id, cantidad')
      .in('producto_id', idsCatalogo)

    if (errRecetas || !recetas || recetas.length === 0) {
      // Ningún producto vendido tiene receta asignada aún
      return
    }

    // 3. Consolidar deducción por insumo
    const deduccionPorInsumo = new Map<string, number>()
    for (const rec of recetas) {
      const prodInfo = cantidadesPorProducto.get(rec.producto_id)
      if (!prodInfo) continue
      const deltaInsumo = (Number(rec.cantidad) || 0) * prodInfo.cantidad
      const prevDelta = deduccionPorInsumo.get(rec.insumo_id) || 0
      deduccionPorInsumo.set(rec.insumo_id, prevDelta + deltaInsumo)
    }

    const idsInsumos = Array.from(deduccionPorInsumo.keys())
    if (idsInsumos.length === 0) return

    // 4. Obtener insumos en batch
    const { data: insumos, error: errInsumos } = await supabase
      .from('stock_insumos')
      .select('id, nombre, stock_actual, unidad_medida')
      .in('id', idsInsumos)

    if (errInsumos || !insumos || insumos.length === 0) return

    const ahoraIso = new Date().toISOString()
    const timestampFinal = fechaIso || ahoraIso
    const updatesInsumos: PromiseLike<any>[] = []
    const filasKardex: any[] = []

    for (const ins of insumos) {
      const deltaTotal = deduccionPorInsumo.get(ins.id) || 0
      if (deltaTotal <= 0) continue

      const stockAnterior = Number(ins.stock_actual) || 0
      const stockNuevo = stockAnterior - deltaTotal

      updatesInsumos.push(
        supabase
          .from('stock_insumos')
          .update({ stock_actual: stockNuevo, updated_at: ahoraIso })
          .eq('id', ins.id)
      )

      filasKardex.push({
        insumo_id: ins.id,
        insumo_nombre: ins.nombre,
        tipo_movimiento: 'venta_automatica' as TipoMovimientoStock,
        cantidad_delta: -deltaTotal,
        stock_anterior: stockAnterior,
        stock_nuevo: stockNuevo,
        unidad_medida: ins.unidad_medida || 'unidades',
        motivo: `Venta Comanda #${referenciaPedidoId}${clienteNombre ? ` (${clienteNombre})` : ''}`,
        usuario_nombre: 'Cocina / Comanda',
        referencia_id: referenciaPedidoId,
        created_at: timestampFinal,
      })
    }

    // 5. Ejecutar updates de stock e inserción de Kardex en paralelo
    await Promise.all([
      ...updatesInsumos,
      filasKardex.length > 0 ? supabase.from('stock_movimientos').insert(filasKardex) : Promise.resolve(),
    ])
  } catch (error) {
    console.error('[Stock Motor] Error al registrar venta en Kardex:', error)
  }
}

/**
 * Restituye el stock y asienta la reversión en el Kardex si un pedido entregado se cancela o revierte.
 */
export async function restituirVentaKardex(
  productos: ItemVendido[],
  referenciaPedidoId: string,
  clienteNombre?: string
): Promise<void> {
  if (!Array.isArray(productos) || productos.length === 0) return

  try {
    const supabase = obtenerSupabaseAdmin()

    const cantidadesPorProducto = new Map<string, number>()
    for (const p of productos) {
      const idProd = p.idCatalogo || p.id
      if (!idProd) continue
      const cant = Math.max(1, Number(p.cantidad) || 1)
      cantidadesPorProducto.set(idProd, (cantidadesPorProducto.get(idProd) || 0) + cant)
    }

    const idsCatalogo = Array.from(cantidadesPorProducto.keys())
    if (idsCatalogo.length === 0) return

    const { data: recetas, error: errRecetas } = await supabase
      .from('stock_recetas')
      .select('producto_id, insumo_id, cantidad')
      .in('producto_id', idsCatalogo)

    if (errRecetas || !recetas || recetas.length === 0) return

    const restitucionPorInsumo = new Map<string, number>()
    for (const rec of recetas) {
      const cantProd = cantidadesPorProducto.get(rec.producto_id) || 0
      const deltaInsumo = (Number(rec.cantidad) || 0) * cantProd
      restitucionPorInsumo.set(rec.insumo_id, (restitucionPorInsumo.get(rec.insumo_id) || 0) + deltaInsumo)
    }

    const idsInsumos = Array.from(restitucionPorInsumo.keys())
    if (idsInsumos.length === 0) return

    const { data: insumos, error: errInsumos } = await supabase
      .from('stock_insumos')
      .select('id, nombre, stock_actual, unidad_medida')
      .in('id', idsInsumos)

    if (errInsumos || !insumos || insumos.length === 0) return

    const ahoraIso = new Date().toISOString()
    const updatesInsumos: PromiseLike<any>[] = []
    const filasKardex: any[] = []

    for (const ins of insumos) {
      const deltaTotal = restitucionPorInsumo.get(ins.id) || 0
      if (deltaTotal <= 0) continue

      const stockAnterior = Number(ins.stock_actual) || 0
      const stockNuevo = stockAnterior + deltaTotal

      updatesInsumos.push(
        supabase
          .from('stock_insumos')
          .update({ stock_actual: stockNuevo, updated_at: ahoraIso })
          .eq('id', ins.id)
      )

      filasKardex.push({
        insumo_id: ins.id,
        insumo_nombre: ins.nombre,
        tipo_movimiento: 'ajuste_manual' as TipoMovimientoStock,
        cantidad_delta: deltaTotal,
        stock_anterior: stockAnterior,
        stock_nuevo: stockNuevo,
        unidad_medida: ins.unidad_medida || 'unidades',
        motivo: `Restitución por Comanda #${referenciaPedidoId}${clienteNombre ? ` (${clienteNombre})` : ''}`,
        usuario_nombre: 'Sistema / Reversión',
        referencia_id: referenciaPedidoId,
      })
    }

    await Promise.all([
      ...updatesInsumos,
      filasKardex.length > 0 ? supabase.from('stock_movimientos').insert(filasKardex) : Promise.resolve(),
    ])
  } catch (error) {
    console.error('[Stock Motor] Error al restituir stock en Kardex:', error)
  }
}

/**
 * Registra deducción por Consumo de Personal en el Kardex.
 */
export async function registrarConsumoPersonalKardex(
  productoId: string,
  productoNombre: string,
  cantidad: number,
  personaNombre: string
): Promise<void> {
  try {
    const supabase = obtenerSupabaseAdmin()
    const cant = Math.max(1, Number(cantidad) || 1)

    // 1. Buscar receta del producto
    const { data: recetas } = await supabase
      .from('stock_recetas')
      .select('insumo_id, cantidad')
      .eq('producto_id', productoId)

    if (recetas && recetas.length > 0) {
      const idsInsumos = recetas.map((r) => r.insumo_id)
      const { data: insumos } = await supabase
        .from('stock_insumos')
        .select('id, nombre, stock_actual, unidad_medida')
        .in('id', idsInsumos)

      if (insumos && insumos.length > 0) {
        const ahoraIso = new Date().toISOString()
        const updates: PromiseLike<any>[] = []
        const kardex: any[] = []

        for (const rec of recetas) {
          const ins = insumos.find((i) => i.id === rec.insumo_id)
          if (!ins) continue
          const delta = (Number(rec.cantidad) || 0) * cant
          const stockAnterior = Number(ins.stock_actual) || 0
          const stockNuevo = stockAnterior - delta

          updates.push(
            supabase.from('stock_insumos').update({ stock_actual: stockNuevo, updated_at: ahoraIso }).eq('id', ins.id)
          )

          kardex.push({
            insumo_id: ins.id,
            insumo_nombre: ins.nombre,
            tipo_movimiento: 'consumo_personal' as TipoMovimientoStock,
            cantidad_delta: -delta,
            stock_anterior: stockAnterior,
            stock_nuevo: stockNuevo,
            unidad_medida: ins.unidad_medida || 'unidades',
            motivo: `Consumo Personal: ${personaNombre} (${cant}x ${productoNombre})`,
            usuario_nombre: personaNombre,
          })
        }

        await Promise.all([...updates, kardex.length > 0 ? supabase.from('stock_movimientos').insert(kardex) : Promise.resolve()])
      }
    }
  } catch (error) {
    console.error('[Stock Motor] Error registrando consumo personal en Kardex:', error)
  }
}

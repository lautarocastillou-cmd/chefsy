// ─────────────────────────────────────────────────────
// app/api/admin/metricas-productos/route.ts
// Agregación analítica de productos vendidos, platos estrella
// y distribución por categorías desde la tabla de pedidos.
// ─────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { productosCatalogo } from '@/datos/productos'

// Mapa de referencia canónica para nombres limpios y categorías oficiales
const MAPA_CATALOGO = new Map<string, { id: string; nombre: string; categoriaId: string }>()
productosCatalogo.forEach(p => {
  MAPA_CATALOGO.set(p.id, { id: p.id, nombre: p.nombre, categoriaId: p.categoriaId })
})

interface ItemProductoComanda {
  id?: string
  nombre?: string
  name?: string
  cantidad?: number
  qty?: number
  precio?: number
  price?: number
  categoriaId?: string
  categoria_id?: string
  [key: string]: any
}

const COLORES_CATEGORIA: Record<string, string> = {
  'Burgers & Patys': '#f97316',
  'Pizzas': '#ef4444',
  'Lomos': '#8b5cf6',
  'Milas': '#eab308',
  'Mila al Plato': '#d97706',
  'Zapping': '#10b981',
  'Papas Fritas': '#facc15',
  'Bebidas': '#06b6d4',
  'Tartas XL': '#ec4899',
  'Promos': '#6366f1',
  'Otros Platos': '#64748b'
}

function normalizarCategoria(catId?: string, nombreProd?: string): string {
  const c = (catId || '').toLowerCase()
  const n = (nombreProd || '').toLowerCase()

  if (c.includes('zapping') || n.includes('zapping')) return 'Zapping'
  if (c.includes('burger') || c.includes('paty') || n.includes('burger') || n.includes('paty')) return 'Burgers & Patys'
  if (c.includes('lomo') || n.includes('lomo')) return 'Lomos'
  if (c.includes('mila-al-plato') || n.includes('al plato')) return 'Mila al Plato'
  if (c.includes('mila') || n.includes('mila')) return 'Milas'
  if (c.includes('pizza') || n.includes('pizza')) return 'Pizzas'
  if (c.includes('papa') || n.includes('papa')) return 'Papas Fritas'
  if (c.includes('tarta') || n.includes('tarta')) return 'Tartas XL'
  if (c.includes('bebida') || c.includes('coca') || n.includes('coca') || n.includes('agua') || n.includes('bebida') || n.includes('cerveza')) return 'Bebidas'
  if (c.includes('promo') || n.includes('promo') || n.includes('combo')) return 'Promos'
  return 'Otros Platos'
}

export async function GET(request: Request) {
  try {
    const sesion = await obtenerSesion()
    if (!sesion) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
    }

    if (sesion.rol !== 'admin' && sesion.rol !== 'cajero') {
      return NextResponse.json({ error: 'Operación reservada para administradores o cajeros.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const desde = searchParams.get('desde') // YYYY-MM-DD
    const hasta = searchParams.get('hasta') // YYYY-MM-DD
    const turnoFiltro = searchParams.get('turno') || 'todos' // 'todos' | 'mediodia' | 'noche'

    const supabaseAdmin = obtenerSupabaseAdmin()

    let pedidos: any[] = []
    let from = 0
    const step = 1000

    while (true) {
      let query = supabaseAdmin
        .from('pedidos')
        .select('id, fecha, hora, estado, total, productos, created_at')
        .neq('estado', 'cancelado')
        .order('created_at', { ascending: true })
        .range(from, from + step - 1)

      if (desde) {
        query = query.gte('fecha', desde)
      }
      if (hasta) {
        query = query.lte('fecha', hasta)
      }

      const { data, error } = await query

      if (error) {
        console.error('[API Metricas Productos] Error de consulta Supabase:', error)
        throw error
      }

      if (!data || data.length === 0) break
      pedidos = pedidos.concat(data)
      if (data.length < step) break
      from += step
    }

    if (!pedidos || pedidos.length === 0) {
      return NextResponse.json({
        resumen: { totalComandas: 0, totalUnidades: 0, totalFacturacionProductos: 0 },
        productoEstrella: null,
        productoEstrellaMediodia: null,
        productoEstrellaNoche: null,
        topProductos: [],
        mixCategorias: []
      })
    }

function esPedidoMediodia(p: { hora?: string | null; created_at?: string | null }): boolean {
  if (p.hora) {
    const esPM = /p\.?\s*m\.?|pm/i.test(p.hora)
    const esAM = /a\.?\s*m\.?|am/i.test(p.hora)
    const numStr = p.hora.replace(/[^0-9:]/g, '').split(':')[0]
    let h = Number(numStr) || 0
    if (esPM && h < 12) h += 12
    else if (esAM && h === 12) h = 0
    return h >= 10 && h < 16
  }
  if (p.created_at) {
    const d = new Date(p.created_at)
    const h = d.getHours()
    return h >= 10 && h < 17
  }
  return false
}

    // Filtrado por turno si aplica
    const pedidosFiltrados = pedidos.filter(p => {
      if (turnoFiltro === 'todos') return true
      const esMediodia = esPedidoMediodia(p)
      return turnoFiltro === 'mediodia' ? esMediodia : !esMediodia
    })

    const totalComandas = pedidosFiltrados.length
    let totalUnidades = 0
    let totalFacturacionProductos = 0

    // Estructuras de acumulación
    interface AcumuladorProducto {
      id: string
      nombre: string
      categoria: string
      categoriaId: string
      unidades: number
      facturacion: number
      comandasSet: Set<string>
      precioPromedio: number
    }

    const productosMap = new Map<string, AcumuladorProducto>()
    const mediodiaMap = new Map<string, AcumuladorProducto>()
    const nocheMap = new Map<string, AcumuladorProducto>()

    const categoriasMap = new Map<string, {
      categoria: string
      unidades: number
      facturacion: number
      color: string
    }>()

    // Procesar cada comanda
    pedidosFiltrados.forEach(pedido => {
      const prods: ItemProductoComanda[] = Array.isArray(pedido.productos) ? pedido.productos : []
      const esMediodia = esPedidoMediodia(pedido)

      prods.forEach(item => {
        const rawNombre = (item.nombre || item.name || 'Producto').trim()
        const baseNombre = rawNombre.split(' (+ ')[0].trim().replace(/^["']|["']$/g, '')

        // NUNCA usar item.id aquí porque es el identificador efímero de línea de carrito
        const idCatalogo = (item.idCatalogo || item.id_catalogo || item.productoId || '').trim()

        // Buscar información canónica en catálogo si existe
        const infoCatalogo = idCatalogo ? MAPA_CATALOGO.get(idCatalogo) : null
        const idProd = idCatalogo || baseNombre.toLowerCase()
        const nombreProducto = infoCatalogo?.nombre || baseNombre
        const categoriaId = infoCatalogo?.categoriaId || item.categoriaId || item.categoria_id || ''
        const categoria = normalizarCategoria(categoriaId, nombreProducto)

        const cantidad = Number(item.cantidad || item.qty || 1)
        const precioUnitario = Number(item.precio || item.price || 0)
        const subtotal = cantidad * precioUnitario

        totalUnidades += cantidad
        totalFacturacionProductos += subtotal

        // 1. Acumulador General
        const keyGeneral = idProd
        if (!productosMap.has(keyGeneral)) {
          productosMap.set(keyGeneral, {
            id: idProd,
            nombre: nombreProducto,
            categoria,
            categoriaId,
            unidades: 0,
            facturacion: 0,
            comandasSet: new Set<string>(),
            precioPromedio: precioUnitario
          })
        }
        const pGen = productosMap.get(keyGeneral)!
        pGen.unidades += cantidad
        pGen.facturacion += subtotal
        pGen.comandasSet.add(pedido.id)

        // 2. Acumulador de Turno
        const targetTurnoMap = esMediodia ? mediodiaMap : nocheMap
        if (!targetTurnoMap.has(keyGeneral)) {
          targetTurnoMap.set(keyGeneral, {
            id: idProd,
            nombre: nombreProducto,
            categoria,
            categoriaId,
            unidades: 0,
            facturacion: 0,
            comandasSet: new Set<string>(),
            precioPromedio: precioUnitario
          })
        }
        const pTurno = targetTurnoMap.get(keyGeneral)!
        pTurno.unidades += cantidad
        pTurno.facturacion += subtotal
        pTurno.comandasSet.add(pedido.id)

        // 3. Acumulador de Categorías
        if (!categoriasMap.has(categoria)) {
          categoriasMap.set(categoria, {
            categoria,
            unidades: 0,
            facturacion: 0,
            color: COLORES_CATEGORIA[categoria] || '#64748b'
          })
        }
        const cCat = categoriasMap.get(categoria)!
        cCat.unidades += cantidad
        cCat.facturacion += subtotal
      })
    })

    // Helper para transformar el mapa de productos a lista ordenada
    const formatearLista = (mapa: Map<string, AcumuladorProducto>) => {
      return Array.from(mapa.values())
        .map(p => ({
          id: p.id,
          nombre: p.nombre,
          categoria: p.categoria,
          categoriaId: p.categoriaId,
          unidades: p.unidades,
          facturacion: p.facturacion,
          comandas: p.comandasSet.size,
          porcentajeComandas: totalComandas > 0 ? Number(((p.comandasSet.size / totalComandas) * 100).toFixed(1)) : 0,
          porcentajeVentas: totalFacturacionProductos > 0 ? Number(((p.facturacion / totalFacturacionProductos) * 100).toFixed(1)) : 0
        }))
        .sort((a, b) => b.unidades - a.unidades || b.facturacion - a.facturacion)
    }

    const productosOrdenados = formatearLista(productosMap)
    const mediodiaOrdenados = formatearLista(mediodiaMap)
    const nocheOrdenados = formatearLista(nocheMap)

    const productoEstrella = productosOrdenados.length > 0 ? productosOrdenados[0] : null
    const productoEstrellaMediodia = mediodiaOrdenados.length > 0 ? mediodiaOrdenados[0] : null
    const productoEstrellaNoche = nocheOrdenados.length > 0 ? nocheOrdenados[0] : null
    const topProductos = productosOrdenados.slice(0, 5)

    // Formatear mix de categorías
    const mixCategorias = Array.from(categoriasMap.values())
      .map(c => ({
        ...c,
        porcentaje: totalFacturacionProductos > 0 ? Number(((c.facturacion / totalFacturacionProductos) * 100).toFixed(1)) : 0,
        porcentajeUnidades: totalUnidades > 0 ? Number(((c.unidades / totalUnidades) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.facturacion - a.facturacion)

    return NextResponse.json({
      resumen: {
        totalComandas,
        totalUnidades,
        totalFacturacionProductos
      },
      productoEstrella,
      productoEstrellaMediodia,
      productoEstrellaNoche,
      topProductos,
      mixCategorias
    })
  } catch (error: any) {
    console.error('[API Metricas Productos] Error general:', error)
    return NextResponse.json({ error: 'Error al procesar métricas de productos.' }, { status: 500 })
  }
}

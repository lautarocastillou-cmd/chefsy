// ─────────────────────────────────────────────────────
// app/api/admin/metricas-avanzadas/route.ts
// Suite Analítica Gastronómica Enterprise:
// 1. Matriz BCG (Ingeniería de Menú)
// 2. Medidores de SLA y Velocidad (Tacómetros)
// 3. Mapa de Calor Horario (Heatmap de Ráfagas)
// 4. Radiografía de Fidelidad y Retención de Clientes
// 5. Rendimiento de Canales & Costo Real de Delivery
// ─────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { obtenerHoraArgentina } from '@/lib/tiempo'
import { productosCatalogo } from '@/datos/productos'
import { OBTENER_DETALLES_COMPLEMENTARIOS } from '@/lib/tienda-helpers'

// Mapa canónico del catálogo para nombres limpios y fotos
const MAPA_CATALOGO = new Map<string, { id: string; nombre: string; categoriaId: string }>()
productosCatalogo.forEach(p => {
  MAPA_CATALOGO.set(p.id, { id: p.id, nombre: p.nombre, categoriaId: p.categoriaId })
})

interface ItemProductoComanda {
  id?: string
  idCatalogo?: string
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
    const horaArg = obtenerHoraArgentina(d)
    const h = horaArg.getHours()
    return h >= 10 && h < 17
  }
  return false
}

function obtenerHoraYDiaPedido(p: { hora?: string | null; created_at?: string | null; fecha?: string }): { diaSemana: number; hora: number } {
  let hora = 21
  let diaSemana = 5 // default Viernes

  if (p.hora) {
    const esPM = /p\.?\s*m\.?|pm/i.test(p.hora)
    const esAM = /a\.?\s*m\.?|am/i.test(p.hora)
    const numStr = p.hora.replace(/[^0-9:]/g, '').split(':')[0]
    let h = Number(numStr) || 0
    if (esPM && h < 12) h += 12
    else if (esAM && h === 12) h = 0
    if (h >= 0 && h <= 23) hora = h
  } else if (p.created_at) {
    const d = new Date(p.created_at)
    const horaArg = obtenerHoraArgentina(d)
    hora = horaArg.getHours()
  }

  if (p.fecha) {
    const [y, m, d] = p.fecha.split('-').map(Number)
    if (y && m && d) {
      const dt = new Date(y, m - 1, d)
      diaSemana = dt.getDay() // 0 = Domingo, 1 = Lunes, etc.
    }
  } else if (p.created_at) {
    const dt = new Date(p.created_at)
    const horaArg = obtenerHoraArgentina(dt)
    diaSemana = horaArg.getDay()
  }

  return { diaSemana, hora }
}

const NOMBRES_DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

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

    // 1. Obtener todas las comandas requeridas paginando de a 1.000 filas
    let pedidos: any[] = []
    let from = 0
    const step = 1000

    while (true) {
      let query = supabaseAdmin
        .from('pedidos')
        .select('id, fecha, hora, estado, total, productos, created_at, listo_at, en_camino_at, entregado_at, cliente, telefono, tipoEntrega, costoEnvio, metodoPago')
        .neq('estado', 'cancelado')
        .order('created_at', { ascending: true })
        .range(from, from + step - 1)

      const { data, error } = await query
      if (error) {
        console.error('[API Metricas Avanzadas] Error consultando pedidos:', error)
        throw error
      }

      if (!data || data.length === 0) break
      pedidos = pedidos.concat(data)
      if (data.length < step) break
      from += step
    }

    // 2. Historial de clientes acumulado a lo largo de toda la historia
    interface PedidoHistCliente {
      fecha: string
      total: number
      timestamp: number
      productos: Array<{ id: string; nombre: string }>
    }

    const historialClientes = new Map<string, {
      telefono: string
      nombre: string
      primerPedidoFecha: string
      ultimoPedidoFecha: string
      pedidosHistoricos: number
      gastoHistorico: number
      fechasPedidos: number[]
      pedidosList: PedidoHistCliente[]
    }>()

    pedidos.forEach(p => {
      const tel = (p.telefono || '').replace(/\D/g, '')
      if (!tel || tel.length < 6) return

      const fechaPed = p.created_at || p.fecha || ''
      const timestamp = new Date(fechaPed).getTime() || 0
      const totalPed = Number(p.total) || 0

      let items: ItemProductoComanda[] = []
      if (Array.isArray(p.productos)) items = p.productos
      else if (typeof p.productos === 'string') {
        try { items = JSON.parse(p.productos) } catch {}
      }

      const prodsEnPedido: Array<{ id: string; nombre: string }> = []
      items.forEach(it => {
        const rawNombre = (it.nombre || it.name || '').trim()
        if (!rawNombre) return
        const nombreLimpio = rawNombre.split(' (+ ')[0].trim().replace(/^["']|["']$/g, '')
        const rawId = (it.idCatalogo || it.id_catalogo || it.productoId || '').trim()
        const catItem = MAPA_CATALOGO.get(rawId)
        const idKey = (catItem?.id || rawId || nombreLimpio).toLowerCase()
        const nombreFinal = catItem?.nombre || nombreLimpio
        prodsEnPedido.push({ id: idKey, nombre: nombreFinal })
      })

      if (!historialClientes.has(tel)) {
        historialClientes.set(tel, {
          telefono: tel,
          nombre: p.cliente || 'Cliente',
          primerPedidoFecha: fechaPed,
          ultimoPedidoFecha: fechaPed,
          pedidosHistoricos: 0,
          gastoHistorico: 0,
          fechasPedidos: [],
          pedidosList: []
        })
      }

      const hc = historialClientes.get(tel)!
      hc.pedidosHistoricos += 1
      hc.gastoHistorico += totalPed
      if (timestamp > 0) hc.fechasPedidos.push(timestamp)
      hc.pedidosList.push({
        fecha: fechaPed,
        total: totalPed,
        timestamp,
        productos: prodsEnPedido
      })

      if (fechaPed && (!hc.primerPedidoFecha || new Date(fechaPed) < new Date(hc.primerPedidoFecha))) {
        hc.primerPedidoFecha = fechaPed
      }
      if (fechaPed && (!hc.ultimoPedidoFecha || new Date(fechaPed) > new Date(hc.ultimoPedidoFecha))) {
        hc.ultimoPedidoFecha = fechaPed
        if (p.cliente) hc.nombre = p.cliente
      }
    })

    // 3. Filtrar pedidos según rango de fecha y turno seleccionado
    const pedidosFiltrados = pedidos.filter(p => {
      if (desde && p.fecha < desde) return false
      if (hasta && p.fecha > hasta) return false

      if (turnoFiltro !== 'todos') {
        const esMediodia = esPedidoMediodia(p)
        if (turnoFiltro === 'mediodia' && !esMediodia) return false
        if (turnoFiltro === 'noche' && esMediodia) return false
      }

      return true
    })

    const totalComandas = pedidosFiltrados.length

    // ── MÓDULO 1: MATRIZ DE INGENIERÍA DE MENÚ ─────────────────────────────
    interface ProdStats {
      id: string
      nombre: string
      categoria: string
      categoriaId: string
      unidades: number
      facturacionTotal: number
      comandasCount: number
      imagenUrl?: string
    }
    const mapaProductos = new Map<string, ProdStats>()

    pedidosFiltrados.forEach(p => {
      let items: ItemProductoComanda[] = []
      if (Array.isArray(p.productos)) items = p.productos
      else if (typeof p.productos === 'string') {
        try { items = JSON.parse(p.productos) } catch {}
      }

      const nombresEnComanda = new Set<string>()

      items.forEach(item => {
        const rawNombre = (item.nombre || item.name || '').trim()
        if (!rawNombre) return
        const nombreLimpio = rawNombre.split(' (+ ')[0].trim().replace(/^["']|["']$/g, '')

        const idCatalogo = (item.idCatalogo || item.id_catalogo || item.productoId || '').trim()
        const catItem = MAPA_CATALOGO.get(idCatalogo)
        const idKey = (catItem?.id || idCatalogo || nombreLimpio).toLowerCase()
        const nombreFinal = catItem?.nombre || nombreLimpio
        const cantidad = Number(item.cantidad || item.qty || 1)
        const precioUnitario = Number(item.precio || item.price || 0)
        const subtotal = precioUnitario * cantidad
        const categoriaIdFinal = catItem?.categoriaId || item.categoriaId || item.categoria_id || ''
        const categoria = normalizarCategoria(categoriaIdFinal, nombreFinal)

        if (!mapaProductos.has(idKey)) {
          const detalles = OBTENER_DETALLES_COMPLEMENTARIOS(categoriaIdFinal, nombreFinal, idKey)
          mapaProductos.set(idKey, {
            id: idKey,
            nombre: nombreFinal,
            categoria,
            categoriaId: categoriaIdFinal,
            unidades: 0,
            facturacionTotal: 0,
            comandasCount: 0,
            imagenUrl: detalles.img || undefined
          })
        }

        const stat = mapaProductos.get(idKey)!
        stat.unidades += cantidad
        stat.facturacionTotal += subtotal

        if (!nombresEnComanda.has(idKey)) {
          stat.comandasCount += 1
          nombresEnComanda.add(idKey)
        }
      })
    })

    const arrayProductos = Array.from(mapaProductos.values())
    const totalUnidadesVendidas = arrayProductos.reduce((acc, p) => acc + p.unidades, 0)
    const totalFacturacionMenu = arrayProductos.reduce((acc, p) => acc + p.facturacionTotal, 0)

    // Umbrales para clasificación en cuadrantes (Ingeniería de Menú: Miller / Kasavana & Smith)
    const umbralVolumenMedio = arrayProductos.length > 0 ? (totalUnidadesVendidas / arrayProductos.length) : 0
    const umbralPrecioMedio = totalUnidadesVendidas > 0 ? (totalFacturacionMenu / totalUnidadesVendidas) : 0

    // Rankings de productos
    const porFacturacion = [...arrayProductos].sort((a, b) => b.facturacionTotal - a.facturacionTotal)
    const mapRankingFacturacion = new Map<string, number>()
    porFacturacion.forEach((p, idx) => mapRankingFacturacion.set(p.id, idx + 1))

    const porUnidades = [...arrayProductos].sort((a, b) => b.unidades - a.unidades)
    const mapRankingUnidades = new Map<string, number>()
    porUnidades.forEach((p, idx) => mapRankingUnidades.set(p.id, idx + 1))

    let cantEstrellas = 0
    let cantCaballos = 0
    let cantRompecabezas = 0
    let cantLastres = 0

    const platosClasificados = arrayProductos.map(p => {
      const precioPromedio = p.unidades > 0 ? Math.round(p.facturacionTotal / p.unidades) : 0
      const participacionUnidadesPct = totalUnidadesVendidas > 0 ? Math.round((p.unidades / totalUnidadesVendidas) * 1000) / 10 : 0
      const participacionFacturacionPct = totalFacturacionMenu > 0 ? Math.round((p.facturacionTotal / totalFacturacionMenu) * 1000) / 10 : 0
      const porcentajeComandas = totalComandas > 0 ? Math.round((p.comandasCount / totalComandas) * 1000) / 10 : 0

      const altaPopularidad = p.unidades >= umbralVolumenMedio
      const altaRentabilidad = precioPromedio >= umbralPrecioMedio

      let cuadrante: 'estrella' | 'caballo' | 'rompecabezas' | 'lastre'
      if (altaPopularidad && altaRentabilidad) {
        cuadrante = 'estrella'
        cantEstrellas++
      } else if (altaPopularidad && !altaRentabilidad) {
        cuadrante = 'caballo'
        cantCaballos++
      } else if (!altaPopularidad && altaRentabilidad) {
        cuadrante = 'rompecabezas'
        cantRompecabezas++
      } else {
        cuadrante = 'lastre'
        cantLastres++
      }

      // Recomendación y Diagnóstico Específico por Producto
      const catLower = p.categoria.toLowerCase()
      const nomLower = p.nombre.toLowerCase()
      let accionSugerida = ''
      let diagnostico = ''
      let razon = ''
      let significado = ''
      let accionesChefsy: string[] = []

      if (cuadrante === 'estrella') {
        diagnostico = 'Alta popularidad + Alto valor económico'
        razon = `Supera el corte de volumen (${p.unidades} u. vendidas vs corte de ${Math.round(umbralVolumenMedio * 10) / 10} u.) y supera el corte de ticket ($${precioPromedio.toLocaleString('es-AR')} vs corte de $${Math.round(umbralPrecioMedio).toLocaleString('es-AR')}).`
        significado = 'Es un producto ancla: el cliente lo elige activamente y aporta una porción sustancial a la facturación de Chefsy.'

        if (catLower.includes('burger') || catLower.includes('paty') || nomLower.includes('zapping')) {
          accionSugerida = 'Hamburguesa insignia. Mantener receta intacta, foto en portada y stock de pan/medallones garantizado.'
          accionesChefsy = [
            'Proteger la estandarización estricta de panes y medallones en horas pico.',
            'Mantenerla visible en la portada de la tienda online sin aplicar descuentos individuales.',
            'Ofrecer opcionales premium (extra cheddar, panceta) para maximizar el ticket comanda.',
            'Priorizar la velocidad de ensamblado para evitar demoras en cocina.'
          ]
        } else if (catLower.includes('lomo') || catLower.includes('mila')) {
          accionSugerida = 'Plato fuerte de alto ticket. Cuidar porciones de lomo/mila y mantenerlo como opción premium recomendada.'
          accionesChefsy = [
            'Asegurar abastecimiento de carne de primera calidad y papas de acompañamiento.',
            'Evitar quiebres de stock en turnos noche cuando se concentra la demanda.',
            'Mantener su posición de destaque en la sección de platos principales.'
          ]
        } else if (catLower.includes('pizza')) {
          accionSugerida = 'Pizza estrella de alta rotación. Asegurar masa madre/estándar y muzzarella en horarios pico sin demoras.'
          accionesChefsy = [
            'Precocinar o tener lista la mise-en-place de prepizzas para absorber ráfagas.',
            'Empaquetarla en combos familiares con bebidas para pedidos de fin de semana.',
            'Mantener la calidad del queso y salsa sin variaciones de costo que afecten el sabor.'
          ]
        } else if (catLower.includes('promo') || catLower.includes('combo')) {
          accionSugerida = 'Combo estrella con máxima tracción. Mantener en banner superior y auditar que la cocina lo despache ágilmente.'
          accionesChefsy = [
            'Mantener visible en cabecera principal de la tienda online.',
            'Asegurar stock de gaseosas y envases descartables asociados.',
            'Monitorear tiempos de comanda para que no sature la freidora o plancha.'
          ]
        } else {
          accionSugerida = 'Pilar del menú. Proteger consistencia, asegurar disponibilidad continua y mantener máxima visibilidad.'
          accionesChefsy = [
            'Proteger la receta estandarizada y la calidad del producto.',
            'Garantizar abastecimiento de insumos para no quebrar stock en días fuertes.',
            'No hacer descuentos innecesarios: el cliente ya lo valora y lo paga.'
          ]
        }
      } else if (cuadrante === 'caballo') {
        diagnostico = 'Alta popularidad + Menor valor unitario'
        razon = `Vende por encima del corte de volumen (${p.unidades} u. vs corte de ${Math.round(umbralVolumenMedio * 10) / 10} u.), pero su precio ($${precioPromedio.toLocaleString('es-AR')}) está por debajo del corte de ticket ($${Math.round(umbralPrecioMedio).toLocaleString('es-AR')}).`
        significado = 'Genera mucho volumen y pedidos, pero aporta un ticket unitario menor. Es el candidato natural para empaquetar y subir el ticket medio.'

        if (catLower.includes('papa')) {
          accionSugerida = 'Acompañamiento masivo. Ofrecer agregados con margen (cheddar, verdeo, bacon) o combo cerrado con plato principal.'
          accionesChefsy = [
            'Ofrecer opciones cargadas (cheddar/bacon/verdeo) que eleven el ticket unitario.',
            'Empaquetarlas en combo sugerido durante el checkout en el carrito.',
            'Monitorear el rendimiento de insumos y aceite para maximizar margen.'
          ]
        } else if (catLower.includes('bebida')) {
          accionSugerida = 'Bebida de alta rotación. Mantener stock frío y armar combos fijos con comida para monetizar la salida.'
          accionesChefsy = [
            'Armar combos obligados con hamburguesas y pizzas para asegurar venta conjunta.',
            'Mantener siempre stock frío en heladeras para retiro y despacho inmediato.',
            'Revisar acuerdos de compra por volumen con distribuidores locales.'
          ]
        } else if (catLower.includes('burger') || catLower.includes('paty')) {
          accionSugerida = 'Burger accesible de alto volumen. Probar combo con gaseosa chica o testear suba gradual (+3% a 5%).'
          accionesChefsy = [
            'Diseñar combo con bebida para llevar el ticket al umbral del menú.',
            'Testear un aumento sutil de precio para medir elasticidad sin perder volumen.',
            'Ofrecer adicionales durante el pedido (doble carne, papas extra).'
          ]
        } else {
          accionSugerida = 'Fuerte volumen pero ticket moderado. Crear combos con bebida o adicionales para elevar el ticket comanda.'
          accionesChefsy = [
            'No retirar el producto: tracciona pedidos y atrae clientes.',
            'Empaquetarlo con bebida o papas para elevar el ticket comanda.',
            'Analizar posibilidad de ajuste gradual de precio (+3% a 5%).'
          ]
        }
      } else if (cuadrante === 'rompecabezas') {
        diagnostico = 'Baja popularidad + Alto valor económico'
        razon = `Tiene un precio unitario elevado ($${precioPromedio.toLocaleString('es-AR')} vs corte de $${Math.round(umbralPrecioMedio).toLocaleString('es-AR')}), pero sus ventas (${p.unidades} u.) están por debajo del corte (${Math.round(umbralVolumenMedio * 10) / 10} u.).`
        significado = 'Plato con excelente aporte al ticket pero baja salida. No conviene eliminarlo sin antes intentar aumentar su visibilidad o probar promociones.'

        if (catLower.includes('lomo') || catLower.includes('mila')) {
          accionSugerida = 'Plato premium con baja salida. Mejorar fotografía en primer plano y probar ubicarlo como Recomendación del Chef.'
          accionesChefsy = [
            'Revisar foto y descripción en la tienda para resaltar por qué es una opción gourmet/especial.',
            'Destacarlo en la sección de recomendados o al inicio de la categoría.',
            'Probar una promo de lanzamiento temporal en días tranquilos (martes/miércoles).'
          ]
        } else if (catLower.includes('pizza')) {
          accionSugerida = 'Pizza de buen ticket pero poco movimiento. Armar promo combinada con una clásica para incentivar el testeo.'
          accionesChefsy = [
            'Ofrecerla en combo mitad y mitad o con una pizza tradicional.',
            'Mejorar la descripción de los ingredientes para tentar al comensal.',
            'Evaluar si el nombre es claro o si requiere un cambio comunicacional.'
          ]
        } else {
          accionSugerida = 'Aporte económico alto con baja rotación. Mejorar fotografía y ubicación en carta antes de considerar cambios.'
          accionesChefsy = [
            'No eliminar automáticamente: aporta buen ticket cuando se vende.',
            'Mejorar la presentación fotográfica en la tienda online.',
            'Probar ofertas o combos de prueba para incentivar la primera compra.'
          ]
        }
      } else {
        diagnostico = 'Baja popularidad + Menor valor unitario'
        razon = `Registra ventas por debajo del corte (${p.unidades} u. vs corte de ${Math.round(umbralVolumenMedio * 10) / 10} u.) y precio por debajo del umbral ($${precioPromedio.toLocaleString('es-AR')} vs $${Math.round(umbralPrecioMedio).toLocaleString('es-AR')}).`
        significado = 'Plato de bajo movimiento que aporta poco volumen y poca facturación. Puede complicar la cocina o compras sin justificación comercial.'

        if (p.unidades <= 3) {
          accionSugerida = 'Salida prácticamente nula (≤3 u.). Candidato directo a retiro para simplificar la cocina y compras.'
          accionesChefsy = [
            'Discontinuar de la tienda online para no saturar al cliente con opciones sin demanda.',
            'Liberar espacio en heladera y mise-en-place de cocina.',
            'Evitar comprar insumos exclusivos que puedan vencerse.'
          ]
        } else {
          accionSugerida = 'Baja rotación y escaso aporte monetario. Evaluar si comparte insumos con estrellas o retirarlo de la carta.'
          accionesChefsy = [
            'Auditar si requiere ingredientes exclusivos que generen mermas.',
            'Si comparte insumos con platos estrella, mantenerlo como opción secundaria.',
            'Si no repunta en el próximo ciclo mensual, evaluar su reemplazo.'
          ]
        }
      }

      return {
        id: p.id,
        nombre: p.nombre,
        categoria: p.categoria,
        categoriaId: p.categoriaId,
        imagenUrl: p.imagenUrl,
        unidades: p.unidades,
        participacionUnidadesPct,
        porcentajeComandas,
        precioPromedio,
        facturacionTotal: p.facturacionTotal,
        participacionFacturacionPct,
        rankingFacturacion: mapRankingFacturacion.get(p.id) || 1,
        rankingUnidades: mapRankingUnidades.get(p.id) || 1,
        cuadrante,
        diagnostico,
        accionSugerida,
        diagnosticoDetallado: {
          razon,
          significado,
          accionesChefsy
        }
      }
    }).sort((a, b) => b.facturacionTotal - a.facturacionTotal)

    // Agregación de Métricas por Cuadrante
    const buildStatsCuadrante = (cuadrante: 'estrella' | 'caballo' | 'rompecabezas' | 'lastre', accion: string) => {
      const items = platosClasificados.filter(p => p.cuadrante === cuadrante)
      const count = items.length
      const facturacionTotal = items.reduce((a, b) => a + b.facturacionTotal, 0)
      const unidadesTotal = items.reduce((a, b) => a + b.unidades, 0)
      const porcentajeFacturacion = totalFacturacionMenu > 0 ? Math.round((facturacionTotal / totalFacturacionMenu) * 1000) / 10 : 0
      const porcentajeUnidades = totalUnidadesVendidas > 0 ? Math.round((unidadesTotal / totalUnidadesVendidas) * 1000) / 10 : 0
      const precioPromedio = unidadesTotal > 0 ? Math.round(facturacionTotal / unidadesTotal) : 0

      return {
        count,
        facturacionTotal,
        porcentajeFacturacion,
        unidadesTotal,
        porcentajeUnidades,
        precioPromedio,
        accionPrincipal: accion
      }
    }

    const statsEstrellas = buildStatsCuadrante('estrella', 'Proteger, mantener disponibilidad y dar máxima visibilidad.')
    const statsCaballos = buildStatsCuadrante('caballo', 'Monetizar el volumen: empaquetar en combos con bebida o papas.')
    const statsRompecabezas = buildStatsCuadrante('rompecabezas', 'Impulsar visibilidad: mejorar foto y probar promos antes de retirar.')
    const statsLastres = buildStatsCuadrante('lastre', 'Auditar complejidad: simplificar insumos o descontinuar platos sin rotación.')

    // Resumen Ejecutivo Dinámico ("Lectura rápida del menú")
    const conclusionesEjecutivas: string[] = []
    if (cantEstrellas > 0) {
      conclusionesEjecutivas.push(
        `${cantEstrellas} platos Estrella concentran el ${statsEstrellas.porcentajeFacturacion}% de la facturación total y sostienen el ${statsEstrellas.porcentajeUnidades}% del volumen. Son el motor de Chefsy: no aplicar descuentos y asegurar insumos en turnos pico.`
      )
    }
    if (cantCaballos > 0) {
      conclusionesEjecutivas.push(
        `Los ${cantCaballos} Caballos de Batalla generan ${statsCaballos.unidadesTotal} unidades (${statsCaballos.porcentajeUnidades}% del volumen) con un ticket promedio de $${statsCaballos.precioPromedio.toLocaleString('es-AR')}. Oportunidad directa para crear combos con bebidas o adicionales para subir el ticket.`
      )
    }
    if (cantRompecabezas > 0) {
      conclusionesEjecutivas.push(
        `Hay ${cantRompecabezas} productos Rompecabezas con ticket alto ($${statsRompecabezas.precioPromedio.toLocaleString('es-AR')}) pero baja venta (${statsRompecabezas.porcentajeUnidades}% del volumen). Conviene mejorar fotografía y ubicarlos en cabecera antes de evaluar cambios.`
      )
    }
    if (cantLastres > 0) {
      conclusionesEjecutivas.push(
        `${cantLastres} platos están en cuadrante Lastre aportando solo el ${statsLastres.porcentajeFacturacion}% de la caja. Revisar si complican la mise-en-place y compras de insumos para considerar su retiro.`
      )
    }

    // ── MÓDULO 2: MEDIDORES DE SLA Y VELOCIDAD (TACÓMETROS) ─────────────────
    let cocinaMuestras: number[] = []
    let cadeteMuestras: number[] = []
    let leadTimeMuestras: number[] = []

    pedidosFiltrados.forEach(p => {
      if (p.created_at && p.listo_at) {
        const delta = (new Date(p.listo_at).getTime() - new Date(p.created_at).getTime()) / 60000
        if (delta > 0 && delta <= 240) cocinaMuestras.push(delta)
      }

      if (p.entregado_at) {
        const startCadete = p.en_camino_at || p.listo_at
        if (startCadete) {
          const delta = (new Date(p.entregado_at).getTime() - new Date(startCadete).getTime()) / 60000
          if (delta > 0 && delta <= 180) cadeteMuestras.push(delta)
        }

        if (p.created_at) {
          const delta = (new Date(p.entregado_at).getTime() - new Date(p.created_at).getTime()) / 60000
          if (delta > 0 && delta <= 300) leadTimeMuestras.push(delta)
        }
      }
    })

    const calcProm = (arr: number[]) => arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0

    const promCocina = calcProm(cocinaMuestras)
    const cocinaRapido = cocinaMuestras.filter(m => m < 18).length
    const cocinaOptimo = cocinaMuestras.filter(m => m >= 18 && m <= 30).length
    const cocinaAlerta = cocinaMuestras.filter(m => m > 30).length

    const promCadete = calcProm(cadeteMuestras)
    const cadeteExpress = cadeteMuestras.filter(m => m < 15).length
    const cadeteNormal = cadeteMuestras.filter(m => m >= 15 && m <= 25).length
    const cadeteDemorado = cadeteMuestras.filter(m => m > 25).length

    const promLeadTime = calcProm(leadTimeMuestras)
    const leadTimeCumple = leadTimeMuestras.filter(m => m < 40).length
    const leadTimeExcede = leadTimeMuestras.filter(m => m >= 40).length

    // ── MÓDULO 3: MAPA DE CALOR HORARIO (HEATMAP) ───────────────────────────
    // Estructura: 7 días (0 a 6) x 24 horas (0 a 23)
    const matrizHeatmap = Array.from({ length: 7 }, (_, dIndex) => ({
      diaIndex: dIndex,
      diaNombre: NOMBRES_DIAS[dIndex],
      horas: Array.from({ length: 24 }, (_, h) => ({
        hora: h,
        comandas: 0,
        facturacion: 0,
        intensidad: 0
      }))
    }))

    let maxComandasEnSlot = 0
    let slotPico = {
      diaIndex: 5,
      diaNombre: 'Viernes',
      hora: 21,
      franja: '21:00 - 22:00',
      comandas: 0,
      facturacion: 0,
      consejoOperativo: 'Sin pedidos suficientes para calcular pico.'
    }

    pedidosFiltrados.forEach(p => {
      const { diaSemana, hora } = obtenerHoraYDiaPedido(p)
      const celda = matrizHeatmap[diaSemana].horas[hora]
      celda.comandas += 1
      celda.facturacion += Number(p.total) || 0

      if (celda.comandas > maxComandasEnSlot) {
        maxComandasEnSlot = celda.comandas
        slotPico = {
          diaIndex: diaSemana,
          diaNombre: NOMBRES_DIAS[diaSemana],
          hora,
          franja: `${String(hora).padStart(2, '0')}:00 - ${String((hora + 1) % 24).padStart(2, '0')}:00`,
          comandas: celda.comandas,
          facturacion: celda.facturacion,
          consejoOperativo: `Máxima demanda semanal: reforzar dotación en cocina con mise-en-place lista a las ${Math.max(10, hora - 1)}:00 hs.`
        }
      }
    })

    // Normalizar intensidades de 0 a 100
    if (maxComandasEnSlot > 0) {
      matrizHeatmap.forEach(d => {
        d.horas.forEach(h => {
          h.intensidad = Math.round((h.comandas / maxComandasEnSlot) * 100)
        })
      })
    }

    // Ordenar matriz iniciando en Lunes (1) hasta Domingo (0)
    const matrizOrdenada = [
      matrizHeatmap[1], // Lunes
      matrizHeatmap[2], // Martes
      matrizHeatmap[3], // Miércoles
      matrizHeatmap[4], // Jueves
      matrizHeatmap[5], // Viernes
      matrizHeatmap[6], // Sábado
      matrizHeatmap[0], // Domingo
    ]

    // ── MÓDULO 4: CLIENTES & FIDELIZACIÓN (ENTERPRISE DECISION SUITE) ───────
    interface ClientePeriodo {
      telefono: string
      nombre: string
      pedidosEnPeriodo: number
      gastoEnPeriodo: number
      primerPedidoHistorico: string
      ultimoPedidoHistorico: string
      pedidosHistoricosTotal: number
      gastoHistoricoTotal: number
      segmento: 'nuevo' | 'ocasional' | 'habitual' | 'vip' | 'superVip'
      esRecurrente: boolean
    }

    const mapaClientesPeriodo = new Map<string, ClientePeriodo>()

    pedidosFiltrados.forEach(p => {
      const tel = (p.telefono || '').replace(/\D/g, '')
      if (!tel || tel.length < 6) return

      const totalPed = Number(p.total) || 0
      const hist = historialClientes.get(tel)
      const cantHist = hist?.pedidosHistoricos || 1
      const gastoHist = hist?.gastoHistorico || totalPed

      // Segmentación según cantidad de compras históricas:
      // - Nuevo: 1 compra
      // - Ocasional: 2 compras
      // - Habitual: 3 a 5 compras
      // - VIP: 6 a 9 compras
      // - Súper VIP: 10 o más compras
      let segmento: 'nuevo' | 'ocasional' | 'habitual' | 'vip' | 'superVip' = 'nuevo'
      if (cantHist === 1) segmento = 'nuevo'
      else if (cantHist === 2) segmento = 'ocasional'
      else if (cantHist >= 3 && cantHist <= 5) segmento = 'habitual'
      else if (cantHist >= 6 && cantHist <= 9) segmento = 'vip'
      else if (cantHist >= 10) segmento = 'superVip'

      const esRec = cantHist > 1

      if (!mapaClientesPeriodo.has(tel)) {
        mapaClientesPeriodo.set(tel, {
          telefono: tel,
          nombre: p.cliente || hist?.nombre || 'Cliente',
          pedidosEnPeriodo: 0,
          gastoEnPeriodo: 0,
          primerPedidoHistorico: hist?.primerPedidoFecha || p.fecha,
          ultimoPedidoHistorico: hist?.ultimoPedidoFecha || p.fecha,
          pedidosHistoricosTotal: cantHist,
          gastoHistoricoTotal: gastoHist,
          segmento,
          esRecurrente: esRec
        })
      }

      const cp = mapaClientesPeriodo.get(tel)!
      cp.pedidosEnPeriodo += 1
      cp.gastoEnPeriodo += totalPed
      if (p.cliente) cp.nombre = p.cliente
    })

    const listaClientesPeriodo = Array.from(mapaClientesPeriodo.values())
    const totalClientesUnicos = listaClientesPeriodo.length

    // Segmentos dentro del período
    const clientesNuevos = listaClientesPeriodo.filter(c => !c.esRecurrente)
    const clientesRecurrentes = listaClientesPeriodo.filter(c => c.esRecurrente)

    const cantNuevos = clientesNuevos.length
    const cantRecurrentes = clientesRecurrentes.length

    const pedidosNuevos = clientesNuevos.reduce((acc, c) => acc + c.pedidosEnPeriodo, 0)
    const pedidosRecurrentes = clientesRecurrentes.reduce((acc, c) => acc + c.pedidosEnPeriodo, 0)

    const facturacionNuevos = clientesNuevos.reduce((acc, c) => acc + c.gastoEnPeriodo, 0)
    const facturacionRecurrentes = clientesRecurrentes.reduce((acc, c) => acc + c.gastoEnPeriodo, 0)
    const facturacionTotalClientes = facturacionNuevos + facturacionRecurrentes

    const ticketPromedioNuevos = pedidosNuevos > 0 ? Math.round(facturacionNuevos / pedidosNuevos) : 0
    const ticketPromedioRecurrentes = pedidosRecurrentes > 0 ? Math.round(facturacionRecurrentes / pedidosRecurrentes) : 0

    // Frecuencia promedio en días entre pedidos para recurrentes
    let sumaFrecuenciasDias = 0
    let clientesConFrecuencia = 0

    clientesRecurrentes.forEach(c => {
      const hist = historialClientes.get(c.telefono)
      if (hist && hist.fechasPedidos.length >= 2) {
        const sorted = [...hist.fechasPedidos].sort((a, b) => a - b)
        const diffDias = (sorted[sorted.length - 1] - sorted[0]) / (1000 * 3600 * 24)
        if (diffDias > 0) {
          sumaFrecuenciasDias += diffDias / (hist.fechasPedidos.length - 1)
          clientesConFrecuencia += 1
        }
      }
    })

    const frecuenciaPromedioDias = clientesConFrecuencia > 0 ? Math.round(sumaFrecuenciasDias / clientesConFrecuencia) : 12

    // Valor promedio histórico por cliente (LTV) de los clientes activos en el período
    const sumaLtvHistoricoActivos = listaClientesPeriodo.reduce((acc, c) => acc + c.gastoHistoricoTotal, 0)
    const ltvPromedio = totalClientesUnicos > 0 ? Math.round(sumaLtvHistoricoActivos / totalClientesUnicos) : 0

    // Tasa global de segunda compra histórica en el restaurante (% con >= 2 compras sobre clientes totales)
    const totalClientesHistoricos = historialClientes.size
    const clientesConRecompraHistorica = Array.from(historialClientes.values()).filter(c => c.pedidosHistoricos >= 2).length
    const tasaSegundaCompraGlobalPct = totalClientesHistoricos > 0
      ? Math.round((clientesConRecompraHistorica / totalClientesHistoricos) * 1000) / 10
      : 0

    // Conteo en 5 niveles para clientes del período:
    const cantSegNuevo = listaClientesPeriodo.filter(c => c.segmento === 'nuevo').length
    const cantSegOcasional = listaClientesPeriodo.filter(c => c.segmento === 'ocasional').length
    const cantSegHabitual = listaClientesPeriodo.filter(c => c.segmento === 'habitual').length
    const cantSegVip = listaClientesPeriodo.filter(c => c.segmento === 'vip').length
    const cantSegSuperVip = listaClientesPeriodo.filter(c => c.segmento === 'superVip').length

    // Embudo de Fidelización (Funnel):
    // 1. Clientes Activos (total en período)
    // 2. Clientes Nuevos (1 compra)
    // 3. Clientes con 2da Compra (>= 2 compras: ocasional + habitual + vip + superVip)
    // 4. Clientes Habituales (>= 3 compras: habitual + vip + superVip)
    // 5. Clientes VIP (>= 6 compras: vip + superVip)
    const funnelActivos = totalClientesUnicos
    const funnelNuevos = cantSegNuevo
    const funnelSegundaCompra = cantSegOcasional + cantSegHabitual + cantSegVip + cantSegSuperVip
    const funnelHabituales = cantSegHabitual + cantSegVip + cantSegSuperVip
    const funnelVips = cantSegVip + cantSegSuperVip

    const embudoFidelizacion = {
      etapas: [
        {
          id: 'activos',
          nombre: 'Clientes Activos',
          descripcion: 'Compraron en el período seleccionado',
          cantidad: funnelActivos,
          porcentaje: 100,
          tasaConversionSiguiente: funnelActivos > 0 ? Math.round((funnelSegundaCompra / funnelActivos) * 1000) / 10 : 0
        },
        {
          id: 'nuevos',
          nombre: 'Clientes Nuevos',
          descripcion: '1 compra en su historia (primerizos)',
          cantidad: funnelNuevos,
          porcentaje: funnelActivos > 0 ? Math.round((funnelNuevos / funnelActivos) * 1000) / 10 : 0,
          tasaConversionSiguiente: undefined
        },
        {
          id: 'segunda_compra',
          nombre: 'Segunda Compra',
          descripcion: 'Superaron la barrera de 1 pedido (>= 2 compras)',
          cantidad: funnelSegundaCompra,
          porcentaje: funnelActivos > 0 ? Math.round((funnelSegundaCompra / funnelActivos) * 1000) / 10 : 0,
          tasaConversionSiguiente: funnelSegundaCompra > 0 ? Math.round((funnelHabituales / funnelSegundaCompra) * 1000) / 10 : 0
        },
        {
          id: 'habituales',
          nombre: 'Clientes Habituales',
          descripcion: '3 a 5 compras históricas acumuladas',
          cantidad: funnelHabituales,
          porcentaje: funnelActivos > 0 ? Math.round((funnelHabituales / funnelActivos) * 1000) / 10 : 0,
          tasaConversionSiguiente: funnelHabituales > 0 ? Math.round((funnelVips / funnelHabituales) * 1000) / 10 : 0
        },
        {
          id: 'vips',
          nombre: 'Clientes VIP',
          descripcion: '6 o más compras (fieles y promotores)',
          cantidad: funnelVips,
          porcentaje: funnelActivos > 0 ? Math.round((funnelVips / funnelActivos) * 1000) / 10 : 0,
          tasaConversionSiguiente: undefined
        }
      ],
      segmentacionNiveles: {
        nuevo: { cantidad: cantSegNuevo, pct: funnelActivos > 0 ? Math.round((cantSegNuevo / funnelActivos) * 100) : 0 },
        ocasional: { cantidad: cantSegOcasional, pct: funnelActivos > 0 ? Math.round((cantSegOcasional / funnelActivos) * 100) : 0 },
        habitual: { cantidad: cantSegHabitual, pct: funnelActivos > 0 ? Math.round((cantSegHabitual / funnelActivos) * 100) : 0 },
        vip: { cantidad: cantSegVip, pct: funnelActivos > 0 ? Math.round((cantSegVip / funnelActivos) * 100) : 0 },
        superVip: { cantidad: cantSegSuperVip, pct: funnelActivos > 0 ? Math.round((cantSegSuperVip / funnelActivos) * 100) : 0 }
      }
    }

    // Top 5 VIPs
    const ahora = new Date()
    const topVip = [...listaClientesPeriodo]
      .sort((a, b) => b.gastoEnPeriodo - a.gastoEnPeriodo)
      .slice(0, 5)
      .map(c => {
        const diffDias = Math.floor((ahora.getTime() - new Date(c.ultimoPedidoHistorico).getTime()) / (1000 * 3600 * 24))
        return {
          telefono: c.telefono,
          nombre: c.nombre,
          pedidos: c.pedidosEnPeriodo,
          gastoTotal: c.gastoEnPeriodo,
          ticketPromedio: c.pedidosEnPeriodo > 0 ? Math.round(c.gastoEnPeriodo / c.pedidosEnPeriodo) : 0,
          ultimoPedido: c.ultimoPedidoHistorico.split('T')[0],
          diasDesdeUltimo: Math.max(0, diffDias),
          segmento: c.segmento
        }
      })

    // Clientes en Riesgo Dinámico y Valor en Riesgo
    const listaEnRiesgo: any[] = []
    let valorEnRiesgoTotal = 0

    Array.from(historialClientes.values()).forEach(c => {
      if (c.pedidosHistoricos < 2) return // Clientes con relación previa
      const ultimoDate = new Date(c.ultimoPedidoFecha)
      const diffDias = Math.floor((ahora.getTime() - ultimoDate.getTime()) / (1000 * 3600 * 24))
      if (diffDias < 10) return

      // Frecuencia individual
      let cicloIndividual = frecuenciaPromedioDias
      if (c.fechasPedidos.length >= 2) {
        const sorted = [...c.fechasPedidos].sort((a, b) => a - b)
        const difDiasTotal = (sorted[sorted.length - 1] - sorted[0]) / (1000 * 3600 * 24)
        const prom = difDiasTotal / (c.fechasPedidos.length - 1)
        if (prom >= 3 && prom <= 90) {
          cicloIndividual = Math.round(prom)
        }
      }

      const ratioAtraso = Math.round((diffDias / cicloIndividual) * 10) / 10

      // Detección dinámica de riesgo:
      // Si el cliente está tardando significativamente más de su ciclo habitual (>= 1.8x)
      // O si pasaron más de 25 días para cualquier cliente con historial
      const estaEnRiesgo = (ratioAtraso >= 1.8 && diffDias >= 14) || (diffDias >= 25)

      if (estaEnRiesgo) {
        let nivelRiesgo: 'critico' | 'alto' | 'moderado' = 'moderado'
        if (ratioAtraso >= 2.5 || diffDias >= 35) nivelRiesgo = 'critico'
        else if (ratioAtraso >= 1.8 || diffDias >= 25) nivelRiesgo = 'alto'

        // Score de prioridad para reactivación:
        // Prioriza: mayor riesgo de abandono + mayor valor histórico + mayor cantidad de compras
        const scoreRiesgo = (Math.min(5, ratioAtraso) * 1000) + (c.gastoHistorico / 100) + (c.pedidosHistoricos * 200)

        const msg = encodeURIComponent(`¡Hola ${c.nombre}! Te extrañamos en Chefsy. Hace unos días que no te vemos, ¿te gustaría pedir algo rico hoy? Te preparamos algo especial.`)

        listaEnRiesgo.push({
          telefono: c.telefono,
          nombre: c.nombre,
          pedidosHistoricos: c.pedidosHistoricos,
          gastoHistorico: c.gastoHistorico,
          ultimoPedido: c.ultimoPedidoFecha.split('T')[0],
          diasInactivo: diffDias,
          cicloCompraDias: cicloIndividual,
          ratioAtraso,
          nivelRiesgo,
          scoreRiesgo,
          mensajeWhatsapp: `https://wa.me/${c.telefono.startsWith('54') ? c.telefono : `549${c.telefono}`}?text=${msg}`
        })

        valorEnRiesgoTotal += c.gastoHistorico
      }
    })

    // Ordenar priorizando:
    // 1. Mayor score de riesgo (ratio de retraso)
    // 2. Mayor valor histórico acumulado
    // 3. Mayor cantidad de compras
    listaEnRiesgo.sort((a, b) => {
      if (b.scoreRiesgo !== a.scoreRiesgo) return b.scoreRiesgo - a.scoreRiesgo
      return b.gastoHistorico - a.gastoHistorico
    })

    const totalClientesEnRiesgo = listaEnRiesgo.length
    const clientesDormidosPriorizados = listaEnRiesgo.slice(0, 10)

    // Análisis de Fidelización por Producto (¿Qué platos generan mayor recurrencia / recompra?)
    const mapaRetencionProductos = new Map<string, {
      id: string
      nombre: string
      categoria: string
      imagenUrl?: string
      clientesCompraron: Set<string>
      clientesRecompraron: Set<string>
    }>()

    // Para cada cliente, ordenamos sus pedidos cronológicamente
    historialClientes.forEach((hc, tel) => {
      if (!hc.pedidosList || hc.pedidosList.length === 0) return
      const ordersSorted = [...hc.pedidosList].sort((a, b) => a.timestamp - b.timestamp)
      const totalPedidosCliente = ordersSorted.length

      ordersSorted.forEach((order, idx) => {
        const esUltimoPedidoDelCliente = idx === totalPedidosCliente - 1
        const clienteVolvioAComprarPosteriormente = !esUltimoPedidoDelCliente

        order.productos.forEach(pItem => {
          if (!pItem.id) return
          if (!mapaRetencionProductos.has(pItem.id)) {
            const catItem = MAPA_CATALOGO.get(pItem.id)
            const catId = catItem?.categoriaId || 'general'
            const nombrePlato = catItem?.nombre || pItem.nombre
            const detalles = OBTENER_DETALLES_COMPLEMENTARIOS(catId, nombrePlato, pItem.id)

            mapaRetencionProductos.set(pItem.id, {
              id: pItem.id,
              nombre: nombrePlato,
              categoria: normalizarCategoria(catId, nombrePlato),
              imagenUrl: detalles.img || undefined,
              clientesCompraron: new Set<string>(),
              clientesRecompraron: new Set<string>()
            })
          }

          const rp = mapaRetencionProductos.get(pItem.id)!
          rp.clientesCompraron.add(tel)
          if (clienteVolvioAComprarPosteriormente) {
            rp.clientesRecompraron.add(tel)
          }
        })
      })
    })

    // Construir ranking de fidelización por producto
    const arrayFidelizacionProductos = Array.from(mapaRetencionProductos.values())
      .filter(p => p.clientesCompraron.size >= 5) // Mínimo de clientes para significancia estadística
      .map(p => {
        const compradores = p.clientesCompraron.size
        const volvieron = p.clientesRecompraron.size
        const tasaRecompraPct = compradores > 0 ? Math.round((volvieron / compradores) * 1000) / 10 : 0
        return {
          id: p.id,
          nombre: p.nombre,
          categoria: p.categoria,
          imagenUrl: p.imagenUrl,
          totalClientesCompraron: compradores,
          clientesVolvieron: volvieron,
          tasaRecompraPct
        }
      })
      .sort((a, b) => {
        if (b.tasaRecompraPct !== a.tasaRecompraPct) return b.tasaRecompraPct - a.tasaRecompraPct
        return b.totalClientesCompraron - a.totalClientesCompraron
      })
      .slice(0, 10)

    // ── MÓDULO 5: RENDIMIENTO DE MODALIDADES & INCIDENCIA DE FLETE ──────────
    interface StatsModalidad {
      pedidos: number
      facturacion: number
      costoEnvios: number
    }

    const canalesMap: Record<string, StatsModalidad> = {
      delivery: { pedidos: 0, facturacion: 0, costoEnvios: 0 },
      retiro: { pedidos: 0, facturacion: 0, costoEnvios: 0 },
      consumo_local: { pedidos: 0, facturacion: 0, costoEnvios: 0 }
    }

    let facturacionTotalCanales = 0
    let costoEnviosTotal = 0

    pedidosFiltrados.forEach(p => {
      const tipo = (p.tipoEntrega || 'delivery') as string
      const canal = canalesMap[tipo] || canalesMap.delivery
      const total = Number(p.total) || 0
      const costoEnv = Number(p.costoEnvio) || 0

      canal.pedidos += 1
      canal.facturacion += total
      canal.costoEnvios += costoEnv

      facturacionTotalCanales += total
      costoEnviosTotal += costoEnv
    })

    const buildCanalResumen = (key: 'delivery' | 'retiro' | 'consumo_local') => {
      const c = canalesMap[key]
      const fleteTotal = c.costoEnvios
      const facturacionTotal = c.facturacion
      const ventaNetaComida = Math.max(0, facturacionTotal - fleteTotal)
      const ticketPromedio = c.pedidos > 0 ? Math.round(facturacionTotal / c.pedidos) : 0
      const ticketComidaPromedio = c.pedidos > 0 ? Math.round(ventaNetaComida / c.pedidos) : 0
      const participacionPct = facturacionTotalCanales > 0 ? Math.round((c.facturacion / facturacionTotalCanales) * 1000) / 10 : 0
      const incidenciaFletePct = c.facturacion > 0 ? Math.round((c.costoEnvios / c.facturacion) * 1000) / 10 : 0

      return {
        pedidos: c.pedidos,
        facturacion: c.facturacion,
        ventaNetaComida,
        ticketPromedio,
        ticketComidaPromedio,
        participacionPct,
        fleteTotal,
        incidenciaFletePct
      }
    }

    return NextResponse.json({
      periodo: {
        desde: desde || 'inicio',
        hasta: hasta || 'fin',
        turno: turnoFiltro,
        totalComandas
      },
      matrizBCG: {
        resumen: {
          totalPlatosAnalizados: arrayProductos.length,
          totalUnidadesVendidas,
          totalFacturacionMenu,
          umbralVolumenMedio: Math.round(umbralVolumenMedio * 10) / 10,
          umbralPrecioMedio: Math.round(umbralPrecioMedio),
          cantEstrellas,
          cantCaballos,
          cantRompecabezas,
          cantLastres,
          cuadrantes: {
            estrella: statsEstrellas,
            caballo: statsCaballos,
            rompecabezas: statsRompecabezas,
            lastre: statsLastres
          },
          resumenEjecutivo: conclusionesEjecutivas
        },
        platos: platosClasificados
      },
      sla: {
        cocina: {
          promedioMinutos: promCocina,
          totalMuestras: cocinaMuestras.length,
          rapidoMenor18: {
            count: cocinaRapido,
            pct: cocinaMuestras.length > 0 ? Math.round((cocinaRapido / cocinaMuestras.length) * 1000) / 10 : 0
          },
          optimo18a30: {
            count: cocinaOptimo,
            pct: cocinaMuestras.length > 0 ? Math.round((cocinaOptimo / cocinaMuestras.length) * 1000) / 10 : 0
          },
          alertaMayor30: {
            count: cocinaAlerta,
            pct: cocinaMuestras.length > 0 ? Math.round((cocinaAlerta / cocinaMuestras.length) * 1000) / 10 : 0
          },
          estadoGeneral: promCocina <= 20 ? 'optimo' : promCocina <= 32 ? 'normal' : 'critico'
        },
        cadete: {
          promedioMinutos: promCadete,
          totalMuestras: cadeteMuestras.length,
          expressMenor15: {
            count: cadeteExpress,
            pct: cadeteMuestras.length > 0 ? Math.round((cadeteExpress / cadeteMuestras.length) * 1000) / 10 : 0
          },
          normal15a25: {
            count: cadeteNormal,
            pct: cadeteMuestras.length > 0 ? Math.round((cadeteNormal / cadeteMuestras.length) * 1000) / 10 : 0
          },
          demoradoMayor25: {
            count: cadeteDemorado,
            pct: cadeteMuestras.length > 0 ? Math.round((cadeteDemorado / cadeteMuestras.length) * 1000) / 10 : 0
          },
          estadoGeneral: promCadete <= 15 ? 'optimo' : promCadete <= 25 ? 'normal' : 'critico'
        },
        totalLeadTime: {
          promedioMinutos: promLeadTime,
          totalMuestras: leadTimeMuestras.length,
          cumplimientoMenor40: {
            count: leadTimeCumple,
            pct: leadTimeMuestras.length > 0 ? Math.round((leadTimeCumple / leadTimeMuestras.length) * 1000) / 10 : 0
          },
          excedidoMayor40: {
            count: leadTimeExcede,
            pct: leadTimeMuestras.length > 0 ? Math.round((leadTimeExcede / leadTimeMuestras.length) * 1000) / 10 : 0
          }
        }
      },
      heatmap: {
        matriz: matrizOrdenada,
        picoMaximo: slotPico,
        horasOperativas: [11, 12, 13, 14, 15, 19, 20, 21, 22, 23, 0, 1]
      },
      fidelidad: {
        totalClientesUnicos,
        nuevos: {
          clientes: cantNuevos,
          pedidos: pedidosNuevos,
          facturacion: facturacionNuevos,
          pctFacturacion: facturacionTotalClientes > 0 ? Math.round((facturacionNuevos / facturacionTotalClientes) * 1000) / 10 : 0,
          ticketPromedio: ticketPromedioNuevos
        },
        recurrentes: {
          clientes: cantRecurrentes,
          pedidos: pedidosRecurrentes,
          facturacion: facturacionRecurrentes,
          pctFacturacion: facturacionTotalClientes > 0 ? Math.round((facturacionRecurrentes / facturacionTotalClientes) * 1000) / 10 : 0,
          ticketPromedio: ticketPromedioRecurrentes,
          frecuenciaPromedioDias
        },
        metricasGlobales: {
          ltvPromedio,
          tasaSegundaCompraGlobalPct
        },
        embudo: embudoFidelizacion,
        topVip,
        riesgoAbandono: {
          totalClientesEnRiesgo,
          valorEnRiesgoTotal,
          clientesEnRiesgo: clientesDormidosPriorizados
        },
        clientesDormidos: clientesDormidosPriorizados,
        fidelizacionPorProducto: arrayFidelizacionProductos
      },
      modalidades: {
        resumen: {
          facturacionTotal: facturacionTotalCanales,
          ventaNetaCocinaTotal: Math.max(0, facturacionTotalCanales - costoEnviosTotal),
          pedidosTotal: totalComandas,
          costoEnvioTotal: costoEnviosTotal,
          fletesRecaudadosTotal: costoEnviosTotal,
          incidenciaFleteGlobal: facturacionTotalCanales > 0 ? Math.round((costoEnviosTotal / facturacionTotalCanales) * 1000) / 10 : 0
        },
        canales: {
          delivery: buildCanalResumen('delivery'),
          retiro: buildCanalResumen('retiro'),
          consumo_local: buildCanalResumen('consumo_local')
        }
      }
    })
  } catch (error: any) {
    console.error('[API Metricas Avanzadas] Error interno:', error)
    return NextResponse.json({ error: 'Error interno al procesar métricas avanzadas.' }, { status: 500 })
  }
}

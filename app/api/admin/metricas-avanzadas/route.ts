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
    const historialClientes = new Map<string, {
      telefono: string
      nombre: string
      primerPedidoFecha: string
      ultimoPedidoFecha: string
      pedidosHistoricos: number
      gastoHistorico: number
    }>()

    pedidos.forEach(p => {
      const tel = (p.telefono || '').replace(/\D/g, '')
      if (!tel || tel.length < 6) return

      const fechaPed = p.created_at || p.fecha || ''
      const totalPed = Number(p.total) || 0

      if (!historialClientes.has(tel)) {
        historialClientes.set(tel, {
          telefono: tel,
          nombre: p.cliente || 'Cliente',
          primerPedidoFecha: fechaPed,
          ultimoPedidoFecha: fechaPed,
          pedidosHistoricos: 0,
          gastoHistorico: 0
        })
      }

      const hc = historialClientes.get(tel)!
      hc.pedidosHistoricos += 1
      hc.gastoHistorico += totalPed
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

    // ── MÓDULO 1: MATRIZ BCG (INGENIERÍA DE MENÚ) ───────────────────────────
    interface ProdStats {
      id: string
      nombre: string
      categoria: string
      categoriaId: string
      unidades: number
      facturacionTotal: number
      comandasCount: number
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
        const nombre = (item.nombre || item.name || '').trim()
        if (!nombre) return

        const idKey = (item.idCatalogo || item.id || nombre).toLowerCase()
        const cantidad = Number(item.cantidad || item.qty || 1)
        const precioUnitario = Number(item.precio || item.price || 0)
        const subtotal = precioUnitario * cantidad
        const categoria = normalizarCategoria(item.categoriaId || item.categoria_id, nombre)

        if (!mapaProductos.has(idKey)) {
          mapaProductos.set(idKey, {
            id: idKey,
            nombre,
            categoria,
            categoriaId: item.categoriaId || item.categoria_id || '',
            unidades: 0,
            facturacionTotal: 0,
            comandasCount: 0
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

    // Umbrales para clasificación en cuadrantes
    const umbralVolumenMedio = arrayProductos.length > 0 ? (totalUnidadesVendidas / arrayProductos.length) : 0
    const umbralPrecioMedio = totalUnidadesVendidas > 0 ? (totalFacturacionMenu / totalUnidadesVendidas) : 0

    let cantEstrellas = 0
    let cantCaballos = 0
    let cantRompecabezas = 0
    let cantLastres = 0

    const platosClasificados = arrayProductos.map(p => {
      const precioPromedio = p.unidades > 0 ? Math.round(p.facturacionTotal / p.unidades) : 0
      const porcentajeComandas = totalComandas > 0 ? Math.round((p.comandasCount / totalComandas) * 1000) / 10 : 0

      const altaPopularidad = p.unidades >= umbralVolumenMedio
      const altaRentabilidad = precioPromedio >= umbralPrecioMedio

      let cuadrante: 'estrella' | 'caballo' | 'rompecabezas' | 'lastre'
      let diagnostico = ''
      let accionSugerida = ''

      if (altaPopularidad && altaRentabilidad) {
        cuadrante = 'estrella'
        cantEstrellas++
        diagnostico = 'Plato líder: máxima salida y ticket por comanda.'
        accionSugerida = 'Mantener receta estricta, calidad fotográfica y prioridad en abastecimiento.'
      } else if (altaPopularidad && !altaRentabilidad) {
        cuadrante = 'caballo'
        cantCaballos++
        diagnostico = 'Alto volumen de comanda pero con ticket unitario bajo.'
        accionSugerida = 'Armar combos con bebidas o guarnición, o testear suba de precio (+5% a 8%).'
      } else if (!altaPopularidad && altaRentabilidad) {
        cuadrante = 'rompecabezas'
        cantRompecabezas++
        diagnostico = 'Alto margen y ticket, pero poca visibilidad o pedidos.'
        accionSugerida = 'Destacar en cabecera de la tienda, mejorar foto o lanzar como recomendación.'
      } else {
        cuadrante = 'lastre'
        cantLastres++
        diagnostico = 'Baja rotación y escaso aporte monetario a la cocina.'
        accionSugerida = 'Evaluar discontinuación para liberar stock y complejidad en la línea de cocción.'
      }

      return {
        id: p.id,
        nombre: p.nombre,
        categoria: p.categoria,
        categoriaId: p.categoriaId,
        unidades: p.unidades,
        precioPromedio,
        facturacionTotal: p.facturacionTotal,
        porcentajeComandas,
        cuadrante,
        diagnostico,
        accionSugerida
      }
    }).sort((a, b) => b.facturacionTotal - a.facturacionTotal)

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

    // ── MÓDULO 4: RADIOGRAFÍA DE FIDELIDAD Y CLIENTES VIP ───────────────────
    interface ClientePeriodo {
      telefono: string
      nombre: string
      pedidosEnPeriodo: number
      gastoEnPeriodo: number
      esRecurrente: boolean
      primerPedidoHistorico: string
      ultimoPedidoHistorico: string
    }

    const mapaClientesPeriodo = new Map<string, ClientePeriodo>()

    pedidosFiltrados.forEach(p => {
      const tel = (p.telefono || '').replace(/\D/g, '')
      if (!tel || tel.length < 6) return

      const totalPed = Number(p.total) || 0
      const hist = historialClientes.get(tel)

      // Se considera recurrente si tiene más de 1 pedido histórico o si el primer pedido fue antes de 'desde'
      const esRec = (hist?.pedidosHistoricos || 1) > 1

      if (!mapaClientesPeriodo.has(tel)) {
        mapaClientesPeriodo.set(tel, {
          telefono: tel,
          nombre: p.cliente || hist?.nombre || 'Cliente',
          pedidosEnPeriodo: 0,
          gastoEnPeriodo: 0,
          esRecurrente: esRec,
          primerPedidoHistorico: hist?.primerPedidoFecha || p.fecha,
          ultimoPedidoHistorico: hist?.ultimoPedidoFecha || p.fecha
        })
      }

      const cp = mapaClientesPeriodo.get(tel)!
      cp.pedidosEnPeriodo += 1
      cp.gastoEnPeriodo += totalPed
      if (p.cliente) cp.nombre = p.cliente
    })

    const listaClientesPeriodo = Array.from(mapaClientesPeriodo.values())
    const nuevosClientes = listaClientesPeriodo.filter(c => !c.esRecurrente)
    const recurrentesClientes = listaClientesPeriodo.filter(c => c.esRecurrente)

    const facturacionNuevos = nuevosClientes.reduce((acc, c) => acc + c.gastoEnPeriodo, 0)
    const facturacionRecurrentes = recurrentesClientes.reduce((acc, c) => acc + c.gastoEnPeriodo, 0)
    const facturacionTotalClientes = facturacionNuevos + facturacionRecurrentes

    // Frecuencia promedio en días entre pedidos para recurrentes
    let sumaFrecuenciasDias = 0
    let clientesConFrecuencia = 0

    recurrentesClientes.forEach(c => {
      const hist = historialClientes.get(c.telefono)
      if (hist && hist.pedidosHistoricos >= 2 && hist.primerPedidoFecha && hist.ultimoPedidoFecha) {
        const d1 = new Date(hist.primerPedidoFecha).getTime()
        const d2 = new Date(hist.ultimoPedidoFecha).getTime()
        const diffDias = (d2 - d1) / (1000 * 3600 * 24)
        if (diffDias > 0) {
          sumaFrecuenciasDias += diffDias / (hist.pedidosHistoricos - 1)
          clientesConFrecuencia += 1
        }
      }
    })

    const frecuenciaPromedioDias = clientesConFrecuencia > 0 ? Math.round(sumaFrecuenciasDias / clientesConFrecuencia) : 12

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
          diasDesdeUltimo: Math.max(0, diffDias)
        }
      })

    // Clientes dormidos / en riesgo (>25 días sin pedir y con >=2 pedidos históricos)
    const clientesDormidos = Array.from(historialClientes.values())
      .filter(c => {
        if (c.pedidosHistoricos < 2) return false
        const diffDias = Math.floor((ahora.getTime() - new Date(c.ultimoPedidoFecha).getTime()) / (1000 * 3600 * 24))
        return diffDias >= 25
      })
      .map(c => {
        const diffDias = Math.floor((ahora.getTime() - new Date(c.ultimoPedidoFecha).getTime()) / (1000 * 3600 * 24))
        const msg = encodeURIComponent(`¡Hola ${c.nombre}! Te extrañamos en Chefsy. Tenemos platos nuevos esperándote, ¿te gustaría pedir algo rico hoy?`)
        return {
          telefono: c.telefono,
          nombre: c.nombre,
          pedidosHistoricos: c.pedidosHistoricos,
          gastoHistorico: c.gastoHistorico,
          ultimoPedido: c.ultimoPedidoFecha.split('T')[0],
          diasInactivo: diffDias,
          mensajeWhatsapp: `https://wa.me/${c.telefono.startsWith('54') ? c.telefono : `549${c.telefono}`}?text=${msg}`
        }
      })
      .sort((a, b) => b.gastoHistorico - a.gastoHistorico)
      .slice(0, 8)

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
      const ticketPromedio = c.pedidos > 0 ? Math.round(c.facturacion / c.pedidos) : 0
      const participacionPct = facturacionTotalCanales > 0 ? Math.round((c.facturacion / facturacionTotalCanales) * 1000) / 10 : 0
      const incidenciaFletePct = c.facturacion > 0 ? Math.round((c.costoEnvios / c.facturacion) * 1000) / 10 : 0

      return {
        pedidos: c.pedidos,
        facturacion: c.facturacion,
        ticketPromedio,
        participacionPct,
        fleteTotal: c.costoEnvios,
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
          umbralVolumenMedio: Math.round(umbralVolumenMedio * 10) / 10,
          umbralPrecioMedio: Math.round(umbralPrecioMedio),
          cantEstrellas,
          cantCaballos,
          cantRompecabezas,
          cantLastres
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
        totalClientesUnicos: listaClientesPeriodo.length,
        nuevos: {
          clientes: nuevosClientes.length,
          pedidos: nuevosClientes.reduce((a, b) => a + b.pedidosEnPeriodo, 0),
          facturacion: facturacionNuevos,
          pctFacturacion: facturacionTotalClientes > 0 ? Math.round((facturacionNuevos / facturacionTotalClientes) * 1000) / 10 : 0
        },
        recurrentes: {
          clientes: recurrentesClientes.length,
          pedidos: recurrentesClientes.reduce((a, b) => a + b.pedidosEnPeriodo, 0),
          facturacion: facturacionRecurrentes,
          pctFacturacion: facturacionTotalClientes > 0 ? Math.round((facturacionRecurrentes / facturacionTotalClientes) * 1000) / 10 : 0,
          frecuenciaPromedioDias
        },
        topVip,
        clientesDormidos
      },
      modalidades: {
        resumen: {
          facturacionTotal: facturacionTotalCanales,
          pedidosTotal: totalComandas,
          costoEnvioTotal: costoEnviosTotal,
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

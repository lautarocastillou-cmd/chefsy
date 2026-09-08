// ─────────────────────────────────────────────────────────────────────────────
// lib/telemetriaCadetes.ts
// Motor de cálculo de telemetría y métricas físicas de velocidad para cadetes.
// ─────────────────────────────────────────────────────────────────────────────

import { Pedido, PuntoRutaBreadcrumb } from '@/tipos'
import { calcularDistanciaKm } from '@/lib/ubicacion'

export interface TelemetriaPuntoNormalizado {
  lat: number
  lng: number
  t: string
  velocidadKmH: number
  esMovimiento: boolean
  distanciaDesdeAnteriorKm: number
  deltaSegundos: number
}

export interface TelemetriaRuta {
  distanciaTotalKm: number
  duracionTotalSegundos: number
  tiempoMovimientoSegundos: number
  tiempoDetenidoSegundos: number
  porcentajeTiempoMovimiento: number
  velocidadMediaMovimiento: number // km/h real en marcha (excluye paradas)
  velocidadComercial: number // km/h puerta a puerta (incluye semáforos y esperas)
  velocidadMaxima: number // km/h pico filtrado
  paradasLargas: number // detenciones > 3 minutos
  alertasExcesoVelocidad: number // pings con velocidad > 60 km/h
  puntosNormalizados: TelemetriaPuntoNormalizado[]
}

export interface MetricasCadeteConsolidadas {
  cadeteId: string
  cadeteNombre: string
  pedidosEntregados: number
  pedidosConTelemetria: number
  distanciaTotalKm: number
  tiempoTotalViajeMinutos: number
  tiempoPromedioPorPedidoMinutos: number
  velocidadMediaMovimiento: number // km/h promedio en marcha
  velocidadComercial: number // km/h promedio comercial
  velocidadMaximaPico: number // km/h máxima alcanzada en el periodo
  ratioMovimientoPorcentaje: number // % rodando vs detenido
  alertasExcesoVelocidad: number
  paradasLargasTotal: number
}

export interface ResumenFlotaCadetes {
  totalPedidosEntregados: number
  totalKmRecorridos: number
  velocidadMediaFlotaMovimiento: number
  velocidadComercialFlota: number
  tiempoPromedioEntregaMinutos: number
  cadeteMasRapido?: { nombre: string; velocidad: number }
  cadeteMasActivo?: { nombre: string; pedidos: number }
  totalAlertasVelocidad: number
  cadetes: MetricasCadeteConsolidadas[]
}

const UMBRAL_MOVIMIENTO_KMH = 4.0 // Por debajo de 4 km/h se considera detenido/espera
const LIMITE_VELOCIDAD_MAXIMA_FISICA = 85.0 // Ruido de GPS / saltos por encima de 85 km/h se filtran
const DISTANCIA_MINIMA_JITTER_KM = 0.006 // 6 metros: fluctuación de GPS en reposo

/**
 * Normaliza la velocidad de un punto de GPS:
 * 1. El GPS de Flutter / Android (geolocator) entrega la velocidad en m/s.
 * 2. Se convierte m/s a km/h multiplicando por 3.6.
 * 3. Se valida contra la velocidad diferencial física (delta d / delta t).
 */
export function normalizarVelocidadPunto(
  rawSpeed: number | null | undefined,
  distanciaKm: number,
  deltaSegundos: number
): number {
  const velDiferencialKmH =
    deltaSegundos > 1.2 ? (distanciaKm / (deltaSegundos / 3600)) : 0

  // Si el desplazamiento es mínimo (menor a jitter de ~6m en reposo), la velocidad es 0
  if (distanciaKm < DISTANCIA_MINIMA_JITTER_KM && deltaSegundos <= 30) {
    return 0
  }

  // Si el hardware no envió velocidad o es 0 habiendo distancia real
  if (rawSpeed == null || rawSpeed <= 0) {
    if (velDiferencialKmH > 0 && velDiferencialKmH <= LIMITE_VELOCIDAD_MAXIMA_FISICA) {
      return Math.round(velDiferencialKmH * 10) / 10
    }
    return 0
  }

  // Detección de unidad:
  // Geolocator envía speed en m/s (ej: 8 m/s = 28.8 km/h).
  // Si rawSpeed * 3.6 está dentro de un límite físico plausible, es m/s.
  const speedEnKmH = rawSpeed * 3.6

  if (speedEnKmH <= LIMITE_VELOCIDAD_MAXIMA_FISICA) {
    // Si la velocidad diferencial es coherente, ponderamos o usamos la del hardware
    return Math.round(speedEnKmH * 10) / 10
  }

  // Si rawSpeed ya venía en km/h (ej: 25 km/h en simulador o mock)
  if (rawSpeed <= LIMITE_VELOCIDAD_MAXIMA_FISICA) {
    return Math.round(rawSpeed * 10) / 10
  }

  // Si ambos superan el límite físico, es un glitch de antena GPS.
  // Caemos al diferencial si es razonable, sino capamos a 0.
  if (velDiferencialKmH > 0 && velDiferencialKmH <= LIMITE_VELOCIDAD_MAXIMA_FISICA) {
    return Math.round(velDiferencialKmH * 10) / 10
  }

  return 0
}

/**
 * Procesa la lista de puntos de telemetría de un pedido y calcula
 * todas las métricas físicas con precisión cinemática.
 */
export function calcularTelemetriaRuta(
  puntos: PuntoRutaBreadcrumb[],
  pedido?: Pedido | null
): TelemetriaRuta {
  if (!puntos || puntos.length < 2) {
    // Estimación básica por timestamps del pedido si no hay puntos
    let duracionEstimada = 0
    if (pedido?.en_camino_at && pedido?.entregado_at) {
      const inicio = new Date(pedido.en_camino_at).getTime()
      const fin = new Date(pedido.entregado_at).getTime()
      duracionEstimada = Math.max(0, Math.floor((fin - inicio) / 1000))
    }

    return {
      distanciaTotalKm: 0,
      duracionTotalSegundos: duracionEstimada,
      tiempoMovimientoSegundos: 0,
      tiempoDetenidoSegundos: duracionEstimada,
      porcentajeTiempoMovimiento: 0,
      velocidadMediaMovimiento: 0,
      velocidadComercial: 0,
      velocidadMaxima: 0,
      paradasLargas: 0,
      alertasExcesoVelocidad: 0,
      puntosNormalizados: []
    }
  }

  const puntosNormalizados: TelemetriaPuntoNormalizado[] = []
  let distanciaTotalKm = 0
  let tiempoMovimientoSegundos = 0
  let tiempoDetenidoSegundos = 0
  let distanciaEnMovimientoKm = 0
  let velocidadMaxima = 0
  let paradasLargas = 0
  let alertasExcesoVelocidad = 0

  // Primer punto base
  puntosNormalizados.push({
    lat: puntos[0].lat,
    lng: puntos[0].lng,
    t: puntos[0].t,
    velocidadKmH: 0,
    esMovimiento: false,
    distanciaDesdeAnteriorKm: 0,
    deltaSegundos: 0
  })

  for (let i = 1; i < puntos.length; i++) {
    const pAnt = puntos[i - 1]
    const pAct = puntos[i]

    const distKm = calcularDistanciaKm(
      { latitud: pAnt.lat, longitud: pAnt.lng },
      { latitud: pAct.lat, longitud: pAct.lng }
    )

    const tAnt = new Date(pAnt.t).getTime()
    const tAct = new Date(pAct.t).getTime()
    const deltaSegundos = Math.max(0, Math.round((tAct - tAnt) / 1000))

    // Descartar anomalías temporales (timestamps invertidos o mayores a 4 horas)
    if (deltaSegundos <= 0 || deltaSegundos > 14400) {
      continue
    }

    // Filtrar saltos de teletransporte imposibles (> 95 km/h en línea recta)
    const velSegmentoKmh = (distKm / (deltaSegundos / 3600))
    if (velSegmentoKmh > 95 && distKm > 0.3) {
      // Salto espurio de GPS: ignoramos distancia irreal
      continue
    }

    distanciaTotalKm += distKm

    const velocidadKmH = normalizarVelocidadPunto(pAct.speed, distKm, deltaSegundos)
    const esMovimiento = velocidadKmH >= UMBRAL_MOVIMIENTO_KMH

    if (esMovimiento) {
      tiempoMovimientoSegundos += deltaSegundos
      distanciaEnMovimientoKm += distKm
      if (velocidadKmH > velocidadMaxima) {
        velocidadMaxima = velocidadKmH
      }
      if (velocidadKmH > 60) {
        alertasExcesoVelocidad++
      }
    } else {
      tiempoDetenidoSegundos += deltaSegundos
      // Si estuvo detenido más de 3 minutos (180s)
      if (deltaSegundos >= 180) {
        paradasLargas++
      }
    }

    puntosNormalizados.push({
      lat: pAct.lat,
      lng: pAct.lng,
      t: pAct.t,
      velocidadKmH,
      esMovimiento,
      distanciaDesdeAnteriorKm: distKm,
      deltaSegundos
    })
  }

  // Duración total calculada
  const tInicio = new Date(puntos[0].t).getTime()
  const tFin = new Date(puntos[puntos.length - 1].t).getTime()
  let duracionTotalSegundos = Math.max(0, Math.floor((tFin - tInicio) / 1000))

  // Si en el pedido los estados en_camino_at y entregado_at son más amplios, respetamos el total del viaje
  if (pedido?.en_camino_at && pedido?.entregado_at) {
    const tCamino = new Date(pedido.en_camino_at).getTime()
    const tEntregado = new Date(pedido.entregado_at).getTime()
    const diffOficial = Math.max(0, Math.floor((tEntregado - tCamino) / 1000))
    if (diffOficial > duracionTotalSegundos) {
      // El exceso de tiempo oficial vs telemetría cuenta como espera en puerta o despacho
      tiempoDetenidoSegundos += (diffOficial - duracionTotalSegundos)
      duracionTotalSegundos = diffOficial
    }
  }

  // Velocidad media en movimiento real:
  // v = d / t (usando distancia y tiempo efectivo donde estuvo rodando)
  let velocidadMediaMovimiento = 0
  if (tiempoMovimientoSegundos > 10 && distanciaEnMovimientoKm > 0.05) {
    velocidadMediaMovimiento = Math.round(
      (distanciaEnMovimientoKm / (tiempoMovimientoSegundos / 3600)) * 10
    ) / 10
  } else if (puntosNormalizados.length > 1) {
    // Si los tramos fueron muy cortos, promedio ponderado de puntos en movimiento
    const puntosEnMarcha = puntosNormalizados.filter(p => p.esMovimiento)
    if (puntosEnMarcha.length > 0) {
      const suma = puntosEnMarcha.reduce((acc, p) => acc + p.velocidadKmH, 0)
      velocidadMediaMovimiento = Math.round((suma / puntosEnMarcha.length) * 10) / 10
    }
  }

  // Velocidad comercial (puerta a puerta: distancia total / duración total)
  let velocidadComercial = 0
  if (duracionTotalSegundos > 30 && distanciaTotalKm > 0.05) {
    velocidadComercial = Math.round(
      (distanciaTotalKm / (duracionTotalSegundos / 3600)) * 10
    ) / 10
  }

  const porcentajeTiempoMovimiento = duracionTotalSegundos > 0
    ? Math.min(100, Math.max(0, Math.round((tiempoMovimientoSegundos / duracionTotalSegundos) * 100)))
    : 0

  return {
    distanciaTotalKm: Number(distanciaTotalKm.toFixed(2)),
    duracionTotalSegundos,
    tiempoMovimientoSegundos,
    tiempoDetenidoSegundos,
    porcentajeTiempoMovimiento,
    velocidadMediaMovimiento,
    velocidadComercial,
    velocidadMaxima: Math.round(velocidadMaxima),
    paradasLargas,
    alertasExcesoVelocidad,
    puntosNormalizados
  }
}

/**
 * Agrupa y consolida las métricas de rendimiento y velocidad para todos
 * los cadetes a partir de un conjunto de pedidos (por ejemplo del día o turno).
 */
export function consolidarMetricasCadetes(
  pedidos: Pedido[],
  cadetesRegistrados: { id: string; nombre: string; activo?: boolean }[] = []
): ResumenFlotaCadetes {
  // Mapa de acumulación por cadete
  const mapaCadetes = new Map<string, {
    nombre: string
    pedidosEntregados: number
    pedidosConTelemetria: number
    distanciaTotalKm: number
    tiempoTotalViajeSegundos: number
    tiempoMovimientoSegundos: number
    tiempoDetenidoSegundos: number
    velocidadesPico: number[]
    sumVelocidadMediaPonderada: number
    sumDistanciaMovimiento: number
    alertasExcesoVelocidad: number
    paradasLargasTotal: number
  }>()

  // Inicializar cadetes registrados conocidos
  cadetesRegistrados.forEach(c => {
    const idKey = c.id.toLowerCase().trim()
    mapaCadetes.set(idKey, {
      nombre: c.nombre || c.id,
      pedidosEntregados: 0,
      pedidosConTelemetria: 0,
      distanciaTotalKm: 0,
      tiempoTotalViajeSegundos: 0,
      tiempoMovimientoSegundos: 0,
      tiempoDetenidoSegundos: 0,
      velocidadesPico: [],
      sumVelocidadMediaPonderada: 0,
      sumDistanciaMovimiento: 0,
      alertasExcesoVelocidad: 0,
      paradasLargasTotal: 0
    })
  })

  // Procesar pedidos entregados
  pedidos.forEach(p => {
    if (p.tipoEntrega !== 'delivery') return
    if (p.estado !== 'entregado') return

    const rawCadeteId = p.cadete_id || p.cadete_nombre || 'Sin Asignar'
    const idKey = rawCadeteId.toLowerCase().trim()

    if (!mapaCadetes.has(idKey)) {
      mapaCadetes.set(idKey, {
        nombre: p.cadete_nombre || rawCadeteId,
        pedidosEntregados: 0,
        pedidosConTelemetria: 0,
        distanciaTotalKm: 0,
        tiempoTotalViajeSegundos: 0,
        tiempoMovimientoSegundos: 0,
        tiempoDetenidoSegundos: 0,
        velocidadesPico: [],
        sumVelocidadMediaPonderada: 0,
        sumDistanciaMovimiento: 0,
        alertasExcesoVelocidad: 0,
        paradasLargasTotal: 0
      })
    }

    const reg = mapaCadetes.get(idKey)!
    reg.pedidosEntregados++

    if (p.cadete_nombre && (!reg.nombre || reg.nombre === idKey)) {
      reg.nombre = p.cadete_nombre
    }

    // Si tiene historial de ruta
    if (p.ruta_historial && Array.isArray(p.ruta_historial) && p.ruta_historial.length >= 2) {
      const telemetria = calcularTelemetriaRuta(p.ruta_historial, p)
      reg.pedidosConTelemetria++
      reg.distanciaTotalKm += telemetria.distanciaTotalKm
      reg.tiempoTotalViajeSegundos += telemetria.duracionTotalSegundos
      reg.tiempoMovimientoSegundos += telemetria.tiempoMovimientoSegundos
      reg.tiempoDetenidoSegundos += telemetria.tiempoDetenidoSegundos
      reg.alertasExcesoVelocidad += telemetria.alertasExcesoVelocidad
      reg.paradasLargasTotal += telemetria.paradasLargas

      if (telemetria.velocidadMaxima > 0) {
        reg.velocidadesPico.push(telemetria.velocidadMaxima)
      }

      if (telemetria.velocidadMediaMovimiento > 0) {
        reg.sumVelocidadMediaPonderada += telemetria.velocidadMediaMovimiento * telemetria.distanciaTotalKm
        reg.sumDistanciaMovimiento += telemetria.distanciaTotalKm
      }
    } else {
      // Si no tiene telemetría pero tiene timestamps de viaje
      if (p.en_camino_at && p.entregado_at) {
        const t1 = new Date(p.en_camino_at).getTime()
        const t2 = new Date(p.entregado_at).getTime()
        const segundos = Math.max(0, Math.floor((t2 - t1) / 1000))
        if (segundos > 0 && segundos < 14400) {
          reg.tiempoTotalViajeSegundos += segundos
        }
      }
    }
  })

  // Consolidar resultados individuales
  const cadetesConsolidados: MetricasCadeteConsolidadas[] = []
  let totalKmFlota = 0
  let totalSegundosViajeFlota = 0
  let totalSegundosMovimientoFlota = 0
  let totalDistanciaMovimientoFlota = 0
  let totalPedidosEntregados = 0
  let totalAlertasVelocidad = 0

  mapaCadetes.forEach((datos, cadeteId) => {
    // Si no tiene pedidos ni es un cadete relevante, continuar
    if (datos.pedidosEntregados === 0 && datos.pedidosConTelemetria === 0) {
      return
    }

    totalPedidosEntregados += datos.pedidosEntregados
    totalKmFlota += datos.distanciaTotalKm
    totalSegundosViajeFlota += datos.tiempoTotalViajeSegundos
    totalSegundosMovimientoFlota += datos.tiempoMovimientoSegundos
    totalDistanciaMovimientoFlota += datos.sumDistanciaMovimiento
    totalAlertasVelocidad += datos.alertasExcesoVelocidad

    const tiempoTotalViajeMinutos = Math.round(datos.tiempoTotalViajeSegundos / 60)
    const tiempoPromedioPorPedidoMinutos = datos.pedidosEntregados > 0
      ? Math.round(tiempoTotalViajeMinutos / datos.pedidosEntregados)
      : 0

    const velocidadMediaMovimiento = datos.sumDistanciaMovimiento > 0
      ? Math.round((datos.sumVelocidadMediaPonderada / datos.sumDistanciaMovimiento) * 10) / 10
      : 0

    const horasViaje = datos.tiempoTotalViajeSegundos / 3600
    const velocidadComercial = horasViaje > 0.05 && datos.distanciaTotalKm > 0.1
      ? Math.round((datos.distanciaTotalKm / horasViaje) * 10) / 10
      : 0

    const velocidadMaximaPico = datos.velocidadesPico.length > 0
      ? Math.max(...datos.velocidadesPico)
      : 0

    const totalSegs = datos.tiempoMovimientoSegundos + datos.tiempoDetenidoSegundos
    const ratioMovimientoPorcentaje = totalSegs > 0
      ? Math.min(100, Math.max(0, Math.round((datos.tiempoMovimientoSegundos / totalSegs) * 100)))
      : 0

    cadetesConsolidados.push({
      cadeteId,
      cadeteNombre: datos.nombre,
      pedidosEntregados: datos.pedidosEntregados,
      pedidosConTelemetria: datos.pedidosConTelemetria,
      distanciaTotalKm: Number(datos.distanciaTotalKm.toFixed(1)),
      tiempoTotalViajeMinutos,
      tiempoPromedioPorPedidoMinutos,
      velocidadMediaMovimiento,
      velocidadComercial,
      velocidadMaximaPico,
      ratioMovimientoPorcentaje,
      alertasExcesoVelocidad: datos.alertasExcesoVelocidad,
      paradasLargasTotal: datos.paradasLargasTotal
    })
  })

  // Ordenar cadetes por pedidos entregados descendente
  cadetesConsolidados.sort((a, b) => b.pedidosEntregados - a.pedidosEntregados)

  // Métricas globales de la flota
  const horasFlota = totalSegundosViajeFlota / 3600
  const velocidadComercialFlota = horasFlota > 0.1 && totalKmFlota > 0.1
    ? Math.round((totalKmFlota / horasFlota) * 10) / 10
    : 0

  const horasMovimientoFlota = totalSegundosMovimientoFlota / 3600
  const velocidadMediaFlotaMovimiento = horasMovimientoFlota > 0.05 && totalDistanciaMovimientoFlota > 0.1
    ? Math.round((totalDistanciaMovimientoFlota / horasMovimientoFlota) * 10) / 10
    : 0

  const tiempoPromedioEntregaMinutos = totalPedidosEntregados > 0
    ? Math.round((totalSegundosViajeFlota / 60) / totalPedidosEntregados)
    : 0

  // Cadete más rápido y más activo
  const cadeteConVelocidad = [...cadetesConsolidados]
    .filter(c => c.velocidadMediaMovimiento > 0)
    .sort((a, b) => b.velocidadMediaMovimiento - a.velocidadMediaMovimiento)[0]

  const cadeteMasActivo = cadetesConsolidados[0]

  return {
    totalPedidosEntregados,
    totalKmRecorridos: Number(totalKmFlota.toFixed(1)),
    velocidadMediaFlotaMovimiento,
    velocidadComercialFlota,
    tiempoPromedioEntregaMinutos,
    cadeteMasRapido: cadeteConVelocidad
      ? { nombre: cadeteConVelocidad.cadeteNombre, velocidad: cadeteConVelocidad.velocidadMediaMovimiento }
      : undefined,
    cadeteMasActivo: cadeteMasActivo && cadeteMasActivo.pedidosEntregados > 0
      ? { nombre: cadeteMasActivo.cadeteNombre, pedidos: cadeteMasActivo.pedidosEntregados }
      : undefined,
    totalAlertasVelocidad,
    cadetes: cadetesConsolidados
  }
}

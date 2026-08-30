// ─────────────────────────────────────────────────────
// lib/batching.ts
// Lógica de detección y agrupación inteligente de pedidos por cercanía geográfica (Smart Batching).
// ─────────────────────────────────────────────────────

import { Pedido } from '@/tipos'
import { calcularDistanciaKm } from './ubicacion'

export interface VecinoCercano {
  pedido: Pedido
  distanciaMetros: number
}

export interface GrupoBatch {
  id: string
  pedidos: Pedido[]
  distanciaMaximaMetros: number
  cadeteId?: string | null
  cadeteNombre?: string | null
}

// Caché en memoria para evitar recalcular distancias trigonométricas (Haversine)
const cacheDistancias = new Map<string, number>()

function obtenerDistanciaMetrosCacheada(
  idA: string, coordA: { latitud: number; longitud: number },
  idB: string, coordB: { latitud: number; longitud: number }
): number {
  const clave = idA < idB ? `${idA}_${idB}` : `${idB}_${idA}`
  const existente = cacheDistancias.get(clave)
  if (existente !== undefined) return existente

  const distKm = calcularDistanciaKm(coordA, coordB)
  const distMetros = Math.round(distKm * 1000)
  cacheDistancias.set(clave, distMetros)

  // Prevenir crecimiento infinito en sesiones muy prolongadas
  if (cacheDistancias.size > 2000) {
    cacheDistancias.clear()
  }
  return distMetros
}

/**
 * Encuentra todos los pedidos vecinos cercanos a un pedido específico (dentro del umbral en metros).
 * Optimizado con caché espacial de distancias.
 */
export function obtenerVecinosCercanos(
  pedido: Pedido,
  todosPedidos: Pedido[],
  umbralMetros: number = 750
): VecinoCercano[] {
  if (!pedido.coordenadas?.latitud || !pedido.coordenadas?.longitud) {
    return []
  }

  // Solo considerar pedidos delivery activos (no entregados ni cancelados)
  const estadosActivos = ['nuevo', 'en_cocina', 'listo', 'en_camino']
  if (!estadosActivos.includes(pedido.estado) || pedido.tipoEntrega !== 'delivery') {
    return []
  }

  const vecinos: VecinoCercano[] = []
  const coordA = pedido.coordenadas

  for (let i = 0; i < todosPedidos.length; i++) {
    const otro = todosPedidos[i]
    if (otro.id === pedido.id) continue
    if (otro.tipoEntrega !== 'delivery') continue
    if (!estadosActivos.includes(otro.estado)) continue
    if (!otro.coordenadas?.latitud || !otro.coordenadas?.longitud) continue

    const distMetros = obtenerDistanciaMetrosCacheada(pedido.id, coordA, otro.id, otro.coordenadas)

    if (distMetros <= umbralMetros) {
      vecinos.push({
        pedido: otro,
        distanciaMetros: distMetros,
      })
    }
  }

  // Ordenar por cercanía (los más cercanos primero)
  return vecinos.sort((a, b) => a.distanciaMetros - b.distanciaMetros)
}

/**
 * Agrupa todos los pedidos activos en clusters/grupos de entrega conjunta según cercanía.
 */
export function detectarGruposCercanos(
  pedidos: Pedido[],
  umbralMetros: number = 750
): GrupoBatch[] {
  const estadosActivos = ['nuevo', 'en_cocina', 'listo', 'en_camino']
  const candidatos = pedidos.filter(
    (p) =>
      p.tipoEntrega === 'delivery' &&
      estadosActivos.includes(p.estado) &&
      p.coordenadas &&
      p.coordenadas.latitud &&
      p.coordenadas.longitud
  )

  if (candidatos.length < 2) return []

  const visitados = new Set<string>()
  const grupos: GrupoBatch[] = []

  for (const p of candidatos) {
    if (visitados.has(p.id)) continue

    const grupoActual: Pedido[] = [p]
    visitados.add(p.id)

    // Buscar todos los pedidos alcanzables dentro del umbral (clustering conexo)
    const cola: Pedido[] = [p]
    let maxDist = 0

    while (cola.length > 0) {
      const actual = cola.shift()!
      for (const otro of candidatos) {
        if (visitados.has(otro.id)) continue

        const distMetros = obtenerDistanciaMetrosCacheada(
          actual.id,
          actual.coordenadas!,
          otro.id,
          otro.coordenadas!
        )

        if (distMetros <= umbralMetros) {
          visitados.add(otro.id)
          grupoActual.push(otro)
          cola.push(otro)
          if (distMetros > maxDist) maxDist = distMetros
        }
      }
    }

    if (grupoActual.length >= 2) {
      // Buscar si alguno ya tiene cadete asignado
      const conCadete = grupoActual.find((ped) => ped.cadete_id)

      grupos.push({
        id: `batch-${grupoActual.map((ped) => ped.id).sort().join('-')}`,
        pedidos: grupoActual,
        distanciaMaximaMetros: maxDist || umbralMetros,
        cadeteId: conCadete?.cadete_id || null,
        cadeteNombre: conCadete?.cadete_nombre || null,
      })
    }
  }

  return grupos
}

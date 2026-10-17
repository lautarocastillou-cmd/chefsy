// ─────────────────────────────────────────────────────────────────────────────
// lib/geo/matcher.ts
// Motor de coincidencia local ultrarrápido (0ms) en memoria para Catamarca.
// Resuelve barrios, alias, Mza/Casa, puntos de referencia y calles principales
// instantáneamente sin tocar la red.
// ─────────────────────────────────────────────────────────────────────────────

import {
  BARRIOS_CATAMARCA,
  PUNTOS_REFERENCIA_CATAMARCA,
  CALLES_PRINCIPALES_CATAMARCA,
  BarrioLocal,
  PuntoReferenciaLocal,
} from './catamarca'

export interface SugerenciaDireccionLocal {
  nombre: string
  coordenadas: {
    latitud: number
    longitud: number
  }
  esBarrio?: boolean
  esReferencia?: boolean
  confianza: number
}

function normalizarTexto(txt: string): string {
  return txt
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[«»“”"']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function extraerManzanaCasa(texto: string): {
  manzana: string | null
  casa: string | null
  monoblock: string | null
} {
  const matchMza = texto.match(/\b(?:mza?|manzana)\.?\s*([a-zA-Z0-9]+)/i)
  const matchCasa = texto.match(/\b(?:c(?:asa)?|l(?:ote)?)\.?\s*([a-zA-Z0-9]+)/i)
  const matchMono = texto.match(/\bmonoblock\.?\s*([a-zA-Z0-9]+)/i)

  return {
    manzana: matchMza ? matchMza[1].toUpperCase() : null,
    casa: matchCasa ? matchCasa[1] : null,
    monoblock: matchMono ? matchMono[1] : null,
  }
}

/**
 * Busca coincidencias locales inmediatas (0ms) en la base de datos de Catamarca.
 * Si el usuario escribe "eva", "500", "unca", "plaza", "belgr", etc.,
 * retorna sugerencias instantáneas listas para mostrar.
 */
export function buscarSugerenciasLocales(texto: string, limite = 5): SugerenciaDireccionLocal[] {
  const q = normalizarTexto(texto)
  if (!q || q.length < 2) return []

  const resultados: SugerenciaDireccionLocal[] = []
  const agregados = new Set<string>()

  const infoMzaCasa = extraerManzanaCasa(texto)
  const detalleMza = [
    infoMzaCasa.manzana ? `Mza ${infoMzaCasa.manzana}` : null,
    infoMzaCasa.casa ? `Casa ${infoMzaCasa.casa}` : null,
    infoMzaCasa.monoblock ? `Monoblock ${infoMzaCasa.monoblock}` : null,
  ].filter(Boolean).join(' ')

  // 1. Puntos de Referencia notorios (Plaza 25, UNCA, Hospitales, Terminal)
  for (const pr of PUNTOS_REFERENCIA_CATAMARCA) {
    const nombreNorm = normalizarTexto(pr.nombre)
    const matchNombre = nombreNorm.includes(q)
    const matchAlias = pr.alias.some(a => normalizarTexto(a).includes(q))

    if (matchNombre || matchAlias) {
      const nombreVisual = `${pr.nombre}, San Fernando del Valle de Catamarca`
      if (!agregados.has(nombreVisual)) {
        agregados.add(nombreVisual)
        resultados.push({
          nombre: nombreVisual,
          coordenadas: { latitud: pr.lat, longitud: pr.lng },
          esReferencia: true,
          confianza: 98,
        })
      }
    }
  }

  // 2. Barrios y Nomenclaturas Sociales (Eva Perón, 500 vv, Parque América, etc.)
  for (const b of BARRIOS_CATAMARCA) {
    const nombreNorm = normalizarTexto(b.nombre)
    const matchNombre = nombreNorm.includes(q) || q.includes(nombreNorm)
    const matchAlias = b.alias.some(a => {
      const aNorm = normalizarTexto(a)
      return aNorm.includes(q) || q.includes(aNorm)
    })

    if (matchNombre || matchAlias) {
      let nombreVisual = `B° ${b.nombre}, ${b.ciudad}`
      if (detalleMza) {
        nombreVisual = `B° ${b.nombre}, ${detalleMza}, ${b.ciudad}`
      }

      if (!agregados.has(nombreVisual)) {
        agregados.add(nombreVisual)
        resultados.push({
          nombre: nombreVisual,
          coordenadas: { latitud: b.centroide.lat, longitud: b.centroide.lng },
          esBarrio: true,
          confianza: 95,
        })
      }
    }
  }

  // 3. Calles principales (si el usuario busca por nombre de calle)
  if (resultados.length < limite) {
    for (const calle of CALLES_PRINCIPALES_CATAMARCA) {
      const calleNorm = normalizarTexto(calle)
      if (calleNorm.includes(q) || (q.length >= 3 && calleNorm.startsWith(q))) {
        // Extraer si el usuario escribió una altura/número
        const matchNumero = texto.match(/\b\d{1,5}\b/)
        const altura = matchNumero ? ` ${matchNumero[0]}` : ''
        const nombreVisual = `${calle}${altura}, San Fernando del Valle de Catamarca`

        if (!agregados.has(nombreVisual)) {
          agregados.add(nombreVisual)
          // Aproximación al centro cívico si es solo la calle sin altura precisa
          resultados.push({
            nombre: nombreVisual,
            coordenadas: { latitud: -28.4696, longitud: -65.7852 },
            confianza: altura ? 75 : 60,
          })
        }
      }
      if (resultados.length >= limite) break
    }
  }

  return resultados.slice(0, limite)
}

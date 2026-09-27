import Fuse from 'fuse.js'

export interface SugerenciaCliente {
  id?: string
  nombre: string
  telefono: string
  telefonoNormalizado: string
  direccion?: string
  coordenadas?: { latitud: number; longitud: number } | null
  metodoPago?: string
  tipoEntrega?: string
  totalPedidos?: number
  ultimaFecha?: string
}

export interface GrupoDuplicado {
  idGrupo: string
  motivo: 'mismo_telefono' | 'nombre_similar' | 'nombre_y_direccion'
  confianza: number // 0 a 100
  clientes: {
    nombre: string
    telefono: string
    telefonoNormalizado: string
    direccion: string
    totalPedidos: number
    totalGastado: number
    ultimoPedidoFecha: string
  }[]
}

/**
 * Normaliza un número telefónico argentino a su formato canónico de 10 dígitos.
 * Maneja prefijos como +54, 9, 0 de discado interurbano y el 15 de celulares.
 * Ejemplo:
 *   "+54 9 383 411-2233" -> "3834112233"
 *   "0383-15-4112233"    -> "3834112233"
 *   "3815550000"         -> "3815550000"
 */
export function normalizarTelefonoArgentino(tel: string | null | undefined): string {
  if (!tel) return ''
  let digitos = String(tel).replace(/\D/g, '')

  if (!digitos) return ''

  // Descartar placeholders comunes
  const textoLimpio = String(tel).toLowerCase().trim()
  if (
    textoLimpio === 'sesp' ||
    textoLimpio === 'sinespecificar' ||
    textoLimpio === 'sin especificar' ||
    textoLimpio === 'undefined' ||
    textoLimpio === 'null' ||
    digitos.length < 6
  ) {
    return ''
  }

  // Quitar prefijo internacional Argentina (54 o 549)
  if (digitos.startsWith('549') && digitos.length >= 12) {
    digitos = digitos.slice(3)
  } else if (digitos.startsWith('54') && digitos.length >= 11) {
    digitos = digitos.slice(2)
  }

  // Quitar 0 inicial de código de área (ej: 0383 -> 383, 011 -> 11)
  if (digitos.startsWith('0') && digitos.length >= 10) {
    digitos = digitos.slice(1)
  }

  // Códigos de área comunes en NOA y principales provincias de Argentina
  // (Catamarca 383/3834, Tucumán 381, Córdoba 351, Buenos Aires 11, etc.)
  const prefijosArea = [
    '3834', '383', '381', '385', '387', '388', '351', '341', '261', '11'
  ]

  for (const cod of prefijosArea) {
    if (digitos.startsWith(cod)) {
      const resto = digitos.slice(cod.length)
      // Si el resto empieza con 15 (móvil local tradicional), se remueve el 15
      if (resto.startsWith('15') && resto.length >= 8) {
        digitos = cod + resto.slice(2)
        break
      }
    }
  }

  return digitos
}

/**
 * Formatea un teléfono normalizado de 10 dígitos para mostrarlo amigablemente.
 * Ejemplo: "3834112233" -> "383 411-2233"
 */
export function formatearTelefonoArgentino(tel: string | null | undefined): string {
  const norm = normalizarTelefonoArgentino(tel)
  if (!norm) return tel ? String(tel).trim() : 'Sin especificar'

  if (norm.length === 10) {
    // Si empieza con 11 (CABA)
    if (norm.startsWith('11')) {
      return `11 ${norm.slice(2, 6)}-${norm.slice(6)}`
    }
    // Si es código de 3 dígitos (383, 381, etc.)
    return `${norm.slice(0, 3)} ${norm.slice(3, 6)}-${norm.slice(6)}`
  }

  return norm
}

/**
 * Limpia un nombre eliminando tildes, signos de puntuación y espacios redundantes.
 */
export function limpiarNombre(nombre: string | null | undefined): string {
  if (!nombre) return ''
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quita acentos
    .replace(/[^a-z0-9\s]/g, ' ')   // Quita puntuación
    .replace(/\s+/g, ' ')           // Colapsa espacios
    .trim()
}

/**
 * Calcula la distancia de Levenshtein entre dos cadenas de texto.
 */
export function distanciaLevenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const filaAnterior = new Array(b.length + 1)
  const filaActual = new Array(b.length + 1)

  for (let j = 0; j <= b.length; j++) {
    filaAnterior[j] = j
  }

  for (let i = 0; i < a.length; i++) {
    filaActual[0] = i + 1
    for (let j = 0; j < b.length; j++) {
      const costo = a[i] === b[j] ? 0 : 1
      filaActual[j + 1] = Math.min(
        filaActual[j] + 1,       // inserción
        filaAnterior[j + 1] + 1, // eliminación
        filaAnterior[j] + costo  // sustitución
      )
    }
    for (let j = 0; j <= b.length; j++) {
      filaAnterior[j] = filaActual[j]
    }
  }

  return filaActual[b.length]
}

/**
 * Calcula un puntaje de similitud entre 0 (totalmente distintos) y 1 (idénticos).
 * Combina similitud por distancia de edición y solapamiento de palabras (token match).
 */
export function calcularSimilitudNombres(nombreA: string, nombreB: string): number {
  const normA = limpiarNombre(nombreA)
  const normB = limpiarNombre(nombreB)

  if (!normA || !normB) return 0
  if (normA === normB) return 1

  // 1. Similitud por Levenshtein
  const maxLen = Math.max(normA.length, normB.length)
  const dist = distanciaLevenshtein(normA, normB)
  const simLev = 1 - dist / maxLen

  // 2. Similitud por tokens/palabras (ej: "Juan Perez" vs "Perez Juan")
  const tokensA = new Set(normA.split(' ').filter(w => w.length > 1))
  const tokensB = new Set(normB.split(' ').filter(w => w.length > 1))

  let coincidencias = 0
  tokensA.forEach(t => {
    if (tokensB.has(t)) coincidencias++
  })

  const unionTokens = new Set([...tokensA, ...tokensB]).size
  const simTokens = unionTokens > 0 ? coincidencias / unionTokens : 0

  // 3. Caso de apodo / prefijo (ej: "Lauta" y "Lautaro")
  const esPrefijo = (normA.length >= 4 && normB.startsWith(normA)) || 
                    (normB.length >= 4 && normA.startsWith(normB))

  let score = simLev * 0.7 + simTokens * 0.3
  if (esPrefijo) {
    score = Math.max(score, 0.85)
  }

  return Math.min(1, Math.max(0, score))
}

/**
 * Configura una instancia de Fuse.js optimizada para búsqueda difusa de clientes.
 */
export function crearIndiceBuscadorClientes(clientes: SugerenciaCliente[]): Fuse<SugerenciaCliente> {
  return new Fuse(clientes, {
    keys: [
      { name: 'nombre', weight: 0.65 },
      { name: 'telefonoNormalizado', weight: 0.25 },
      { name: 'direccion', weight: 0.1 }
    ],
    threshold: 0.38, // Balance óptimo entre tolerancia a typos y precisión
    includeScore: true,
    minMatchCharLength: 2,
    shouldSort: true,
  })
}

/**
 * Algoritmo de detección de duplicados para la Agenda CRM.
 * Identifica grupos de clientes sospechosos de ser la misma persona.
 */
export function detectarGruposDuplicados(
  clientes: Array<{
    nombre: string
    telefono: string
    direccionMasReciente?: string
    totalPedidos: number
    totalGastado: number
    fechaUltimoPedido?: string
  }>
): GrupoDuplicado[] {
  const grupos: GrupoDuplicado[] = []
  const visitados = new Set<number>()

  // 1. Detección por mismo teléfono normalizado con nombres distintos
  const porTelefono = new Map<string, number[]>()
  clientes.forEach((c, idx) => {
    const telNorm = normalizarTelefonoArgentino(c.telefono)
    if (telNorm && telNorm.length >= 8) {
      const lista = porTelefono.get(telNorm) || []
      lista.push(idx)
      porTelefono.set(telNorm, lista)
    }
  })

  porTelefono.forEach((indices, telNorm) => {
    if (indices.length > 1) {
      // Verificar si los nombres tienen alguna variación
      const nombresDistintos = new Set(indices.map(i => limpiarNombre(clientes[i].nombre)))
      if (nombresDistintos.size > 1) {
        indices.forEach(i => visitados.add(i))
        grupos.push({
          idGrupo: `tel_${telNorm}`,
          motivo: 'mismo_telefono',
          confianza: 95,
          clientes: indices.map(i => ({
            nombre: clientes[i].nombre,
            telefono: clientes[i].telefono,
            telefonoNormalizado: telNorm,
            direccion: clientes[i].direccionMasReciente || '',
            totalPedidos: clientes[i].totalPedidos || 0,
            totalGastado: clientes[i].totalGastado || 0,
            ultimoPedidoFecha: clientes[i].fechaUltimoPedido || '',
          }))
        })
      }
    }
  })

  // 2. Detección por similitud alta de nombre (> 0.82)
  for (let i = 0; i < clientes.length; i++) {
    if (visitados.has(i)) continue
    const cA = clientes[i]
    const similares: number[] = [i]

    for (let j = i + 1; j < clientes.length; j++) {
      if (visitados.has(j)) continue
      const cB = clientes[j]

      const simNombre = calcularSimilitudNombres(cA.nombre, cB.nombre)
      const telNormA = normalizarTelefonoArgentino(cA.telefono)
      const telNormB = normalizarTelefonoArgentino(cB.telefono)

      // Si tienen nombres muy semejantes (ej: Lautaro Castillo vs Lautaro Castillou)
      if (simNombre >= 0.82) {
        // Si además tienen misma dirección o GPS similar, es prácticamente certeza
        const dirA = limpiarNombre(cA.direccionMasReciente)
        const dirB = limpiarNombre(cB.direccionMasReciente)
        const mismaDir = dirA && dirB && dirA.length > 5 && dirA === dirB

        const confianza = mismaDir 
          ? 92 
          : (telNormA && telNormB && telNormA === telNormB ? 95 : Math.round(simNombre * 90))

        similares.push(j)
        visitados.add(j)
      }
    }

    if (similares.length > 1) {
      visitados.add(i)
      const grupoClientes = similares.map(idx => ({
        nombre: clientes[idx].nombre,
        telefono: clientes[idx].telefono,
        telefonoNormalizado: normalizarTelefonoArgentino(clientes[idx].telefono),
        direccion: clientes[idx].direccionMasReciente || '',
        totalPedidos: clientes[idx].totalPedidos || 0,
        totalGastado: clientes[idx].totalGastado || 0,
        ultimoPedidoFecha: clientes[idx].fechaUltimoPedido || '',
      }))

      grupos.push({
        idGrupo: `nom_${i}`,
        motivo: 'nombre_similar',
        confianza: 85,
        clientes: grupoClientes
      })
    }
  }

  return grupos
}

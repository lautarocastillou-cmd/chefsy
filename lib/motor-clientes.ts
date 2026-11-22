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
 * Busca clientes usando únicamente el campo que el usuario está completando.
 * Esto evita que una coincidencia débil en dirección o teléfono aparezca como
 * sugerencia cuando la búsqueda era por nombre.
 */
export function buscarClientesPorCampo(
  clientes: SugerenciaCliente[],
  consulta: string,
  campo: 'nombre' | 'telefono',
  limite = 4,
): SugerenciaCliente[] {
  const termino = campo === 'nombre'
    ? limpiarNombre(consulta)
    : normalizarTelefonoArgentino(consulta)

  const minimo = campo === 'nombre' ? 3 : 3
  if (termino.length < minimo) return []

  const resultados = clientes
    .map((cliente, indice) => {
      const valor = campo === 'nombre'
        ? limpiarNombre(cliente.nombre)
        : cliente.telefonoNormalizado || normalizarTelefonoArgentino(cliente.telefono)

      if (!valor) return null

      if (campo === 'nombre') {
        const palabras = termino.split(' ').filter(Boolean)
        const palabrasCliente = valor.split(' ').filter(Boolean)
        const coincidePorPalabra = palabras.every(palabra => {
          if (palabrasCliente.some(nombre => nombre.includes(palabra))) return true

          // Tolerar un error de tipeo pequeño, pero solo dentro del nombre.
          // No se usa para teléfono ni dirección: evita falsos positivos.
          return palabrasCliente.some(nombre => {
            const distancia = distanciaLevenshtein(palabra, nombre)
            const maxErrores = palabra.length >= 6 ? 2 : 1
            return distancia <= maxErrores && distancia / Math.max(palabra.length, nombre.length) <= 0.34
          })
        })
        if (!coincidePorPalabra) return null

        const exacto = valor === termino
        const empiezaConTermino = valor.startsWith(termino)
        const posicion = valor.indexOf(termino)
        return {
          cliente,
          indice,
          prioridad: exacto ? 0 : empiezaConTermino ? 1 : 2,
          distancia: Math.max(0, valor.length - termino.length),
          posicion,
        }
      }

      if (valor !== termino && !valor.includes(termino)) return null
      return {
        cliente,
        indice,
        prioridad: valor === termino ? 0 : 1,
        distancia: Math.max(0, valor.length - termino.length),
        posicion: valor.indexOf(termino),
      }
    })
    .filter((resultado): resultado is NonNullable<typeof resultado> => resultado !== null)
    .sort((a, b) => (
      a.prioridad - b.prioridad ||
      a.distancia - b.distancia ||
      a.posicion - b.posicion ||
      a.indice - b.indice
    ))

  return resultados.slice(0, limite).map(resultado => resultado.cliente)
}

export interface FiltrosBusquedaCliente {
  nombre?: string
  telefono?: string
  direccion?: string
}

export type NivelCoincidenciaCliente = 'exacta' | 'debil'

/**
 * Distingue el aviso de cliente registrado de una sugerencia aproximada.
 * Solo nombre completo o teléfono completo confirman una coincidencia.
 */
export function obtenerNivelCoincidencia(
  cliente: SugerenciaCliente,
  filtros: FiltrosBusquedaCliente,
): NivelCoincidenciaCliente {
  const nombre = limpiarNombre(filtros.nombre)
  const telefono = normalizarTelefonoArgentino(filtros.telefono)
  const nombreExacto = Boolean(nombre && limpiarNombre(cliente.nombre) === nombre)
  const telefonoCliente = cliente.telefonoNormalizado || normalizarTelefonoArgentino(cliente.telefono)
  const telefonoExacto = Boolean(telefono && telefonoCliente === telefono)

  return nombreExacto || telefonoExacto ? 'exacta' : 'debil'
}

export interface CuentaClienteFuente {
  id?: string
  nombre?: string | null
  telefono?: string | null
}

export interface PedidoClienteFuente {
  cliente?: string | null
  telefono?: string | null
  direccion?: string | null
  coordenadas?: { latitud: number; longitud: number } | null
  metodoPago?: string | null
  tipoEntrega?: string | null
  created_at?: string | null
}

/**
 * Consolida cuentas formales y todo el historial de pedidos en un único índice.
 * El orden más reciente gana para dirección, coordenadas y preferencias.
 */
export function consolidarSugerenciasClientes(
  cuentas: CuentaClienteFuente[],
  pedidos: PedidoClienteFuente[],
): SugerenciaCliente[] {
  const mapa = new Map<string, SugerenciaCliente>()
  const clave = (nombre: string | null | undefined, telefono: string | null | undefined) => {
    const telefonoNormalizado = normalizarTelefonoArgentino(telefono)
    return telefonoNormalizado || `nombre:${limpiarNombre(nombre)}`
  }

  for (const cuenta of cuentas) {
    const nombre = cuenta.nombre?.trim()
    if (!nombre) continue
    const telefono = cuenta.telefono || ''
    const telefonoNormalizado = normalizarTelefonoArgentino(telefono)
    mapa.set(clave(nombre, telefono), {
      id: cuenta.id,
      nombre,
      telefono,
      telefonoNormalizado,
      totalPedidos: 0,
    })
  }

  const pedidosOrdenados = [...pedidos]
    .filter(p => Boolean(p.cliente?.trim() && p.cliente.trim().length >= 2))
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))

  for (const pedido of pedidosOrdenados) {
    const nombre = pedido.cliente!.trim()
    const telefono = pedido.telefono || ''
    const telefonoNormalizado = normalizarTelefonoArgentino(telefono)
    const clavePedido = clave(nombre, telefono)
    const existente = mapa.get(clavePedido)

    if (existente) {
      existente.totalPedidos = (existente.totalPedidos || 0) + 1
      if (!existente.direccion && pedido.direccion) {
        existente.direccion = pedido.direccion
        existente.coordenadas = pedido.coordenadas || null
      }
      if (!existente.metodoPago && pedido.metodoPago) existente.metodoPago = pedido.metodoPago
      if (!existente.tipoEntrega && pedido.tipoEntrega) existente.tipoEntrega = pedido.tipoEntrega
      if (!existente.ultimaFecha && pedido.created_at) existente.ultimaFecha = pedido.created_at
      continue
    }

    mapa.set(clavePedido, {
      nombre,
      telefono,
      telefonoNormalizado,
      direccion: pedido.direccion || '',
      coordenadas: pedido.coordenadas || null,
      metodoPago: pedido.metodoPago || 'efectivo',
      tipoEntrega: pedido.tipoEntrega || 'delivery',
      totalPedidos: 1,
      ultimaFecha: pedido.created_at || undefined,
    })
  }

  return Array.from(mapa.values())
    .sort((a, b) => (b.totalPedidos || 0) - (a.totalPedidos || 0))
}

/**
 * Busca por nombre, teléfono y dirección como filtros independientes.
 * Cuando hay más de un filtro válido, todos deben coincidir en el mismo cliente.
 */
export function buscarClientesConFiltros(
  clientes: SugerenciaCliente[],
  filtros: FiltrosBusquedaCliente,
): SugerenciaCliente[] {
  const nombre = filtros.nombre?.trim() || ''
  const telefono = filtros.telefono?.trim() || ''
  const direccion = filtros.direccion?.trim() || ''

  const resultadosNombre = nombre
    ? buscarClientesPorCampo(clientes, nombre, 'nombre', clientes.length)
    : clientes

  const telefonoNormalizado = normalizarTelefonoArgentino(telefono)
  const usaTelefono = telefonoNormalizado.length >= 3
  const direccionNormalizada = limpiarNombre(direccion)
  const usaDireccion = direccionNormalizada.length >= 3

  return resultadosNombre.filter(cliente => {
    if (usaTelefono) {
      const telefonoCliente = cliente.telefonoNormalizado || normalizarTelefonoArgentino(cliente.telefono)
      if (!telefonoCliente.includes(telefonoNormalizado)) return false
    }

    if (usaDireccion) {
      const direccionCliente = limpiarNombre(cliente.direccion)
      if (!direccionCliente.includes(direccionNormalizada)) return false
    }

    return true
  })
}

/**
 * Clave estable para mantener seleccionada una sugerencia después de que
 * React vuelva a ejecutar la búsqueda.
 */
export function obtenerClaveCliente(cliente: SugerenciaCliente): string {
  return cliente.id || normalizarTelefonoArgentino(cliente.telefono) || cliente.telefonoNormalizado || limpiarNombre(cliente.nombre)
}

export function clienteCoincideConConfirmacion(
  cliente: SugerenciaCliente,
  claveConfirmada: string | null | undefined,
): boolean {
  return Boolean(claveConfirmada && obtenerClaveCliente(cliente) === claveConfirmada)
}

export function datosCoincidenConConfirmacion(
  cliente: SugerenciaCliente,
  datos: { nombre?: string; telefono?: string; direccion?: string },
): boolean {
  const nombreConsulta = limpiarNombre(datos.nombre)
  const telefonoConsulta = normalizarTelefonoArgentino(datos.telefono)
  const direccionConsulta = limpiarNombre(datos.direccion)
  const nombreCoincide = !nombreConsulta || limpiarNombre(cliente.nombre) === nombreConsulta
  const telefonoCliente = cliente.telefonoNormalizado || normalizarTelefonoArgentino(cliente.telefono)
  const telefonoCoincide = !telefonoConsulta || telefonoCliente === telefonoConsulta
  const direccionCliente = limpiarNombre(cliente.direccion)
  const direccionCoincide = !direccionConsulta || direccionCliente === direccionConsulta
  return nombreCoincide && telefonoCoincide && direccionCoincide
}

/**
 * Calcula un puntaje de calidad (0-100) para una sugerencia de cliente
 * dada la consulta del usuario. Solo se ponderan los campos que el
 * usuario efectivamente completó.
 * - Nombre: 50 puntos (similitud difusa)
 * - Teléfono: 30 puntos (exacto o incluido)
 * - Dirección: 20 puntos (exacta o incluida)
 */
export function calcularScoreSugerencia(
  cliente: SugerenciaCliente,
  filtros: FiltrosBusquedaCliente,
): number {
  const nombreConsulta = limpiarNombre(filtros.nombre || '')
  const telefonoConsulta = normalizarTelefonoArgentino(filtros.telefono || '')
  const direccionConsulta = limpiarNombre(filtros.direccion || '')

  let puntos = 0
  let totalCampos = 0

  // Nombre (peso 50)
  if (nombreConsulta) {
    totalCampos += 50
    const sim = calcularSimilitudNombres(cliente.nombre, nombreConsulta)
    puntos += sim * 50
  }

  // Teléfono (peso 30)
  if (telefonoConsulta) {
    totalCampos += 30
    const telCliente = cliente.telefonoNormalizado || normalizarTelefonoArgentino(cliente.telefono)
    if (telCliente === telefonoConsulta) puntos += 30
    else if (telCliente.includes(telefonoConsulta) || telefonoConsulta.includes(telCliente)) puntos += 15
  }

  // Dirección (peso 20)
  if (direccionConsulta) {
    totalCampos += 20
    const dirCliente = limpiarNombre(cliente.direccion || '')
    if (dirCliente === direccionConsulta) puntos += 20
    else if (dirCliente.includes(direccionConsulta) || direccionConsulta.includes(dirCliente)) puntos += 10
  }

  if (totalCampos === 0) return 0
  return Math.round((puntos / totalCampos) * 100)
}

/**
 * Filtra sugerencias por un umbral mínimo de calidad.
 * Solo devuelve clientes cuyo score supere el umbral, ordenados de mayor a menor score.
 */
export function filtrarSugerenciasPorCalidad(
  clientes: SugerenciaCliente[],
  filtros: FiltrosBusquedaCliente,
  umbralMinimo = 40,
): { cliente: SugerenciaCliente; score: number }[] {
  if (clientes.length === 0) return []

  return clientes
    .map((c) => ({ cliente: c, score: calcularScoreSugerencia(c, filtros) }))
    .filter((item) => item.score >= umbralMinimo)
    .sort((a, b) => b.score - a.score)
}

/**
 * Ordena clientes por frecuencia (totalPedidos) y recencia (ultimaFecha).
 * Los clientes con más pedidos y más recientes van primero.
 */
export function ordenarClientesPorFrecuencia(clientes: SugerenciaCliente[]): SugerenciaCliente[] {
  return [...clientes].sort((a, b) => {
    const pedidosA = a.totalPedidos || 0
    const pedidosB = b.totalPedidos || 0
    if (pedidosB !== pedidosA) return pedidosB - pedidosA

    const fechaA = a.ultimaFecha || ''
    const fechaB = b.ultimaFecha || ''
    return fechaB.localeCompare(fechaA)
  })
}

/**
 * Extrae el barrio de una dirección. Toma las palabras después del número
 * de calle (si lo hay) como candidato a barrio.
 */
export function extraerBarrio(direccion: string | null | undefined): string {
  if (!direccion) return ''
  const partes = direccion.trim().split(/\s+/)
  let inicio = 0
  if (/^\d+/.test(partes[0] || '')) inicio = 1
  const barrio = partes.slice(inicio, inicio + 2).join(' ').toLowerCase()
  return limpiarNombre(barrio)
}

/**
 * Prepara la lista final de sugerencias para el CRM:
 * 1. Filtro por calidad mínima (no mostrar clientes al azar)
 * 2. Agrupamiento estable por barrio (si hay dirección cargada)
 * 3. Orden por frecuencia y recencia dentro de cada grupo
 */
export interface OpcionesPrepararCRM {
  umbralCalidad?: number
  priorizarBarrio?: boolean
}

export function prepararSugerenciasCRM(
  clientes: SugerenciaCliente[],
  filtros: FiltrosBusquedaCliente,
  opciones: OpcionesPrepararCRM = {},
): SugerenciaCliente[] {
  const { umbralCalidad = 40, priorizarBarrio = true } = opciones

  // 1. Filtro por calidad (con scores)
  const conScore = filtrarSugerenciasPorCalidad(clientes, filtros, umbralCalidad)

  // 2. Orden estable por frecuencia antes de agrupar por barrio
  const ordenadosPorFrecuencia = conScore.map((item) => item.cliente)
  const porFrecuencia = ordenarClientesPorFrecuencia(ordenadosPorFrecuencia)

  // 3. Si hay dirección, priorizar mismo barrio manteniendo orden relativo
  if (priorizarBarrio && filtros.direccion?.trim()) {
    const barrioConsulta = extraerBarrio(filtros.direccion)
    if (barrioConsulta) {
      const mismosBarrio = porFrecuencia.filter((c) => extraerBarrio(c.direccion) === barrioConsulta)
      const otrosBarrio = porFrecuencia.filter((c) => extraerBarrio(c.direccion) !== barrioConsulta)
      return [...mismosBarrio, ...otrosBarrio]
    }
  }

  return porFrecuencia
}

export function obtenerMotivoCoincidencia(filtros: { nombre?: string; telefono?: string; direccion?: string }): string {
  const tieneNombre = Boolean(filtros.nombre?.trim())
  const tieneTelefono = Boolean(normalizarTelefonoArgentino(filtros.telefono))
  const tieneDireccion = Boolean(limpiarNombre(filtros.direccion).length >= 3)
  if (tieneNombre && tieneTelefono) return 'Nombre y teléfono'
  if (tieneNombre && tieneDireccion) return 'Nombre y dirección'
  if (tieneTelefono) return 'Teléfono exacto'
  if (tieneDireccion) return 'Dirección'
  return 'Coincide en el nombre'
}

export function moverIndiceSugerencia(indice: number, total: number, direccion: -1 | 1): number {
  if (total <= 0) return -1
  return (indice + direccion + total) % total
}

/**
 * Configura una instancia Fuse.js conservando búsquedas existentes de CRM.
 * Las búsquedas del formulario nuevo usan buscarClientesPorCampo para no
 * mezclar campos distintos.
 */
export function crearIndiceBuscadorClientes(clientes: SugerenciaCliente[]): Fuse<SugerenciaCliente> {
  return new Fuse(clientes, {
    keys: [
      { name: 'nombre', weight: 0.65 },
      { name: 'telefonoNormalizado', weight: 0.25 },
      { name: 'direccion', weight: 0.1 }
    ],
    threshold: 0.38,
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

      // Comprobar direcciones
      const dirA = limpiarNombre(cA.direccionMasReciente)
      const dirB = limpiarNombre(cB.direccionMasReciente)
      const mismaDir = Boolean(dirA && dirB && dirA.length > 5 && dirA === dirB)

      // Regla de descarte inteligente:
      // Si ambos tienen celulares válidos y son DISTINTOS:
      if (telNormA && telNormB && telNormA !== telNormB) {
        const tokensA = limpiarNombre(cA.nombre).split(' ').filter(w => w.length > 1)
        const tokensB = limpiarNombre(cB.nombre).split(' ').filter(w => w.length > 1)
        // Nombres de una sola palabra (ej: "Lucas", "Agustin") con números distintos son personas distintas
        if (tokensA.length <= 1 || tokensB.length <= 1) {
          continue
        }
        // Si no comparten dirección ni tienen nombre casi idéntico (>0.94), descartar
        if (!mismaDir && simNombre < 0.94) {
          continue
        }
      }

      // Si tienen nombres muy semejantes (ej: Lautaro Castillo vs Lautaro Castillou)
      if (simNombre >= 0.82) {
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

// ── PERSISTENCIA DE CASOS OMITIDOS / DESCARTADOS ─────────────────────────────
export const STORAGE_KEY_DUPLICADOS_OMITIDOS = 'chefsy_duplicados_omitidos'

/**
 * Genera una firma única para un grupo de duplicados basada en sus clientes y teléfonos.
 */
export function obtenerFirmaGrupo(grupo: GrupoDuplicado): string {
  if (!grupo || !Array.isArray(grupo.clientes)) return ''
  const items = grupo.clientes.map(c => {
    const nom = limpiarNombre(c.nombre)
    const tel = normalizarTelefonoArgentino(c.telefono) || 'sin_tel'
    return `${nom}:${tel}`
  })
  items.sort()
  return items.join('|')
}

/**
 * Obtiene la lista de firmas de grupos omitidos desde localStorage.
 */
export function obtenerFirmasOmitidas(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DUPLICADOS_OMITIDOS)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Guarda una firma de grupo omitido en localStorage.
 */
export function guardarFirmaOmitida(firma: string): string[] {
  if (typeof window === 'undefined' || !firma) return []
  try {
    const existentes = new Set(obtenerFirmasOmitidas())
    existentes.add(firma)
    const lista = Array.from(existentes)
    localStorage.setItem(STORAGE_KEY_DUPLICADOS_OMITIDOS, JSON.stringify(lista))
    return lista
  } catch {
    return []
  }
}

/**
 * Restablece todas las firmas omitidas para volver a analizar todos los casos.
 */
export function restablecerFirmasOmitidas(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY_DUPLICADOS_OMITIDOS)
  } catch {}
}

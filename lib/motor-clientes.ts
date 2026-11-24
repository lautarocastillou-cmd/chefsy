import Fuse from 'fuse.js'

export interface SugerenciaCliente {
  id?: string
  claveCliente?: string
  nombre: string
  telefono: string
  telefonoNormalizado: string
  direccion?: string
  coordenadas?: { latitud: number; longitud: number } | null
  metodoPago?: string
  metodoPagoHabitual?: string
  tipoEntrega?: string
  totalPedidos?: number
  totalCancelados?: number
  totalGastado?: number
  ticketPromedio?: number
  platoFavorito?: string
  ultimaObservacion?: string
  ultimaFecha?: string
  notaFija?: string
  etiquetas?: string[]
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
 * Calcula la distancia de Damerau-Levenshtein (Optimal String Alignment)
 * para detectar transposiciones adyacentes (ej: "lautrao" <-> "lautaro") como 1 error.
 */
function distanciaDamerauLevenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const lenA = a.length
  const lenB = b.length
  const d: number[][] = Array.from({ length: lenA + 1 }, () => new Array(lenB + 1).fill(0))

  for (let i = 0; i <= lenA; i++) d[i][0] = i
  for (let j = 0; j <= lenB; j++) d[0][j] = j

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(
        d[i - 1][j] + 1,         // eliminación
        d[i][j - 1] + 1,         // inserción
        d[i - 1][j - 1] + costo, // sustitución
      )
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1) // transposición
      }
    }
  }

  return d[lenA][lenB]
}

/**
 * Extrae dígitos utilizables para búsquedas por teléfono (incluye parciales de 4-5 dígitos).
 * Si el número tiene >= 6 dígitos válidos, usa la normalización argentina canónica.
 */
function extraerDigitosTelefonoConsulta(tel: string | null | undefined): string {
  if (!tel) return ''
  const norm = normalizarTelefonoArgentino(tel)
  if (norm) return norm

  const textoLimpio = String(tel).toLowerCase().trim()
  if (
    textoLimpio === 'sesp' ||
    textoLimpio === 'sinespecificar' ||
    textoLimpio === 'sin especificar' ||
    textoLimpio === 'undefined' ||
    textoLimpio === 'null'
  ) {
    return ''
  }

  const digitos = String(tel).replace(/\D/g, '')
  return digitos.length >= 4 ? digitos : ''
}

/**
 * Evalúa si un token de consulta coincide con un token candidato por:
 * - igualdad exacta
 * - prefijo estricto (o prefijo inverso si el candidato tiene >= 4 caracteres)
 * - typo genuino (Levenshtein <= 1 para largo >= 4, <= 2 para largo >= 7, o transposición adyacente),
 *   rechazando palabras no relacionadas como "carlos" vs "marcos" donde cambia la letra inicial y largo <= 6.
 */
function evaluarCoincidenciaToken(
  queryToken: string,
  candidateToken: string,
): { match: boolean; score: number; exacto: boolean } {
  if (!queryToken || !candidateToken) {
    return { match: false, score: 0, exacto: false }
  }

  if (queryToken === candidateToken) {
    return { match: true, score: 1, exacto: true }
  }

  // Prefijo estricto (ej: "laut" -> "lautaro", "fe" -> "fernandez")
  if (queryToken.length >= 2 && candidateToken.startsWith(queryToken)) {
    const ratio = queryToken.length / candidateToken.length
    const score = queryToken.length >= 3
      ? Math.min(0.95, 0.80 + 0.15 * ratio)
      : 0.78
    return { match: true, score, exacto: false }
  }

  // Prefijo inverso (ej: "lautaro" -> "lauta")
  if (candidateToken.length >= 4 && queryToken.startsWith(candidateToken)) {
    const ratio = candidateToken.length / queryToken.length
    const score = Math.min(0.92, 0.78 + 0.14 * ratio)
    return { match: true, score, exacto: false }
  }

  // Typo genuino
  const minLen = Math.min(queryToken.length, candidateToken.length)
  const maxLen = Math.max(queryToken.length, candidateToken.length)
  if (minLen < 4) {
    return { match: false, score: 0, exacto: false }
  }

  const mismaInicial = queryToken[0] === candidateToken[0]
  if (!mismaInicial && maxLen <= 6) {
    return { match: false, score: 0, exacto: false }
  }

  const distLev = distanciaLevenshtein(queryToken, candidateToken)
  const distDam = distanciaDamerauLevenshtein(queryToken, candidateToken)
  const maxLev = minLen >= 7 ? 2 : 1

  const esTypoValido =
    (distLev <= maxLev || (distDam === 1 && minLen >= 4)) &&
    distDam / maxLen <= 0.30 &&
    (mismaInicial || distDam <= 1)

  if (esTypoValido) {
    const score = Math.max(0.70, 1 - (distDam / maxLen) * 1.15)
    return { match: true, score, exacto: false }
  }

  return { match: false, score: 0, exacto: false }
}

/**
 * Calcula un puntaje de similitud entre 0 (totalmente distintos) y 1 (idénticos).
 * Prioriza coincidencia estricta por tokens (exacto, prefijo, typo genuino) para
 * evitar falsos positivos entre nombres no relacionados como "Carlos" vs "Marcos".
 */
export function calcularSimilitudNombres(nombreA: string, nombreB: string): number {
  const normA = limpiarNombre(nombreA)
  const normB = limpiarNombre(nombreB)

  if (!normA || !normB) return 0
  if (normA === normB) return 1

  const tokensA = normA.split(' ').filter(w => w.length >= 2)
  const tokensB = normB.split(' ').filter(w => w.length >= 2)

  if (tokensA.length === 0 || tokensB.length === 0) {
    const esPrefijo = normA.startsWith(normB) || normB.startsWith(normA)
    return esPrefijo ? 0.75 : 0
  }

  const [menores, mayores] = tokensA.length <= tokensB.length
    ? [tokensA, tokensB]
    : [tokensB, tokensA]

  let sumaScores = 0
  let coincidencias = 0

  for (const tMenor of menores) {
    let mejorScore = 0
    for (const tMayor of mayores) {
      const ab = evaluarCoincidenciaToken(tMenor, tMayor)
      const ba = evaluarCoincidenciaToken(tMayor, tMenor)
      const candidatoScore = Math.max(ab.match ? ab.score : 0, ba.match ? ba.score : 0)
      if (candidatoScore > mejorScore) {
        mejorScore = candidatoScore
      }
    }
    if (mejorScore > 0) {
      coincidencias++
      sumaScores += mejorScore
    }
  }

  if (coincidencias === menores.length) {
    const promedio = sumaScores / menores.length
    const factorCobertura = menores.length === mayores.length
      ? 1
      : 0.85 + 0.10 * (menores.length / mayores.length)
    return Math.min(1, Math.max(0, promedio * factorCobertura))
  }

  // Ningún token o solo una fracción coincidió: penalizar fuertemente
  if (coincidencias === 0) {
    const maxLen = Math.max(normA.length, normB.length)
    const simLev = 1 - distanciaLevenshtein(normA, normB) / maxLen
    return Math.min(0.35, Math.max(0, simLev * 0.45))
  }

  const unionEstimada = mayores.length + (menores.length - coincidencias)
  return Math.min(0.45, Math.max(0, (coincidencias / unionEstimada) * 0.45))
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
  total?: number | string | null
  observaciones?: string | null
  productos?: { nombre?: string; cantidad?: number }[] | null
  estado?: string | null
  created_at?: string | null
}

export interface NotaCRMFuente {
  notaFija?: string
  etiquetas?: string[]
}

/**
 * Consolida cuentas formales y todo el historial de pedidos en un único índice.
 * El orden más reciente gana para dirección, coordenadas y observaciones; además
 * calcula métricas de mini-perfil (ticket promedio, pago habitual, plato favorito)
 * y adjunta notas fijas/etiquetas persistentes del CRM.
 */
export function consolidarSugerenciasClientes(
  cuentas: CuentaClienteFuente[],
  pedidos: PedidoClienteFuente[],
  notasMap: Record<string, NotaCRMFuente> = {},
): SugerenciaCliente[] {
  const mapa = new Map<string, SugerenciaCliente>()
  const conteosPago = new Map<string, Record<string, number>>()
  const conteosPlatos = new Map<string, Record<string, number>>()

  const clave = (nombre: string | null | undefined, telefono: string | null | undefined) => {
    const telefonoNormalizado = normalizarTelefonoArgentino(telefono)
    return telefonoNormalizado || `nombre:${limpiarNombre(nombre)}`
  }

  for (const cuenta of cuentas) {
    const nombre = cuenta.nombre?.trim()
    if (!nombre) continue
    const telefono = cuenta.telefono || ''
    const telefonoNormalizado = normalizarTelefonoArgentino(telefono)
    const claveCuenta = clave(nombre, telefono)
    mapa.set(claveCuenta, {
      id: cuenta.id,
      claveCliente: claveCuenta,
      nombre,
      telefono,
      telefonoNormalizado,
      totalPedidos: 0,
      totalCancelados: 0,
      totalGastado: 0,
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
    const esCancelado = pedido.estado === 'cancelado'
    const montoPedido = Number(pedido.total) || 0
    const obsLimpia = typeof pedido.observaciones === 'string' ? pedido.observaciones.trim() : ''

    let existente = mapa.get(clavePedido)

    if (!existente) {
      existente = {
        claveCliente: clavePedido,
        nombre,
        telefono,
        telefonoNormalizado,
        direccion: pedido.direccion || '',
        coordenadas: pedido.coordenadas || null,
        metodoPago: pedido.metodoPago || 'efectivo',
        tipoEntrega: pedido.tipoEntrega || 'delivery',
        totalPedidos: 0,
        totalCancelados: 0,
        totalGastado: 0,
        ultimaFecha: pedido.created_at || undefined,
      }
      mapa.set(clavePedido, existente)
    } else {
      if (!existente.direccion && pedido.direccion) {
        existente.direccion = pedido.direccion
        existente.coordenadas = pedido.coordenadas || null
      }
      if (!existente.metodoPago && pedido.metodoPago) existente.metodoPago = pedido.metodoPago
      if (!existente.tipoEntrega && pedido.tipoEntrega) existente.tipoEntrega = pedido.tipoEntrega
      if (!existente.ultimaFecha && pedido.created_at) existente.ultimaFecha = pedido.created_at
    }

    if (esCancelado) {
      existente.totalCancelados = (existente.totalCancelados || 0) + 1
    } else {
      existente.totalPedidos = (existente.totalPedidos || 0) + 1
      existente.totalGastado = (existente.totalGastado || 0) + montoPedido

      if (pedido.metodoPago && pedido.metodoPago !== 'sin_especificar') {
        const pagos = conteosPago.get(clavePedido) || {}
        pagos[pedido.metodoPago] = (pagos[pedido.metodoPago] || 0) + 1
        conteosPago.set(clavePedido, pagos)
      }

      if (Array.isArray(pedido.productos)) {
        const platos = conteosPlatos.get(clavePedido) || {}
        for (const item of pedido.productos) {
          const nomPlato = typeof item?.nombre === 'string' ? item.nombre.trim() : ''
          if (!nomPlato) continue
          const cant = Number(item?.cantidad) || 1
          platos[nomPlato] = (platos[nomPlato] || 0) + cant
        }
        conteosPlatos.set(clavePedido, platos)
      }
    }

    if (!existente.ultimaObservacion && obsLimpia) {
      existente.ultimaObservacion = obsLimpia
    }
  }

  // Calcular derivados finales y adjuntar notas/etiquetas CRM
  for (const [claveCli, cliente] of mapa.entries()) {
    const totalPed = cliente.totalPedidos || 0
    const totalGast = cliente.totalGastado || 0
    if (totalPed > 0 && totalGast > 0) {
      cliente.ticketPromedio = Math.round(totalGast / totalPed)
    }

    const pagos = conteosPago.get(claveCli)
    if (pagos) {
      const topPago = Object.entries(pagos).sort((a, b) => b[1] - a[1])[0]
      if (topPago) cliente.metodoPagoHabitual = topPago[0]
    }

    const platos = conteosPlatos.get(claveCli)
    if (platos) {
      const topPlato = Object.entries(platos).sort((a, b) => b[1] - a[1])[0]
      if (topPlato) cliente.platoFavorito = topPlato[0]
    }

    const claveNombreFallback = `nombre:${limpiarNombre(cliente.nombre)}`
    const notaCRM = notasMap[claveCli] || notasMap[claveNombreFallback]
    if (notaCRM) {
      if (notaCRM.notaFija) cliente.notaFija = notaCRM.notaFija
      if (Array.isArray(notaCRM.etiquetas) && notaCRM.etiquetas.length > 0) {
        cliente.etiquetas = notaCRM.etiquetas
      }
    }
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
 * dada la consulta del usuario, aplicando señales negativas de descarte inteligente:
 * - Conflicto de teléfono (>= 6 dígitos válidos que no coinciden) -> 0
 * - Conflicto de apellido / multi-token (si hay 2+ tokens, todos deben coincidir) -> 0
 * - Conflicto de dirección (>= 4 chars sin inclusión ni mismo barrio) -> -18 pts
 *
 * Solo se ponderan los campos que el usuario efectivamente completó:
 * - Nombre: 50 puntos (similitud estricta por tokens)
 * - Teléfono: 30 puntos (exacto o incluido)
 * - Dirección: 20 puntos (exacta, incluida o mismo barrio)
 */
export function calcularScoreSugerencia(
  cliente: SugerenciaCliente,
  filtros: FiltrosBusquedaCliente,
): number {
  const nombreConsulta = limpiarNombre(filtros.nombre || '')
  const telConsultaNorm = normalizarTelefonoArgentino(filtros.telefono || '')
  const telConsultaDigitos = extraerDigitosTelefonoConsulta(filtros.telefono)
  const direccionConsulta = limpiarNombre(filtros.direccion || '')

  const telCliente = cliente.telefonoNormalizado || normalizarTelefonoArgentino(cliente.telefono)
  const dirCliente = limpiarNombre(cliente.direccion || '')

  // Señal negativa 1: Conflicto de teléfono
  if (telConsultaNorm.length >= 6 && telCliente.length >= 6) {
    const coincideTel =
      telCliente === telConsultaNorm ||
      telCliente.includes(telConsultaNorm) ||
      telConsultaNorm.includes(telCliente)
    if (!coincideTel) return 0
  }

  // Señal negativa 2: Conflicto de apellido / multi-token
  if (nombreConsulta) {
    const queryTokens = nombreConsulta.split(' ').filter(t => t.length >= 2)
    if (queryTokens.length >= 2) {
      const candTokens = limpiarNombre(cliente.nombre).split(' ').filter(t => t.length >= 2)
      if (candTokens.length === 0) return 0
      const todosCoinciden = queryTokens.every(qt =>
        candTokens.some(ct => evaluarCoincidenciaToken(qt, ct).match),
      )
      if (!todosCoinciden) return 0
    }
  }

  let puntos = 0
  let totalCampos = 0
  let penalizacionDireccion = 0

  // Nombre (peso 50)
  if (nombreConsulta) {
    totalCampos += 50
    const sim = calcularSimilitudNombres(cliente.nombre, nombreConsulta)
    puntos += sim * 50
  }

  // Teléfono (peso 30)
  if (telConsultaDigitos) {
    totalCampos += 30
    if (telCliente) {
      if (telConsultaNorm && telCliente === telConsultaNorm) {
        puntos += 30
      } else if (telCliente.includes(telConsultaDigitos) || telConsultaDigitos.includes(telCliente)) {
        puntos += telConsultaDigitos.length >= 6 ? 24 : 21
      }
    }
  }

  // Dirección (peso 20)
  if (direccionConsulta) {
    totalCampos += 20
    if (dirCliente) {
      if (dirCliente === direccionConsulta) {
        puntos += 20
      } else if (dirCliente.includes(direccionConsulta) || direccionConsulta.includes(dirCliente)) {
        puntos += 14
      } else {
        const barrioConsulta = extraerBarrio(filtros.direccion)
        const barrioCliente = extraerBarrio(cliente.direccion)
        if (barrioConsulta && barrioCliente && barrioConsulta === barrioCliente) {
          puntos += 10
        } else if (direccionConsulta.length >= 4 && dirCliente.length >= 4) {
          // Señal negativa 3: Conflicto de dirección
          penalizacionDireccion = 18
        }
      }
    }
  }

  if (totalCampos === 0) return 0
  const scoreBase = Math.round((puntos / totalCampos) * 100)
  return Math.max(0, Math.min(100, scoreBase - penalizacionDireccion))
}

/**
 * Filtra sugerencias por un umbral mínimo de calidad.
 * Solo devuelve clientes cuyo score supere el umbral, ordenados de mayor a menor score.
 */
export function filtrarSugerenciasPorCalidad(
  clientes: SugerenciaCliente[],
  filtros: FiltrosBusquedaCliente,
  umbralMinimo = 62,
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

export interface ResultadoSugerenciaCRM {
  cliente: SugerenciaCliente
  score: number
  confianza: 'alta' | 'media'
  motivo: string
}

/**
 * Opciones para la preparación y ranking híbrido de sugerencias del CRM.
 */
export interface OpcionesPrepararCRM {
  umbralCalidad?: number
  priorizarBarrio?: boolean
  limite?: number
}

/**
 * Prepara la lista detallada de sugerencias para el CRM con ranking híbrido:
 * 1. Exige longitud mínima de entrada (>= 3 chars en nombre, >= 4 dígitos en teléfono o >= 4 chars en dirección)
 * 2. Filtra por calidad mínima (default 62) con señales negativas de descarte inteligente
 * 3. Rankea priorizando relevancia: `score + min(10, log2(totalPedidos + 1) * 2.5)` (+5 si mismo barrio)
 * 4. Etiqueta confianza (`alta` / `media`) y motivo específico por candidato
 * 5. Limita resultados (default 5)
 */
export function prepararSugerenciasCRMDetallado(
  clientes: SugerenciaCliente[],
  filtros: FiltrosBusquedaCliente,
  opciones: OpcionesPrepararCRM = {},
): ResultadoSugerenciaCRM[] {
  if (clientes.length === 0) return []

  const nombreConsulta = limpiarNombre(filtros.nombre || '')
  const telConsultaNorm = normalizarTelefonoArgentino(filtros.telefono || '')
  const telConsultaDigitos = extraerDigitosTelefonoConsulta(filtros.telefono)
  const direccionConsulta = limpiarNombre(filtros.direccion || '')

  // Longitud mínima de entrada
  const tieneNombreValido = nombreConsulta.length >= 3
  const tieneTelefonoValido = telConsultaDigitos.length >= 4
  const tieneDireccionValida = direccionConsulta.length >= 4
  if (!tieneNombreValido && !tieneTelefonoValido && !tieneDireccionValida) {
    return []
  }

  const { umbralCalidad = 62, priorizarBarrio = true, limite = 5 } = opciones
  if (limite <= 0) return []

  const barrioConsulta = direccionConsulta ? extraerBarrio(filtros.direccion) : ''

  const evaluados = clientes
    .map((cliente) => {
      const score = calcularScoreSugerencia(cliente, filtros)
      if (score < umbralCalidad) return null

      const telCliente = cliente.telefonoNormalizado || normalizarTelefonoArgentino(cliente.telefono)
      const telExacto = Boolean(telConsultaNorm && telCliente && telCliente === telConsultaNorm)
      const coincideTelefono = Boolean(
        telConsultaDigitos &&
        telCliente &&
        (telExacto || telCliente.includes(telConsultaDigitos) || telConsultaDigitos.includes(telCliente)),
      )

      const nombreExacto = Boolean(nombreConsulta && limpiarNombre(cliente.nombre) === nombreConsulta)
      const simNombre = nombreConsulta ? calcularSimilitudNombres(cliente.nombre, nombreConsulta) : 0
      const coincideNombre = Boolean(nombreConsulta && simNombre >= 0.62)

      const barrioCliente = cliente.direccion ? extraerBarrio(cliente.direccion) : ''
      const mismoBarrio = Boolean(barrioConsulta && barrioCliente && barrioConsulta === barrioCliente)

      const bonusFrecuencia = Math.min(10, Math.log2((cliente.totalPedidos || 0) + 1) * 2.5)
      const bonusBarrio = priorizarBarrio && mismoBarrio ? 5 : 0
      const rankingScore = score + bonusFrecuencia + bonusBarrio

      const confianza: 'alta' | 'media' =
        score >= 82 || telExacto || nombreExacto ? 'alta' : 'media'

      let motivo = 'Coincidencia de nombre'
      if (coincideNombre && coincideTelefono) {
        motivo = 'Nombre y teléfono'
      } else if (telExacto) {
        motivo = 'Teléfono exacto'
      } else if (nombreExacto) {
        motivo = 'Nombre exacto'
      } else if (coincideNombre && mismoBarrio) {
        motivo = 'Nombre y mismo barrio'
      } else if (mismoBarrio && !coincideNombre) {
        motivo = 'Mismo barrio'
      } else if (coincideTelefono) {
        motivo = 'Teléfono exacto'
      } else {
        motivo = 'Coincidencia de nombre'
      }

      return {
        cliente,
        score,
        confianza,
        motivo,
        rankingScore,
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => {
      if (b.rankingScore !== a.rankingScore) return b.rankingScore - a.rankingScore
      if (b.score !== a.score) return b.score - a.score
      const pedidosDiff = (b.cliente.totalPedidos || 0) - (a.cliente.totalPedidos || 0)
      if (pedidosDiff !== 0) return pedidosDiff
      return (b.cliente.ultimaFecha || '').localeCompare(a.cliente.ultimaFecha || '')
    })

  return evaluados.slice(0, limite).map(({ cliente, score, confianza, motivo }) => ({
    cliente,
    score,
    confianza,
    motivo,
  }))
}

/**
 * Prepara la lista final de sugerencias para el CRM usando el motor de ranking híbrido.
 */
export function prepararSugerenciasCRM(
  clientes: SugerenciaCliente[],
  filtros: FiltrosBusquedaCliente,
  opciones: OpcionesPrepararCRM = {},
): SugerenciaCliente[] {
  return prepararSugerenciasCRMDetallado(clientes, filtros, opciones).map((r) => r.cliente)
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

// ─────────────────────────────────────────────────────
// lib/carta-digital.ts
// Tipos, valores por defecto, sanitización y helpers puros
// para la Carta Digital (visor estilo PDF en /carta).
// ─────────────────────────────────────────────────────

export interface HojaCarta {
  id: string
  titulo: string
  imagenUrl: string
  ancho?: number
  alto?: number
  activa: boolean
  orden: number
  creadaEn: string
}

export interface ConfiguracionCarta {
  titulo: string
  subtitulo: string
  whatsappTelefono: string
  whatsappMensaje: string
  mostrarLinkTienda: boolean
  mostrarEstadoHorario: boolean
  hojas: HojaCarta[]
  updatedAt: string
}

export const WHATSAPP_TELEFONO_DEFAULT = '5493834225445'
export const WHATSAPP_MENSAJE_DEFAULT = '¡Hola Chefsy! Estuve viendo la carta y quiero hacer un pedido.'
export const MAX_HOJAS_CARTA = 30

export function crearConfiguracionCartaDefault(): ConfiguracionCarta {
  return {
    titulo: 'Carta Chefsy',
    subtitulo: 'Mirá nuestro menú actualizado y pedí por WhatsApp.',
    whatsappTelefono: WHATSAPP_TELEFONO_DEFAULT,
    whatsappMensaje: WHATSAPP_MENSAJE_DEFAULT,
    mostrarLinkTienda: true,
    mostrarEstadoHorario: true,
    hojas: [],
    updatedAt: '',
  }
}

export function limpiarTextoPlano(valor: unknown, maxLen: number, fallback = ''): string {
  if (typeof valor !== 'string') return fallback
  const limpio = valor.replace(/\s+/g, ' ').trim()
  if (!limpio) return fallback
  return limpio.slice(0, maxLen)
}

export function limpiarTelefonoWhatsAppCarta(valor: unknown): string {
  if (typeof valor !== 'string') return WHATSAPP_TELEFONO_DEFAULT
  const digitos = valor.replace(/\D/g, '')
  if (digitos.length < 8 || digitos.length > 16) return WHATSAPP_TELEFONO_DEFAULT
  return digitos
}

export function esUrlImagenCartaValida(valor: unknown): valor is string {
  if (typeof valor !== 'string') return false
  const limpia = valor.trim()
  if (!limpia || limpia.length > 2048) return false
  if (limpia.startsWith('/')) return !limpia.startsWith('//')
  try {
    const parsed = new URL(limpia)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

export function sanitizarDimensionPositiva(valor: unknown): number | undefined {
  const n = Number(valor)
  if (!Number.isFinite(n) || n < 50 || n > 10000) return undefined
  return Math.round(n)
}

export function normalizarHojaCarta(entrada: any, indice: number, ahoraIso: string): HojaCarta | null {
  if (!entrada || typeof entrada !== 'object') return null
  if (!esUrlImagenCartaValida(entrada.imagenUrl)) return null

  const idRaw = typeof entrada.id === 'string' ? entrada.id.trim() : ''
  const id = idRaw && idRaw.length <= 80 ? idRaw : `hoja-${Date.now()}-${indice}`

  return {
    id,
    titulo: limpiarTextoPlano(entrada.titulo, 40, ''),
    imagenUrl: entrada.imagenUrl.trim(),
    ancho: sanitizarDimensionPositiva(entrada.ancho),
    alto: sanitizarDimensionPositiva(entrada.alto),
    activa: entrada.activa !== false,
    orden: indice,
    creadaEn:
      typeof entrada.creadaEn === 'string' && entrada.creadaEn.trim()
        ? entrada.creadaEn.trim()
        : ahoraIso,
  }
}

export function normalizarConfiguracionCarta(
  entrada: any,
  ahoraIso: string = new Date().toISOString()
): ConfiguracionCarta {
  const base = crearConfiguracionCartaDefault()
  if (!entrada || typeof entrada !== 'object') return base

  const hojasCrudas = Array.isArray(entrada.hojas) ? entrada.hojas : []
  // Respetar el orden explícito si viene definido, si no el orden del arreglo
  const hojasOrdenadas = [...hojasCrudas]
    .map((h, idx) => ({ h, idx, orden: typeof h?.orden === 'number' ? h.orden : idx }))
    .sort((a, b) => a.orden - b.orden || a.idx - b.idx)
    .slice(0, MAX_HOJAS_CARTA)

  const idsVistos = new Set<string>()
  const hojasLimpias: HojaCarta[] = []

  for (const item of hojasOrdenadas) {
    const hoja = normalizarHojaCarta(item.h, hojasLimpias.length, ahoraIso)
    if (!hoja) continue
    let idFinal = hoja.id
    if (idsVistos.has(idFinal)) {
      idFinal = `${idFinal}-${hojasLimpias.length}`
    }
    idsVistos.add(idFinal)
    hojasLimpias.push({ ...hoja, id: idFinal, orden: hojasLimpias.length })
  }

  return {
    titulo: limpiarTextoPlano(entrada.titulo, 80, base.titulo),
    subtitulo: limpiarTextoPlano(entrada.subtitulo, 180, base.subtitulo),
    whatsappTelefono: limpiarTelefonoWhatsAppCarta(entrada.whatsappTelefono),
    whatsappMensaje: limpiarTextoPlano(entrada.whatsappMensaje, 300, base.whatsappMensaje),
    mostrarLinkTienda: entrada.mostrarLinkTienda !== false,
    mostrarEstadoHorario: entrada.mostrarEstadoHorario !== false,
    hojas: hojasLimpias,
    updatedAt:
      typeof entrada.updatedAt === 'string' && entrada.updatedAt.trim()
        ? entrada.updatedAt.trim()
        : '',
  }
}

/** Devuelve únicamente las hojas activas y ordenadas listas para el visor público. */
export function obtenerHojasVisibles(config: ConfiguracionCarta): HojaCarta[] {
  return [...config.hojas]
    .filter((h) => h.activa && esUrlImagenCartaValida(h.imagenUrl))
    .sort((a, b) => a.orden - b.orden)
}

/** Construye el enlace de WhatsApp con el mensaje precargado. */
export function construirEnlaceWhatsAppCarta(config: Pick<ConfiguracionCarta, 'whatsappTelefono' | 'whatsappMensaje'>): string {
  const tel = limpiarTelefonoWhatsAppCarta(config.whatsappTelefono)
  const msg = limpiarTextoPlano(config.whatsappMensaje, 300, WHATSAPP_MENSAJE_DEFAULT)
  return `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`
}

/** Reordena un elemento dentro de un arreglo de hojas y reasigna `orden` consecutivo. */
export function reordenarHojasCarta(hojas: HojaCarta[], desdeIndice: number, haciaIndice: number): HojaCarta[] {
  if (
    desdeIndice === haciaIndice ||
    desdeIndice < 0 ||
    haciaIndice < 0 ||
    desdeIndice >= hojas.length ||
    haciaIndice >= hojas.length
  ) {
    return hojas
  }
  const copia = [...hojas]
  const [movida] = copia.splice(desdeIndice, 1)
  copia.splice(haciaIndice, 0, movida)
  return copia.map((h, idx) => ({ ...h, orden: idx }))
}

/** Calcula qué URLs de Supabase Storage dejaron de referenciarse al guardar. */
export function obtenerUrlsEliminadasStorage(
  hojasAnteriores: HojaCarta[],
  hojasNuevas: HojaCarta[]
): string[] {
  const nuevasUrls = new Set(hojasNuevas.map((h) => h.imagenUrl))
  const eliminadas: string[] = []
  for (const h of hojasAnteriores) {
    if (
      h.imagenUrl &&
      !nuevasUrls.has(h.imagenUrl) &&
      h.imagenUrl.includes('supabase.co/storage/v1/object/public/images/')
    ) {
      eliminadas.push(h.imagenUrl)
    }
  }
  return eliminadas
}

/** Formatea una fecha ISO de última actualización en español argentino breve (ej. "24 nov"). */
export function formatearFechaActualizacionCarta(iso: string): string {
  if (!iso) return ''
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return ''
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(fecha)
}

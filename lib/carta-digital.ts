// ─────────────────────────────────────────────────────
// lib/carta-digital.ts
// Tipos, valores por defecto, sanitización y helpers puros
// para la Carta Digital (visor estilo PDF en /carta).
// ─────────────────────────────────────────────────────

export type TipoHojaCarta = 'imagen' | 'titulo'

export type FuenteTituloCarta =
  | 'bebas'
  | 'anton'
  | 'playfair'
  | 'cinzel'
  | 'montserrat'
  | 'outfit'
  | 'syne'
  | 'marker'
  | 'inter'

export type TamanoTituloCarta = 'sm' | 'md' | 'lg' | 'xl'
export type AlturaTituloCarta = 'compacta' | 'media' | 'amplia'
export type AlineacionTituloCarta = 'left' | 'center' | 'right'
export type DecoracionTituloCarta = 'ninguna' | 'lineas' | 'borde-inferior' | 'acento-lateral'

export interface EstiloTituloCarta {
  fuente: FuenteTituloCarta
  tamano: TamanoTituloCarta
  altura: AlturaTituloCarta
  alineacion: AlineacionTituloCarta
  colorFondo: string
  colorTexto: string
  mayusculas: boolean
  decoracion: DecoracionTituloCarta
}

export interface HojaCarta {
  id: string
  tipo: TipoHojaCarta
  titulo: string
  subtitulo?: string
  imagenUrl: string
  ancho?: number
  alto?: number
  estiloTitulo?: EstiloTituloCarta
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

export interface DefinicionFuenteCarta {
  id: FuenteTituloCarta
  nombre: string
  familiaCss: string
  categoria: string
  tracking: string
}

export const FUENTES_TITULO_CARTA: DefinicionFuenteCarta[] = [
  { id: 'bebas', nombre: 'Bebas Neue', familiaCss: 'var(--font-bebas), sans-serif', categoria: 'Impacto', tracking: '0.08em' },
  { id: 'anton', nombre: 'Anton', familiaCss: 'var(--font-anton), sans-serif', categoria: 'Cartel', tracking: '0.04em' },
  { id: 'playfair', nombre: 'Playfair Display', familiaCss: 'var(--font-playfair), Georgia, serif', categoria: 'Editorial', tracking: '0.02em' },
  { id: 'cinzel', nombre: 'Cinzel', familiaCss: 'var(--font-cinzel), Georgia, serif', categoria: 'Clásica', tracking: '0.1em' },
  { id: 'montserrat', nombre: 'Montserrat', familiaCss: 'var(--font-montserrat), sans-serif', categoria: 'Moderna', tracking: '0.06em' },
  { id: 'outfit', nombre: 'Outfit', familiaCss: 'var(--font-outfit), sans-serif', categoria: 'Limpia', tracking: '0.03em' },
  { id: 'syne', nombre: 'Syne', familiaCss: 'var(--font-syne), sans-serif', categoria: 'Urbana', tracking: '0.02em' },
  { id: 'marker', nombre: 'Permanent Marker', familiaCss: 'var(--font-permanent-marker), cursive', categoria: 'Pizarra', tracking: '0.02em' },
  { id: 'inter', nombre: 'Inter', familiaCss: 'var(--font-inter), sans-serif', categoria: 'Sobria', tracking: '0.02em' },
]

export interface PresetEstiloTituloCarta {
  id: string
  nombre: string
  colorFondo: string
  colorTexto: string
  decoracion: DecoracionTituloCarta
}

export const PRESETS_ESTILO_TITULO: PresetEstiloTituloCarta[] = [
  { id: 'chefsy', nombre: 'Chefsy Verde', colorFondo: '#2A6348', colorTexto: '#ffffff', decoracion: 'lineas' },
  { id: 'carbon', nombre: 'Carbón', colorFondo: '#1c1917', colorTexto: '#f5f0e6', decoracion: 'lineas' },
  { id: 'crema', nombre: 'Crema Editorial', colorFondo: '#f5f0e6', colorTexto: '#1c1917', decoracion: 'borde-inferior' },
  { id: 'blanco', nombre: 'Blanco Limpio', colorFondo: '#ffffff', colorTexto: '#2A6348', decoracion: 'acento-lateral' },
  { id: 'terracota', nombre: 'Terracota', colorFondo: '#8c3b24', colorTexto: '#fff7ed', decoracion: 'lineas' },
]

export const WHATSAPP_TELEFONO_DEFAULT = '5493834225445'
export const WHATSAPP_MENSAJE_DEFAULT = '¡Hola Chefsy! Estuve viendo la carta y quiero hacer un pedido.'
export const MAX_HOJAS_CARTA = 50

const FUENTES_VALIDAS = new Set<FuenteTituloCarta>(FUENTES_TITULO_CARTA.map((f) => f.id))
const TAMANOS_VALIDOS = new Set<TamanoTituloCarta>(['sm', 'md', 'lg', 'xl'])
const ALTURAS_VALIDAS = new Set<AlturaTituloCarta>(['compacta', 'media', 'amplia'])
const ALINEACIONES_VALIDAS = new Set<AlineacionTituloCarta>(['left', 'center', 'right'])
const DECORACIONES_VALIDAS = new Set<DecoracionTituloCarta>([
  'ninguna',
  'lineas',
  'borde-inferior',
  'acento-lateral',
])

export function crearEstiloTituloDefault(): EstiloTituloCarta {
  return {
    fuente: 'bebas',
    tamano: 'lg',
    altura: 'media',
    alineacion: 'center',
    colorFondo: '#2A6348',
    colorTexto: '#ffffff',
    mayusculas: true,
    decoracion: 'lineas',
  }
}

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

export function crearHojaTituloDefault(orden: number, titulo = 'Nueva sección'): HojaCarta {
  return {
    id: `titulo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tipo: 'titulo',
    titulo,
    subtitulo: '',
    imagenUrl: '',
    estiloTitulo: crearEstiloTituloDefault(),
    activa: true,
    orden,
    creadaEn: new Date().toISOString(),
  }
}

export function obtenerDefinicionFuenteCarta(fuente?: FuenteTituloCarta): DefinicionFuenteCarta {
  return FUENTES_TITULO_CARTA.find((f) => f.id === fuente) || FUENTES_TITULO_CARTA[0]
}

export function limpiarTextoPlano(valor: unknown, maxLen: number, fallback = ''): string {
  if (typeof valor !== 'string') return fallback
  const limpio = valor.replace(/\s+/g, ' ').trim()
  if (!limpio) return fallback
  return limpio.slice(0, maxLen)
}

export function sanitizarColorHex(valor: unknown, fallback: string): string {
  if (typeof valor !== 'string') return fallback
  const limpio = valor.trim()
  if (/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(limpio)) {
    return limpio
  }
  return fallback
}

export function normalizarEstiloTituloCarta(entrada: any): EstiloTituloCarta {
  const base = crearEstiloTituloDefault()
  if (!entrada || typeof entrada !== 'object') return base

  const fuente = FUENTES_VALIDAS.has(entrada.fuente) ? (entrada.fuente as FuenteTituloCarta) : base.fuente
  const tamano = TAMANOS_VALIDOS.has(entrada.tamano) ? (entrada.tamano as TamanoTituloCarta) : base.tamano
  const altura = ALTURAS_VALIDAS.has(entrada.altura) ? (entrada.altura as AlturaTituloCarta) : base.altura
  const alineacion = ALINEACIONES_VALIDAS.has(entrada.alineacion)
    ? (entrada.alineacion as AlineacionTituloCarta)
    : base.alineacion
  const decoracion = DECORACIONES_VALIDAS.has(entrada.decoracion)
    ? (entrada.decoracion as DecoracionTituloCarta)
    : base.decoracion

  return {
    fuente,
    tamano,
    altura,
    alineacion,
    colorFondo: sanitizarColorHex(entrada.colorFondo, base.colorFondo),
    colorTexto: sanitizarColorHex(entrada.colorTexto, base.colorTexto),
    mayusculas: entrada.mayusculas !== false,
    decoracion,
  }
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

  const tipo: TipoHojaCarta = entrada.tipo === 'titulo' ? 'titulo' : 'imagen'
  const idRaw = typeof entrada.id === 'string' ? entrada.id.trim() : ''
  const id = idRaw && idRaw.length <= 80 ? idRaw : `${tipo}-${Date.now()}-${indice}`
  const creadaEn =
    typeof entrada.creadaEn === 'string' && entrada.creadaEn.trim()
      ? entrada.creadaEn.trim()
      : ahoraIso

  if (tipo === 'titulo') {
    const titulo = limpiarTextoPlano(entrada.titulo, 80, '')
    if (!titulo) return null

    return {
      id,
      tipo: 'titulo',
      titulo,
      subtitulo: limpiarTextoPlano(entrada.subtitulo, 120, ''),
      imagenUrl: '',
      estiloTitulo: normalizarEstiloTituloCarta(entrada.estiloTitulo),
      activa: entrada.activa !== false,
      orden: indice,
      creadaEn,
    }
  }

  if (!esUrlImagenCartaValida(entrada.imagenUrl)) return null

  return {
    id,
    tipo: 'imagen',
    titulo: limpiarTextoPlano(entrada.titulo, 40, ''),
    imagenUrl: entrada.imagenUrl.trim(),
    ancho: sanitizarDimensionPositiva(entrada.ancho),
    alto: sanitizarDimensionPositiva(entrada.alto),
    activa: entrada.activa !== false,
    orden: indice,
    creadaEn,
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

/** Devuelve únicamente las hojas y títulos activos y ordenados listos para el visor público. */
export function obtenerHojasVisibles(config: ConfiguracionCarta): HojaCarta[] {
  return [...config.hojas]
    .filter((h) => {
      if (!h.activa) return false
      if (h.tipo === 'titulo') return Boolean(h.titulo.trim())
      return esUrlImagenCartaValida(h.imagenUrl)
    })
    .sort((a, b) => a.orden - b.orden)
}

/** Devuelve la primera hoja de tipo imagen visible (ideal para portada OpenGraph/WhatsApp). */
export function obtenerPrimeraImagenVisible(hojas: HojaCarta[]): HojaCarta | undefined {
  return hojas.find((h) => h.activa && h.tipo !== 'titulo' && esUrlImagenCartaValida(h.imagenUrl))
}

/**
 * Calcula un factor de proporción para adaptar la altura/escala de un título separador
 * según la relación alto/ancho de la imagen que aparece inmediatamente debajo.
 * - Imágenes apaisadas (bajas): devuelve un factor más compacto (~0.78–0.92).
 * - Imágenes estándar 4:5 / 3:4: devuelve ~1.0.
 * - Imágenes muy altas (9:16): devuelve hasta ~1.14 para mantener equilibrio visual.
 */
export function calcularFactorAlturaTitulo(siguienteImagen?: HojaCarta): number {
  if (!siguienteImagen || !siguienteImagen.ancho || !siguienteImagen.alto) {
    return 1
  }
  const ratio = siguienteImagen.alto / siguienteImagen.ancho
  // Referencia base: lámina vertical 3:4 (ratio ~1.33) => factor 1.0
  const normalizado = 0.72 + (ratio / 1.33) * 0.28
  return Math.round(Math.min(1.16, Math.max(0.76, normalizado)) * 100) / 100
}

/** Busca la próxima hoja de tipo imagen que sigue al índice indicado. */
export function obtenerSiguienteImagen(hojas: HojaCarta[], indice: number): HojaCarta | undefined {
  for (let i = indice + 1; i < hojas.length; i++) {
    if (hojas[i]?.tipo !== 'titulo' && hojas[i]?.ancho && hojas[i]?.alto) {
      return hojas[i]
    }
  }
  return undefined
}

/** Construye el enlace de WhatsApp con el mensaje precargado. */
export function construirEnlaceWhatsAppCarta(
  config: Pick<ConfiguracionCarta, 'whatsappTelefono' | 'whatsappMensaje'>
): string {
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
  const nuevasUrls = new Set(hojasNuevas.map((h) => h.imagenUrl).filter(Boolean))
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

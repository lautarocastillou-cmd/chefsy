// ─────────────────────────────────────────────────────
// lib/notificaciones-pagos.ts
// Parser de notificaciones de billeteras/bancos argentinos,
// deduplicación y cruce automático contra pedidos pendientes.
// ─────────────────────────────────────────────────────

export interface NotificacionPago {
  id: string
  cadete_id: string
  cadete_nombre: string
  monto: number
  metodo: string
  billetera: string
  remitente?: string
  pedido_id?: string
  pedido_cliente?: string
  mensaje?: string
  paquete?: string
  leida: boolean
  creado_en: string
}

export interface ResultadoParseoNotificacionPago {
  esIngreso: boolean
  monto: number | null
  billetera: string
  remitente?: string
  motivoDescarte?: string
}

export interface PedidoCandidatoMatch {
  id: string
  cliente: string
  total: number
  estado?: string
  metodo_pago?: string
  pago_confirmado?: boolean
  cadete_id?: string | null
  cadete_nombre?: string | null
  created_at?: string
}

const BILLETERAS_POR_PAQUETE: Record<string, string> = {
  'com.mercadopago.wallet': 'Mercado Pago',
  'com.naranjax.app': 'Naranja X',
  'com.naranjax.naranjax': 'Naranja X',
  'com.brubank': 'Brubank',
  'com.uala': 'Ualá',
  'ar.com.uala': 'Ualá',
  'com.playdigital.modo': 'MODO',
  'com.personal.pay': 'Personal Pay',
  'ar.com.bancoprovincia.cuentadni': 'Cuenta DNI',
  'ar.com.bna.app': 'BNA+',
  'ar.com.bna.bnamas': 'BNA+',
  'ar.com.santander.rio.mbanking': 'Santander',
  'com.galicia.app': 'Galicia',
  'com.bbva.nxt_argentina': 'BBVA',
  'com.macro.app': 'Banco Macro',
  'com.lemoncash.app': 'Lemon Cash',
  'com.prex.argentina': 'Prex',
  'com.mercadolibre': 'Mercado Pago',
}

const PATRONES_EGRESO = [
  /\bpagaste\b/i,
  /\benviaste\b/i,
  /\btransferiste\b/i,
  /\bcompraste\b/i,
  /\bdebitamos\b/i,
  /\bd[eé]bito\b/i,
  /\bretiro\s+de\s+dinero\b/i,
  /\bc[oó]digo\s+de\s+(verificaci[oó]n|seguridad)\b/i,
  /\btu\s+c[oó]digo\b/i,
  /\boferta\b/i,
  /\bdescuento\b/i,
  /\bcuotas?\b/i,
  /\bsolicit[oó]\s+dinero\b/i,
]

const PATRONES_INGRESO = [
  /\brecibiste\b/i,
  /\bte\s+transfirieron\b/i,
  /\btransferencia\s+recibida\b/i,
  /\bacreditamos\b/i,
  /\bacreditado\b/i,
  /\bingres[oó]\b/i,
  /\bte\s+enviaron\b/i,
  /\bpago\s+recibido\b/i,
  /\bcobro\s+(acreditado|recibido|aprobado)\b/i,
  /\bte\s+pag[oó]\b/i,
  /\bnueva\s+transferencia\b/i,
]

export function detectarNombreBilletera(paquete?: string, textoCompleto = ''): string {
  const pkg = (paquete || '').trim().toLowerCase()
  if (pkg && BILLETERAS_POR_PAQUETE[pkg]) {
    return BILLETERAS_POR_PAQUETE[pkg]
  }
  const t = textoCompleto.toLowerCase()
  if (t.includes('mercado pago') || t.includes('mercadopago')) return 'Mercado Pago'
  if (t.includes('naranja x') || t.includes('naranjax')) return 'Naranja X'
  if (t.includes('brubank')) return 'Brubank'
  if (t.includes('ualá') || t.includes('uala')) return 'Ualá'
  if (t.includes('modo')) return 'MODO'
  if (t.includes('personal pay')) return 'Personal Pay'
  if (t.includes('cuenta dni')) return 'Cuenta DNI'
  if (t.includes('bna+') || t.includes('banco nación')) return 'BNA+'
  if (t.includes('santander')) return 'Santander'
  if (t.includes('galicia')) return 'Galicia'
  if (t.includes('bbva')) return 'BBVA'
  if (t.includes('macro')) return 'Banco Macro'
  return 'Transferencia'
}

/**
 * Extrae un monto numérico en formato argentino (`$ 14.500`, `$14.500,50`, `ARS 8500`, `$8500`).
 */
export function extraerMontoArgentino(texto: string): number | null {
  if (!texto) return null
  // Priorizar montos precedidos por `$` o `ARS`
  const matchMoneda = texto.match(/(?:\$|ARS)\s*([0-9]{1,3}(?:\.[0-9]{3})+(?:,[0-9]{1,2})?|[0-9]+(?:,[0-9]{1,2})?)/i)
  const bruto = matchMoneda?.[1]
  if (!bruto) return null

  // En formato AR: `.` es separador de miles y `,` es decimal
  const normalizado = bruto.replace(/\./g, '').replace(',', '.')
  const valor = Number(normalizado)
  if (!Number.isFinite(valor) || valor <= 0 || valor > 50_000_000) {
    return null
  }
  return Math.round(valor * 100) / 100
}

/**
 * Intenta extraer el nombre del remitente desde frases típicas de billeteras argentinas.
 * Ej: "Recibiste una transferencia de Juan Pérez por $ 14.500" -> "Juan Pérez"
 */
export function extraerRemitenteNotificacion(texto: string): string | undefined {
  if (!texto) return undefined
  const patrones = [
    /(?:transferencia\s+de|recibiste\s+(?:dinero\s+)?de|de\s+parte\s+de|te\s+transfiri[oó]|envi[oó])\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]+){0,3}?)(?:\s+(?:por|a\s+tu|en\s+tu|para|\$)|[.,!]|$)/i,
    /de\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3}?)(?:\s+(?:por|a\s+tu|en\s+tu|para|\$)|[.,!]|$)/,
  ]
  for (const regex of patrones) {
    const m = texto.match(regex)
    const candidato = m?.[1]?.replace(/\s+(?:por|en|a|para|el|la)$/i, '').trim()
    if (
      candidato &&
      candidato.length >= 3 &&
      candidato.length <= 60 &&
      !/^(dinero|pesos|argentina|transferencia|tu\s+cuenta|mercado\s+pago)$/i.test(candidato)
    ) {
      return candidato
    }
  }
  return undefined
}

/**
 * Parsea una notificación cruda de Android (`titulo`, `texto`, `paquete`) y determina
 * si corresponde a una transferencia/pago recibido real.
 */
export function parsearNotificacionPagoTexto(entrada: {
  titulo?: string
  texto?: string
  paquete?: string
}): ResultadoParseoNotificacionPago {
  const titulo = (entrada.titulo || '').replace(/\s+/g, ' ').trim()
  const texto = (entrada.texto || '').replace(/\s+/g, ' ').trim()
  const completo = `${titulo} ${texto}`.trim()
  const billetera = detectarNombreBilletera(entrada.paquete, completo)

  if (!completo) {
    return { esIngreso: false, monto: null, billetera, motivoDescarte: 'Notificación vacía' }
  }

  for (const patron of PATRONES_EGRESO) {
    if (patron.test(completo)) {
      return { esIngreso: false, monto: null, billetera, motivoDescarte: 'Movimiento saliente o promocional' }
    }
  }

  const coincideIngreso = PATRONES_INGRESO.some((p) => p.test(completo))
  if (!coincideIngreso) {
    return { esIngreso: false, monto: null, billetera, motivoDescarte: 'No indica recepción de dinero' }
  }

  const monto = extraerMontoArgentino(completo)
  if (!monto) {
    return { esIngreso: false, monto: null, billetera, motivoDescarte: 'No se detectó un monto válido' }
  }

  const remitente = extraerRemitenteNotificacion(completo)
  return {
    esIngreso: true,
    monto,
    billetera,
    remitente,
  }
}

function normalizarNombreComparacion(valor: string): string {
  return valor
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function puntajeSimilitudNombre(a?: string, b?: string): number {
  if (!a || !b) return 0
  const tokensA = normalizarNombreComparacion(a).split(' ').filter((t) => t.length >= 3)
  const tokensB = new Set(normalizarNombreComparacion(b).split(' ').filter((t) => t.length >= 3))
  if (tokensA.length === 0 || tokensB.size === 0) return 0
  let coincidencias = 0
  for (const t of tokensA) {
    if (tokensB.has(t)) coincidencias++
  }
  return coincidencias
}

/**
 * Busca el mejor pedido pendiente de confirmación que coincida con el monto recibido
 * (tolerancia ±$10 por redondeos), desempatando por similitud de nombre y recencia.
 */
export function buscarPedidoCoincidentePago(
  pedidos: PedidoCandidatoMatch[],
  datos: { monto: number; remitente?: string; tolerancia?: number }
): PedidoCandidatoMatch | null {
  const tolerancia = datos.tolerancia ?? 10
  const candidatos = pedidos.filter((p) => {
    if (!p || p.pago_confirmado === true) return false
    const estado = (p.estado || '').toLowerCase()
    if (estado === 'cancelado' || estado === 'anulado') return false
    const total = Number(p.total)
    if (!Number.isFinite(total) || total <= 0) return false
    return Math.abs(total - datos.monto) <= tolerancia
  })

  if (candidatos.length === 0) return null

  candidatos.sort((a, b) => {
    // 1. Coincidencia exacta de monto primero
    const diffA = Math.abs(Number(a.total) - datos.monto)
    const diffB = Math.abs(Number(b.total) - datos.monto)
    if (diffA !== diffB) return diffA - diffB

    // 2. Coincidencia de nombre con el remitente
    const simA = puntajeSimilitudNombre(datos.remitente, a.cliente)
    const simB = puntajeSimilitudNombre(datos.remitente, b.cliente)
    if (simA !== simB) return simB - simA

    // 3. Priorizar pedidos con método transferencia
    const transfA = (a.metodo_pago || '').toLowerCase().includes('transfer') ? 1 : 0
    const transfB = (b.metodo_pago || '').toLowerCase().includes('transfer') ? 1 : 0
    if (transfA !== transfB) return transfB - transfA

    // 4. Más reciente primero
    const tsA = a.created_at ? new Date(a.created_at).getTime() : 0
    const tsB = b.created_at ? new Date(b.created_at).getTime() : 0
    return tsB - tsA
  })

  return candidatos[0]
}

/**
 * Evita registrar duplicados cuando Android re-emite la misma notificación en pocos segundos.
 */
export function esNotificacionPagoDuplicada(
  existentes: NotificacionPago[],
  candidata: { monto: number; billetera: string; mensaje?: string; ahoraMs?: number },
  ventanaMs = 45_000
): boolean {
  const ahora = candidata.ahoraMs ?? Date.now()
  const msgNorm = (candidata.mensaje || '').trim().toLowerCase()
  return existentes.some((n) => {
    const ts = new Date(n.creado_en).getTime()
    if (!Number.isFinite(ts) || Math.abs(ahora - ts) > ventanaMs) return false
    if (Math.abs(n.monto - candidata.monto) > 0.01) return false
    if (n.billetera.toLowerCase() !== candidata.billetera.toLowerCase()) return false
    if (!msgNorm) return true
    return (n.mensaje || '').trim().toLowerCase() === msgNorm
  })
}

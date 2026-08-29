// ─────────────────────────────────────────────────────
// lib/impresion/escpos.ts
// Codificador binario de comandos ESC/POS nativos para
// impresoras térmicas de 80mm (48 columnas) y 58mm (32 columnas).
// ─────────────────────────────────────────────────────

import { Pedido } from '@/tipos'
import { formatearPrecio } from '@/lib/utils'

export interface OpcionesImpresion {
  anchoMm?: 80 | 58
  cortarPapel?: boolean
  abrirCajon?: boolean
  sonarAlarma?: boolean
}

// ── Comandos ESC/POS estándar ─────────────────────────
const COMANDOS = {
  INIT: [0x1b, 0x40], // ESC @ (Inicializar impresora)
  CODE_PAGE_CP850: [0x1b, 0x74, 0x02], // ESC t 2 (Página de códigos CP850 Multilingual)
  ALIGN_LEFT: [0x1b, 0x61, 0x00], // ESC a 0
  ALIGN_CENTER: [0x1b, 0x61, 0x01], // ESC a 1
  ALIGN_RIGHT: [0x1b, 0x61, 0x02], // ESC a 2
  BOLD_ON: [0x1b, 0x45, 0x01], // ESC E 1
  BOLD_OFF: [0x1b, 0x45, 0x00], // ESC E 0
  SIZE_NORMAL: [0x1d, 0x21, 0x00], // GS ! 0
  SIZE_DOUBLE_HEIGHT: [0x1d, 0x21, 0x01], // GS ! 1
  SIZE_DOUBLE_WIDTH: [0x1d, 0x21, 0x10], // GS ! 16
  SIZE_DOUBLE: [0x1d, 0x21, 0x11], // GS ! 17 (Doble ancho y alto)
  SIZE_QUADRUPLE: [0x1d, 0x21, 0x22], // GS ! 34 (Cuádruple tamaño)
  UNDERLINE_ON: [0x1b, 0x2d, 0x01], // ESC - 1
  UNDERLINE_OFF: [0x1b, 0x2d, 0x00], // ESC - 0
  FEED_LINES: (n: number) => [0x1b, 0x64, n], // ESC d n
  CUT_PAPER: [0x1d, 0x56, 0x41, 0x03], // GS V A 3 (Alimentar 3 líneas y cortar)
  CUT_PAPER_PARTIAL: [0x1d, 0x56, 0x01], // GS V 1 (Corte parcial)
  DRAWER_KICK: [0x1b, 0x70, 0x00, 0x19, 0xfa], // ESC p 0 25 250 (Abrir cajón)
  BEEP: [0x1b, 0x42, 0x02, 0x02], // ESC B 2 2 (Buzzer / pitido)
}

/**
 * Convierte un string JavaScript (Unicode) a bytes CP850 / Latin1
 * para que los acentos y la ñ se impriman correctamente en impresoras térmicas.
 */
export function stringABytesCP850(texto: string): number[] {
  const bytes: number[] = []

  const mapaEspeciales: Record<string, number> = {
    á: 0xa0,
    é: 0x82,
    í: 0xa1,
    ó: 0xa2,
    ú: 0xa3,
    Á: 0xb5,
    É: 0x90,
    Í: 0xd6,
    Ó: 0xe0,
    Ú: 0xe9,
    ñ: 0xa4,
    Ñ: 0xa5,
    ü: 0x81,
    Ü: 0x9a,
    '¡': 0xad,
    '¿': 0xa8,
    '°': 0xf8,
    '·': 0xfa,
    '•': 0x07,
  }

  for (let i = 0; i < texto.length; i++) {
    const char = texto[i]
    if (mapaEspeciales[char]) {
      bytes.push(mapaEspeciales[char])
    } else {
      const code = char.charCodeAt(0)
      if (code < 128) {
        bytes.push(code)
      } else {
        const normalizado = char.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        bytes.push(normalizado.charCodeAt(0) || 0x20)
      }
    }
  }

  return bytes
}

export class EscPosBuilder {
  private buffer: number[] = []
  private anchoColumnas: number

  constructor(anchoMm: 80 | 58 = 80) {
    this.anchoColumnas = anchoMm === 58 ? 32 : 48
    this.buffer.push(...COMANDOS.INIT)
    this.buffer.push(...COMANDOS.CODE_PAGE_CP850)
  }

  alinear(alineacion: 'izq' | 'centro' | 'der'): this {
    if (alineacion === 'centro') this.buffer.push(...COMANDOS.ALIGN_CENTER)
    else if (alineacion === 'der') this.buffer.push(...COMANDOS.ALIGN_RIGHT)
    else this.buffer.push(...COMANDOS.ALIGN_LEFT)
    return this
  }

  negrita(activar: boolean = true): this {
    this.buffer.push(...(activar ? COMANDOS.BOLD_ON : COMANDOS.BOLD_OFF))
    return this
  }

  tamano(tipo: 'normal' | 'doble_alto' | 'doble_ancho' | 'doble' | 'cuadruple'): this {
    if (tipo === 'doble') this.buffer.push(...COMANDOS.SIZE_DOUBLE)
    else if (tipo === 'doble_alto') this.buffer.push(...COMANDOS.SIZE_DOUBLE_HEIGHT)
    else if (tipo === 'doble_ancho') this.buffer.push(...COMANDOS.SIZE_DOUBLE_WIDTH)
    else if (tipo === 'cuadruple') this.buffer.push(...COMANDOS.SIZE_QUADRUPLE)
    else this.buffer.push(...COMANDOS.SIZE_NORMAL)
    return this
  }

  subrayar(activar: boolean = true): this {
    this.buffer.push(...(activar ? COMANDOS.UNDERLINE_ON : COMANDOS.UNDERLINE_OFF))
    return this
  }

  texto(str: string): this {
    this.buffer.push(...stringABytesCP850(str))
    return this
  }

  linea(str: string = ''): this {
    this.texto(str)
    this.buffer.push(0x0a) // \n
    return this
  }

  separador(char: string = '-'): this {
    const sep = char.repeat(this.anchoColumnas)
    this.alinear('centro')
    this.tamano('normal')
    this.negrita(false)
    this.linea(sep)
    return this
  }

  /**
   * Imprime dos textos justificados a los extremos (ej: "Mila Especial .......... $12.500")
   */
  filaDosColumnas(izq: string, der: string, relleno: string = ' '): this {
    const lenIzq = izq.length
    const lenDer = der.length
    const espacioDisponible = this.anchoColumnas - lenIzq - lenDer

    if (espacioDisponible > 0) {
      const lineaTexto = izq + relleno.repeat(espacioDisponible) + der
      this.alinear('izq').linea(lineaTexto)
    } else {
      const izqRecortado = izq.slice(0, this.anchoColumnas - lenDer - 2) + '..'
      const espacioRecortado = Math.max(1, this.anchoColumnas - izqRecortado.length - lenDer)
      this.alinear('izq').linea(izqRecortado + ' '.repeat(espacioRecortado) + der)
    }
    return this
  }

  alimentar(lineas: number = 3): this {
    this.buffer.push(...COMANDOS.FEED_LINES(lineas))
    return this
  }

  cortar(parcial: boolean = false): this {
    this.alimentar(2)
    this.buffer.push(...(parcial ? COMANDOS.CUT_PAPER_PARTIAL : COMANDOS.CUT_PAPER))
    return this
  }

  abrirCajon(): this {
    this.buffer.push(...COMANDOS.DRAWER_KICK)
    return this
  }

  sonarAlarma(): this {
    this.buffer.push(...COMANDOS.BEEP)
    return this
  }

  obtenerBytes(): Uint8Array {
    return new Uint8Array(this.buffer)
  }
}

// ─────────────────────────────────────────────────────
// Generadores de Documentos de Alto Nivel
// ─────────────────────────────────────────────────────

/**
 * Genera el ticket final para el cliente con precios, desglose y datos de entrega.
 */
export function generarEscPosTicketCliente(pedido: Pedido, opciones: OpcionesImpresion = {}): Uint8Array {
  const anchoMm = opciones.anchoMm || 80
  const builder = new EscPosBuilder(anchoMm)
  const f = formatearPrecio

  const metodoPagoLabel: Record<string, string> = {
    efectivo: 'Efectivo',
    tarjeta: 'Tarjeta / Débito',
    transferencia: 'Transferencia',
    mixto: 'Mixto',
    sin_especificar: 'Sin especificar',
  }

  // 1. Encabezado
  builder
    .alinear('centro')
    .tamano('doble')
    .negrita(true)
    .linea('CHEFSY')
    .tamano('normal')
    .negrita(false)
    .linea('TICKET DE PEDIDO')
    .negrita(true)
    .linea(`Pedido #${pedido.id.slice(0, 6).toUpperCase()} · ${pedido.hora}`)
    .separador('-')

  // 2. Datos del Cliente
  builder
    .alinear('izq')
    .negrita(true)
    .linea(`Cliente: ${pedido.cliente}`)
    .negrita(false)

  if (pedido.telefono && pedido.telefono !== 'Sin especificar') {
    builder.linea(`Tel: ${pedido.telefono}`)
  }

  const tipoEntregaStr =
    pedido.tipoEntrega === 'delivery'
      ? 'DELIVERY'
      : pedido.tipoEntrega === 'retiro'
      ? 'RETIRO EN LOCAL'
      : 'CONSUMO EN LOCAL'

  builder
    .negrita(true)
    .linea(`Entrega: ${tipoEntregaStr}`)
    .negrita(false)

  if (pedido.direccion) {
    builder.linea(`Dir: ${pedido.direccion}`)
  }

  builder.separador('-')

  // 3. Detalle de Productos
  builder.alinear('izq')
  for (const item of pedido.productos) {
    const cantidadStr = `${item.cantidad}x `
    const precioStr = f(item.precio * item.cantidad)
    builder.negrita(true).filaDosColumnas(cantidadStr + item.nombre, precioStr, '.')

    if ((item as any).modificadores && Array.isArray((item as any).modificadores)) {
      for (const mod of (item as any).modificadores) {
        builder.negrita(false).linea(`   + ${mod.nombre || mod}`)
      }
    }
  }

  builder.separador('-')

  // 4. Totales y Envío
  if (pedido.costoEnvio !== undefined && pedido.costoEnvio > 0) {
    builder.filaDosColumnas('Subtotal:', f(pedido.total - pedido.costoEnvio))
    builder.filaDosColumnas(`Envío (${pedido.distanciaKm || 0} km):`, f(pedido.costoEnvio))
  }

  builder
    .alinear('izq')
    .tamano('doble_alto')
    .negrita(true)
    .filaDosColumnas('TOTAL:', f(pedido.total))
    .tamano('normal')
    .negrita(false)
    .linea(`Método de Pago: ${metodoPagoLabel[pedido.metodoPago ?? 'sin_especificar'] ?? 'Sin especificar'}`)

  // 5. Observaciones / Notas
  if (pedido.observaciones && pedido.observaciones.trim()) {
    builder
      .separador('-')
      .alinear('izq')
      .negrita(true)
      .linea('NOTAS / ACLARACIONES:')
      .negrita(false)
      .linea(pedido.observaciones.toUpperCase())
  }

  // 6. Pie de Página
  builder
    .separador('-')
    .alinear('centro')
    .negrita(true)
    .linea('¡Gracias por tu compra!')
    .tamano('normal')
    .negrita(false)
    .linea('chefsy.xyz')

  if (opciones.abrirCajon) {
    builder.abrirCajon()
  }

  if (opciones.cortarPapel !== false) {
    builder.cortar()
  }

  return builder.obtenerBytes()
}

/**
 * Genera la comanda para cocina (letras gigantes, sin precios, con notas resaltadas).
 */
export function generarEscPosComandaCocina(pedido: Pedido, opciones: OpcionesImpresion = {}): Uint8Array {
  const anchoMm = opciones.anchoMm || 80
  const builder = new EscPosBuilder(anchoMm)

  // 1. Encabezado de Cocina
  builder
    .alinear('centro')
    .tamano('doble')
    .negrita(true)
    .linea('*** COCINA ***')
    .tamano('doble_alto')
    .linea(`ORDEN #${pedido.id.slice(0, 6).toUpperCase()}`)
    .tamano('normal')
    .negrita(false)
    .linea(`Hora: ${pedido.hora} · ${pedido.cliente}`)
    .separador('=')

  // 2. Lista de Platos con Cantidades Resaltadas
  builder.alinear('izq')
  for (const item of pedido.productos) {
    builder
      .tamano('doble')
      .negrita(true)
      .linea(`[ ${item.cantidad}x ] ${item.nombre}`)
      .tamano('normal')
      .negrita(false)

    if ((item as any).modificadores && Array.isArray((item as any).modificadores)) {
      for (const mod of (item as any).modificadores) {
        builder.negrita(true).linea(`   >> ${mod.nombre || mod}`)
      }
    }
    builder.linea('')
  }

  // 3. Notas Urgentes de Cocina
  if (pedido.observaciones && pedido.observaciones.trim()) {
    builder
      .separador('*')
      .alinear('izq')
      .tamano('doble_alto')
      .negrita(true)
      .linea('ATENCION NOTAS:')
      .tamano('normal')
      .linea(pedido.observaciones.toUpperCase())
      .separador('*')
  }

  // 4. Tipo de Entrega en Marco
  const tipoEntregaStr =
    pedido.tipoEntrega === 'delivery'
      ? '🛵 >> DELIVERY <<'
      : pedido.tipoEntrega === 'retiro'
      ? '🏠 >> RETIRO EN LOCAL <<'
      : '🍽 >> CONSUMO EN LOCAL <<'

  builder
    .alinear('centro')
    .tamano('doble_alto')
    .negrita(true)
    .linea(tipoEntregaStr)

  if (opciones.sonarAlarma) {
    builder.sonarAlarma()
  }

  if (opciones.cortarPapel !== false) {
    builder.cortar()
  }

  return builder.obtenerBytes()
}

/**
 * Genera un ticket de prueba para calibrar ancho de papel, fuentes y guillotina.
 */
export function generarEscPosTicketPrueba(opciones: OpcionesImpresion = {}): Uint8Array {
  const anchoMm = opciones.anchoMm || 80
  const builder = new EscPosBuilder(anchoMm)

  builder
    .alinear('centro')
    .tamano('doble')
    .negrita(true)
    .linea('CHEFSY POS')
    .tamano('normal')
    .negrita(false)
    .linea('PRUEBA DE IMPRESION DIRECTA')
    .separador('=')
    .alinear('izq')
    .linea(`Ancho configurado: ${anchoMm}mm (${anchoMm === 58 ? 32 : 48} columnas)`)
    .linea(`Fecha: ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR')}`)
    .separador('-')
    .negrita(true)
    .filaDosColumnas('Item de Prueba 1', '$4.500', '.')
    .filaDosColumnas('Item de Prueba 2', '$7.800', '.')
    .separador('-')
    .tamano('doble_alto')
    .negrita(true)
    .filaDosColumnas('TOTAL TEST:', '$12.300')
    .tamano('normal')
    .separador('=')
    .alinear('centro')
    .negrita(true)
    .linea('¡Conexion ESC/POS Exitosa!')
    .linea('Impresion silenciosa lista para usar.')

  if (opciones.sonarAlarma) {
    builder.sonarAlarma()
  }

  if (opciones.cortarPapel !== false) {
    builder.cortar()
  }

  return builder.obtenerBytes()
}

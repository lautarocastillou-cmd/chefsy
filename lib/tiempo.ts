// ─────────────────────────────────────────────────────
// lib/tiempo.ts
// Lógica utilitaria para la gestión de tiempos y contadores
// ─────────────────────────────────────────────────────

/**
 * Devuelve la fecha de negocio actual en formato YYYY-MM-DD local.
 * Si la hora actual es antes de las 05:00 AM, se considera que todavía es el día anterior.
 * Esto evita que la caja se cierre en medio de la noche.
 */
export function obtenerFechaNegocio(fechaReferencia: Date = new Date()): string {
  const ahora = new Date(fechaReferencia)
  
  if (ahora.getHours() < 5) {
    ahora.setDate(ahora.getDate() - 1)
  }
  
  const anio = ahora.getFullYear()
  const mes = String(ahora.getMonth() + 1).padStart(2, '0')
  const dia = String(ahora.getDate()).padStart(2, '0')
  
  return `${anio}-${mes}-${dia}`
}

/**
 * Devuelve la fecha/hora en la zona horaria de Argentina (UTC-3).
 */
export function obtenerHoraArgentina(fechaReferencia: Date = new Date()): Date {
  const utc = fechaReferencia.getTime() + (fechaReferencia.getTimezoneOffset() * 60000)
  return new Date(utc - (3 * 3600000))
}

/**
 * Verifica si es domingo en Argentina (día 0).
 */
export function esDomingoArgentina(fechaReferencia: Date = new Date()): boolean {
  const horaArg = obtenerHoraArgentina(fechaReferencia)
  return horaArg.getDay() === 0
}

/**
 * Evalúa el estado del local combinando la regla de turnos manuales y días de atención.
 * - Los domingos el local permanece CERRADO.
 * - Ningún turno se activa automáticamente si no se inicia manualmente.
 */
export function obtenerEstadoHorarioLocal(turnoActivo: boolean | null | undefined, fechaReferencia: Date = new Date()) {
  const esDomingo = esDomingoArgentina(fechaReferencia)

  // 1. REGLA ESTRICTA DE DOMINGOS: El local permanece 100% CERRADO los domingos
  if (esDomingo) {
    return {
      abierto: false,
      esDomingo: true,
      motivo: 'domingo' as const,
      mensaje: 'Los domingos el local permanece cerrado. Te esperamos de lunes a sábados.',
    }
  }

  // 2. Si no hay turno activo iniciado manualmente por el administrador, permanece cerrado
  if (!turnoActivo) {
    return {
      abierto: false,
      esDomingo: false,
      motivo: 'turno_cerrado' as const,
      mensaje: 'El local se encuentra cerrado en este momento. Horarios: Lunes a Sábados de 11:30 a 14:00 y 20:30 a 01:00 hs. Domingos cerrado.',
    }
  }

  return {
    abierto: true,
    esDomingo: false,
    motivo: 'abierto' as const,
    mensaje: 'Local abierto y recibiendo pedidos.',
  }
}

/**
 * Detecta si el turno es Mediodía o Noche según la hora local de Argentina.
 * - 10:00 a 16:00 hs: Mediodía (11:30 a 14:00)
 * - Resto del tiempo: Noche (20:30 a 01:00)
 */
export function detectarTipoTurnoActual(fechaReferencia: Date = new Date()): 'mediodia' | 'noche' {
  const horaArg = obtenerHoraArgentina(fechaReferencia)
  const hora = horaArg.getHours()
  if (hora >= 10 && hora < 16) {
    return 'mediodia'
  }
  return 'noche'
}

/**
 * Devuelve una etiqueta legible con ícono para un tipo de turno.
 */
export function obtenerEtiquetaTurno(tipo?: string | null): string {
  if (tipo === 'mediodia') return '☀️ Mediodía'
  if (tipo === 'noche') return '🌙 Noche'
  return '☀️/🌙 General'
}

/**
 * Parsea una fecha en formato "YYYY-MM-DD" y hora en formato 12h o 24h a un objeto Date local.
 * Soporta formatos de hora como "17:35", "17:35:12", "05:35 p. m.", "05:35 PM", etc.
 * Resuelve el bug del NaN al ignorar caracteres no numéricos tras separar horas/minutos/segundos.
 *
 * @param fecha Cadena de texto de la fecha en formato "YYYY-MM-DD"
 * @param hora Cadena de texto de la hora en formato "HH:MM" o "HH:MM:SS" (con o sin meridiano)
 * @returns Objeto Date correspondiente a la zona horaria local
 */
export function parsearFechaHora(fecha: string, hora: string): Date {
  if (!fecha || !hora) return new Date()

  // Separar fecha
  const partsFecha = fecha.split('-')
  const anio = Number(partsFecha[0]) || new Date().getFullYear()
  const mes = (Number(partsFecha[1]) || 1) - 1 // 0-indexed
  const dia = Number(partsFecha[2]) || new Date().getDate()

  // Limpiar y normalizar la hora
  let horaLimpia = hora.trim()
  
  // Detectar AM / PM
  const esPM = /p\.?\s*m\.?|pm/i.test(horaLimpia)
  const esAM = /a\.?\s*m\.?|am/i.test(horaLimpia)

  // Eliminar meridianos para parsear números
  horaLimpia = horaLimpia.replace(/a\.?\s*m\.?|p\.?\s*m\.?|am|pm/i, '').trim()

  // Separar horas, minutos, segundos
  const partsHora = horaLimpia.split(':')
  let horas = Number(partsHora[0]) || 0
  const minutos = Number(partsHora[1]) || 0
  const segundos = Number(partsHora[2]) || 0

  // Ajustar formato 12h a 24h
  if (esPM && horas < 12) {
    horas += 12
  } else if (esAM && horas === 12) {
    horas = 0
  }

  return new Date(anio, mes, dia, horas, minutos, segundos)
}

/**
 * Calcula la diferencia en segundos entre dos fechas, garantizando un mínimo de 1 segundo.
 *
 * @param inicio Objeto Date de inicio
 * @param fin Objeto Date de fin
 * @returns Cantidad de segundos transcurridos
 */
export function calcularDiferenciaSegundos(inicio: Date, fin: Date): number {
  const diff = fin.getTime() - inicio.getTime()
  return Math.max(1, Math.floor(diff / 1000))
}

/**
 * Formatea un total de segundos en una cadena con formato "MM:SS".
 *
 * @param segundosTotales Cantidad de segundos transcurridos
 * @returns Cadena con formato "MM:SS" (ej: "03:45", "102:05")
 */
export function formatearSegundos(segundosTotales: number): string {
  const minutos = Math.floor(segundosTotales / 60)
  const segundos = segundosTotales % 60

  const strMinutos = minutos.toString().padStart(2, '0')
  const strSegundos = segundos.toString().padStart(2, '0')

  return `${strMinutos}:${strSegundos}`
}

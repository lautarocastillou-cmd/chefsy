// ─────────────────────────────────────────────────────
// lib/api-error.ts
// Una sola forma de responder un error interno en los route handlers.
// ─────────────────────────────────────────────────────
//
// EL PROBLEMA QUE RESUELVE
// El patrón `return NextResponse.json({ error: error.message })` estaba
// repetido en 14 lugares. `error.message` para un error de Supabase trae
// cosas como:
//
//   "column pedidos.estado does not exist"
//   "new row violates row-level security policy for table \"pedidos\""
//   "duplicate key value violates unique constraint \"pedidos_pkey\""
//
// O sea: nombres de tabla, de columna y de constraints. No es el mensaje
// que un error interno debe darle a quien llama.
//
// LA REGLA
// El detalle va al log del servidor, nunca a la respuesta. Al cliente se le
// da un mensaje genérico y el código HTTP correcto.
//
// SI EL MENSAJE ES PARA EL USUARIO
// Para errores que sí son legibles (un archivo muy pesado, una fecha
// inválida, un campo obligatorio), lanzá `new ErrorApi('...')` a propósito.
// Que mostrar texto al usuario sea una decisión consciente y no algo que
// pase por accidente cuando alguien escribe `error.message`.

import { NextResponse } from 'next/server'

/**
 * Error con un mensaje diseñado para mostrarse al usuario.
 *
 * Solo estos se pasan al cliente. `responderError` los distingue de los
 * errores internos, así que un `throw new Error('bug de producción')`
 * accidental nunca llega a la respuesta.
 */
export class ErrorApi extends Error {
  readonly status: number

  /**
   * `status` es obligatorio a propósito.
   *
   * Con un default (por ejemplo 400) es fácil escribir
   * `throw new ErrorApi('no se pudo procesar el turno')` y mandar un 500
   * como si fuera 400. Eso no es cosmético: el monitoreo suele alertar por
   * separado a los 5xx, así que un fallo real de servidor se camufla de
   * error del cliente y nadie lo ve.
   *
   * Obligar a escribirlo hace que la decisión sea explícita:
   *   - el pedido del usuario está mal    -> new ErrorApi('...', 400)
   *   - fallamos nosotros                  -> new ErrorApi('...', 500)
   */
  constructor(mensaje: string, status: number) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.status = status
  }
}

interface OpcionesResponder {
  /** Status HTTP de la respuesta. Default 500. */
  status?: number
  /** Mensaje para el cliente cuando NO es un ErrorApi. Default genérico. */
  mensaje?: string
  /** Etiqueta para el log, ej. '[API Stock]'. */
  contexto: string
}

/**
 * Loguea el detalle y devuelve una respuesta segura.
 *
 * Un `ErrorApi` pasa su mensaje al cliente (es intencional); cualquier otro
 * error devuelve el mensaje genérico.
 */
export function responderError(error: unknown, opciones: OpcionesResponder): NextResponse {
  const { contexto, status = 500, mensaje = 'Error interno del servidor.' } = opciones

  if (error instanceof ErrorApi) {
    // Es un mensaje pensado para el usuario: no hace falta loguearlo como
    // error, pero sí dejar rastro de que hubo un 4xx.
    if (error.status >= 500) {
      console.error(`${contexto} ${error.status}:`, error.message)
    }
    return NextResponse.json({ error: error.message }, { status: error.status })
  }

  // Detalle completo para el operador. Incluye el stack: sin esto, un 500
  // silencioso es casi imposible de diagnosticar en producción.
  console.error(`${contexto}:`, error)

  return NextResponse.json({ error: mensaje }, { status })
}

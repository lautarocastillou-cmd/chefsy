// ─────────────────────────────────────────────────────
// lib/pedidos-broadcast.ts
// Señal de "cambió algo en pedidos" para el panel en vivo.
// ─────────────────────────────────────────────────────
//
// POR QUÉ EXISTE
// `pedidos` se cierra a `anon` por RLS (contiene nombre, teléfono y dirección
// de clientes). Eso rompe `postgres_changes`, que NO pasa por route handlers:
// Supabase Realtime autentica contra la base directamente y un JWT anónimo no
// alcanza.
//
// La solución es separar "señal" de "dato":
//   1. El servidor avisa QUE algo cambió, sin decir QUÉ.
//   2. El panel recibe la señal y refetchea los datos por un route handler
//      normal, que sí valida sesión.
//
// El broadcast NO filtra información: el payload es solo {id, tipo} y ni
// siquiera un atacante con la anon key puede obtener PII por este canal,
// porque el cliente ignora el payload y vuelve a pedir los datos al servidor.
//
// Por eso el payload tiene que seguir siendo mínimo. Si alguna vez agrego un
// campo con datos del pedido, esto vuelve a ser una fuga.

import { createClient } from '@supabase/supabase-js'

const CANAL = 'chefsy-pedidos'

function obtenerUrlYClave(): { url: string; clave: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  // La service_role es la única que puede emitir por el endpoint de broadcast.
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !clave) return null
  return { url, clave }
}

export type TipoCambioPedido = 'insert' | 'update' | 'delete' | 'archive'

/**
 * Emite una señal de cambio. Fire-and-forget: si falla, el panel igual
 * refresca por el poll de SWR, así que nunca debe romper la operación
 * que la disparó.
 */
export async function notificarCambioPedido(
  id: string,
  tipo: TipoCambioPedido
): Promise<void> {
  const config = obtenerUrlYClave()
  if (!config) return

  try {
    await fetch(`${config.url}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.clave,
        Authorization: `Bearer ${config.clave}`,
      },
      body: JSON.stringify({
        messages: [
          {
            topic: CANAL,
            event: 'cambio',
            // Payload mínimo a propósito: ver nota de arriba.
            payload: { id, tipo },
          },
        ],
      }),
    })
  } catch (error) {
    // Silencioso a propósito: es una optimización, no una garantía.
    console.warn('[PedidosBroadcast] No se pudo emitir la señal:', error)
  }
}

/** Canal que escucha el navegador. Exportado para no duplicar el string. */
export const CANAL_PEDIDOS = CANAL

/**
 * Cliente anónimo para escuchar el broadcast. Se usa `broadcast` (no
 * `postgres_changes`) justamente porque no consulta filas de la tabla.
 */
export function crearClienteEscucha() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !clave) return null

  return createClient(url, clave, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    realtime: { params: { eventsPerSecond: 20 } },
  })
}

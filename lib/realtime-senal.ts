// ─────────────────────────────────────────────────────────────────────────────
// lib/realtime-senal.ts
// Emisor genérico de señales de "cambió algo" para el panel en vivo.
//
// POR QUÉ EXISTE
// Las tablas de negocio están cerradas a `anon` por RLS (ver supabase/migrations/).
// Eso rompe `postgres_changes`, que NO pasa por route handlers: Supabase Realtime
// autentica contra la base directamente y un JWT anónimo no alcanza.
//
// La solución es separar "señal" de "dato":
//   1. El servidor avisa QUE algo cambió, sin decir QUÉ.
//   2. El panel recibe la señal y refetchea los datos por un route handler
//      normal, que sí valida sesión.
//
// El broadcast NO filtra información: el payload es mínimo y el cliente ignora
// su contenido para volver a pedir los datos al servidor. Por eso el payload
// tiene que seguir siendo mínimo — si alguna vez se le agrega un campo con
// PII, esto vuelve a ser una fuga.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function obtenerUrlYClave(): { url: string; clave: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  // La service_role es la única que puede emitir por el endpoint de broadcast.
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !clave) return null
  return { url, clave }
}

/**
 * Emite una señal de cambio en un canal. Fire-and-forget: si falla, el panel
 * igual refresca por su poll de respaldo, así que nunca debe romper la
 * operación que la disparó.
 */
export async function emitirSenal(
  canal: string,
  evento: string,
  payload: Record<string, unknown>
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
        messages: [{ topic: canal, event: evento, payload }],
      }),
    })
  } catch (error) {
    // Silencioso a propósito: es una optimización, no una garantía.
    console.warn(`[Realtime] No se pudo emitir la señal en "${canal}":`, error)
  }
}

/**
 * Cliente anónimo SOLO para escuchar broadcasts. No consulta filas de ninguna
 * tabla, así que no necesita ninguna política RLS de SELECT.
 */
export function crearClienteEscucha(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !clave) return null

  return createClient(url, clave, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    realtime: { params: { eventsPerSecond: 20 } },
  })
}

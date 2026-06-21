// ─────────────────────────────────────────────────────
// lib/supabase-admin.ts
// Singleton del cliente Supabase administrativo (service_role).
// En Next.js con Node runtime, los módulos persisten entre requests
// dentro del mismo worker — reutilizar la instancia reduce el overhead
// de inicialización y aprovecha el pool de conexiones interno.
//
// IMPORTANTE: Solo importar desde Route Handlers o Server Components.
// Nunca desde componentes 'use client'.
// ─────────────────────────────────────────────────────

import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _adminClient: SupabaseClient | null = null

/**
 * Retorna la instancia singleton del cliente Supabase con service_role.
 * La primera llamada crea el cliente; las siguientes reutilizan la misma instancia.
 * Lanza un Error si las variables de entorno no están configuradas.
 */
export function obtenerSupabaseAdmin(): SupabaseClient {
  if (_adminClient) return _adminClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      '[Supabase Admin] Variables de entorno no configuradas: NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY.'
    )
  }

  _adminClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return _adminClient
}

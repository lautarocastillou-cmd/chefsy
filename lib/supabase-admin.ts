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
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error('[Supabase Admin] NEXT_PUBLIC_SUPABASE_URL no configurada.')
  }

  // En producción, fail-closed estricto: NUNCA degradar a anon key
  if (!serviceKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[Supabase Admin] Error crítico de seguridad: SUPABASE_SERVICE_ROLE_KEY no está configurada. Las operaciones administrativas en producción no permiten fallback.'
      )
    }
    console.warn(
      '[Supabase Admin] ADVERTENCIA: SUPABASE_SERVICE_ROLE_KEY no está configurada en entorno local. Operando con fallback temporal.'
    )
  }

  const key = serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) {
    throw new Error('[Supabase Admin] Clave de Supabase no configurada.')
  }

  _adminClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return _adminClient
}

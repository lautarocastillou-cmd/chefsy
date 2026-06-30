// ─────────────────────────────────────────────────────
// lib/supabase.ts
// Cliente global de Supabase
// ─────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Falta configurar NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local')
}

// Cliente exportado para usar en toda la app (con persistencia de sesión y prevención de deadlocks en PC)
export const supabase = createClient(
  supabaseUrl ?? 'https://falta-configurar.supabase.co',
  supabaseAnonKey ?? 'falta-configurar',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      lock: typeof window !== 'undefined' && 'locks' in navigator
        ? async (name, acquireTimeout, fn) => {
            return await navigator.locks.request(name, { ifAvailable: true }, async (lock) => {
              if (!lock) {
                // Si el lock está ocupado por otra pestaña o render en PC, ejecutar directamente sin colgarse
                return await fn()
              }
              return await fn()
            }).catch(async () => {
              return await fn()
            })
          }
        : undefined,
    },
  }
)

// Cliente anónimo que ignora localStorage y Web Locks (evita cuelgues)
export const supabaseAnon = createClient(
  supabaseUrl ?? 'https://falta-configurar.supabase.co',
  supabaseAnonKey ?? 'falta-configurar',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'supabase.anon.auth.token'
    }
  }
)

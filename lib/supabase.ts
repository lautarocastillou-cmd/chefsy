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

// Cliente exportado para usar en toda la app
export const supabase = createClient(
  supabaseUrl ?? 'https://falta-configurar.supabase.co',
  supabaseAnonKey ?? 'falta-configurar'
)

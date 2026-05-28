'use client'

// ─────────────────────────────────────────────────────
// app/malu/page.tsx
// Página principal del sistema Malú Clothing.
// Muestra LoginMalu si no hay sesión, AppMalu si sí.
// ─────────────────────────────────────────────────────

import { usarMalu } from '@/modules/malu/contexto'
import LoginMalu from '@/modules/malu/componentes/LoginMalu'
import AppMalu from '@/modules/malu/componentes/AppMalu'

export default function PaginaMalu() {
  const { autenticada, cargando } = usarMalu()

  if (cargando) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#0a0a0a' }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'rgba(212,175,55,0.3)', borderTopColor: '#d4af37' }}
        />
      </div>
    )
  }

  return autenticada ? <AppMalu /> : <LoginMalu />
}

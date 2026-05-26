// ─────────────────────────────────────────────────────
// app/page.tsx
// Redirige automáticamente al dashboard al acceder a "/"
// ─────────────────────────────────────────────────────

import { redirect } from 'next/navigation'

export default function PaginaInicio() {
  redirect('/dashboard')
}

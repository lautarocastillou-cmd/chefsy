// ─────────────────────────────────────────────────────
// app/malu/layout.tsx
// Layout propio de Malú Clothing.
// NO envuelve los providers de Chefsy.
// ─────────────────────────────────────────────────────

import type { Metadata } from 'next'
import { ProveedorMalu } from '@/modules/malu/contexto'

export const metadata: Metadata = {
  title: 'Malú Clothing — Gestión',
  description: 'Sistema de gestión de deudoras para Malú Clothing',
  icons: { icon: '/malu-logo.png' },
}

export default function LayoutMalu({ children }: { children: React.ReactNode }) {
  return (
    <ProveedorMalu>
      {children}
    </ProveedorMalu>
  )
}

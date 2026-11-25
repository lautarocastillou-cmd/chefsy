// ─────────────────────────────────────────────────────
// app/api/tienda/promo-flash/route.ts
// Endpoint público en tiempo real del estado y cupo restante
// de la Promo Flash (Burger Cheese a $5.000 — Solo por hoy).
// ─────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { obtenerEstadoPromoFlashServidor } from '@/lib/promo-flash-servidor'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const estado = await obtenerEstadoPromoFlashServidor()
    return NextResponse.json(
      { ok: true, estado },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    console.error('[API Tienda Promo Flash GET]:', err)
    return NextResponse.json(
      { ok: false, error: 'No se pudo consultar la promo flash.' },
      { status: 500 }
    )
  }
}

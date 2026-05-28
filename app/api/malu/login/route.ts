// ─────────────────────────────────────────────────────
// app/api/malu/login/route.ts
// Endpoint de autenticación de Malú Clothing.
// Solo verifica la contraseña de .env.local (MALU_PASS).
// No tiene relación con el auth de Chefsy.
// ─────────────────────────────────────────────────────

import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { contrasena } = await request.json()

    const claveCorrecta = process.env.MALU_PASS
    if (!claveCorrecta) {
      console.error('[Malú Auth] MALU_PASS no está definida en .env.local')
      return NextResponse.json({ error: 'Servidor no configurado.' }, { status: 500 })
    }

    if (contrasena !== claveCorrecta) {
      return NextResponse.json({ error: 'Contraseña incorrecta.' }, { status: 401 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 })
  }
}

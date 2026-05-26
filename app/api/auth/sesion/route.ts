// ─────────────────────────────────────────────────────
// app/api/auth/sesion/route.ts
// Retorna los datos de la sesión activa leyendo
// la cookie HttpOnly desde el servidor. El cliente
// no puede leer la cookie directamente (por diseño),
// por lo que consulta este endpoint al montar.
// ─────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'

export async function GET() {
  const sesion = await obtenerSesion()

  if (!sesion) {
    return NextResponse.json({ usuario: null }, { status: 200 })
  }

  // Retornar solo los datos públicos de la sesión
  return NextResponse.json({
    usuario: sesion.usuario,
    nombre:  sesion.nombre,
    rol:     sesion.rol,
  })
}

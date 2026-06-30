// app/api/clientes/logout/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { limpiarCookieCliente } from '@/lib/auth-cliente-server'

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.set(limpiarCookieCliente() as any)
  return NextResponse.json({ ok: true })
}

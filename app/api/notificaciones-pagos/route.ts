// ─────────────────────────────────────────────────────
// app/api/notificaciones-pagos/route.ts
// API para recibir notificaciones de transferencias (desde
// el listener Android del local o el admin) y consultarlas
// desde la app de cadetes (Shorebird OTA) y el panel web.
// ─────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { obtenerSesion } from '@/lib/auth-server'
import {
  marcarNotificacionPagoLeidaServidor,
  obtenerNotificacionesPagosServidor,
  registrarNotificacionPagoServidor,
} from '@/lib/notificaciones-pagos-servidor'

export const dynamic = 'force-dynamic'

const TOKEN_DEFAULT_APPS = 'chefsy_expo_secure_track_99XQ'

function tokenBearerValido(request: Request): boolean {
  const auth = request.headers.get('authorization') || ''
  if (!auth.toLowerCase().startsWith('bearer ')) return false
  const recibido = auth.slice(7).trim()
  if (!recibido) return false

  const permitidos = [
    process.env.CHEFSY_PAGOS_TOKEN,
    process.env.CADETE_TRACK_TOKEN,
    TOKEN_DEFAULT_APPS,
  ].filter((t): t is string => Boolean(t && t.trim()))

  const bufRecibido = Buffer.from(recibido, 'utf8')
  for (const esperado of permitidos) {
    const bufEsperado = Buffer.from(esperado.trim(), 'utf8')
    if (
      bufRecibido.length === bufEsperado.length &&
      timingSafeEqual(bufRecibido, bufEsperado)
    ) {
      return true
    }
  }
  return false
}

async function autorizarSolicitud(
  request: Request,
  rolesPermitidos: Array<'admin' | 'cajero' | 'cadete'> = ['admin', 'cajero']
): Promise<boolean> {
  if (tokenBearerValido(request)) return true
  try {
    const sesion = await obtenerSesion()
    if (sesion && rolesPermitidos.includes(sesion.rol as any)) {
      return true
    }
  } catch {
    // Sin cookie de sesión válida
  }
  return false
}

export async function GET(request: Request) {
  try {
    const autorizado = await autorizarSolicitud(request, ['admin', 'cajero', 'cadete'])
    if (!autorizado) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const cadeteId = searchParams.get('cadeteId')
    const pedidoId = searchParams.get('pedidoId')
    const soloNoLeidas = searchParams.get('noLeidas') === '1'
    const limite = Number(searchParams.get('limit') || '50')

    const notificaciones = await obtenerNotificacionesPagosServidor({
      cadeteId,
      pedidoId,
      soloNoLeidas,
      limite: Number.isFinite(limite) ? limite : 50,
    })

    return NextResponse.json(
      { ok: true, notificaciones },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error: any) {
    console.error('[API Notificaciones Pagos GET]:', error)
    return NextResponse.json(
      { ok: false, notificaciones: [], error: 'Error al consultar notificaciones.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const autorizado = await autorizarSolicitud(request, ['admin', 'cajero'])
    if (!autorizado) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Cuerpo JSON inválido.' }, { status: 400 })
    }

    const resultado = await registrarNotificacionPagoServidor({
      titulo: typeof body.titulo === 'string' ? body.titulo : undefined,
      texto: typeof body.texto === 'string' ? body.texto : undefined,
      paquete: typeof body.paquete === 'string' ? body.paquete : undefined,
      monto: body.monto,
      metodo: typeof body.metodo === 'string' ? body.metodo : undefined,
      billetera: typeof body.billetera === 'string' ? body.billetera : undefined,
      remitente: typeof body.remitente === 'string' ? body.remitente : undefined,
      cadeteId: typeof body.cadeteId === 'string' ? body.cadeteId : undefined,
      cadeteNombre: typeof body.cadeteNombre === 'string' ? body.cadeteNombre : undefined,
      pedidoId: typeof body.pedidoId === 'string' ? body.pedidoId : undefined,
      mensaje: typeof body.mensaje === 'string' ? body.mensaje : undefined,
    })

    return NextResponse.json(resultado)
  } catch (error: any) {
    console.error('[API Notificaciones Pagos POST]:', error)
    return NextResponse.json(
      { error: 'Error al registrar notificación de pago.' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const autorizado = await autorizarSolicitud(request, ['admin', 'cajero', 'cadete'])
    if (!autorizado) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    await marcarNotificacionPagoLeidaServidor(id)
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[API Notificaciones Pagos PATCH]:', error)
    return NextResponse.json(
      { error: 'Error al actualizar notificación.' },
      { status: 500 }
    )
  }
}

// ─────────────────────────────────────────────────────
// app/api/admin/promo-flash/route.ts
// API administrativa para consultar y configurar la Promo Flash
// (límite de unidades, máximo por pedido, precio, fecha y estado).
// ─────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { responderError } from '@/lib/api-error'
import {
  contarVendidasPromoFlashFechaServidor,
  guardarConfiguracionPromoFlashServidor,
  obtenerConfiguracionPromoFlashServidor,
  obtenerEstadoPromoFlashServidor,
} from '@/lib/promo-flash-servidor'
import { evaluarEstadoPromoFlash } from '@/lib/promo-flash'
import { obtenerFechaNegocio } from '@/lib/tiempo'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const sesion = await obtenerSesion()
    if (!sesion || sesion.rol !== 'admin') {
      return NextResponse.json(
        { error: 'Acceso denegado. Operación reservada para administradores.' },
        { status: 403 }
      )
    }

    const estado = await obtenerEstadoPromoFlashServidor()
    return NextResponse.json(
      { ok: true, estado },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    return responderError(err, {
      contexto: '[API Admin Promo Flash GET]',
      mensaje: 'No se pudo cargar la configuración de la promo flash.',
    })
  }
}

export async function PUT(request: Request) {
  try {
    const sesion = await obtenerSesion()
    if (!sesion || sesion.rol !== 'admin') {
      return NextResponse.json(
        { error: 'Acceso denegado. Operación reservada para administradores.' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
    }

    const actual = await obtenerConfiguracionPromoFlashServidor()
    const fusionada = {
      ...actual,
      ...body,
    }

    // Si el admin reactiva manualmente la promo o sube el límite por encima de las vendidas,
    // limpiamos la bandera de auto-desactivación previa.
    const vendidasEnFecha = await contarVendidasPromoFlashFechaServidor(
      typeof fusionada.fechaVigencia === 'string' ? fusionada.fechaVigencia : actual.fechaVigencia
    )

    if (fusionada.activa === true) {
      if (Number(fusionada.limiteTotal) > vendidasEnFecha) {
        fusionada.desactivadaAutomaticamente = false
        fusionada.agotadaEn = undefined
      } else {
        return NextResponse.json(
          {
            error: `Ya se vendieron ${vendidasEnFecha} unidades hoy. Subí el límite por encima de ${vendidasEnFecha} para reactivarla.`,
          },
          { status: 400 }
        )
      }
    }

    const guardada = await guardarConfiguracionPromoFlashServidor(fusionada)
    const estado = evaluarEstadoPromoFlash(guardada, vendidasEnFecha, obtenerFechaNegocio())

    return NextResponse.json({ ok: true, estado })
  } catch (err) {
    return responderError(err, {
      contexto: '[API Admin Promo Flash PUT]',
      mensaje: 'No se pudo guardar la configuración de la promo flash.',
    })
  }
}

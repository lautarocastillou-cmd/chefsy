import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { guardarNotaCRM, obtenerMapaNotasCRM } from '@/lib/crm-notas-servidor'
import { invalidarCache } from '@/lib/cache-servidor'

export const dynamic = 'force-dynamic'

const CACHE_KEY_SUGERENCIAS = 'clientes_sugerencias_cache'

export async function GET() {
  try {
    const sesion = await obtenerSesion()
    if (!sesion || (sesion.rol !== 'admin' && sesion.rol !== 'cajero')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const mapa = await obtenerMapaNotasCRM()
    return NextResponse.json(mapa)
  } catch (error) {
    console.error('[API CRM Notas] Error GET:', error)
    return NextResponse.json({ error: 'Error al obtener notas CRM' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const sesion = await obtenerSesion()
    if (!sesion || (sesion.rol !== 'admin' && sesion.rol !== 'cajero')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { claveCliente, notaFija, etiquetas, nombreReferencia, telefonoReferencia } = body || {}

    if (!claveCliente || typeof claveCliente !== 'string' || claveCliente.trim().length < 2) {
      return NextResponse.json({ error: 'claveCliente inválida' }, { status: 400 })
    }

    const guardado = await guardarNotaCRM({
      claveCliente: claveCliente.trim(),
      notaFija: typeof notaFija === 'string' ? notaFija : '',
      etiquetas: Array.isArray(etiquetas) ? etiquetas : [],
      nombreReferencia: typeof nombreReferencia === 'string' ? nombreReferencia : undefined,
      telefonoReferencia: typeof telefonoReferencia === 'string' ? telefonoReferencia : undefined,
    })

    // Invalidar caché de sugerencias para que el próximo GET refleje los cambios
    try {
      invalidarCache(CACHE_KEY_SUGERENCIAS)
    } catch {}

    return NextResponse.json({ ok: true, registro: guardado })
  } catch (error) {
    console.error('[API CRM Notas] Error POST:', error)
    return NextResponse.json({ error: 'No se pudo guardar la nota del cliente' }, { status: 500 })
  }
}

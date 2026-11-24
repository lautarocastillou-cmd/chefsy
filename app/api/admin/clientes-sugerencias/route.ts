import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import {
  consolidarSugerenciasClientes,
  CuentaClienteFuente,
  PedidoClienteFuente,
  SugerenciaCliente,
} from '@/lib/motor-clientes'
import { obtenerDeCache, guardarEnCache } from '@/lib/cache-servidor'
import { obtenerMapaNotasCRM } from '@/lib/crm-notas-servidor'

export const dynamic = 'force-dynamic'

const CACHE_KEY_SUGERENCIAS = 'clientes_sugerencias_cache'

export async function GET() {
  try {
    const sesion = await obtenerSesion()
    if (!sesion || (sesion.rol !== 'admin' && sesion.rol !== 'cajero')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const cached = obtenerDeCache<SugerenciaCliente[]>(CACHE_KEY_SUGERENCIAS)
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'private, max-age=30',
          'X-Chefsy-Cache': 'HIT',
        }
      })
    }

    const supabase = obtenerSupabaseAdmin()

    // El CRM necesita el historial completo para no perder clientes antiguos.
    const [resPedidos, resCuentas, notasMap] = await Promise.all([
      supabase
        .from('pedidos')
        .select('cliente, telefono, direccion, coordenadas, metodoPago, tipoEntrega, total, observaciones, productos, estado, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('clientes')
        .select('id, nombre, telefono'),
      obtenerMapaNotasCRM().catch((err) => {
        console.warn('[API Clientes Sugerencias] Error cargando notas CRM:', err)
        return {}
      }),
    ])

    const { data: pedidos, error: errPedidos } = resPedidos
    const { data: cuentasClientes, error: errCuentas } = resCuentas

    if (errPedidos) {
      console.error('[API Clientes Sugerencias] Error en pedidos:', errPedidos)
      throw errPedidos
    }

    if (errCuentas) {
      console.error('[API Clientes Sugerencias] Error en cuentas:', errCuentas)
      throw errCuentas
    }

    const resultado = consolidarSugerenciasClientes(
      (cuentasClientes || []) as CuentaClienteFuente[],
      (pedidos || []) as PedidoClienteFuente[],
      notasMap,
    )

    guardarEnCache(CACHE_KEY_SUGERENCIAS, resultado, 30) // 30s en caché de servidor

    return NextResponse.json(resultado, {
      headers: {
        'Cache-Control': 'private, max-age=30',
        'X-Chefsy-Cache': 'MISS',
      }
    })
  } catch (error: unknown) {
    console.error('[API Clientes Sugerencias] Error:', error)
    return NextResponse.json({ error: 'Error al obtener sugerencias' }, { status: 500 })
  }
}

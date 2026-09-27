import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { normalizarTelefonoArgentino, SugerenciaCliente } from '@/lib/motor-clientes'
import { obtenerDeCache, guardarEnCache } from '@/lib/cache-servidor'

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

    // 1. Obtener los últimos 300 pedidos para extraer clientes recientes con su última dirección y coordenadas
    const { data: pedidos, error: errPedidos } = await supabase
      .from('pedidos')
      .select('cliente, telefono, direccion, coordenadas, metodoPago, tipoEntrega, created_at')
      .order('created_at', { ascending: false })
      .limit(300)

    if (errPedidos) {
      console.error('[API Clientes Sugerencias] Error en pedidos:', errPedidos)
      throw errPedidos
    }

    // 2. Obtener cuentas registradas de clientes
    const { data: cuentasClientes } = await supabase
      .from('clientes')
      .select('id, nombre, telefono, puntos_actuales')
      .limit(200)

    const mapaClientes = new Map<string, SugerenciaCliente>()

    // Indexar cuentas formales primero
    if (Array.isArray(cuentasClientes)) {
      for (const c of cuentasClientes) {
        if (!c.nombre) continue
        const telNorm = normalizarTelefonoArgentino(c.telefono)
        const clave = telNorm || c.nombre.toLowerCase().trim()
        mapaClientes.set(clave, {
          id: c.id,
          nombre: c.nombre.trim(),
          telefono: c.telefono || '',
          telefonoNormalizado: telNorm,
          totalPedidos: 0,
        })
      }
    }

    // Rellenar con los pedidos más recientes (sobreescribe con última dirección y método de pago)
    if (Array.isArray(pedidos)) {
      for (const p of pedidos) {
        if (!p.cliente || p.cliente.trim().length < 2) continue
        const telNorm = normalizarTelefonoArgentino(p.telefono)
        const clave = telNorm || p.cliente.toLowerCase().trim()

        const existente = mapaClientes.get(clave)
        if (existente) {
          existente.totalPedidos = (existente.totalPedidos || 0) + 1
          if (!existente.direccion && p.direccion) {
            existente.direccion = p.direccion
            existente.coordenadas = p.coordenadas
          }
          if (!existente.metodoPago && p.metodoPago) {
            existente.metodoPago = p.metodoPago
          }
          if (!existente.tipoEntrega && p.tipoEntrega) {
            existente.tipoEntrega = p.tipoEntrega
          }
          if (!existente.ultimaFecha) {
            existente.ultimaFecha = p.created_at
          }
        } else {
          mapaClientes.set(clave, {
            nombre: p.cliente.trim(),
            telefono: p.telefono || '',
            telefonoNormalizado: telNorm,
            direccion: p.direccion || '',
            coordenadas: p.coordenadas || null,
            metodoPago: p.metodoPago || 'efectivo',
            tipoEntrega: p.tipoEntrega || 'delivery',
            totalPedidos: 1,
            ultimaFecha: p.created_at,
          })
        }
      }
    }

    const resultado = Array.from(mapaClientes.values())
      .sort((a, b) => (b.totalPedidos || 0) - (a.totalPedidos || 0))
      .slice(0, 250)

    guardarEnCache(CACHE_KEY_SUGERENCIAS, resultado, 30) // 30s en caché de servidor

    return NextResponse.json(resultado, {
      headers: {
        'Cache-Control': 'private, max-age=30',
        'X-Chefsy-Cache': 'MISS',
      }
    })
  } catch (error: any) {
    console.error('[API Clientes Sugerencias] Error:', error)
    return NextResponse.json({ error: 'Error al obtener sugerencias' }, { status: 500 })
  }
}

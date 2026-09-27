import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { normalizarTelefonoArgentino } from '@/lib/motor-clientes'
import { invalidarCache } from '@/lib/cache-servidor'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const sesion = await obtenerSesion()
    if (!sesion || (sesion.rol !== 'admin' && sesion.rol !== 'cajero')) {
      return NextResponse.json({ error: 'Acceso denegado. Se requiere sesión autorizada.' }, { status: 403 })
    }

    const body = await request.json()
    const {
      nombrePrincipal,
      telefonoPrincipal,
      direccionPrincipal,
      coordenadasPrincipal,
      nombresSecundarios,
      telefonosSecundarios = []
    } = body

    if (!nombrePrincipal || typeof nombrePrincipal !== 'string' || !nombrePrincipal.trim()) {
      return NextResponse.json({ error: 'El nombre principal es obligatorio' }, { status: 400 })
    }

    if (!Array.isArray(nombresSecundarios) || nombresSecundarios.length === 0) {
      return NextResponse.json({ error: 'Debe especificar al menos un cliente secundario a fusionar' }, { status: 400 })
    }

    const supabase = obtenerSupabaseAdmin()
    const nombreCanonico = nombrePrincipal.trim()
    const telCanonico = normalizarTelefonoArgentino(telefonoPrincipal) || String(telefonoPrincipal || '').trim()

    // 1. Reasignar pedidos históricos en la tabla 'pedidos'
    const nombresParaActualizar = Array.from(new Set(
      nombresSecundarios
        .map((n: any) => String(n || '').trim())
        .filter((n: string) => n.length > 0 && n.toLowerCase() !== nombreCanonico.toLowerCase())
    ))

    let pedidosActualizados = 0

    if (nombresParaActualizar.length > 0) {
      // Buscar IDs de pedidos que coincidan con los nombres secundarios
      const { data: pedidosMatch, error: errBusqueda } = await supabase
        .from('pedidos')
        .select('id, cliente, telefono, direccion')
        .in('cliente', nombresParaActualizar)

      if (errBusqueda) {
        console.error('[API Fusión Clientes] Error buscando pedidos:', errBusqueda)
        throw errBusqueda
      }

      if (pedidosMatch && pedidosMatch.length > 0) {
        const ids = pedidosMatch.map(p => p.id)
        
        const payloadUpdate: any = {
          cliente: nombreCanonico,
        }
        if (telCanonico) {
          payloadUpdate.telefono = telCanonico
        }
        if (direccionPrincipal) {
          payloadUpdate.direccion = direccionPrincipal
        }
        if (coordenadasPrincipal) {
          payloadUpdate.coordenadas = coordenadasPrincipal
        }

        const { error: errUpdate } = await supabase
          .from('pedidos')
          .update(payloadUpdate)
          .in('id', ids)

        if (errUpdate) {
          console.error('[API Fusión Clientes] Error actualizando pedidos:', errUpdate)
          throw errUpdate
        }

        pedidosActualizados = ids.length
      }
    }

    // 2. Unificar cuentas registradas en la tabla 'clientes' si existen
    const telefonosParaBuscar = Array.from(new Set(
      [telCanonico, ...telefonosSecundarios.map((t: any) => normalizarTelefonoArgentino(t))]
        .filter((t: string) => t && t.length >= 8)
    ))

    if (telefonosParaBuscar.length > 0) {
      const { data: cuentasMatch } = await supabase
        .from('clientes')
        .select('id, nombre, telefono, puntos_actuales')
        .in('telefono', telefonosParaBuscar)

      if (cuentasMatch && cuentasMatch.length > 1) {
        // Encontrar la cuenta principal (o la que coincida con telCanonico)
        const principal = cuentasMatch.find(c => c.telefono === telCanonico) || cuentasMatch[0]
        const secundarias = cuentasMatch.filter(c => c.id !== principal.id)

        const sumaPuntosSecundarios = secundarias.reduce((acc, c) => acc + (Number(c.puntos_actuales) || 0), 0)
        const totalPuntosFinal = (Number(principal.puntos_actuales) || 0) + sumaPuntosSecundarios

        // Actualizar cuenta principal con puntos acumulados y nombre canónico
        await supabase
          .from('clientes')
          .update({
            nombre: nombreCanonico,
            puntos_actuales: totalPuntosFinal,
          })
          .eq('id', principal.id)

        // Eliminar cuentas secundarias fusionadas
        const idsAEliminar = secundarias.map(c => c.id)
        await supabase
          .from('clientes')
          .delete()
          .in('id', idsAEliminar)
      }
    }

    // Invalidar caché de sugerencias
    invalidarCache('clientes_sugerencias_cache')

    return NextResponse.json({
      ok: true,
      mensaje: `¡Fusión completada! Se unificaron ${pedidosActualizados} pedidos bajo "${nombreCanonico}".`,
      pedidosActualizados,
    })
  } catch (error: any) {
    console.error('[API Fusión Clientes] Error:', error)
    return NextResponse.json({ error: error.message || 'Error al fusionar clientes' }, { status: 500 })
  }
}

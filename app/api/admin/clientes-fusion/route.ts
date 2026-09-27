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
      clientesSecundarios,
      nombresSecundarios,
      telefonosSecundarios = []
    } = body

    if (!nombrePrincipal || typeof nombrePrincipal !== 'string' || !nombrePrincipal.trim()) {
      return NextResponse.json({ error: 'El nombre principal es obligatorio' }, { status: 400 })
    }

    // Normalizar lista de clientes secundarios a fusionar
    const secundariosNormalizados: Array<{ nombre: string; telefono: string }> = []

    if (Array.isArray(clientesSecundarios) && clientesSecundarios.length > 0) {
      clientesSecundarios.forEach((cs: any) => {
        if (cs && typeof cs === 'object') {
          secundariosNormalizados.push({
            nombre: String(cs.nombre || '').trim(),
            telefono: String(cs.telefono || '').trim()
          })
        }
      })
    } else if (Array.isArray(nombresSecundarios)) {
      nombresSecundarios.forEach((nom: any, idx: number) => {
        secundariosNormalizados.push({
          nombre: String(nom || '').trim(),
          telefono: String(telefonosSecundarios[idx] || '').trim()
        })
      })
    }

    if (secundariosNormalizados.length === 0) {
      return NextResponse.json({ error: 'Debe especificar al menos un cliente secundario a fusionar' }, { status: 400 })
    }

    const supabase = obtenerSupabaseAdmin()
    const nombreCanonico = nombrePrincipal.trim()
    const telCanonico = normalizarTelefonoArgentino(telefonoPrincipal) || String(telefonoPrincipal || '').trim()

    // 1. Reasignar pedidos históricos en la tabla 'pedidos'
    const idsParaActualizar = new Set<string>()

    for (const sec of secundariosNormalizados) {
      const secNom = sec.nombre
      const secTel = sec.telefono
      const secTelNorm = normalizarTelefonoArgentino(secTel)

      // A) Si el secundario tiene teléfono específico
      if (secTelNorm && secTelNorm.length >= 6) {
        const { data: porTel, error: errTel } = await supabase
          .from('pedidos')
          .select('id, cliente, telefono')
          .or(`telefono.eq.${secTel},telefono.eq.${secTelNorm}`)

        if (!errTel && porTel) {
          porTel.forEach(p => idsParaActualizar.add(p.id))
        }
      }

      // B) Si el secundario tiene nombre distinto al principal
      if (secNom && secNom.toLowerCase() !== nombreCanonico.toLowerCase()) {
        const { data: porNombre, error: errNom } = await supabase
          .from('pedidos')
          .select('id, cliente')
          .eq('cliente', secNom)

        if (!errNom && porNombre) {
          porNombre.forEach(p => idsParaActualizar.add(p.id))
        }
      }

      // C) Si el secundario no tiene teléfono o tiene el mismo nombre sin teléfono
      if (secNom && (!secTelNorm || secTelNorm.length < 6)) {
        const { data: sinTel, error: errSinTel } = await supabase
          .from('pedidos')
          .select('id, cliente, telefono')
          .eq('cliente', secNom)

        if (!errSinTel && sinTel) {
          sinTel.forEach(p => {
            const t = normalizarTelefonoArgentino(p.telefono)
            if (!t || t.length < 6 || p.telefono === 'Sin especificar') {
              idsParaActualizar.add(p.id)
            }
          })
        }
      }
    }

    let pedidosActualizados = 0

    if (idsParaActualizar.size > 0) {
      const ids = Array.from(idsParaActualizar)
      const payloadUpdate: any = {
        cliente: nombreCanonico,
      }
      if (telCanonico && telCanonico !== 'Sin especificar') {
        payloadUpdate.telefono = telCanonico
      }
      if (direccionPrincipal && direccionPrincipal !== 'Retiro / Consumo Local') {
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

    // 2. Unificar cuentas registradas en la tabla 'clientes' si existen
    const telefonosParaBuscar = Array.from(new Set(
      [
        telCanonico,
        ...secundariosNormalizados.map(s => normalizarTelefonoArgentino(s.telefono)),
        ...telefonosSecundarios.map((t: any) => normalizarTelefonoArgentino(t))
      ].filter((t: string) => t && t.length >= 8 && t !== 'Sin especificar')
    ))

    if (telefonosParaBuscar.length > 0) {
      const { data: cuentasMatch } = await supabase
        .from('clientes')
        .select('id, nombre, telefono, puntos_actuales')
        .in('telefono', telefonosParaBuscar)

      if (cuentasMatch && cuentasMatch.length > 1) {
        const principal = cuentasMatch.find(c => c.telefono === telCanonico) || cuentasMatch[0]
        const secundarias = cuentasMatch.filter(c => c.id !== principal.id)

        const sumaPuntosSecundarios = secundarias.reduce((acc, c) => acc + (Number(c.puntos_actuales) || 0), 0)
        const totalPuntosFinal = (Number(principal.puntos_actuales) || 0) + sumaPuntosSecundarios

        await supabase
          .from('clientes')
          .update({
            nombre: nombreCanonico,
            puntos_actuales: totalPuntosFinal,
          })
          .eq('id', principal.id)

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

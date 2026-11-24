import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

export interface NotaClienteCRM {
  claveCliente: string
  notaFija: string
  etiquetas: string[]
  nombreReferencia?: string
  telefonoReferencia?: string
  updatedAt?: string
}

const ID_FILA_FALLBACK_CRM = 99

function esErrorTablaInexistente(error: any): boolean {
  if (!error) return false
  const msg = String(error.message || '').toLowerCase()
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    msg.includes('clientes_crm_notas') && (msg.includes('does not exist') || msg.includes('schema cache'))
  )
}

/**
 * Obtiene todas las notas fijas y etiquetas CRM indexadas por claveCliente.
 * Usa la tabla dedicada `clientes_crm_notas` si existe; si aún no se aplicó la
 * migración, lee desde `configuracion_operativa` (id=99) sin romper nada.
 */
export async function obtenerMapaNotasCRM(): Promise<Record<string, NotaClienteCRM>> {
  const supabase = obtenerSupabaseAdmin()

  const { data, error } = await supabase
    .from('clientes_crm_notas')
    .select('clave_cliente, nota_fija, etiquetas, nombre_referencia, telefono_referencia, updated_at')

  if (!error && Array.isArray(data)) {
    const mapa: Record<string, NotaClienteCRM> = {}
    for (const fila of data) {
      if (!fila.clave_cliente) continue
      mapa[fila.clave_cliente] = {
        claveCliente: fila.clave_cliente,
        notaFija: fila.nota_fija || '',
        etiquetas: Array.isArray(fila.etiquetas) ? fila.etiquetas : [],
        nombreReferencia: fila.nombre_referencia || undefined,
        telefonoReferencia: fila.telefono_referencia || undefined,
        updatedAt: fila.updated_at || undefined,
      }
    }
    return mapa
  }

  if (error && !esErrorTablaInexistente(error)) {
    console.warn('[CRM Notas] Error leyendo tabla clientes_crm_notas:', error.message)
  }

  // Fallback seguro en configuracion_operativa (fila dedicada id=99)
  const { data: filaFallback } = await supabase
    .from('configuracion_operativa')
    .select('prioridades')
    .eq('id', ID_FILA_FALLBACK_CRM)
    .maybeSingle()

  const mapaFallback = (filaFallback?.prioridades as any)?.crmNotasClientes
  if (mapaFallback && typeof mapaFallback === 'object') {
    return mapaFallback as Record<string, NotaClienteCRM>
  }

  return {}
}

/**
 * Guarda o actualiza la nota fija y etiquetas de un cliente CRM.
 */
export async function guardarNotaCRM(entrada: NotaClienteCRM): Promise<NotaClienteCRM> {
  const supabase = obtenerSupabaseAdmin()
  const claveLimpia = entrada.claveCliente.trim()
  const notaLimpia = (entrada.notaFija || '').trim().slice(0, 500)
  const etiquetasLimpias = Array.from(
    new Set(
      (entrada.etiquetas || [])
        .map((t) => String(t).trim().slice(0, 32))
        .filter(Boolean)
    )
  ).slice(0, 10)

  const ahora = new Date().toISOString()
  const registroFinal: NotaClienteCRM = {
    claveCliente: claveLimpia,
    notaFija: notaLimpia,
    etiquetas: etiquetasLimpias,
    nombreReferencia: entrada.nombreReferencia?.trim() || undefined,
    telefonoReferencia: entrada.telefonoReferencia?.trim() || undefined,
    updatedAt: ahora,
  }

  const { error } = await supabase
    .from('clientes_crm_notas')
    .upsert(
      {
        clave_cliente: claveLimpia,
        nota_fija: notaLimpia,
        etiquetas: etiquetasLimpias,
        nombre_referencia: registroFinal.nombreReferencia || null,
        telefono_referencia: registroFinal.telefonoReferencia || null,
        updated_at: ahora,
      },
      { onConflict: 'clave_cliente' }
    )

  if (!error) {
    return registroFinal
  }

  if (!esErrorTablaInexistente(error)) {
    throw error
  }

  // Fallback seguro en configuracion_operativa (fila dedicada id=99)
  const { data: existente } = await supabase
    .from('configuracion_operativa')
    .select('prioridades')
    .eq('id', ID_FILA_FALLBACK_CRM)
    .maybeSingle()

  const prioridadesActuales = (existente?.prioridades as Record<string, any>) || {}
  const mapaActual: Record<string, NotaClienteCRM> = {
    ...(prioridadesActuales.crmNotasClientes || {}),
  }

  if (!notaLimpia && etiquetasLimpias.length === 0) {
    delete mapaActual[claveLimpia]
  } else {
    mapaActual[claveLimpia] = registroFinal
  }

  const { error: errFallback } = await supabase
    .from('configuracion_operativa')
    .upsert(
      {
        id: ID_FILA_FALLBACK_CRM,
        limites: {},
        prioridades: {
          ...prioridadesActuales,
          crmNotasClientes: mapaActual,
        },
        updated_at: ahora,
      },
      { onConflict: 'id' }
    )

  if (errFallback) {
    throw errFallback
  }

  return registroFinal
}

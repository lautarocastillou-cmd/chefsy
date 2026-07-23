import { supabase, supabaseAnon } from '@/lib/supabase'
import { Pedido } from '@/tipos'
import { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Obtiene todos los pedidos ordenados de forma descendente (más nuevos primero)
 * históricamente de una fecha específica.
 */
export async function obtenerPedidosHistoricos(fecha?: string): Promise<Pedido[]> {
  try {
    let query = supabaseAnon.from('pedidos').select('*')
    if (fecha) {
      query = query.eq('fecha', fecha)
    }
    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error en Supabase al obtener pedidos:', error.message)
      throw new Error(error.message)
    }

    return (data as Pedido[]) || []
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido al obtener pedidos'
    console.error('Error atrapado en la capa de servicios:', errorMessage)
    throw new Error(errorMessage)
  }
}

/**
 * Obtiene los pedidos activos de Supabase (no archivados)
 */
export async function obtenerPedidosActivos(limite = 100): Promise<Pedido[]> {
  const { data, error } = await supabaseAnon
    .from('pedidos')
    .select('*')
    .eq('archivado', false)
    .order('created_at', { ascending: false })
    .limit(limite)

  if (error) {
    console.error('[Servicio Pedidos] Error al obtener pedidos activos:', error.message)
    throw new Error(error.message)
  }

  return (data as Pedido[]) || []
}

/**
 * Inserta un pedido de forma local (optimista) en Supabase
 * Nota: Esto se usa para insertar desde el frontend. Para sincronización asíncrona,
 * se utiliza la API `/api/admin/pedidos`.
 */
export async function insertarPedidoLocal(payload: any): Promise<void> {
  const payloadCompleto = { ...payload, archivado: false }
  
  // Helper: timeout para evitar cuelgues silenciosos de red/RLS
  // Usamos Promise.resolve() para convertir PostgrestFilterBuilder (thenable) a Promise real
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conTimeout = (thenable: any, ms = 15000): Promise<any> =>
    Promise.race([
      Promise.resolve(thenable),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout: la operación tardó más de ${ms / 1000}s`)), ms)
      ),
    ])

  // 1. Ejecutar transacción de puntos si aplica
  if (payload.cliente_id && (payload.puntos_gastados > 0 || payload.puntos_ganados > 0)) {
    const { error: rpcError } = await conTimeout(
      supabase.rpc('procesar_compra_puntos', {
        p_cliente_id: payload.cliente_id,
        p_puntos_a_gastar: payload.puntos_gastados || 0,
        p_puntos_a_ganar: payload.puntos_ganados || 0
      })
    )
    
    if (rpcError) {
      console.error('[Servicio Pedidos] Error en RPC de puntos:', rpcError.message)
      throw new Error(`No se pudo procesar los puntos: ${rpcError.message}`)
    }
  }

  // 2. Insertar el pedido en sí
  const { error } = await conTimeout(
    supabase.from('pedidos').insert(payloadCompleto)
  )

  if (error) {
    console.error('[Servicio Pedidos] Error al insertar pedido:', error.message)
    throw new Error(error.message)
  }
}

/**
 * Suscribe a los cambios en la tabla de pedidos
 */
export function suscribirAPedidos(
  onInsertOrUpdate: (pedido: Pedido, archivado: boolean) => void,
  onDelete: (id: string) => void
): RealtimeChannel {
  return supabase
    .channel('tabla-pedidos')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pedidos' },
      (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const pedidoCrudo = payload.new as any
          onInsertOrUpdate(pedidoCrudo as Pedido, !!pedidoCrudo.archivado)
        } else if (payload.eventType === 'DELETE') {
          onDelete(payload.old.id)
        }
      }
    )
    .subscribe()
}

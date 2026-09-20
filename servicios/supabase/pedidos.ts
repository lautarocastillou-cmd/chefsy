import { supabase, supabaseAnon } from '@/lib/supabase'
import { Pedido, PuntoRutaBreadcrumb } from '@/tipos'
import { RealtimeChannel } from '@supabase/supabase-js'

// Columnas estándar para listados (excluye ruta_historial para no descargar miles de puntos GPS innecesariamente)
const COLUMNAS_PEDIDO_LISTA = 'id, cliente, telefono, tipoEntrega, direccion, coordenadas, productos, total, costoEnvio, distanciaKm, estado, metodoPago, observaciones, hora, fecha, created_at, cocina_at, listo_at, entregado_at, ubicacion_cadete, cadete_coordenadas, pago_confirmado, archivado, cadete_id, cadete_nombre, reparto_at, montoEfectivo, montoTransferencia, montoTarjeta, notificacion_manual, push_subscription, cliente_id, puntos_ganados, puntos_gastados, en_camino_at, orden_entrega'

/**
 * Obtiene todos los pedidos ordenados de forma descendente (más nuevos primero)
 * históricamente de una fecha específica.
 */
export async function obtenerPedidosHistoricos(fecha?: string): Promise<Pedido[]> {
  try {
    let query = supabaseAnon.from('pedidos').select(COLUMNAS_PEDIDO_LISTA)
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
    .select(COLUMNAS_PEDIDO_LISTA)
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
  // Usamos la API server-side en lugar de Supabase directo para bypassear RLS
  const res = await fetch('/api/tienda/pedido', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, archivado: false }),
  })

  if (!res.ok) {
    let mensaje = `Error HTTP ${res.status}`
    try {
      const data = await res.json()
      if (data?.error) mensaje = data.error
    } catch {}
    console.error('[insertarPedidoLocal] Error:', mensaje)
    throw new Error(mensaje)
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

/**
 * Obtiene el historial de ruta GPS real de un pedido específico.
 * Se consulta bajo demanda para no sobrecargar los listados principales.
 */
export async function obtenerRutaHistorialPedido(id: string): Promise<PuntoRutaBreadcrumb[] | null> {
  try {
    const { data, error } = await supabaseAnon
      .from('pedidos')
      .select('ruta_historial')
      .eq('id', id)
      .single()

    if (error || !data) return null
    return (data.ruta_historial as PuntoRutaBreadcrumb[]) || null
  } catch (err) {
    console.error('[obtenerRutaHistorialPedido] Error al obtener ruta:', err)
    return null
  }
}

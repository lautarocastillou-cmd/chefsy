import { CANAL_PEDIDOS, crearClienteEscucha, type TipoCambioPedido } from '@/lib/pedidos-broadcast'
import { Pedido, PuntoRutaBreadcrumb } from '@/tipos'
import { RealtimeChannel } from '@supabase/supabase-js'

// NOTA DE ARQUITECTURA (2026-09)
// Estas funciones ya NO leen `pedidos` desde el navegador. Antes usaban
// `supabaseAnon`, lo que significaba que la anon key —que viaja dentro del
// bundle, es pública por diseño— podía bajarse las 2.072 filas con `curl`,
// con nombre, teléfono y dirección de cada cliente.
//
// Ahora van por route handlers con service_role + sesión validada. Ver
// supabase/migrations/002_rls_pedidos.sql.

/**
 * Wrapper de fetch contra los route handlers de pedidos.
 * Centraliza el manejo de errores para no repetirlo en cada función.
 */
async function pedirJson<T>(url: string, etiqueta: string): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    // Las credenciales de sesión viajan en la cookie httpOnly que emite
    // /api/auth/login; sin esto el route handler la vería anónima.
    credentials: 'same-origin',
  })

  if (!res.ok) {
    let mensaje = `Error HTTP ${res.status}`
    try {
      const data = await res.json()
      if (data?.error) mensaje = data.error
    } catch {
      // respuesta sin cuerpo JSON: se queda el mensaje por defecto
    }
    throw new Error(`[${etiqueta}] ${mensaje}`)
  }

  return (await res.json()) as T
}

/**
 * Obtiene pedidos históricos (más recientes primero), opcionalmente de una
 * fecha concreta. Excluye turnos de prueba.
 */
export async function obtenerPedidosHistoricos(fecha?: string): Promise<Pedido[]> {
  const params = new URLSearchParams()
  if (fecha) params.set('fecha', fecha)

  const query = params.toString()
  const data = await pedirJson<{ pedidos: Pedido[] }>(
    `/api/admin/pedidos${query ? `?${query}` : ''}`,
    'obtenerPedidosHistoricos'
  )
  return data.pedidos || []
}

/**
 * Obtiene los pedidos activos (no archivados) para el kanban en vivo.
 */
export async function obtenerPedidosActivos(limite = 100): Promise<Pedido[]> {
  const data = await pedirJson<{ pedidos: Pedido[] }>(
    `/api/admin/pedidos?activos=1&limite=${limite}`,
    'obtenerPedidosActivos'
  )
  return data.pedidos || []
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
 * Suscribe a los cambios en la tabla de pedidos.
 *
 * ANTES: `postgres_changes`, que lee la tabla directamente desde el navegador
 * con la anon key. Con `pedidos` cerrada por RLS eso ya no es posible —
 * postgres_changes no pasa por route handlers, se autentica contra Postgres.
 *
 * AHORA: un canal `broadcast`. El servidor emite una señal mínima
 * ({id, tipo}, sin datos del cliente) por el endpoint de Realtime cuando
 * escribe un pedido, y el panel reactiona refetchendo por el route handler
 * autenticado. La señal no lleva PII; los datos vuelven por sesión.
 *
 * El payload se ignora a propósito: se dispara un refetch en vez de aplicar
 * el cambio, así que no hay forma de inyectar datos falsos por este canal.
 * El poll de SWR (refreshInterval) queda como red de contención.
 */
export function suscribirAPedidos(
  onCambio: (payload: { id: string; tipo: TipoCambioPedido }) => void
): RealtimeChannel | null {
  const cliente = crearClienteEscucha()
  if (!cliente) {
    console.warn('[Pedidos] Sin configuración de Supabase: se pierde la actualización en vivo.')
    return null
  }

  return cliente
    .channel(CANAL_PEDIDOS)
    .on('broadcast', { event: 'cambio' }, (mensaje) => {
      const payload = mensaje.payload as { id?: unknown; tipo?: unknown } | undefined
      if (!payload || typeof payload.id !== 'string') return
      const tipo = typeof payload.tipo === 'string' ? payload.tipo : 'update'
      onCambio({ id: payload.id, tipo: tipo as TipoCambioPedido })
    })
    .subscribe()
}

/**
 * Obtiene el historial de ruta GPS real de un pedido específico.
 * Se consulta bajo demanda para no sobrecargar los listados principales.
 */
export async function obtenerRutaHistorialPedido(id: string): Promise<PuntoRutaBreadcrumb[] | null> {
  try {
    const data = await pedirJson<{ ruta: PuntoRutaBreadcrumb[] | null }>(
      `/api/admin/pedidos/${encodeURIComponent(id)}/ruta`,
      'obtenerRutaHistorialPedido'
    )
    return data.ruta
  } catch (err) {
    console.error('[obtenerRutaHistorialPedido] Error al obtener ruta:', err)
    return null
  }
}

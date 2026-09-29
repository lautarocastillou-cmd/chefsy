// ─────────────────────────────────────────────────────
// app/api/admin/pedidos/route.ts
// Endpoint seguro para operaciones administrativas en pedidos.
// Valida sesión y ejecuta acciones usando service_role.
// ─────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { notificarCambioPedido, type TipoCambioPedido } from '@/lib/pedidos-broadcast'
import { enviarNotificacionCadete } from '@/lib/webpush'
import { registrarVentaKardex, restituirVentaKardex } from '@/lib/stock-motor'
import { obtenerFechaNegocio } from '@/lib/tiempo'

const TIPOS_ENTREGA_VALIDOS = ['delivery', 'retiro', 'mostrador', 'consumo_local']
const METODOS_PAGO_VALIDOS = ['efectivo', 'tarjeta', 'transferencia', 'sin_especificar', 'puntos']

function validarPedidoParaCrear(pedido: any): string | null {
  if (!pedido || typeof pedido !== 'object') return 'El pedido es requerido y debe ser un objeto.'
  if (!pedido.id || typeof pedido.id !== 'string' || !pedido.id.trim() || pedido.id.length > 64) {
    return 'ID de pedido inválido (máx 64 caracteres).'
  }
  if (!pedido.cliente || typeof pedido.cliente !== 'string' || !pedido.cliente.trim() || pedido.cliente.length > 120) {
    return 'Nombre del cliente requerido (máx 120 caracteres).'
  }
  if (pedido.telefono !== undefined && pedido.telefono !== null) {
    if (typeof pedido.telefono !== 'string' || pedido.telefono.length > 40) {
      return 'Teléfono inválido (máx 40 caracteres).'
    }
  }
  if (pedido.direccion !== undefined && pedido.direccion !== null) {
    if (typeof pedido.direccion !== 'string' || pedido.direccion.length > 300) {
      return 'Dirección inválida (máx 300 caracteres).'
    }
  }
  if (pedido.tipoEntrega && !TIPOS_ENTREGA_VALIDOS.includes(pedido.tipoEntrega)) {
    return `Tipo de entrega inválido. Permitidos: ${TIPOS_ENTREGA_VALIDOS.join(', ')}`
  }
  if (pedido.metodoPago && !METODOS_PAGO_VALIDOS.includes(pedido.metodoPago)) {
    return `Método de pago inválido. Permitidos: ${METODOS_PAGO_VALIDOS.join(', ')}`
  }
  const total = Number(pedido.total)
  if (isNaN(total) || !Number.isFinite(total) || total < 0 || total > 10000000) {
    return 'Total inválido (debe ser un número finito entre 0 y 10.000.000).'
  }
  if (pedido.costoEnvio !== undefined && pedido.costoEnvio !== null) {
    const envio = Number(pedido.costoEnvio)
    if (isNaN(envio) || !Number.isFinite(envio) || envio < 0 || envio > 500000) {
      return 'Costo de envío inválido (debe ser un número finito entre 0 y 500.000).'
    }
  }
  if (!Array.isArray(pedido.productos) || pedido.productos.length === 0) {
    return 'El pedido debe incluir al menos un producto.'
  }
  if (pedido.productos.length > 100) {
    return 'El pedido no puede exceder los 100 productos.'
  }
  for (let i = 0; i < pedido.productos.length; i++) {
    const p = pedido.productos[i]
    if (!p || typeof p !== 'object') return `Producto en posición ${i} inválido.`
    const cant = Number(p.cantidad)
    if (!Number.isInteger(cant) || cant < 1 || cant > 100) {
      return `Cantidad inválida para "${p.nombre || 'producto'}" (debe ser un entero entre 1 y 100).`
    }
    const precio = Number(p.precioUnitario ?? p.precio)
    if (isNaN(precio) || !Number.isFinite(precio) || precio < 0 || precio > 1000000) {
      return `Precio inválido para "${p.nombre || 'producto'}".`
    }
  }
  return null
}

function validarCoordenadas(coords: any): boolean {
  if (!coords || typeof coords !== 'object') return false
  const lat = Number(coords.latitud ?? coords.lat)
  const lng = Number(coords.longitud ?? coords.lng)
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

// Whitelist estricta contra Mass Assignment: solo columnas explícitas de la tabla pedidos
const CAMPOS_PERMITIDOS_PEDIDO = [
  'id',
  'cliente',
  'telefono',
  'tipoEntrega',
  'direccion',
  'coordenadas',
  'productos',
  'total',
  'costoEnvio',
  'distanciaKm',
  'estado',
  'metodoPago',
  'observaciones',
  'hora',
  'fecha',
  'pago_confirmado',
  'cadete_id',
  'cadete_nombre',
  'cadete_coordenadas',
  'montoEfectivo',
  'montoTransferencia',
  'montoTarjeta',
  'notificacion_manual',
  'cliente_id',
  'puntos_ganados',
  'puntos_gastados',
  'orden_entrega',
  'es_prueba',
  'turno_tipo'
] as const

function filtrarCamposPermitidos(origen: Record<string, any>): Record<string, any> {
  const limpio: Record<string, any> = {}
  for (const campo of CAMPOS_PERMITIDOS_PEDIDO) {
    if (campo in origen && origen[campo] !== undefined) {
      limpio[campo] = origen[campo]
    }
  }
  return limpio
}

// Columnas de listado. Mismas que COLUMNAS_PEDIDO_LISTA en
// servicios/supabase/pedidos.ts, y por el mismo motivo: no bajar
// `ruta_historial` (puede tener cientos de puntos) ni `push_subscription`.
const COLUMNAS_LISTA =
  'id, cliente, telefono, tipoEntrega, direccion, coordenadas, productos, total, costoEnvio, distanciaKm, estado, metodoPago, observaciones, hora, fecha, created_at, cocina_at, listo_at, entregado_at, ubicacion_cadete, cadete_coordenadas, pago_confirmado, archivado, cadete_id, cadete_nombre, reparto_at, montoEfectivo, montoTransferencia, montoTarjeta, notificacion_manual, cliente_id, puntos_ganados, puntos_gastados, en_camino_at, orden_entrega, es_prueba, turno_tipo'

/**
 * GET — Lecturas de `pedidos` desde el servidor.
 *
 * Existe porque `pedidos` se cierra a `anon` por RLS: contiene nombre,
 * teléfono, dirección y detalle de compra de cada cliente. Antes de esta
 * migración el navegador la leía directo con la anon key y cualquiera con
 * `curl` se bajaba las 2.072 filas.
 *
 * Este handler corre con service_role (que saltea RLS) y solo responde a
 * usuarios autenticados. Por eso devuelve los datos crudos del pedido sin
 * enmascarar: quien llega acá ya pasó el control de sesión.
 *
 * Parámetros:
 *   ?activos=1&limite=100   → pedidos no archivados, para el kanban en vivo
 *   ?fecha=YYYY-MM-DD      → pedidos de una fecha, para el histórico
 *   (sin params)            → histórico completo, para la agenda de clientes
 */
export async function GET(request: Request) {
  try {
    const sesion = await obtenerSesion()
    if (!sesion) {
      return NextResponse.json({ error: 'Acceso denegado. No autenticado.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const soloActivos = searchParams.get('activos') === '1'
    const fecha = searchParams.get('fecha')
    const limiteParam = parseInt(searchParams.get('limite') || '', 10)

    if (fecha !== null && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return NextResponse.json(
        { error: 'Parámetro fecha inválido. Se espera YYYY-MM-DD.' },
        { status: 400 }
      )
    }

    // Tope duro: sin esto, ?limite=999999 dripa la tabla entera.
    const limite = soloActivos
      ? Math.min(Number.isFinite(limiteParam) && limiteParam > 0 ? limiteParam : 100, 200)
      : 2000

    const supabase = obtenerSupabaseAdmin()

    let query = supabase
      .from('pedidos')
      .select(COLUMNAS_LISTA)
      .neq('es_prueba', true)
      .neq('turno_tipo', 'prueba')

    if (soloActivos) {
      query = query.eq('archivado', false)
    }
    if (fecha) {
      query = query.eq('fecha', fecha)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limite)

    if (error) throw error

    return NextResponse.json({ pedidos: data || [] })
  } catch (error) {
    console.error('[API Pedidos GET] Error:', error)
    // No se filtra error.message al cliente: puede traer nombres de tabla,
    // columnas o fragmentos de consulta.
    return NextResponse.json({ error: 'Error interno al obtener los pedidos.' }, { status: 500 })
  }
}

/**
 * Envuelve al manejador real para emitir la señal de "cambio en pedidos".
 *
 * Se hace acá y no dentro de cada `case` del switch a propósito: hay más de
 * diez acciones que escriben en la tabla (crear, editar, cambiar_estado,
 * confirmar_pago, archivar, archivar_lote, asignar_cadete, cobrar, ...), y
 * emitir en cada return es un lugar fácil de olvidar. Acá hay un solo punto
 * de salida y es imposible saltearlo.
 *
 * El payload va mínimo a propósito: ver lib/pedidos-broadcast.ts.
 */
export async function POST(request: Request) {
  // Se clona porque el manejador interno consume el body con request.json().
  let idPedido: string | null = null
  let tipo: TipoCambioPedido = 'update'
  try {
    const previo: any = await request.clone().json()
    idPedido = typeof previo?.pedido?.id === 'string' ? previo.pedido.id
      : typeof previo?.id === 'string' ? previo.id
      : null
    if (previo?.accion === 'crear') tipo = 'insert'
    if (previo?.accion === 'archivar' || previo?.accion === 'archivar_lote') tipo = 'archive'
  } catch {
    // Body ilegible: lo va a rechazar el manejador interno con un 400 claro.
  }

  const respuesta = await procesarPOST(request)

  // Solo se avisa si la operación salió bien. Un 4xx/5xx no cambió nada
  // y avisar haría refetchear al panel para nada.
  if (respuesta.ok && idPedido) {    await notificarCambioPedido(idPedido, tipo)
  }

  return respuesta
}

async function procesarPOST(request: Request) {
  // 1. Validar sesión en el servidor
  const sesion = await obtenerSesion()
  if (!sesion) {
    return NextResponse.json(
      { error: 'Acceso denegado. No autenticado.' },
      { status: 401 }
    )
  }

  const { rol } = sesion

  let body: any = null
  try {
    body = await request.json()
    const { accion } = body

    if (!accion) {
      return NextResponse.json(
        { error: 'Acción no especificada.' },
        { status: 400 }
      )
    }

    // 2. Obtener el cliente de Supabase administrativo (singleton — se reutiliza entre requests)
    const supabaseAdmin = obtenerSupabaseAdmin()

    // 3. Procesar acciones con validación de roles
    switch (accion) {
      case 'crear': {
        if (rol !== 'admin' && rol !== 'cajero') {
          return NextResponse.json({ error: 'Operación reservada para personal autorizado.' }, { status: 403 })
        }

        const { pedido } = body
        const errorVal = validarPedidoParaCrear(pedido)
        if (errorVal) {
          return NextResponse.json({ error: errorVal }, { status: 400 })
        }

        // Sanitización estricta por whitelist contra Mass Assignment
        const payload: any = {
          ...filtrarCamposPermitidos(pedido),
          archivado: false,
        }

        // 1. Ejecutar transacción de puntos si aplica (solo para pedidos reales, nunca en turnos de prueba)
        const esPedidoPrueba = Boolean(payload.es_prueba) || payload.turno_tipo === 'prueba'
        if (!esPedidoPrueba && payload.cliente_id && (payload.puntos_gastados > 0 || payload.puntos_ganados > 0)) {
          const puntosAGastar = Math.max(0, Math.min(Number(payload.puntos_gastados) || 0, 50000))
          // Máximo de puntos ganables limitado al 20% del total para prevenir inyección de saldo infinito
          const maxPuntosGanables = Math.max(10, Math.floor((Number(payload.total) || 0) * 0.2))
          const puntosAGanar = Math.max(0, Math.min(Number(payload.puntos_ganados) || 0, maxPuntosGanables))

          const { error: rpcError } = await supabaseAdmin.rpc('procesar_compra_puntos', {
            p_cliente_id: payload.cliente_id,
            p_puntos_a_gastar: puntosAGastar,
            p_puntos_a_ganar: puntosAGanar
          })
          
          if (rpcError) {
            console.error('[API Pedidos] Error en RPC de puntos:', rpcError.message)
            return NextResponse.json({ error: `Error procesando puntos: ${rpcError.message}` }, { status: 500 })
          }
        }

        let { error } = await supabaseAdmin
          .from('pedidos')
          .insert(payload)

        if (error) {
          console.error('[API Pedidos] Error al insertar pedido:', error)
          throw error
        }

        return NextResponse.json({ ok: true })
      }

      case 'editar': {
        if (rol !== 'admin' && rol !== 'cajero') {
          return NextResponse.json({ error: 'Operación reservada para personal autorizado.' }, { status: 403 })
        }

        const { id, pedido } = body
        if (!id || typeof id !== 'string' || !id.trim() || id.length > 64 || !pedido || typeof pedido !== 'object') {
          return NextResponse.json({ error: 'Datos incompletos para editar.' }, { status: 400 })
        }

        if (pedido.total !== undefined) {
          const t = Number(pedido.total)
          if (isNaN(t) || !Number.isFinite(t) || t < 0 || t > 10000000) {
            return NextResponse.json({ error: 'Total inválido.' }, { status: 400 })
          }
        }
        if (pedido.costoEnvio !== undefined && pedido.costoEnvio !== null) {
          const e = Number(pedido.costoEnvio)
          if (isNaN(e) || !Number.isFinite(e) || e < 0 || e > 500000) {
            return NextResponse.json({ error: 'Costo de envío inválido.' }, { status: 400 })
          }
        }
        if (pedido.tipoEntrega && !TIPOS_ENTREGA_VALIDOS.includes(pedido.tipoEntrega)) {
          return NextResponse.json({ error: 'Tipo de entrega inválido.' }, { status: 400 })
        }
        if (pedido.metodoPago && !METODOS_PAGO_VALIDOS.includes(pedido.metodoPago)) {
          return NextResponse.json({ error: 'Método de pago inválido.' }, { status: 400 })
        }

        // Sanitización estricta por whitelist contra Mass Assignment
        const payload = filtrarCamposPermitidos(pedido)
        delete payload.id

        if (Object.keys(payload).length === 0) {
          return NextResponse.json({ error: 'No se enviaron campos válidos para actualizar.' }, { status: 400 })
        }

        const { error } = await supabaseAdmin
          .from('pedidos')
          .update(payload)
          .eq('id', id)

        if (error) throw error
        return NextResponse.json({ ok: true })
      }

      case 'actualizar_estado': {
        const { id, estado, cocina_at, listo_at, entregado_at, en_camino_at } = body
        if (!id || !estado) {
          return NextResponse.json({ error: 'Datos incompletos para actualizar_estado.' }, { status: 400 })
        }

        const ESTADOS_VALIDOS = ['nuevo', 'en_cocina', 'listo', 'en_camino', 'entregado', 'cancelado']
        if (!ESTADOS_VALIDOS.includes(estado)) {
          return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 })
        }

        // Un cadete puede cambiar a "listo", "en_camino" o "entregado"
        if (rol === 'cadete' && !['listo', 'en_camino', 'entregado'].includes(estado)) {
          return NextResponse.json({ error: 'Operación no permitida para el rol de cadete.' }, { status: 403 })
        }

        const updatePayload: any = { estado }
        if (cocina_at !== undefined) updatePayload.cocina_at = cocina_at
        if (listo_at !== undefined) updatePayload.listo_at = listo_at
        if (entregado_at !== undefined) updatePayload.entregado_at = entregado_at
        if (en_camino_at !== undefined) updatePayload.en_camino_at = en_camino_at
        if (estado === 'en_camino' && en_camino_at === undefined) updatePayload.en_camino_at = new Date().toISOString()

        // Limpiar coordenadas del cadete automáticamente al finalizar la entrega
        if (estado === 'entregado') {
          updatePayload.cadete_coordenadas = null
        }

        // Obtener estado anterior para evitar doble descuento y obtener cadete_id
        const { data: pedidoPrevio } = await supabaseAdmin
          .from('pedidos')
          .select('estado, cadete_id')
          .eq('id', id)
          .single()

        if (estado === 'en_camino' && pedidoPrevio?.cadete_id) {
          const { data: cadeteInfo } = await supabaseAdmin
            .from('cadetes')
            .select('lat, lng')
            .ilike('id', pedidoPrevio.cadete_id)
            .maybeSingle()

          if (cadeteInfo && cadeteInfo.lat != null && cadeteInfo.lng != null) {
            updatePayload.cadete_coordenadas = { latitud: cadeteInfo.lat, longitud: cadeteInfo.lng }
          }
        }

        // C4: Una sola query — update + select en la misma operación
        const { data: updateData, error } = await supabaseAdmin
          .from('pedidos')
          .update(updatePayload)
          .eq('id', id)
          .select('id, cadete_id, tipoEntrega, cliente, productos')

        if (error) throw error
        
        const pedidoAct = updateData && updateData.length > 0 ? updateData[0] : null
        
        if (!pedidoAct) {
          console.warn(`[API Pedidos] El update no devolvió filas para el pedido ${id}. Fila inexistente.`)
          return NextResponse.json(
            { error: 'El pedido no existe en la base de datos (quizás fue eliminado o nunca se sincronizó).' },
            { status: 404 }
          )
        }

        // Descontar stock y asentar en Kardex cuando pasa a "entregado" (y antes no lo era)
        if (pedidoPrevio?.estado !== 'entregado' && estado === 'entregado' && pedidoAct?.productos) {
          const productosVendidos = pedidoAct.productos.map((p: any) => ({
            idCatalogo: p.idCatalogo,
            id: p.id,
            cantidad: p.cantidad,
            nombre: p.nombre
          })).filter((p: any) => p.idCatalogo || p.id)

          if (productosVendidos.length > 0) {
            await registrarVentaKardex(productosVendidos, id, pedidoAct.cliente)
          }
        }

        // Restituir stock y asentar en Kardex cuando deja de ser "entregado" (ej. pasa a cancelado o nuevo)
        if (pedidoPrevio?.estado === 'entregado' && estado !== 'entregado' && pedidoAct?.productos) {
          const productosDevueltos = pedidoAct.productos.map((p: any) => ({
            idCatalogo: p.idCatalogo,
            id: p.id,
            cantidad: p.cantidad,
            nombre: p.nombre
          })).filter((p: any) => p.idCatalogo || p.id)

          if (productosDevueltos.length > 0) {
            await restituirVentaKardex(productosDevueltos, id, pedidoAct.cliente)
          }
        }

        // Notificar al cadete si el pedido es delivery y está listo
        // Usamos pedidoAct directamente — sin segunda query a la base de datos
        if (estado === 'listo' && pedidoAct?.cadete_id && pedidoAct?.tipoEntrega === 'delivery') {
          await enviarNotificacionCadete(
            pedidoAct.cadete_id,
            '¡Pedido Listo para Retirar!',
            `Tu pedido #${(pedidoAct?.id || id || '').slice(-4).toUpperCase()} ya está listo en el local para que pases a buscarlo. ¡Te esperamos!`
          )
        }

        return NextResponse.json({ ok: true })
      }

      case 'confirmar_pago': {
        if (rol !== 'admin' && rol !== 'cajero') {
          return NextResponse.json({ error: 'Operación reservada para personal autorizado.' }, { status: 403 })
        }

        const { id, pago_confirmado } = body
        if (!id || pago_confirmado === undefined) {
          return NextResponse.json({ error: 'Datos incompletos para confirmar_pago.' }, { status: 400 })
        }

        const { error } = await supabaseAdmin
          .from('pedidos')
          .update({ pago_confirmado })
          .eq('id', id)

        if (error) throw error
        return NextResponse.json({ ok: true })
      }

      case 'eliminar': {
        if (rol !== 'admin') {
          return NextResponse.json({ error: 'Operación reservada para administradores.' }, { status: 403 })
        }

        const { id } = body
        if (!id) {
          return NextResponse.json({ error: 'ID de pedido no provisto.' }, { status: 400 })
        }

        // Obtener pedido antes de eliminar para restituir stock si aplica
        const { data: pedidoEliminar } = await supabaseAdmin
          .from('pedidos')
          .select('estado, productos')
          .eq('id', id)
          .single()

        const { error } = await supabaseAdmin
          .from('pedidos')
          .delete()
          .eq('id', id)

        if (error) throw error

        // Restituir stock si el pedido eliminado estaba en estado "entregado"
        if (pedidoEliminar?.estado === 'entregado' && pedidoEliminar?.productos) {
          const productosDevueltos = pedidoEliminar.productos.map((p: any) => ({
            idCatalogo: p.idCatalogo,
            id: p.id,
            cantidad: p.cantidad,
            nombre: p.nombre
          })).filter((p: any) => p.idCatalogo || p.id)

          if (productosDevueltos.length > 0) {
            await restituirVentaKardex(productosDevueltos, id)
          }
        }

        return NextResponse.json({ ok: true })
      }

      case 'finalizar_turno': {
        if (rol !== 'admin') {
          return NextResponse.json({ error: 'Operación reservada para administradores.' }, { status: 403 })
        }

        const { ids, snapshot } = body
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
          return NextResponse.json({ error: 'IDs de pedidos no provistos o vacíos.' }, { status: 400 })
        }

        // 1. Archivar los pedidos inmediatamente (limpiar panel)
        const { error: errorArchivar } = await supabaseAdmin
          .from('pedidos')
          .update({ archivado: true })
          .in('id', ids)

        if (errorArchivar) throw errorArchivar

        // 2. FUSIONAR Y CONSOLIDAR EL CIERRE COMPLETO DEL TURNO EN CIERRES_DIARIOS
        try {
          // Obtener fecha de negocio de Argentina (YYYY-MM-DD)
          const fechaStr = snapshot?.fecha || obtenerFechaNegocio()

          const turnoTipo = snapshot?.turno_tipo || 'noche'

          // Si es un turno de prueba, cerramos el turno inmediatamente sin tocar cierres_diarios
          if (turnoTipo === 'prueba') {
            await supabaseAdmin
              .from('turnos')
              .update({ activo: false, tipo_turno: 'noche' })
              .eq('id', 1)

            return NextResponse.json({ ok: true, es_prueba: true, mensaje: 'Turno de prueba finalizado sin afectar historial ni métricas.' })
          }

          // Consultar pedidos de hoy en la base de datos para consolidar (excluyendo estrictamente pedidos de prueba)
          const { data: pedidosDelDia } = await supabaseAdmin
            .from('pedidos')
            .select('id, estado, total, costoEnvio, metodoPago, tipoEntrega, es_prueba, turno_tipo')
            .eq('fecha', fechaStr)
            .neq('es_prueba', true)
            .neq('turno_tipo', 'prueba')

          if (pedidosDelDia && pedidosDelDia.length > 0) {
            // En servicio exclusivamente nocturno, todos los pedidos de la fecha corresponden a este turno
            const pedidosDelTurno = pedidosDelDia

            const validos = pedidosDelTurno.filter((p: any) => p.estado !== 'cancelado')
            let facturacion_neta = validos.reduce((acc: number, p: any) => acc + (p.total - (p.costoEnvio || 0)), 0)
            let efectivo_ventas = validos.reduce((acc: number, p: any) => acc + (p.metodoPago === 'efectivo' ? p.total : 0), 0)
            const tarjeta_total = validos.reduce((acc: number, p: any) => acc + (p.metodoPago === 'tarjeta' ? p.total : 0), 0)
            const transferencia_total = validos.reduce((acc: number, p: any) => acc + (p.metodoPago === 'transferencia' ? p.total : 0), 0)

            // Sumar consumos del personal pagados en el acto
            try {
              const { data: consumosDb } = await supabaseAdmin
                .from('consumos_personal')
                .select('total, precio, cantidad, tipo_pago, fecha')
                .eq('tipo_pago', 'pagado')

              if (consumosDb && consumosDb.length > 0) {
                const totalConsumosPagados = consumosDb
                  .filter((c: any) => {
                    return obtenerFechaNegocio(new Date(c.fecha)) === fechaStr
                  })
                  .reduce((acc: number, c: any) => acc + (c.total || c.precio * c.cantidad || 0), 0)

                facturacion_neta += totalConsumosPagados
                efectivo_ventas += totalConsumosPagados
              }
            } catch (errConsumos) {
              console.error('[API Cierre Diario] Error sumando consumos:', errConsumos)
            }

            const caja_inicial = snapshot?.caja_inicial || 0
            const efectivo_rendir = caja_inicial + efectivo_ventas
            const total_pedidos = validos.length
            const ticket_promedio = total_pedidos > 0 ? facturacion_neta / total_pedidos : 0

            const total_envios_delivery = validos.filter((p: any) => p.tipoEntrega === 'delivery').length
            const costo_envios_cadetes = validos
              .filter((p: any) => p.tipoEntrega === 'delivery')
              .reduce((acc: number, p: any) => acc + (p.costoEnvio || 0), 0)
            const total_retiros = validos.filter((p: any) => p.tipoEntrega === 'retiro').length
            const total_consumo_local = validos.filter((p: any) => p.tipoEntrega === 'consumo_local').length

            const cancelados = pedidosDelTurno.filter((p: any) => p.estado === 'cancelado')
            const pedidos_cancelados = cancelados.length
            const monto_cancelados = cancelados.reduce((acc: number, p: any) => acc + p.total, 0)

            const snapshotConsolidado = {
              fecha: fechaStr,
              turno_tipo: turnoTipo,
              facturacion_neta,
              efectivo_ventas,
              caja_inicial,
              efectivo_rendir,
              tarjeta_total,
              transferencia_total,
              total_pedidos,
              total_envios_delivery,
              costo_envios_cadetes,
              total_retiros,
              total_consumo_local,
              ticket_promedio,
              pedidos_cancelados,
              monto_cancelados,
            }

            // Guardar o actualizar registro de cierre para esta fecha y turno atómicamente
            await supabaseAdmin
              .from('cierres_diarios')
              .upsert(snapshotConsolidado, { onConflict: 'fecha,turno_tipo' })

            // Desactivar el turno activo para que el próximo turno inicie limpio
            await supabaseAdmin
              .from('turnos')
              .update({ activo: false })
              .eq('id', 1)
          }
        } catch (errCierre) {
          console.error('[API Cierre Diario] Error al consolidar snapshot:', errCierre)
        }

        return NextResponse.json({ ok: true })
      }

      case 'actualizar_gps': {
        // Permitido para cadetes y administradores
        const { ids, cadete_coordenadas } = body
        if (!ids || !Array.isArray(ids) || ids.length === 0 || ids.length > 50 || !validarCoordenadas(cadete_coordenadas)) {
          return NextResponse.json({ error: 'Datos de coordenadas o lista de IDs inválida.' }, { status: 400 })
        }

        let query = supabaseAdmin
          .from('pedidos')
          .update({ cadete_coordenadas })
          .in('id', ids)

        // Seguridad estricta: si es cadete, solo puede inyectar GPS en sus propios pedidos
        if (rol === 'cadete') {
          query = query.eq('cadete_id', sesion.usuario)
        }

        const { error } = await query

        if (error) throw error
        return NextResponse.json({ ok: true })
      }

      case 'asignar_cadete': {
        if (rol !== 'admin' && rol !== 'cajero') {
          return NextResponse.json({ error: 'Operación reservada para personal autorizado.' }, { status: 403 })
        }

        const { id, cadete_id, cadete_nombre } = body
        if (!id || typeof id !== 'string' || !id.trim() || id.length > 64) {
          return NextResponse.json({ error: 'ID de pedido no provisto o inválido.' }, { status: 400 })
        }
        if (cadete_id && (typeof cadete_id !== 'string' || cadete_id.length > 64)) {
          return NextResponse.json({ error: 'ID de cadete inválido.' }, { status: 400 })
        }
        if (cadete_nombre && (typeof cadete_nombre !== 'string' || cadete_nombre.length > 100)) {
          return NextResponse.json({ error: 'Nombre de cadete inválido.' }, { status: 400 })
        }

        const { data: updateData, error } = await supabaseAdmin
          .from('pedidos')
          .update({ cadete_id: cadete_id || null, cadete_nombre: cadete_nombre || null })
          .eq('id', id)
          .select('cliente')

        if (error) throw error

        const pedidoAct = updateData && updateData.length > 0 ? updateData[0] : null

        if (cadete_id && pedidoAct) {
          enviarNotificacionCadete(
            cadete_id,
            'Nuevo Pedido Asignado',
            `Se te ha asignado el pedido de ${pedidoAct.cliente || 'un cliente'}.`
          ).catch((err) => console.error('[Push Cadete] Error enviando notificación:', err))
        }

        return NextResponse.json({ ok: true })
      }

      case 'cambiar_metodo_pago': {
        if (rol !== 'admin' && rol !== 'cajero') {
          return NextResponse.json({ error: 'Operación reservada para personal autorizado.' }, { status: 403 })
        }

        const { id, metodoPago } = body
        if (!id || typeof id !== 'string' || !id.trim() || id.length > 64) {
          return NextResponse.json({ error: 'ID de pedido inválido.' }, { status: 400 })
        }
        if (!metodoPago || !METODOS_PAGO_VALIDOS.includes(metodoPago)) {
          return NextResponse.json({ error: `Método de pago inválido. Permitidos: ${METODOS_PAGO_VALIDOS.join(', ')}` }, { status: 400 })
        }

        const { error } = await supabaseAdmin
          .from('pedidos')
          .update({ metodoPago })
          .eq('id', id)

        if (error) throw error
        return NextResponse.json({ ok: true })
      }

      case 'actualizar_orden_entrega': {
        if (rol !== 'admin' && rol !== 'cajero' && rol !== 'cadete') {
          return NextResponse.json({ error: 'Operación no autorizada.' }, { status: 403 })
        }
        const { id, orden_entrega } = body
        if (!id) {
          return NextResponse.json({ error: 'ID de pedido requerido.' }, { status: 400 })
        }
        let query = supabaseAdmin
          .from('pedidos')
          .update({ orden_entrega: orden_entrega ?? null })
          .eq('id', id)

        // Seguridad estricta: un cadete solo puede reordenar sus propios pedidos asignados
        if (rol === 'cadete') {
          query = query.eq('cadete_id', sesion.usuario)
        }

        const { error } = await query
        if (error) throw error
        return NextResponse.json({ ok: true })
      }

      case 'actualizar_ordenes_cadete': {
        if (rol !== 'admin' && rol !== 'cajero' && rol !== 'cadete') {
          return NextResponse.json({ error: 'Operación no autorizada.' }, { status: 403 })
        }
        const { pedidosOrdenados } = body
        if (!Array.isArray(pedidosOrdenados)) {
          return NextResponse.json({ error: 'pedidosOrdenados inválido.' }, { status: 400 })
        }
        await Promise.all(
          pedidosOrdenados
            .filter((item: any) => !!item?.id)
            .map((item: any) => {
              let query = supabaseAdmin
                .from('pedidos')
                .update({ orden_entrega: item.orden_entrega ?? null })
                .eq('id', item.id)
              if (rol === 'cadete') {
                query = query.eq('cadete_id', sesion.usuario)
              }
              return query
            })
        )
        return NextResponse.json({ ok: true })
      }

      default:
        return NextResponse.json(
          { error: `Acción '${accion}' no válida.` },
          { status: 400 }
        )
    }
  } catch (error: any) {
    console.error(`[API Pedidos] Error al procesar acción '${body?.accion}':`, error)
    return NextResponse.json(
      { error: `Error interno: ${error?.message || 'Error desconocido'}` },
      { status: 500 }
    )
  }
}

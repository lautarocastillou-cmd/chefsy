import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Cargar .env.local
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8')
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+?)[=:](.*)/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/['"]/g, '')
      process.env[key] = value
    }
  })
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Faltan credenciales de Supabase')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

function determinarTurnoYFecha(p: any): { fecha: string; turno: 'mediodia' | 'noche' } {
  let fecha = p.fecha
  if (!fecha && p.created_at) {
    const d = new Date(p.created_at)
    const dArg = new Date(d.getTime() - 3 * 3600000)
    if (dArg.getHours() < 5) {
      dArg.setDate(dArg.getDate() - 1)
    }
    fecha = dArg.toISOString().split('T')[0]
  }

  let turno: 'mediodia' | 'noche' = 'noche'
  if (p.turno_tipo === 'mediodia' || p.turno_tipo === 'noche') {
    turno = p.turno_tipo
  } else if (p.hora) {
    const esPM = /p\.?\s*m\.?|pm/i.test(p.hora)
    const esAM = /a\.?\s*m\.?|am/i.test(p.hora)
    const numStr = p.hora.replace(/[^0-9:]/g, '').split(':')[0]
    let h = Number(numStr) || 0
    if (esPM && h < 12) h += 12
    else if (esAM && h === 12) h = 0
    turno = h >= 10 && h < 16 ? 'mediodia' : 'noche'
  } else if (p.created_at) {
    const d = new Date(p.created_at)
    const dArg = new Date(d.getTime() - 3 * 3600000)
    const h = dArg.getHours()
    turno = h >= 10 && h < 16 ? 'mediodia' : 'noche'
  }

  return { fecha, turno }
}

async function sincronizarCierres() {
  console.log('Obteniendo pedidos de Supabase...')
  let pedidos: any[] = []
  let from = 0
  const step = 1000

  while (true) {
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .order('created_at', { ascending: true })
      .range(from, from + step - 1)

    if (error) {
      console.error('Error fetching pedidos:', error)
      return
    }

    if (!data || data.length === 0) break
    pedidos = pedidos.concat(data)
    console.log(`Descargados ${pedidos.length} pedidos...`)
    if (data.length < step) break
    from += step
  }

  console.log(`Se encontraron ${pedidos.length} pedidos. Agrupando por fecha y turno...`)

  const { data: cierresExistentes } = await supabase
    .from('cierres_diarios')
    .select('fecha, turno_tipo, caja_inicial')

  const mapaCajaInicial = new Map<string, number>()
  if (cierresExistentes) {
    cierresExistentes.forEach((c: any) => {
      const k = `${c.fecha}_${c.turno_tipo || 'noche'}`
      if (c.caja_inicial) mapaCajaInicial.set(k, Number(c.caja_inicial))
    })
  }

  const grupos: Record<string, { fecha: string; turno: 'mediodia' | 'noche'; pedidos: any[] }> = {}

  pedidos.forEach(p => {
    const { fecha, turno } = determinarTurnoYFecha(p)
    if (!fecha) return

    const key = `${fecha}_${turno}`
    if (!grupos[key]) {
      grupos[key] = { fecha, turno, pedidos: [] }
    }
    grupos[key].pedidos.push(p)
  })

  console.log(`Se identificaron ${Object.keys(grupos).length} turnos históricos. Calculando métricas...`)

  let guardados = 0

  for (const [key, grupo] of Object.entries(grupos)) {
    const { fecha, turno, pedidos: lista } = grupo
    const validos = lista.filter(p => p.estado !== 'cancelado')

    const facturacion_neta = validos.reduce((acc, p) => acc + (Number(p.total) - (Number(p.costoEnvio) || 0)), 0)

    const obtenerMontoMetodo = (p: any, m: string) => (p.metodoPago === m ? Number(p.total) : 0)
    const efectivo_ventas = validos.reduce((acc, p) => acc + obtenerMontoMetodo(p, 'efectivo'), 0)
    const tarjeta_total = validos.reduce((acc, p) => acc + obtenerMontoMetodo(p, 'tarjeta'), 0)
    const transferencia_total = validos.reduce((acc, p) => acc + obtenerMontoMetodo(p, 'transferencia'), 0)

    const caja_inicial = mapaCajaInicial.get(key) || 0
    const efectivo_rendir = caja_inicial + efectivo_ventas
    const total_pedidos = validos.length
    const ticket_promedio = total_pedidos > 0 ? facturacion_neta / total_pedidos : 0

    const total_envios_delivery = validos.filter(p => p.tipoEntrega === 'delivery').length
    const costo_envios_cadetes = validos
      .filter(p => p.tipoEntrega === 'delivery')
      .reduce((acc, p) => acc + (Number(p.costoEnvio) || 0), 0)
    const total_retiros = validos.filter(p => p.tipoEntrega === 'retiro').length
    const total_consumo_local = validos.filter(p => p.tipoEntrega === 'consumo_local').length

    const cancelados = lista.filter(p => p.estado === 'cancelado')
    const pedidos_cancelados = cancelados.length
    const monto_cancelados = cancelados.reduce((acc, p) => acc + Number(p.total), 0)

    const payload = {
      fecha,
      turno_tipo: turno,
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

    const { error: errUpsert } = await supabase
      .from('cierres_diarios')
      .upsert(payload, { onConflict: 'fecha,turno_tipo' })

    if (errUpsert) {
      console.error(`Error al guardar cierre ${key}:`, errUpsert.message)
    } else {
      guardados++
    }
  }

  console.log(`¡Completado! Se consolidaron exitosamente ${guardados} cierres (mediodía y noche).`)
}

sincronizarCierres()

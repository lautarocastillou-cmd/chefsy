import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Cargar .env.local manualmente
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
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Faltan credenciales de Supabase')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

// Lógica de fecha de negocio
function obtenerFechaNegocio(fechaReferencia: Date): string {
  const ahora = new Date(fechaReferencia)
  if (ahora.getHours() < 5) {
    ahora.setDate(ahora.getDate() - 1)
  }
  const anio = ahora.getFullYear()
  const mes = String(ahora.getMonth() + 1).padStart(2, '0')
  const dia = String(ahora.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

async function migrar() {
  console.log('Obteniendo pedidos de Supabase...')
  const { data: pedidos, error } = await supabase
    .from('pedidos')
    .select('*')
  
  if (error) {
    console.error('Error fetching pedidos:', error)
    return
  }

  console.log(`Se encontraron ${pedidos.length} pedidos. Agrupando por fecha...`)

  const pedidosPorFecha: Record<string, any[]> = {}

  pedidos.forEach(p => {
    // Solo consideramos archivados, que son los que ya terminaron su turno.
    if (!p.archivado) return;

    const fechaNegocio = obtenerFechaNegocio(new Date(p.created_at))
    if (!pedidosPorFecha[fechaNegocio]) {
      pedidosPorFecha[fechaNegocio] = []
    }
    pedidosPorFecha[fechaNegocio].push(p)
  })

  const fechas = Object.keys(pedidosPorFecha)
  console.log(`Se encontraron ${fechas.length} días de negocio archivados. Calculando cierres...`)

  let upsertados = 0

  for (const fecha of fechas) {
    const pedidosDia = pedidosPorFecha[fecha]
    const validos = pedidosDia.filter((p) => p.estado !== 'cancelado')
    
    const facturacion_neta = validos.reduce((acc, p) => acc + (Number(p.total) - (Number(p.costoEnvio) || 0)), 0)
    
    const obtenerMontoMetodo = (p: any, m: string) => p.metodoPago === m ? Number(p.total) : 0
    const efectivo_ventas = validos.reduce((acc, p) => acc + obtenerMontoMetodo(p, 'efectivo'), 0)
    const tarjeta_total = validos.reduce((acc, p) => acc + obtenerMontoMetodo(p, 'tarjeta'), 0)
    const transferencia_total = validos.reduce((acc, p) => acc + obtenerMontoMetodo(p, 'transferencia'), 0)
    
    // Como la caja inicial no quedó en la DB históricamente, asumimos 0.
    const caja_inicial = 0 
    const efectivo_rendir = caja_inicial + efectivo_ventas
    
    const total_pedidos = validos.length
    const ticket_promedio = total_pedidos > 0 ? facturacion_neta / total_pedidos : 0
    
    const total_envios_delivery = validos.filter((p) => p.tipoEntrega === 'delivery').length
    const costo_envios_cadetes = validos.filter((p) => p.tipoEntrega === 'delivery').reduce((acc, p) => acc + (Number(p.costoEnvio) || 0), 0)
    const total_retiros = validos.filter((p) => p.tipoEntrega === 'retiro').length
    const total_consumo_local = validos.filter((p) => p.tipoEntrega === 'consumo_local').length
    
    const cancelados = pedidosDia.filter((p) => p.estado === 'cancelado')
    const pedidos_cancelados = cancelados.length
    const monto_cancelados = cancelados.reduce((acc, p) => acc + Number(p.total), 0)

    const snapshot = {
      fecha,
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
      monto_cancelados
    }

    const { error: errorUpsert } = await supabase
      .from('cierres_diarios')
      .upsert(snapshot, { onConflict: 'fecha' })

    if (errorUpsert) {
      console.error(`Error upserting ${fecha}:`, errorUpsert)
    } else {
      upsertados++
    }
  }

  console.log(`¡Migración completada! Se procesaron y guardaron ${upsertados} días históricos en 'cierres_diarios'.`)
}

migrar()

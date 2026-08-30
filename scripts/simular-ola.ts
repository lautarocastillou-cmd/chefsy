import { supabaseAnon as supabase } from '../lib/supabase'

const clientes = [
  { nombre: 'Martín Benítez', tel: '3834112233', dir: 'Av. Belgrano 1240, Catamarca', lat: -28.4682, lng: -65.7821, tipo: 'delivery' },
  { nombre: 'Lucía Morales', tel: '3834998877', dir: 'Av. Belgrano 1350, Catamarca', lat: -28.4688, lng: -65.7815, tipo: 'delivery' }, // Misma zona que Martín (Smart Batching 1)
  { nombre: 'Gonzalo Herrera', tel: '3834556677', dir: 'Sarmiento 650, Catamarca', lat: -28.4645, lng: -65.7780, tipo: 'delivery' },
  { nombre: 'Camila Carrizo', tel: '3834223344', dir: 'Sarmiento 720, Catamarca', lat: -28.4651, lng: -65.7774, tipo: 'delivery' }, // Misma zona que Gonzalo (Smart Batching 2)
  { nombre: 'Agustín Varela', tel: '3834889900', dir: 'República 420, Catamarca', lat: -28.4690, lng: -65.7790, tipo: 'delivery' },
  { nombre: 'Florencia Romero', tel: '3834334455', dir: 'Retiro en Local', lat: null, lng: null, tipo: 'retiro' },
  { nombre: 'Mesa 4 - Salón', tel: 'Sin especificar', dir: '', lat: null, lng: null, tipo: 'consumo_local' },
  { nombre: 'Rodrigo Soria', tel: '3834123456', dir: 'Prado 850, Catamarca', lat: -28.4720, lng: -65.7830, tipo: 'delivery' },
  { nombre: 'Valentina Díaz', tel: '3834654321', dir: 'Prado 910, Catamarca', lat: -28.4725, lng: -65.7826, tipo: 'delivery' }, // Misma zona que Rodrigo
  { nombre: 'Esteban Mercado', tel: '3834778899', dir: 'Retiro en Local', lat: null, lng: null, tipo: 'retiro' },
  { nombre: 'Mesa 2 - Salón', tel: 'Sin especificar', dir: '', lat: null, lng: null, tipo: 'consumo_local' },
  { nombre: 'Sofía Álvarez', tel: '3834445566', dir: 'San Martín 320, Catamarca', lat: -28.4670, lng: -65.7760, tipo: 'delivery' },
  { nombre: 'Joaquín Navarro', tel: '3834901234', dir: 'San Martín 410, Catamarca', lat: -28.4675, lng: -65.7755, tipo: 'delivery' }, // Misma zona que Sofía
  { nombre: 'Micaela Ponce', tel: '3834567890', dir: 'Av. Ocampo 450, Catamarca', lat: -28.4750, lng: -65.7860, tipo: 'delivery' },
  { nombre: 'Tomás Gómez', tel: '3834234567', dir: 'Retiro en Local', lat: null, lng: null, tipo: 'retiro' },
  { nombre: 'Mesa 7 - Salón', tel: 'Sin especificar', dir: '', lat: null, lng: null, tipo: 'consumo_local' },
  { nombre: 'Nicolás Vega', tel: '3834789012', dir: 'Mate de Luna 800, Catamarca', lat: -28.4630, lng: -65.7840, tipo: 'delivery' },
  { nombre: 'Paula Córdoba', tel: '3834345678', dir: 'Mate de Luna 850, Catamarca', lat: -28.4635, lng: -65.7835, tipo: 'delivery' }, // Misma zona que Nicolás
]

const productosMuestrario = [
  { id: 'prod-cheddar-doble', nombre: 'Doble Cheeseburger con Bacon', precio: 8500, cantidad: 2 },
  { id: 'prod-lomo-completo', nombre: 'Lomo Completo Especial Chefsy', precio: 9500, cantidad: 1 },
  { id: 'prod-papas-cheddar', nombre: 'Papas Fritas Rústicas Cheddar & Bacon', precio: 4500, cantidad: 1 },
  { id: 'prod-coca-cola', nombre: 'Coca Cola 1.5L', precio: 2800, cantidad: 1 },
  { id: 'prod-pizza-muzza', nombre: 'Pizza Mozzarella a la Piedra', precio: 7800, cantidad: 1 },
  { id: 'prod-mila-napolitana', nombre: 'Milanesa Napolitana con Fritas', precio: 9200, cantidad: 1 },
]

const estados = ['nuevo', 'en_cocina', 'listo', 'en_camino', 'nuevo', 'en_cocina']
const metodosPago = ['efectivo', 'transferencia', 'tarjeta']

async function main() {
  console.log('🚀 Iniciando simulación de ola masiva de pedidos en Chefsy...')

  // 1. Activar turno si no estuviera
  await supabase.from('turnos').upsert({ id: 1, activo: true, updated_at: new Date().toISOString() })

  const ahora = new Date()
  const fechaHoy = ahora.toISOString().split('T')[0]

  const pedidosAInsertar = clientes.map((c, i) => {
    const estado = estados[i % estados.length]
    const metodoPago = metodosPago[i % metodosPago.length]
    const prods = [
      productosMuestrario[i % productosMuestrario.length],
      productosMuestrario[(i + 1) % productosMuestrario.length],
    ]
    const subtotal = prods.reduce((acc, p) => acc + p.precio * p.cantidad, 0)
    const costoEnvio = c.tipo === 'delivery' ? 1500 : 0
    const total = subtotal + costoEnvio

    const tOffset = (i * 3) // minutos atrás
    const tCreacion = new Date(ahora.getTime() - tOffset * 60000)
    const tCocina = estado !== 'nuevo' ? new Date(tCreacion.getTime() + 2 * 60000).toISOString() : null
    const tListo = (estado === 'listo' || estado === 'en_camino') ? new Date(tCreacion.getTime() + 10 * 60000).toISOString() : null
    const tEntregado = null

    return {
      id: `ola-${Date.now()}-${i + 1}`,
      cliente: c.nombre,
      telefono: c.tel,
      direccion: c.dir,
      tipoEntrega: c.tipo,
      metodoPago: metodoPago,
      productos: prods,
      total,
      costoEnvio,
      distanciaKm: c.tipo === 'delivery' ? 2.3 : null,
      estado: estado,
      fecha: fechaHoy,
      hora: tCreacion.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }),
      coordenadas: c.lat ? { latitud: c.lat, longitud: c.lng } : null,
      observaciones: i % 3 === 0 ? 'Sin cebolla, extra aderezo de la casa por favor.' : '',
      archivado: false,
      pago_confirmado: metodoPago === 'transferencia' ? i % 2 === 0 : false,
      cadete_id: null,
      cadete_nombre: null,
      created_at: tCreacion.toISOString(),
      cocina_at: tCocina,
      listo_at: tListo,
      entregado_at: tEntregado,
    }
  })

  console.log(`📦 Insertando ${pedidosAInsertar.length} pedidos realistas...`)

  const { data, error } = await supabase.from('pedidos').insert(pedidosAInsertar).select('id')

  if (error) {
    console.error('❌ Error al insertar pedidos:', error)
    process.exit(1)
  }

  console.log(`✅ ¡${data.length} pedidos insertados exitosamente en Supabase!`)
}

main().catch(console.error)

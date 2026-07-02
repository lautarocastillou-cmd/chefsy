import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Cargar variables de entorno desde .env.local
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=')
      const key = trimmed.slice(0, idx).trim()
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
      process.env[key] = val
    }
  })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Faltan credenciales NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Textos o patrones por defecto que deben ser eliminados si existieran en la base de datos
const descripcionesPorDefecto = [
  'Pan de lomo casero · medallón de carne',
  'Pan de lomo casero · bife premium',
  'Bife de lomo premium · queso cheddar fundido',
  'Bife de lomo tierno · cheddar premium',
  'Bife de lomo premium fundido con una fina',
  'Medallón artesanal a la parrilla',
  'Medallón artesanal · jamón cocido',
  'Doble medallón de carne · doble queso cheddar',
  'Medallón artesanal · queso cheddar',
  'Medallón de carne premium fundido',
  'Masa de piedra artesanal',
  'Salsa de tomate casera · muzzarella premium',
  'Masa a la piedra · muzzarella',
  'Abundante cebolla dulce caramelizada',
  'Muzzarella fundida · rodajas de longaniza',
  'Combinación cremosa de muzzarella, roquefort',
  'Sándwich tostado gigante en pan lactal especial',
  'Chorizo parrillero premium abierto al libro',
  'Milanesa de ternera gigante frita al momento',
  'Tarta casera XL hojaldrada recién horneada',
  'Bebida helada de tu elección para acompañar',
  'El combo ideal pensado para compartir',
  'Exquisito plato elaborado al instante'
]

async function limpiarDescripciones() {
  console.log('--- Iniciando limpieza de descripciones por defecto en tienda_metadata ---')
  
  const { data: metadatas, error } = await supabase
    .from('tienda_metadata')
    .select('*')

  if (error) {
    console.error('Error al consultar tienda_metadata:', error)
    return
  }

  if (!metadatas || metadatas.length === 0) {
    console.log('No se encontraron registros en tienda_metadata.')
    return
  }

  let limpiados = 0
  let conservados = 0

  for (const item of metadatas) {
    const desc = item.descripcion_publica || ''
    if (!desc.trim()) continue

    // Comprobamos si es una descripción por defecto generada por el sistema
    const esPorDefecto = descripcionesPorDefecto.some(def => desc.includes(def)) || desc.includes(' · ')

    if (esPorDefecto) {
      console.log(`Borrando descripción por defecto de producto: [${item.producto_id}] "${item.nombre_publico}"`)
      const { error: updErr } = await supabase
        .from('tienda_metadata')
        .update({ descripcion_publica: '', updated_at: new Date().toISOString() })
        .eq('producto_id', item.producto_id)

      if (updErr) {
        console.error(`Error al actualizar ${item.producto_id}:`, updErr)
      } else {
        limpiados++
      }
    } else {
      console.log(`Conservando descripción personalizada en producto: [${item.producto_id}] "${item.nombre_publico}" -> "${desc.slice(0, 40)}..."`)
      conservados++
    }
  }

  console.log('--- Resumen de Limpieza ---')
  console.log(`Descripciones por defecto borradas: ${limpiados}`)
  console.log(`Descripciones personalizadas conservadas: ${conservados}`)
}

limpiarDescripciones()

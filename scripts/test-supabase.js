// scratch/test-supabase.js
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://bdwgglizirgyuxfwssvc.supabase.co'
const supabaseAnonKey = 'sb_publishable_g6nrbK_Q5h-DLsK1DMPSvA_3uSAyEQI'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  console.log('Probando conexión a Supabase...')
  try {
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .limit(5)
    
    if (error) {
      console.error('Error de Supabase:', error)
    } else {
      console.log('Conexión exitosa! Pedidos encontrados:', data.length)
      console.log('Pedidos:', JSON.stringify(data, null, 2))
    }
  } catch (err) {
    console.error('Error inesperado:', err)
  }
}

test()

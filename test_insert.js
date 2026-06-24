const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envStr = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envStr.split('\n').map(line => line.split('=').map(s => s.trim())));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

supabase.from('pedidos').insert({
  id: 'test-1234',
  cliente: 'Test',
  telefono: '123',
  tipoEntrega: 'retiro',
  direccion: '',
  total: 100,
  estado: 'nuevo',
  metodoPago: 'efectivo',
  hora: '12:00',
  fecha: '2026-06-24',
  productos: []
}).then(res => console.log(res));

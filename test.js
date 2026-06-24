const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envStr = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envStr.split('\n').map(line => line.split('=').map(s => s.trim())));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('pedidos').select('tipo_entrega, tipoEntrega').limit(1).then(console.log).catch(console.error);
supabase.from('turnos').select('*').limit(1).then(console.log).catch(console.error);

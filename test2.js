const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envStr = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envStr.split('\n').map(line => line.split('=').map(s => s.trim())));
const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function testUpdate() {
  const { data: pedido } = await supabaseAdmin.from('pedidos').select('id, estado').limit(1).single();
  if (!pedido) return console.log('No orders');
  
  console.log('Testing update on', pedido.id);
  const { data: pedidoAct, error } = await supabaseAdmin
    .from('pedidos')
    .update({ estado: 'en_cocina' })
    .eq('id', pedido.id)
    .select('cadete_id, tipoEntrega, cliente, productos')
    .single();
    
  console.log('Update Result:', { error, data: pedidoAct });
}

testUpdate();

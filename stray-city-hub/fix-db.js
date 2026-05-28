const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fix() {
  console.log("Fixing Argentina (Sold Out)...");
  await supabase.from('skz_sale_events').update({
    status: 'sold_out',
    status_detail: '¡Entradas agotadas! (Verificando)',
    ai_last_response: 'Update manual por el admin'
  }).eq('id', 'argentina');

  console.log("Fixing Colombia (En Venta)...");
  await supabase.from('skz_sale_events').update({
    status: 'on_sale',
    status_detail: '¡Últimas entradas disponibles!',
    ai_last_response: 'Update manual por el admin'
  }).eq('id', 'colombia');

  console.log("Listo!");
}

fix();

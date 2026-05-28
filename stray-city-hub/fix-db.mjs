async function supaPatch(path, body) {
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(`${sbUrl}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Supabase PATCH error: ${await res.text()}`);
}

async function fix() {
  console.log("Fixing Argentina (Sold Out)...");
  await supaPatch('skz_sale_events?id=eq.argentina', {
    status: 'sold_out',
    status_detail: '¡Entradas agotadas!',
    ai_last_response: 'Update manual por el admin',
    updated_at: new Date().toISOString()
  });

  console.log("Fixing Colombia (En Venta)...");
  await supaPatch('skz_sale_events?id=eq.colombia', {
    status: 'on_sale',
    status_detail: '¡Últimas entradas disponibles!',
    ai_last_response: 'Update manual por el admin',
    updated_at: new Date().toISOString()
  });

  console.log("Listo!");
}

fix();

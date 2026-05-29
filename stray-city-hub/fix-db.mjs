async function supaFetch(path, method = 'GET', body = null) {
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const options = {
    method,
    headers: {
      'apikey': sbKey,
      'Authorization': `Bearer ${sbKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${sbUrl}/rest/v1/${path}`, options);
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase Error ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function run() {
  console.log("Agregando México Fecha 2...");
  const mx2 = await supaFetch('skz_sale_events', 'POST', {
    id: 'mexico_2',
    country: 'México 🇲🇽',
    city: 'Ciudad de México',
    venue: 'Estadio GNP Seguros',
    sale_date: '2026-05-28',
    status: 'on_sale',
    status_detail: 'Segunda fecha — ¡Venta activa!',
    ai_last_response: null,
    last_checked_at: null
  });
  console.log("México 2:", mx2);

  // Verificar
  console.log("\n--- Estado final ---");
  const all = await supaFetch('skz_sale_events?select=id,country,sale_date,status,status_detail&order=sale_date.asc');
  console.log(JSON.stringify(all, null, 2));
}

run();

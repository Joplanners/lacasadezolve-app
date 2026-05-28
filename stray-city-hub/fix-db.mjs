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
  // 1. Agregar segunda fecha de Argentina
  console.log("Agregando Argentina Fecha 2...");
  const ar2 = await supaFetch('skz_sale_events', 'POST', {
    id: 'argentina_2',
    country: 'Argentina 🇦🇷',
    city: 'Buenos Aires',
    venue: 'Hipódromo San Isidro',
    sale_date: '2026-06-01',
    status: 'upcoming',
    status_detail: 'Segunda fecha — Venta 1 de Junio',
    ai_last_response: null,
    last_checked_at: null
  });
  console.log("Argentina 2:", ar2);

  // 2. Actualizar México a on_sale
  console.log("Actualizando México a on_sale...");
  await supaFetch('skz_sale_events?id=eq.mexico', 'PATCH', {
    status: 'on_sale',
    status_detail: '¡Venta de entradas activa!',
    updated_at: new Date().toISOString()
  });
  console.log("México actualizado.");

  // 3. Verificar todos los eventos
  console.log("\n--- Estado final de todos los eventos ---");
  const all = await supaFetch('skz_sale_events?select=*&order=sale_date.asc');
  console.log(JSON.stringify(all, null, 2));
}

run();

import fetch from 'node-fetch';

async function test() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  const res = await fetch(`${supabaseUrl}/rest/v1/user_digital_downloads`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      order_id: '12345678-1234-1234-1234-123456789012',
      product_id: '12345678-1234-1234-1234-123456789012',
      file_url: 'test'
    })
  })
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}

test();

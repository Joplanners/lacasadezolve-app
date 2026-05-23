import { createHash } from 'node:crypto'

// ─── Rate limiter en memoria ───
const rateLimits = new Map()
const RATE_WINDOW_MS = 60 * 60 * 1000 // 1 hora
const MAX_MESSAGES_PER_HOUR = 5
const MAX_CANDLES_PER_HOUR = 10

function hashIP(ip) {
  return createHash('sha256').update(ip || 'unknown').digest('hex')
}

function checkRateLimit(ipHash, action) {
  const now = Date.now()
  if (!rateLimits.has(ipHash)) rateLimits.set(ipHash, { messages: [], candles: [] })
  
  const bucket = rateLimits.get(ipHash)
  bucket[action] = bucket[action].filter((ts) => now - ts < RATE_WINDOW_MS)
  
  const max = action === 'messages' ? MAX_MESSAGES_PER_HOUR : MAX_CANDLES_PER_HOUR
  if (bucket[action].length >= max) return false
  
  bucket[action].push(now)
  return true
}

function sanitize(str) {
  if (typeof str !== 'string') return ''
  return str.trim().replace(/[<>]/g, '')
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, apikey, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
}

// Helper para hacer fetch directo a Supabase REST API (sin librerías externas)
async function supaFetch(path, method = 'GET', body = null) {
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || !sbKey) throw new Error("Missing Supabase credentials");

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
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase Error ${res.status}: ${text}`);
  }
  return res.json();
}

export default async (req, context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname.replace('/.netlify/functions/api', '').replace('/api', '')
    const clientIP = context?.ip || (req.headers && req.headers.get('x-forwarded-for')) || 'unknown'
    const ipHash = hashIP(clientIP)

    // GET /status
    if (req.method === 'GET' && (path === '/status' || path === '')) {
      const events = await supaFetch('skz_sale_events?select=*&order=sale_date.asc');
      const counterArr = await supaFetch('skz_candle_counter?id=eq.1&select=count');
      const messages = await supaFetch('skz_manifestation_messages?select=*&order=created_at.desc&limit=100');

      return new Response(
        JSON.stringify({
          events: events || [],
          candleCount: counterArr && counterArr.length > 0 ? counterArr[0].count : 0,
          messages: messages || [],
        }),
        { status: 200, headers: corsHeaders },
      )
    }

    // POST /messages
    if (req.method === 'POST' && path === '/messages') {
      if (!checkRateLimit(ipHash, 'messages')) {
        return new Response(JSON.stringify({ error: 'Demasiados mensajes.' }), { status: 429, headers: corsHeaders })
      }

      const body = await req.json()
      const author = sanitize(body.author)
      const message = sanitize(body.message)
      const tag = body.tag

      const validTags = ['manifestación', 'energía', 'decreto', 'mensaje']
      if (!author || author.length > 30) return new Response(JSON.stringify({ error: 'Nombre inválido.' }), { status: 400, headers: corsHeaders })
      if (!message || message.length > 50) return new Response(JSON.stringify({ error: 'Mensaje inválido.' }), { status: 400, headers: corsHeaders })
      if (!validTags.includes(tag)) return new Response(JSON.stringify({ error: 'Tag inválido.' }), { status: 400, headers: corsHeaders })

      const data = await supaFetch('skz_manifestation_messages', 'POST', { author, message, tag, ip_hash: ipHash });
      return new Response(JSON.stringify({ success: true, message: data[0] }), { status: 201, headers: corsHeaders })
    }

    // POST /candle
    if (req.method === 'POST' && path === '/candle') {
      if (!checkRateLimit(ipHash, 'candles')) {
        return new Response(JSON.stringify({ error: 'Muchas velas.' }), { status: 429, headers: corsHeaders })
      }

      const currentArr = await supaFetch('skz_candle_counter?id=eq.1&select=count');
      const newCount = (currentArr && currentArr.length > 0 ? currentArr[0].count : 0) + 1;

      await supaFetch('skz_candle_counter?id=eq.1', 'PATCH', { count: newCount, updated_at: new Date().toISOString() });

      return new Response(JSON.stringify({ success: true, count: newCount }), { status: 200, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ error: 'Ruta no encontrada' }), { status: 404, headers: corsHeaders })
  } catch (err) {
    console.error('[API Error]', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
}

export const config = {
  path: ['/api', '/api/*'],
}

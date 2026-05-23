import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash } from 'node:crypto'

// ─── Supabase (service role — NUNCA exponer al cliente) ───
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

// ─── Rate limiter en memoria (se resetea con cold starts) ───
const rateLimits = new Map() // key: ipHash, value: { messages: [{ts}], candles: [{ts}] }
const RATE_WINDOW_MS = 60 * 60 * 1000 // 1 hora
const MAX_MESSAGES_PER_HOUR = 5
const MAX_CANDLES_PER_HOUR = 30

function hashIP(ip) {
  return createHash('sha256').update(ip || 'unknown').digest('hex')
}

function checkRateLimit(ipHash, action) {
  const now = Date.now()
  if (!rateLimits.has(ipHash)) {
    rateLimits.set(ipHash, { messages: [], candles: [] })
  }

  const bucket = rateLimits.get(ipHash)
  // Limpiar entradas viejas
  bucket[action] = bucket[action].filter((ts) => now - ts < RATE_WINDOW_MS)

  const max = action === 'messages' ? MAX_MESSAGES_PER_HOUR : MAX_CANDLES_PER_HOUR
  if (bucket[action].length >= max) {
    return false
  }

  bucket[action].push(now)
  return true
}

// ─── Sanitizar input: trim + bloquear tags HTML ───
function sanitize(str) {
  if (typeof str !== 'string') return ''
  return str.trim().replace(/[<>]/g, '')
}

// ─── Headers CORS ───
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
}

// ─── Handler principal ───
export default async (req, context) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const url = new URL(req.url)
  const path = url.pathname.replace('/.netlify/functions/api', '').replace('/api', '')
  const clientIP = context.ip || req.headers.get('x-forwarded-for') || 'unknown'
  const ipHash = hashIP(clientIP)

  try {
    // ═══════════════════════════════════════
    // GET /status — Leer estado de ventas
    // ═══════════════════════════════════════
    if (req.method === 'GET' && (path === '/status' || path === '')) {
      const { data: events, error } = await supabase
        .from('skz_sale_events')
        .select('*')
        .order('sale_date', { ascending: true })

      if (error) throw error

      const { data: counter } = await supabase
        .from('skz_candle_counter')
        .select('count')
        .eq('id', 1)
        .single()

      const { data: messages } = await supabase
        .from('skz_manifestation_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      return new Response(
        JSON.stringify({
          events: events || [],
          candleCount: counter?.count || 0,
          messages: messages || [],
        }),
        { status: 200, headers: corsHeaders },
      )
    }

    // ═══════════════════════════════════════
    // POST /messages — Agregar mensaje al muro
    // ═══════════════════════════════════════
    if (req.method === 'POST' && path === '/messages') {
      // Rate limit
      if (!checkRateLimit(ipHash, 'messages')) {
        return new Response(
          JSON.stringify({ error: 'Demasiados mensajes. Espera un rato e intenta de nuevo.' }),
          { status: 429, headers: corsHeaders },
        )
      }

      const body = await req.json()
      const author = sanitize(body.author)
      const message = sanitize(body.message)
      const tag = body.tag

      // Validaciones
      const validTags = ['manifestación', 'energía', 'decreto', 'mensaje']

      if (!author || author.length > 30) {
        return new Response(
          JSON.stringify({ error: 'Nombre inválido (máx. 30 caracteres).' }),
          { status: 400, headers: corsHeaders },
        )
      }

      if (!message || message.length > 50) {
        return new Response(
          JSON.stringify({ error: 'Mensaje inválido (máx. 50 caracteres).' }),
          { status: 400, headers: corsHeaders },
        )
      }

      if (!validTags.includes(tag)) {
        return new Response(
          JSON.stringify({ error: 'Tipo de mensaje inválido.' }),
          { status: 400, headers: corsHeaders },
        )
      }

      // Insertar en Supabase
      const { data, error } = await supabase
        .from('skz_manifestation_messages')
        .insert({ author, message, tag, ip_hash: ipHash })
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, message: data }),
        { status: 201, headers: corsHeaders },
      )
    }

    // ═══════════════════════════════════════
    // POST /candle — Incrementar vela
    // ═══════════════════════════════════════
    if (req.method === 'POST' && path === '/candle') {
      // Rate limit
      if (!checkRateLimit(ipHash, 'candles')) {
        return new Response(
          JSON.stringify({ error: 'Muchas velas encendidas. Espera un momento.' }),
          { status: 429, headers: corsHeaders },
        )
      }

      // Incrementar con RPC o update manual
      const { data: current } = await supabase
        .from('skz_candle_counter')
        .select('count')
        .eq('id', 1)
        .single()

      const newCount = (current?.count || 0) + 1

      const { error } = await supabase
        .from('skz_candle_counter')
        .update({ count: newCount, updated_at: new Date().toISOString() })
        .eq('id', 1)

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, count: newCount }),
        { status: 200, headers: corsHeaders },
      )
    }

    // ═══════════════════════════════════════
    // 404
    // ═══════════════════════════════════════
    return new Response(
      JSON.stringify({ error: 'Ruta no encontrada' }),
      { status: 404, headers: corsHeaders },
    )
  } catch (err) {
    console.error('[API Error]', err)
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: corsHeaders },
    )
  }
}

export const config = {
  path: ['/api', '/api/*'],
}

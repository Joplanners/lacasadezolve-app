// ─── Config ───
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`

const SALE_URLS = {
  colombia: process.env.SALE_URL_COLOMBIA || 'https://www.ticketmaster.co/event/stray-kids-straycity-2026',
  argentina: process.env.SALE_URL_ARGENTINA || 'https://www.allaccess.com.ar/event/stray-kids',
  mexico: process.env.SALE_URL_MEXICO || 'https://www.ticketmaster.com.mx/straycity-mexico-city-ciudad-de-mexico-25-09-2026/event/1400649DA6177249',
}

function extractVisibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 4000)
}

async function analyzeWithGemini(country, scrapedText) {
  const prompt = `Actúa como un analizador de datos. Tu objetivo es leer el texto extraído de la página web de venta de entradas para el concierto de Stray Kids en ${country} y determinar el estado actual de las entradas. 
REGLA DE ORO: Si encuentras palabras como "Agotado", "Sold Out", "Sin disponibilidad", "Tickets no disponibles" en CUALQUIER PARTE del texto, el status DEBE ser obligatoriamente "sold_out", sin importar qué más diga la página.
Si la página menciona "Fila virtual", "Queue", o "Próximamente" pero hoy es el día de venta, considera que la venta está activa ("hot" o "on_sale").
Responde en modo JSON con la estructura: { "status": "upcoming" | "on_sale" | "hot" | "sold_out", "status_detail": "Frase de máximo 5 palabras (ej: '¡Entradas totalmente agotadas!')" }
Texto extraído de la web: """ ${scrapedText} """`

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { 
        temperature: 0.1,
        responseMimeType: "application/json"
      },
    }),
  })

  if (!response.ok) throw new Error(`Gemini API error: ${await response.text()}`)

  const data = await response.json()
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  
  let parsed;
  try {
    parsed = JSON.parse(rawText)
  } catch (err) {
    throw new Error(`Failed to parse Gemini JSON: ${rawText}`)
  }
  return {
    status: parsed.status,
    status_detail: String(parsed.status_detail || '').substring(0, 100),
    ai_last_response: rawText.substring(0, 500),
  }
}

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

async function processCountry(eventId, country, url) {
  try {
    const pageResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-419,es;q=0.9',
      },
    })

    if (!pageResponse.ok) throw new Error(`HTTP ${pageResponse.status} al acceder a ${url}`)

    const html = await pageResponse.text()
    const visibleText = extractVisibleText(html)

    if (visibleText.length < 50) return { eventId, success: false, error: 'Texto corto' }

    const analysis = await analyzeWithGemini(country, visibleText)

    await supaPatch(`skz_sale_events?id=eq.${eventId}`, {
      status: analysis.status,
      status_detail: analysis.status_detail,
      ai_last_response: analysis.ai_last_response,
      last_checked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return { eventId, success: true, ...analysis }
  } catch (err) {
    return { eventId, success: false, error: err.message }
  }
}

export default async (req, context) => {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Faltan variables Supabase")

    const now = new Date()
    const localNow = new Date(now.getTime() - (4 * 60 * 60 * 1000))
    const day = localNow.getDate()
    const month = localNow.getMonth()
    const year = localNow.getFullYear()

    const isActiveSaleDay = year === 2026 && (
      (month === 4 && (day === 27 || day === 29)) ||  // Mayo: Colombia/Argentina + México
      (month === 5 && day === 1)                       // Junio: Argentina fecha 2
    )
    if (!isActiveSaleDay) {
      return new Response(JSON.stringify({ skipped: true, reason: 'No es día de venta' }))
    }

    const results = await Promise.allSettled([
      ...(month === 4 && day === 27 ? [] : []),
      ...(month === 4 && day === 29 ? [processCountry('mexico', 'México', SALE_URLS.mexico)] : []),
      ...(month === 5 && day === 1 ? [processCountry('argentina_2', 'Argentina (Segunda Fecha)', SALE_URLS.argentina)] : []),
    ])

    const summary = results.map((r) => (r.status === 'fulfilled' ? r.value : r.reason))
    console.log('[check-sales] RESULTADO FINAL:', JSON.stringify(summary, null, 2))
    return new Response(JSON.stringify({ success: true, results: summary }))
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}

export const config = {
  schedule: '*/15 * 27,28,29,30 5,6 *',
}

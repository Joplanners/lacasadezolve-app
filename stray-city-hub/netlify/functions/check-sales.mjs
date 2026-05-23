import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── Config ───
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = 'gemini-2.0-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

// ─── URLs de venta por país ───
// IMPORTANTE: Reemplazar con las URLs reales de Ticketmaster/AllAccess
const SALE_URLS = {
  colombia: process.env.SALE_URL_COLOMBIA || 'https://www.ticketmaster.co/event/stray-kids-straycity-2026',
  argentina: process.env.SALE_URL_ARGENTINA || 'https://www.allaccess.com.ar/event/stray-kids',
  mexico: process.env.SALE_URL_MEXICO || 'https://www.ticketmaster.com.mx/straycity-mexico-city-ciudad-de-mexico-25-09-2026/event/1400649DA6177249',
}

// ─── Extraer texto visible de HTML (strip tags) ───
function extractVisibleText(html) {
  return html
    // Eliminar scripts y styles completos
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    // Eliminar tags HTML
    .replace(/<[^>]+>/g, ' ')
    // Limpiar entidades HTML comunes
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;/g, '')
    // Colapsar espacios en blanco
    .replace(/\s+/g, ' ')
    .trim()
    // Limitar a 4000 caracteres (para no exceder el contexto de Gemini)
    .substring(0, 4000)
}

// ─── Consultar Gemini con el texto scrapeado ───
async function analyzeWithGemini(country, scrapedText) {
  const prompt = `Actúa como un analizador de datos. Tu objetivo es leer el texto extraído de la página web de venta de entradas para el concierto de Stray Kids en ${country} y determinar el estado actual de las entradas. 
Responde ÚNICAMENTE con un objeto JSON válido con esta estructura estricta: 
{ "status": "upcoming" | "on_sale" | "hot" | "sold_out", "status_detail": "Breve frase de 5 palabras sobre lo que dice la página (ej: 'Fila virtual activa' o 'Entradas agotadas')" }. 
Texto extraído de la web: """ ${scrapedText} """`

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.1, // Baja creatividad para respuestas consistentes
        maxOutputTokens: 150,
      },
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Gemini API error (${response.status}): ${errText}`)
  }

  const data = await response.json()

  // Extraer el texto de la respuesta de Gemini
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  // Parsear el JSON de la respuesta (puede venir envuelto en ```json ... ```)
  const jsonMatch = rawText.match(/\{[\s\S]*?\}/)
  if (!jsonMatch) {
    throw new Error(`No se pudo extraer JSON de la respuesta de Gemini: ${rawText}`)
  }

  const parsed = JSON.parse(jsonMatch[0])

  // Validar campos
  const validStatuses = ['upcoming', 'on_sale', 'hot', 'sold_out']
  if (!validStatuses.includes(parsed.status)) {
    throw new Error(`Status inválido de Gemini: ${parsed.status}`)
  }

  return {
    status: parsed.status,
    status_detail: String(parsed.status_detail || '').substring(0, 100),
    ai_last_response: rawText.substring(0, 500),
  }
}

// ─── Procesar un país ───
async function processCountry(eventId, country, url) {
  console.log(`[check-sales] Procesando ${country} → ${url}`)

  try {
    // 1. Fetch de la página de venta
    const pageResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-419,es;q=0.9',
      },
    })

    if (!pageResponse.ok) {
      throw new Error(`HTTP ${pageResponse.status} al acceder a ${url}`)
    }

    const html = await pageResponse.text()
    const visibleText = extractVisibleText(html)

    if (visibleText.length < 50) {
      console.warn(`[check-sales] Texto muy corto para ${country}, posible bloqueo`)
      return { eventId, success: false, error: 'Texto extraído demasiado corto' }
    }

    // 2. Enviar a Gemini
    const analysis = await analyzeWithGemini(country, visibleText)

    // 3. Actualizar Supabase
    const { error } = await supabase
      .from('skz_sale_events')
      .update({
        status: analysis.status,
        status_detail: analysis.status_detail,
        ai_last_response: analysis.ai_last_response,
        last_checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', eventId)

    if (error) throw error

    console.log(`[check-sales] ✅ ${country}: ${analysis.status} — "${analysis.status_detail}"`)
    return { eventId, success: true, ...analysis }
  } catch (err) {
    console.error(`[check-sales] ❌ Error en ${country}:`, err.message)
    return { eventId, success: false, error: err.message }
  }
}

// ─── Handler de la Scheduled Function ───
export default async () => {
  console.log('[check-sales] 🔄 Ejecutando chequeo de ventas programado...')

  // Verificar que es un día de venta (27 o 29 de Mayo 2026)
  // Usamos UTC-4 (hora Chile/Colombia) para el chequeo
  const now = new Date()
  const offsetMs = -4 * 60 * 60 * 1000
  const localNow = new Date(now.getTime() + offsetMs)
  const day = localNow.getDate()
  const month = localNow.getMonth() // 0-indexed → Mayo = 4
  const year = localNow.getFullYear()

  console.log(`[check-sales] Fecha local (UTC-4): ${year}-${month + 1}-${day}`)

  // Solo ejecutar en los días de venta de Mayo 2026
  // Si quieres testear, comenta este bloque temporalmente
  const isActiveSaleDay =
    year === 2026 && month === 4 && (day === 27 || day === 29)

  if (!isActiveSaleDay) {
    console.log('[check-sales] ⏭️ No es día de venta activa. Saltando.')
    return new Response(JSON.stringify({ skipped: true, reason: 'No es día de venta' }))
  }

  // Procesar cada país
  const results = await Promise.allSettled([
    // 27 de Mayo: Colombia y Argentina
    ...(day === 27
      ? [
          processCountry('colombia', 'Colombia', SALE_URLS.colombia),
          processCountry('argentina', 'Argentina', SALE_URLS.argentina),
        ]
      : []),
    // 29 de Mayo: México
    ...(day === 29
      ? [processCountry('mexico', 'México', SALE_URLS.mexico)]
      : []),
  ])

  const summary = results.map((r) => (r.status === 'fulfilled' ? r.value : r.reason))
  console.log('[check-sales] 📊 Resultados:', JSON.stringify(summary))

  return new Response(JSON.stringify({ success: true, results: summary }))
}

// ─── Cron: cada 15 minutos los días 27 y 29 de Mayo ───
export const config = {
  schedule: '*/15 * 27,29 5 *',
}

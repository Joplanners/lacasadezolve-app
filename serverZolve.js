import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import cors from 'cors'
import fetch from 'node-fetch' // Asegúrate de tener node-fetch instalado si Node < 18

const app = express()
const port = process.env.PORT || 3001
const GEMINI_API_KEY = process.env.ZOLVE_GEMINI_API_KEY
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY

const allowedOrigins = ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:3000']
if (process.env.FRONTEND_PRODUCTION_URL) {
  allowedOrigins.push(process.env.FRONTEND_PRODUCTION_URL)
}
// PARA PRODUCCIÓN, si tu frontend está en Netlify (lacasadezolve.com) y este backend en Render (o similar),
// y usas un proxy de Netlify desde /api/* a tu backend, el 'Origin' que verá este backend
// podría ser el de Netlify o el original. Es bueno añadir tu dominio de producción aquí.
// Por ejemplo, si tu frontend está en https://lacasadezolve.com
if (!allowedOrigins.includes('https://lacasadezolve.com')) {
  allowedOrigins.push('https://lacasadezolve.com')
}

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      console.warn(`CORS: Origen no permitido bloqueado: ${origin}`)
      callback(new Error('Origen no permitido por CORS'))
    }
  },
  optionsSuccessStatus: 200,
}

app.use(cors(corsOptions))
app.use(express.json())

if (!GEMINI_API_KEY) {
  console.error('Error FATAL: ZOLVE_GEMINI_API_KEY no está configurada.')
  process.exit(1)
}
if (!OPENWEATHER_API_KEY) {
  // Advertencia en lugar de error fatal para que el chatbot pueda funcionar si solo falla el clima
  console.warn('[AVISO] OPENWEATHER_API_KEY no está configurada. La API de clima no funcionará.')
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
const modelName = 'gemini-2.5-flash'
const generationConfig = { temperature: 0.7, maxOutputTokens: 800 }
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
]
const cache = new Map()
const CACHE_TTL_MS = 1 * 60 * 60 * 1000
const predefinedResponses = {
  hola: '¡Hola! Soy Zolve 🦊 ¿En qué puedo ayudarte hoy?',
  'buenos dias': '¡Buenos días! Soy Zolve 🦊 ¿Listo para encontrar algo creativo hoy?',
  'buenas tardes': '¡Buenas tardes! Soy Zolve 🦊 ¿Cómo puedo asistirte?',
  'buenas noches': '¡Buenas noches! Soy Zolve 🦊 ¿Buscas inspiración antes de dormir?',
  adios: '¡Hasta pronto! Espero haberte ayudado. ¡Vuelve cuando quieras! 🦊✨',
  chao: '¡Chao! ¡Que tengas un día genial! 🦊💖',
  gracias: '¡De nada! Siempre es un placer ayudar. 🦊😊',
  'muchas gracias': '¡Con gusto! Si necesitas algo más, aquí estaré. 🦊',
  instagram:
    'Puedes encontrarnos en Instagram como @zolve_fox. ¡Síguenos para ver todas nuestras novedades! 🦊🛒',
  'cual es su instagram': 'Nuestro Instagram es @zolve_fox. ¡Te esperamos por allá! 🦊💖',
  facebook: 'También estamos en Facebook. Búscanos como La Casa de Zolve. 🦊',
  'tienda fisica':
    'Por el momento, La Casa de Zolve es una tienda 100% online. Hacemos envíos y coordinamos entregas. 🦊🚚',
  'cuentame un chiste':
    'Jeje, soy un zorrito de papelería, los chistes no son mi fuerte. Pero puedo ayudarte a encontrar el cuaderno perfecto para escribirlos. 😉🦊',
  'que tiempo hace':
    'Soy un zorrito de interiores, ¡pero espero que tengas un clima estupendo! ☀️ ¿Necesitas ayuda con algún producto?',
  'que piensas del universo':
    '¡El universo es enormemente inspirador! Casi tanto como nuestros productos de papelería. 😉 ¿Te ayudo con algo de La Casa de Zolve? 🦊',
}
const outOfScopeKeywords = [
  'chiste',
  'tiempo',
  'clima',
  'universo',
  'sentido de la vida',
  'filosofia',
  'politica',
  'religion',
  'deportes',
  'noticias',
  'famosos',
  'cocina',
  'receta',
]
function normalizeText(text) {
  if (typeof text !== 'string') return ''
  return text.toLowerCase().trim().replace(/\s+/g, ' ')
}

let dailyGeminiRequests = 0
const MAX_DAILY_REQUESTS = 490
const SLEEP_MESSAGE =
  '¡Zorry! 🦊💤 Zolve ha respondido muchas preguntas hoy y necesita recargar energías. Estaré de vuelta mañana para seguir ayudándote. ¡Buenos tutos!'
let resetTimeoutId = null

function resetDailyCounter() {
  const now = new Date()
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
  const msUntilMidnight = tomorrow.getTime() - now.getTime()
  console.log(
    `SERVER: Contador de Gemini se reiniciará en ${Math.round(msUntilMidnight / (1000 * 60))} minutos.`,
  )
  dailyGeminiRequests = 0
  if (resetTimeoutId) {
    clearTimeout(resetTimeoutId)
  }
  resetTimeoutId = setTimeout(() => {
    console.log('SERVER: Reseteando contador de Gemini.')
    dailyGeminiRequests = 0
    resetDailyCounter()
  }, msUntilMidnight)
}
dailyGeminiRequests = 0
console.log('SERVER: Contador de Gemini inicializado a 0.')
resetDailyCounter()

app.get('/api/weather-by-ip', async (req, res) => {
  try {
    const ip =
      req.headers['x-nf-client-connection-ip'] ||
      req.headers['x-forwarded-for']?.split(',').shift() ||
      req.socket?.remoteAddress
    console.log('[WEATHER API] IP Cliente:', ip)
    if (!ip) {
      return res.status(400).json({ error: 'Ubicación IP no detectada.' })
    }

    let city = 'Santiago' // Fallback city
    try {
      const clientIpForGeo =
        ip.includes(':') && (ip.startsWith('::ffff:') || ip === '::1') ? '' : ip // ip-api usa '' para auto-detectar, o la IP pública. Evitar localhost IPV6.
      const geoApiUrl = clientIpForGeo
        ? `http://ip-api.com/json/${clientIpForGeo}?fields=status,message,city`
        : `http://ip-api.com/json/?fields=status,message,city`
      const geoResponse = await fetch(geoApiUrl)
      const geoData = await geoResponse.json()
      console.log('[WEATHER API] GeoIP Data:', geoData)
      if (geoData.status === 'success' && geoData.city) {
        city = geoData.city
      } else {
        console.warn(
          '[WEATHER API] GeoIP falló o no devolvió ciudad:',
          geoData.message || 'Usando ciudad por defecto.',
        )
      }
    } catch (geoError) {
      console.error('[WEATHER API] Error GeoIP API:', geoError)
    }

    if (!OPENWEATHER_API_KEY) {
      return res.status(500).json({ error: 'Servicio de clima no disponible.' })
    }

    console.log(`[WEATHER API] Obteniendo clima para: ${city}`)
    const weatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=es`,
    )
    if (!weatherResponse.ok) {
      const errorText = await weatherResponse.text()
      throw new Error(`OpenWeatherMap Error (${weatherResponse.status}): ${errorText}`)
    }
    const weatherAPIData = await weatherResponse.json()
    console.log('[WEATHER API] OpenWeatherMap Data:', weatherAPIData)
    if (!weatherAPIData.main || !weatherAPIData.weather || !weatherAPIData.weather[0]) {
      throw new Error('Respuesta de API de clima inesperada.')
    }

    const responseToFrontend = {
      city: weatherAPIData.name || city,
      temperature: Math.round(weatherAPIData.main.temp),
      description:
        weatherAPIData.weather[0].description.charAt(0).toUpperCase() +
        weatherAPIData.weather[0].description.slice(1),
      iconCode: weatherAPIData.weather[0].icon,
      tempMin: Math.round(weatherAPIData.main.temp_min),
      tempMax: Math.round(weatherAPIData.main.temp_max),
    }
    res.json(responseToFrontend)
  } catch (error) {
    console.error('[WEATHER API] Error en /api/weather-by-ip:', error.message)
    res.status(500).json({ error: error.message || 'Error al obtener el clima.' })
  }
})

app.post('/api/chat', async (req, res) => {
  try {
    const { systemPrompt, chatHistory, userPrompt } = req.body
    const originalUserPrompt = userPrompt
    if (!originalUserPrompt) {
      return res.status(400).json({ error: 'userPrompt es requerido.' })
    }
    const normalizedUserPrompt = normalizeText(originalUserPrompt)
    if (normalizedUserPrompt.length < 2 && !/\w/.test(normalizedUserPrompt)) {
      return res.json({ text: 'Mmm... ¿podrías ser un poquito más específico? 🦊' })
    }
    if (predefinedResponses[normalizedUserPrompt]) {
      return res.json({ text: predefinedResponses[normalizedUserPrompt] })
    }
    if (dailyGeminiRequests >= MAX_DAILY_REQUESTS) {
      console.warn(
        `SERVER: Límite diario (${MAX_DAILY_REQUESTS}) alcanzado. Solicitudes hoy: ${dailyGeminiRequests}.`,
      )
      return res.json({ text: SLEEP_MESSAGE })
    }
    const isOutOfScope = outOfScopeKeywords.some((keyword) =>
      normalizedUserPrompt.includes(keyword),
    )
    const probablyOutOfScope =
      isOutOfScope &&
      !normalizedUserPrompt.includes('zolve') &&
      !normalizedUserPrompt.includes('producto') &&
      !normalizedUserPrompt.includes('papeleria')
    if (probablyOutOfScope) {
      const defaultOutOfScopeMessage =
        'Mmm, esa es una pregunta muy astuta 🦊. Sobre eso en específico, te recomiendo visitar nuestra página de inicio en lacasadezolve.com y usar el formulario de contacto. Así, uno de mis amigos humanos te ayudará.'
      return res.json({
        text: predefinedResponses['que piensas del universo'] || defaultOutOfScopeMessage,
      })
    }
    const cacheKey = normalizedUserPrompt
    if (cache.has(cacheKey)) {
      const cachedEntry = cache.get(cacheKey)
      if (Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
        return res.json({ text: cachedEntry.text })
      } else {
        cache.delete(cacheKey)
      }
    }
    if (dailyGeminiRequests >= MAX_DAILY_REQUESTS) {
      console.warn(
        `SERVER: Límite diario (${MAX_DAILY_REQUESTS}) alcanzado justo antes de Gemini. Solicitudes hoy: ${dailyGeminiRequests}.`,
      )
      return res.json({ text: SLEEP_MESSAGE })
    }
    console.log(
      `SERVER: Consultando a Gemini: "${originalUserPrompt}". Solicitudes hoy (antes): ${dailyGeminiRequests}/${MAX_DAILY_REQUESTS}`,
    )
    dailyGeminiRequests++
    const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: systemPrompt })
    const chat = model.startChat({ history: chatHistory || [], generationConfig, safetySettings })
    const result = await chat.sendMessage(originalUserPrompt)
    const response = result.response
    if (!response) {
      dailyGeminiRequests--
      console.error('SERVER: Respuesta de Gemini vacía:', originalUserPrompt)
      return res.status(500).json({ error: 'La IA no generó una respuesta.' })
    }
    const botResponseText = response.text()
    if (!botResponseText || botResponseText.trim() === '') {
      dailyGeminiRequests--
      console.warn('SERVER: Respuesta de Gemini vacía (texto):', originalUserPrompt)
      return res.json({ text: 'Parece que me quedé sin palabras 🦊. ¿Reformulas?' })
    }
    cache.set(cacheKey, { text: botResponseText, timestamp: Date.now() })
    console.log(`SERVER: Guardado en caché. Solicitudes hoy (después): ${dailyGeminiRequests}`)
    res.json({ text: botResponseText })
  } catch (error) {
    console.error('SERVER ERROR en /api/chat:', error)
    let errorMessage = 'Hubo un error procesando tu solicitud.'
    if (error.response?.promptFeedback?.blockReason) {
      errorMessage = `Tu pregunta no pudo ser procesada por la IA debido a: ${error.response.promptFeedback.blockReason}. Por favor, reformula.`
    } else if (error.message?.includes('[GoogleGenerativeAI Error]: Candidate was blocked')) {
      errorMessage = `Tu pregunta fue bloqueada por políticas de contenido. Por favor, reformula. 🦊`
    } else if (error.name === 'GoogleGenerativeAIResponseError' && error.message?.includes('429')) {
      errorMessage = 'Mi cerebro (IA) está un poco saturado. Intenta en unos momentos. 🦊'
    }
    res.status(500).json({ error: errorMessage })
  }
})

app.listen(port, () => {
  console.log(`Servidor ZolveBot escuchando en http://localhost:${port}`)
  console.log('Asegúrate de que ZOLVE_GEMINI_API_KEY está en tu .env')
  if (!OPENWEATHER_API_KEY) {
    console.warn('[AVISO] OPENWEATHER_API_KEY no configurada. API de clima no funcionará.')
  }
  console.log(`Límite de Gemini: ${MAX_DAILY_REQUESTS}/día.`)
})

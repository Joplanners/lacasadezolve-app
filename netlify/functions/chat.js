import dotenv from 'dotenv'
dotenv.config()

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

const GEMINI_API_KEY = process.env.ZOLVE_GEMINI_API_KEY
const MODEL_NAME = 'gemini-2.0-flash'
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null
const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY) : null

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
const predefinedResponsesSimple = {
  hola: '¡Hola! Soy Zolve 🦊 ¿Cómo puedo ayudarte hoy?',
  gracias: '¡De nada! 🦊',
}
function normalizeText(text) {
  if (typeof text !== 'string') return ''
  return text.toLowerCase().trim().replace(/\s+/g, ' ')
}

const MAX_DAILY_REQUESTS_CONFIG_KEY = 'gemini_chat_daily_count'
const SLEEP_MESSAGE =
  '¡Zorry! 🦊💤 Zolve ha respondido muchas preguntas hoy y necesita recargar energías. Estaré de vuelta mañana para seguir ayudándote. ¡Buenos tutos!'

export async function handler(event, _context) {
  const headers = {
    'Access-Control-Allow-Origin': event.headers?.origin || '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  }
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido.' }) }
  }

  if (!GEMINI_API_KEY || !genAI) {
    console.error('NETLIFY FUNC CHAT: ZOLVE_GEMINI_API_KEY no configurada o genAI no inicializado.')
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Configuración de IA incorrecta.' }),
    }
  }
  if (!supabase) {
    console.error(
      'NETLIFY FUNC CHAT: Cliente de Supabase no inicializado. Verifica VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env y en UI de Netlify.',
    )
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error de configuración del servidor (DB).' }),
    }
  }

  try {
    let currentCount = 0
    let maxLimit = 490
    const today = new Date().toISOString().split('T')[0]
    let { data: counterData, error: counterError } = await supabase
      .from('api_usage_counters')
      .select('current_count, last_reset_date, max_limit')
      .eq('service_name', MAX_DAILY_REQUESTS_CONFIG_KEY)
      .single()
    if (counterError && counterError.code !== 'PGRST116') {
      console.error('[Netlify Fn chat] Supabase contador SELECT error:', counterError.message)
      throw new Error('Error al verificar límite (DB read).')
    }
    if (counterData) {
      maxLimit = counterData.max_limit || maxLimit
      const lastReset = counterData.last_reset_date
      if (lastReset !== today) {
        const { error: updateError } = await supabase
          .from('api_usage_counters')
          .update({
            current_count: 0,
            last_reset_date: today,
            updated_at: new Date().toISOString(),
          })
          .eq('service_name', MAX_DAILY_REQUESTS_CONFIG_KEY)
        if (updateError) {
          console.error(
            '[Netlify Fn chat] Supabase contador UPDATE error (reset):',
            updateError.message,
          )
          throw new Error('Error al verificar límite (DB reset).')
        }
        currentCount = 0
      } else {
        currentCount = counterData.current_count
      }
    } else {
      const { error: insertError } = await supabase.from('api_usage_counters').insert({
        service_name: MAX_DAILY_REQUESTS_CONFIG_KEY,
        current_count: 0,
        last_reset_date: today,
        max_limit: maxLimit,
        updated_at: new Date().toISOString(),
      })
      if (insertError) {
        console.error('[Netlify Fn chat] Supabase contador INSERT error:', insertError.message)
        throw new Error('Error al verificar límite (DB insert).')
      }
    }
    if (currentCount >= maxLimit) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ text: SLEEP_MESSAGE, error: 'rate_limit_exceeded' }),
      }
    }

    const body = JSON.parse(event.body)
    const { systemPrompt, chatHistory, userPrompt } = body
    if (!userPrompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'userPrompt es requerido.' }),
      }
    }
    const normalizedUserPrompt = normalizeText(userPrompt)
    if (predefinedResponsesSimple[normalizedUserPrompt]) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ text: predefinedResponsesSimple[normalizedUserPrompt] }),
      }
    }

    const { error: incrementError } = await supabase
      .from('api_usage_counters')
      .update({ current_count: currentCount + 1, updated_at: new Date().toISOString() })
      .eq('service_name', MAX_DAILY_REQUESTS_CONFIG_KEY)
    if (incrementError) {
      console.error('[Netlify Fn chat] Supabase contador INCREMENT error:', incrementError.message)
    }
    currentCount++
    console.log(
      `[Netlify Fn chat] Consultando Gemini: "${userPrompt}". Solicitudes hoy (aprox): ${currentCount}/${maxLimit}`,
    )

    const model = genAI.getGenerativeModel({ model: MODEL_NAME, systemInstruction: systemPrompt })
    const chatSession = model.startChat({
      history: chatHistory || [],
      generationConfig,
      safetySettings,
    })
    const result = await chatSession.sendMessage(userPrompt)
    if (!result.response) {
      let errorMessage = 'IA no generó respuesta (objeto response nulo).'
      const candidate = result.candidates?.[0]
      if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
        errorMessage = `IA no pudo generar respuesta completa: ${candidate.finishReason}.`
        const blockedRating = candidate.safetyRatings?.find((r) => r.blocked)
        if (blockedRating) {
          errorMessage += ` Categoria Bloqueada: ${blockedRating.category}.`
        }
      }
      console.error('[Netlify Fn chat] Respuesta de Gemini vacía o error:', errorMessage, result)
      return { statusCode: 500, headers, body: JSON.stringify({ error: errorMessage }) }
    }
    const responseText = result.response.text()
    if (!responseText?.trim()) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ text: 'Parece que me quedé sin palabras 🦊. ¿Reformulas?' }),
      }
    }
    return { statusCode: 200, headers, body: JSON.stringify({ text: responseText }) }
  } catch (error) {
    console.error(
      '[Netlify Fn chat] ERROR GENERAL:',
      error.message,
      error.stack ? error.stack.split('\n').slice(0, 5).join('\n') : '',
    )
    let errorMessage = 'Hubo un error procesando tu solicitud.'
    if (error.message?.includes('[GoogleGenerativeAI Error]')) {
      errorMessage = error.message
      if (error.message.includes('Candidate was blocked')) {
        errorMessage = `Tu pregunta fue bloqueada. Por favor, reformula. 🦊`
      } else if (error.message.includes('429')) {
        errorMessage = 'Mi cerebro (IA) está saturado. Intenta en unos momentos. 🦊'
      }
    } else if (error.message) {
      errorMessage = error.message
    }
    return { statusCode: 500, headers, body: JSON.stringify({ error: errorMessage }) }
  }
}

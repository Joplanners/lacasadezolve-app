import dotenv from 'dotenv'
dotenv.config()
import fetch from 'node-fetch'

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY
const DEFAULT_CITY_QUERY = 'Santiago,CL' // Para la API
const DEFAULT_CITY_DISPLAY_NAME = 'Santiago, Chile' // Para mostrar al usuario

function getCorsOrigin(origin) {
  if (!origin) return 'https://lacasadezolve.com'
  if (
    origin === 'https://lacasadezolve.com' ||
    origin === 'https://www.lacasadezolve.com' ||
    origin.endsWith('.netlify.app') ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1')
  ) {
    return origin
  }
  return 'https://lacasadezolve.com'
}

export async function handler(event, context) {
  const origin = event.headers?.origin || event.headers?.Origin
  const headers = {
    'Access-Control-Allow-Origin': getCorsOrigin(origin),
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  }
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido.' }) }
  }
  if (!OPENWEATHER_API_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Servicio de clima no configurado.' }),
    }
  }

  const params = event.queryStringParameters || {}
  const lat = params.lat
  const lon = params.lon
  let weatherApiUrl
  let queryLocationInfo = DEFAULT_CITY_QUERY
  let isUsingDefaultCity = true

  try {
    if (lat !== undefined && lon !== undefined && lat !== '' && lon !== '') {
      const latNum = parseFloat(lat)
      const lonNum = parseFloat(lon)

      if (isNaN(latNum) || isNaN(lonNum) || latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Coordenadas inválidas.' }) }
      }

      isUsingDefaultCity = false
      weatherApiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latNum}&lon=${lonNum}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=es`
      queryLocationInfo = `coordenadas (${latNum}, ${lonNum})`
    } else {
      weatherApiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(DEFAULT_CITY_QUERY)}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=es`
    }

    const weatherResponse = await fetch(weatherApiUrl)
    if (!weatherResponse.ok) {
      const errorBody = await weatherResponse
        .json()
        .catch(() => ({ message: weatherResponse.statusText }))
      throw new Error(
        errorBody.message || `No se pudo obtener el clima (${weatherResponse.status})`,
      )
    }
    const weatherAPIData = await weatherResponse.json()
    if (!weatherAPIData.main || !weatherAPIData.weather || !weatherAPIData.weather[0]) {
      throw new Error('Respuesta de API de clima inesperada.')
    }

    const responseToFrontend = {
      city: isUsingDefaultCity ? DEFAULT_CITY_DISPLAY_NAME : weatherAPIData.name || 'Tu ubicación',
      temperature: Math.round(weatherAPIData.main.temp),
      description:
        weatherAPIData.weather[0].description.charAt(0).toUpperCase() +
        weatherAPIData.weather[0].description.slice(1),
      iconCode: weatherAPIData.weather[0].icon,
      tempMin: Math.round(weatherAPIData.main.temp_min),
      tempMax: Math.round(weatherAPIData.main.temp_max),
      usedDefault: isUsingDefaultCity,
    }
    return { statusCode: 200, headers, body: JSON.stringify(responseToFrontend) }
  } catch (error) {
    console.error('[Netlify Fn weather] ERROR GENERAL:', error.message)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error al obtener el clima.' }),
    }
  }
}

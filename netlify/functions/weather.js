import dotenv from 'dotenv'
dotenv.config()
import fetch from 'node-fetch'

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY
const DEFAULT_CITY_QUERY = 'Santiago,CL' // Para la API
const DEFAULT_CITY_DISPLAY_NAME = 'Santiago, Chile' // Para mostrar al usuario

export async function handler(event, context) {
  const headers = {
    'Access-Control-Allow-Origin':
      process.env.CONTEXT === 'production'
        ? 'https://lacasadezolve.com'
        : event.headers?.origin || '*',
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
    if (lat && lon) {
      isUsingDefaultCity = false
      weatherApiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=es`
      queryLocationInfo = `coordenadas (${lat}, ${lon})`
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
      body: JSON.stringify({ error: error.message || 'Error al obtener el clima.' }),
    }
  }
}

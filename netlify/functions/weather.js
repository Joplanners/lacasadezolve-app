import dotenv from 'dotenv'
dotenv.config()

import fetch from 'node-fetch'

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY

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
    console.error('NETLIFY FUNC WEATHER: OPENWEATHER_API_KEY no configurada.')
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Servicio de clima no configurado.' }),
    }
  }

  let clientIp =
    event.headers['x-nf-client-connection-ip'] ||
    event.headers['x-forwarded-for']?.split(',').shift() ||
    event.headers['client-ip'] ||
    event.requestContext?.identity?.sourceIp // Para AWS Lambda (Netlify usa esto a veces)

  console.log('[Netlify Fn weather] Headers recibidos:', JSON.stringify(event.headers))
  console.log('[Netlify Fn weather] IP del cliente candidata:', clientIp)

  if (!clientIp || clientIp === '127.0.0.1' || clientIp === '::1') {
    console.warn(
      '[Netlify Fn weather] No se pudo determinar una IP pública del cliente, usando IP de la función como fallback para GeoIP.',
    )
    clientIp = '' // Dejar vacío para que ip-api.com intente autodetectar desde donde se hace la request
  }

  try {
    let city = 'Santiago'
    try {
      const geoApiUrl = `http://ip-api.com/json/${clientIp}?fields=status,message,city,query,country`
      console.log(`[Netlify Fn weather] Llamando a GeoIP API: ${geoApiUrl}`)
      const geoResponse = await fetch(geoApiUrl)
      const geoData = await geoResponse.json()
      console.log('[Netlify Fn weather] Respuesta de GeoIP:', geoData)

      if (geoData.status === 'success' && geoData.city) {
        city = geoData.city
        console.log(
          `[Netlify Fn weather] Ciudad detectada por GeoIP: ${city}, País: ${geoData.country}`,
        )
      } else {
        console.warn(
          '[Netlify Fn weather] GeoIP falló o no devolvió ciudad:',
          geoData.message || 'Usando ciudad por defecto.',
        )
      }
    } catch (geoError) {
      console.error('[Netlify Fn weather] Error llamando a GeoIP API:', geoError.message)
    }

    console.log(`[Netlify Fn weather] Obteniendo clima para: ${city}`)
    const weatherApiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=es`
    const weatherResponse = await fetch(weatherApiUrl)
    if (!weatherResponse.ok) {
      const errorText = await weatherResponse.text()
      console.error(
        `[Netlify Fn weather] Error de OpenWeatherMap: ${weatherResponse.status}`,
        errorText,
      )
      throw new Error(`No se pudo obtener el clima (${weatherResponse.status}) para ${city}`)
    }
    const weatherAPIData = await weatherResponse.json()
    console.log('[Netlify Fn weather] Respuesta de OpenWeatherMap:', weatherAPIData)
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
    return { statusCode: 200, headers, body: JSON.stringify(responseToFrontend) }
  } catch (error) {
    console.error(
      '[Netlify Fn weather] ERROR GENERAL:',
      error.message,
      error.stack ? error.stack.split('\n').slice(0, 5).join('\n') : '',
    )
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Error al obtener el clima.' }),
    }
  }
}

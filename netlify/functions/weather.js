// netlify/functions/weather.js
import dotenv from 'dotenv'
dotenv.config() // Carga .env desde la raíz para netlify dev

import fetch from 'node-fetch' // Necesario para fetch en Node si tu versión es < 18

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY
// Podrías añadir un contador para la API de clima también si tiene límites estrictos,
// usando la misma tabla api_usage_counters con un service_name diferente.
// Por ahora, lo haremos directo.

export async function handler(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': event.headers?.origin || '*', // Cambia a tu dominio en producción
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS', // Solo GET para esta función
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
      body: JSON.stringify({ error: 'Servicio de clima no configurado correctamente.' }),
    }
  }

  // 1. Obtener la IP del cliente desde las cabeceras de Netlify
  // Netlify añade la IP del cliente en `x-nf-client-connection-ip`
  const ip = event.headers['x-nf-client-connection-ip'] || event.headers['client-ip'] // client-ip es un fallback que netlify dev podría usar

  console.log('[Netlify Fn weather] IP del cliente detectada:', ip)

  if (!ip) {
    console.warn('[Netlify Fn weather] No se pudo determinar la IP del cliente.')
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'No se pudo determinar tu ubicación (IP no detectada).' }),
    }
  }

  try {
    // 2. LLAMAR A UN SERVICIO DE GEOLOCALIZACIÓN POR IP
    let city = 'Santiago' // Ciudad por defecto
    try {
      // ip-api.com usa la IP de la petición si no se le pasa una IP en la URL.
      // Si la función se ejecuta en un servidor, la IP de ese servidor se usaría,
      // por lo que es mejor intentar pasar la IP del cliente.
      // Para localhost (::1 o 127.0.0.1), ip-api.com puede dar la ciudad de tu ISP.
      const clientIpForGeo =
        ip.includes(':') && (ip.startsWith('::ffff:') || ip === '::1') ? '' : ip
      const geoApiUrl = clientIpForGeo
        ? `http://ip-api.com/json/${clientIpForGeo}?fields=status,message,city,query`
        : `http://ip-api.com/json/?fields=status,message,city,query`

      console.log(`[Netlify Fn weather] Llamando a GeoIP API: ${geoApiUrl}`)
      const geoResponse = await fetch(geoApiUrl)
      const geoData = await geoResponse.json()
      console.log('[Netlify Fn weather] Respuesta de GeoIP:', geoData)

      if (geoData.status === 'success' && geoData.city) {
        city = geoData.city
      } else {
        console.warn(
          '[Netlify Fn weather] No se pudo obtener la ciudad de GeoIP:',
          geoData.message || 'Respuesta no exitosa de GeoIP. Usando ciudad por defecto.',
        )
      }
    } catch (geoError) {
      console.error('[Netlify Fn weather] Error llamando a GeoIP API:', geoError.message)
      // No detener todo, se usará la ciudad por defecto.
    }

    // 3. LLAMAR A UNA API DE CLIMA (OpenWeatherMap)
    console.log(`[Netlify Fn weather] Obteniendo clima para: ${city}`)
    const weatherApiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=es`
    const weatherResponse = await fetch(weatherApiUrl)

    if (!weatherResponse.ok) {
      const errorText = await weatherResponse.text()
      console.error(
        `[Netlify Fn weather] Error de OpenWeatherMap: ${weatherResponse.status}`,
        errorText,
      )
      throw new Error(
        `No se pudo obtener el clima de OpenWeatherMap (${weatherResponse.status}) para ${city}`,
      )
    }

    const weatherAPIData = await weatherResponse.json()
    console.log('[Netlify Fn weather] Respuesta de OpenWeatherMap:', weatherAPIData)

    if (!weatherAPIData.main || !weatherAPIData.weather || !weatherAPIData.weather[0]) {
      throw new Error('Respuesta inesperada de la API de clima.')
    }

    // 4. FORMATEAR Y ENVIAR RESPUESTA JSON AL FRONTEND
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseToFrontend),
    }
  } catch (error) {
    console.error(
      '[Netlify Fn weather] ERROR GENERAL:',
      error.message,
      error.stack ? error.stack.split('\n').slice(0, 5).join('\n') : '',
    )
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Error interno al obtener el clima.' }),
    }
  }
}

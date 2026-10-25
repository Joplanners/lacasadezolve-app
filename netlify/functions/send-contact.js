// Archivo: netlify/functions/send-contact.js

import { Resend } from 'resend'

function escapeHtml(text) {
  if (typeof text !== 'string') return ''
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Inicializamos Resend con la API Key que guardamos en las variables de entorno
const resend = new Resend(process.env.RESEND_API_KEY)

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

export async function handler(event) {
  const origin = event.headers?.origin || event.headers?.Origin
  const headers = {
    'Access-Control-Allow-Origin': getCorsOrigin(origin),
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  // Solo permitir peticiones de tipo POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')

    // Honeypot anti-spam: si un bot llena este campo trampa, simulamos éxito sin enviar correo
    if (body.website) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Mensaje enviado con éxito.' }),
      }
    }

    const { name, email, message } = body

    // Validación simple para asegurarnos que los datos llegaron
    if (!name || !email || !message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Por favor, completa todos los campos.' }),
      }
    }

    // Sanitizar contra CRLF injection en subject o headers
    const sanitizedName = escapeHtml(name.replace(/[\r\n]/g, ' ').trim().slice(0, 100))
    const sanitizedEmail = email.replace(/[\r\n]/g, '').trim().slice(0, 150)
    const sanitizedMessage = escapeHtml(message.trim().slice(0, 5000)).replace(/\n/g, '<br>')

    // Usamos Resend para enviar el correo
    await resend.emails.send({
      from: 'Formulario Web <formulario@lacasadezolve.com>',
      to: 'zolve.santiago@gmail.com',
      subject: `Nuevo Mensaje de Contacto de: ${sanitizedName}`,
      reply_to: sanitizedEmail,
      html: `
        <h2>Nuevo Mensaje desde lacasadezolve.com</h2>
        <p><strong>Nombre:</strong> ${sanitizedName}</p>
        <p><strong>Correo del remitente:</strong> ${escapeHtml(sanitizedEmail)}</p>
        <hr>
        <h3>Mensaje:</h3>
        <p>${sanitizedMessage}</p>
      `,
    })

    // Si todo sale bien, enviamos una respuesta de éxito al frontend
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Mensaje enviado con éxito.' }),
    }
  } catch (error) {
    console.error('Error en la función send-contact:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Lo sentimos, no se pudo enviar el mensaje en este momento.' }),
    }
  }
}

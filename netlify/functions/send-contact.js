// Archivo: netlify/functions/send-contact.js

import { Resend } from 'resend'

// Inicializamos Resend con la API Key que guardamos en las variables de entorno
const resend = new Resend(process.env.RESEND_API_KEY)

export async function handler(event) {
  // Solo permitir peticiones de tipo POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método no permitido' }
  }

  try {
    // Extraemos los datos del formulario que vienen del frontend
    const { name, email, message } = JSON.parse(event.body)

    // Validación simple para asegurarnos que los datos llegaron
    if (!name || !email || !message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Por favor, completa todos los campos.' }),
      }
    }

    // Usamos Resend para enviar el correo
    await resend.emails.send({
      from: 'Formulario Web <formulario@lacasadezolve.com>', // Resend recomienda usar este remitente en el plan gratuito
      to: 'zolve.santiago@gmail.com', // ¡Tu correo personal a donde llegarán los mensajes!
      subject: `Nuevo Mensaje de Contacto de: ${name}`,
      reply_to: email, // Esto hace que al darle "Responder" en tu Gmail, le respondas al cliente.
      html: `
        <h2>Nuevo Mensaje desde lacasadezolve.com</h2>
        <p><strong>Nombre:</strong> ${name}</p>
        <p><strong>Correo del remitente:</strong> ${email}</p>
        <hr>
        <h3>Mensaje:</h3>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `,
    })

    // Si todo sale bien, enviamos una respuesta de éxito al frontend
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Mensaje enviado con éxito.' }),
    }
  } catch (error) {
    console.error('Error en la función send-contact:', error)
    // Si algo falla, enviamos una respuesta de error al frontend
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Lo sentimos, no se pudo enviar el mensaje en este momento.' }),
    }
  }
}

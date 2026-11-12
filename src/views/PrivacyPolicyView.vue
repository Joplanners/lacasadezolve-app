<script setup>
import { RouterLink } from 'vue-router'
import { useSeoMeta } from '@/composables/useSeoMeta'

useSeoMeta({
  title: 'Política de Privacidad',
  description:
    'Conoce cómo La Casa de Zolve SpA protege tu información personal, tus datos y tu privacidad bajo la Ley 19.628 y Ley 21.719.',
  url: '/politica-de-privacidad',
})
</script>

<template>
  <div class="legal-page-container">
    <h1>Política de Privacidad y Protección de Datos Personales</h1>
    <p class="last-updated">Última actualización: 11 de noviembre de 2026</p>

    <h2>I. Introducción y Responsable del Tratamiento</h2>
    <p>
      La privacidad y protección de los datos personales de los visitantes y compradores de nuestro
      sitio web www.lacasadezolve.com es una prioridad para nosotros. Esta política explica de
      manera transparente cómo <strong>La Casa de Zolve SpA</strong> (RUT N° 77.446.775-0, con
      domicilio legal en Eulogía Sánchez 065, Providencia, Santiago, Chile, representada legalmente
      por Doña Jacqueline Alejandra Vásquez Diabuno, correo de contacto
      <strong>contacto@lacasadezolve.com</strong>) recopila, almacena, protege y elimina su
      información personal, en estricto cumplimiento de la <strong>Ley N° 19.628</strong> sobre
      Protección de la Vida Privada y sus modificaciones introducidas por la
      <strong>Ley N° 21.719</strong> sobre Protección de Datos Personales de la República de Chile.
    </p>

    <h2>II. ¿Qué Datos Personales Recopilamos y con qué Finalidad?</h2>
    <p>
      Aplicamos el principio de minimización de datos: únicamente solicitamos los datos
      estrictamente indispensables para prestar nuestros servicios:
    </p>
    <ol>
      <li>
        <strong>Datos de Compra y Despacho (Nombre, RUT, Correo Electrónico, Teléfono y Dirección):</strong>
        Solicitamos estos datos en el proceso de pago (Checkout)
        <strong
          >única y exclusivamente para individualizar a la persona que realiza la compra, procesar
          el pago electrónico, emitir la documentación tributaria correspondiente y gestionar el
          despacho del pedido a su domicilio o sucursal</strong
        >
        (o habilitar sus descargas en el caso de productos digitales). De forma completamente
        opcional, cuando exista un sorteo promocional activo en el sitio, el comprador podrá indicar
        su usuario de Instagram (<code>@usuario</code>) con el único fin de participar e
        identificarle en dicho sorteo.
      </li>
      <li>
        <strong>Datos de Registro y Perfil de Usuario ("Mi Perfil"):</strong>
        Si usted decide crear una cuenta en nuestro sitio web (mediante correo y contraseña o inicio
        de sesión con Google OAuth), sus datos de identificación y su dirección de envío se
        almacenan en nuestra base de datos segura provista por <strong>Supabase</strong> con el
        <strong>único fin de facilitar sus futuras compras</strong> (evitando que deba escribirlos
        cada vez), permitirle revisar el estado de sus pedidos y mantener disponibles sus archivos
        digitales descargables.
      </li>
      <li>
        <strong>Archivos para Productos Personalizados:</strong>
        Las imágenes, fotografías o indicaciones que usted sube voluntariamente al adquirir un
        producto personalizado se almacenan de forma segura en infraestructura de
        <strong>Cloudflare R2 / Supabase Storage</strong> y se utilizan
        <strong>exclusivamente para confeccionar su pedido</strong>. Jamás las publicamos ni
        compartimos con terceros sin su autorización expresa.
      </li>
      <li>
        <strong>Información de Pagos (Webpay Plus):</strong>
        Todos los pagos nacionales en línea son procesados directamente por
        <strong>Transbank (Webpay Plus)</strong> bajo estándares bancarios cifrados.
        <strong>La Casa de Zolve SpA jamás accede ni almacena los números completos de sus tarjetas
        de crédito, débito o códigos CVV.</strong>
      </li>
      <li>
        <strong>Datos de Navegación, Analítica (GA4) y Atribución de Campañas:</strong>
        Previo consentimiento otorgado en nuestro banner de cookies, utilizamos
        <strong>Google Analytics 4 (GA4)</strong> (con anonimización de IP) y métricas de atribución
        de tráfico (como visitas provenientes de nuestras campañas o perfiles en Instagram, Facebook
        y buscadores en Google Search Console) con fines puramente estadísticos para conocer qué
        productos interesan a nuestros visitantes y mejorar la experiencia del sitio.
      </li>
      <li>
        <strong>Comunicaciones de Contacto y Asistente Virtual (ZolveBot):</strong>
        Los mensajes enviados a <strong>contacto@lacasadezolve.com</strong> se utilizan solo para
        responder su consulta. Por su parte, las consultas realizadas en nuestro chat interactivo
        <strong>ZolveBot</strong> se procesan en tiempo real a través de los
        <strong>servidores de Google LLC (API de Google Gemini)</strong> únicamente para generar la
        respuesta orientativa durante su sesión de navegación.
        <strong
          >La Casa de Zolve SpA NO guarda, registra ni almacena en ninguna base de datos los
          mensajes, nombres ni los datos de la interacción con el bot</strong
        >
        (la conversación desaparece por completo al cerrar o recargar la página). Aun así,
        recomendamos no ingresar datos personales sensibles ni contraseñas en el chat.
      </li>
    </ol>

    <h2>III. Prohibición Absoluta de Venta o Comercialización de Datos</h2>
    <p>
      <strong
        >La Casa de Zolve SpA declara expresamente que JAMÁS vende, arrienda, cede ni comercializa
        los datos personales de sus usuarios, clientes o visitantes a terceros bajo ninguna
        modalidad.</strong
      >
    </p>

    <h2>IV. Encargados de Tratamiento y Proveedores Tecnológicos</h2>
    <p>
      Para que nuestra tienda en línea funcione de forma segura, utilizamos proveedores tecnológicos
      de primer nivel que actúan como encargados de tratamiento bajo estrictos estándares de
      seguridad y confidencialidad:
    </p>
    <ul>
      <li><strong>Supabase:</strong> Base de datos segura y sistema de autenticación de usuarios.</li>
      <li><strong>Netlify:</strong> Alojamiento (hosting) y despliegue del sitio web.</li>
      <li><strong>Cloudflare / Cloudflare R2:</strong> Seguridad perimetral y almacenamiento seguro de archivos digitales.</li>
      <li><strong>Transbank (Webpay Plus):</strong> Procesamiento seguro de pagos con tarjetas en Chile.</li>
      <li><strong>Resend:</strong> Envío de correos transaccionales de confirmación de compra.</li>
      <li><strong>Paket y Starken (Empresas de Courier):</strong> Transporte y entrega de pedidos físicos (<strong>Paket</strong> para despachos dentro de la Región Metropolitana y <strong>Starken</strong> para envíos a regiones; reciben únicamente el nombre, teléfono y dirección de destino indispensables para entregar el paquete).</li>
      <li><strong>Google LLC:</strong> Google Analytics 4 / Search Console (estadísticas web sujetas a su configuración de cookies), Google OAuth (inicio de sesión opcional) y procesamiento en tiempo real en los servidores de Google (API de Google Gemini) para las respuestas del chat <strong>ZolveBot</strong>, sin almacenamiento de las conversaciones en nuestra base de datos.</li>
    </ul>

    <h2>V. Transferencias Internacionales de Datos</h2>
    <p>
      Dado que proveedores globales de infraestructura en la nube como Supabase, Netlify, Cloudflare,
      Resend y Google operan servidores ubicados principalmente en Estados Unidos y la Unión Europea,
      el uso del sitio conlleva el alojamiento técnico de datos en dichos servidores internacionales,
      los cuales cuentan con certificaciones internacionales de seguridad (ISO 27001 / SOC 2) y
      estándares de protección adecuados conforme a la Ley N° 21.719.
    </p>

    <h2>VI. Plazo de Conservación de los Datos Personales (Límite de 1 Año por Inactividad)</h2>
    <p>
      En cumplimiento del principio de limitación del plazo de conservación de la
      <strong>Ley N° 21.719</strong>:
    </p>
    <ol>
      <li>
        <strong>Cuentas de Usuario:</strong> Los datos personales guardados en su perfil se
        conservarán mientras usted mantenga su cuenta activa. Si una cuenta permanece sin actividad
        por un período continuo superior a <strong>doce (12) meses (1 año)</strong> sin que medie
        renovación del consentimiento del titular, <strong>La Casa de Zolve SpA</strong> procederá a
        la eliminación o anonimización de los datos del perfil.
      </li>
      <li>
        <strong>Archivos de Personalización:</strong> Las imágenes enviadas para confeccionar un
        producto personalizado se conservan únicamente durante la fabricación, entrega y el plazo de
        garantía legal del pedido, eliminándose posteriormente de forma segura.
      </li>
      <li>
        <strong>Obligaciones Legales y Tributarias:</strong> Los datos estrictamente asociados a
        comprobantes de venta y facturación se conservarán por el plazo exigido por la legislación
        tributaria chilena ante el Servicio de Impuestos Internos (SII).
      </li>
    </ol>

    <h2>VII. ¿Cómo Solicitar el Borrado de sus Datos Personales o Eliminar su Cuenta Definitivamente?</h2>
    <p>
      Usted es dueño(a) de sus datos personales y puede eliminarlos de nuestra base de datos en
      <strong>Supabase</strong> en cualquier momento y sin costo a través de cualquiera de estos dos
      mecanismos directos:
    </p>
    <ol>
      <li>
        <strong>Desde su panel "Mi Perfil" (Eliminación inmediata con Switch):</strong>
        Inicie sesión en www.lacasadezolve.com, ingrese a <strong>"Mi Perfil"</strong> y baje hasta
        el final de la página a la sección
        <em>"Privacidad y Eliminación de Datos Personales"</em>. Active el interruptor
        (<strong>switch</strong>) de confirmación y presione el botón
        <strong>"Eliminar mi cuenta definitivamente"</strong>. Sus datos de perfil se borrarán de
        inmediato de nuestra base de datos y su sesión quedará cerrada.
      </li>
      <li>
        <strong>Por Correo Electrónico:</strong>
        Envíe un correo electrónico a <strong>contacto@lacasadezolve.com</strong> indicando en el
        asunto <strong><code>BORRAR DATOS PERSONALES</code></strong> e incluyendo en el cuerpo del
        mensaje su <strong>nombre completo y correo electrónico registrado</strong> para poder
        individualizar su cuenta y eliminar definitivamente sus registros de nuestra base de datos.
      </li>
    </ol>

    <h2>VIII. Ejercicio de Derechos ARSOP+ (Ley N° 19.628 y Ley N° 21.719)</h2>
    <p>
      Como titular de datos personales, usted puede ejercer gratuitamente en cualquier momento sus
      derechos legales:
    </p>
    <ul>
      <li><strong>Acceso:</strong> Conocer qué datos suyos tratamos y su finalidad.</li>
      <li><strong>Rectificación:</strong> Corregir o actualizar datos inexactos o incompletos (directamente en "Mi Perfil" o por correo).</li>
      <li><strong>Supresión (Cancelación):</strong> Eliminar sus datos personales y su cuenta cuando lo desee.</li>
      <li><strong>Oposición y Bloqueo:</strong> Oponerse a tratamientos específicos o solicitar la suspensión temporal de sus datos.</li>
      <li><strong>Portabilidad:</strong> Solicitar copia electrónica estructurada de sus datos personales.</li>
      <li><strong>Revocación del Consentimiento:</strong> Retirar su consentimiento en cualquier momento (por ejemplo, para cookies desde el botón "Preferencias de Cookies" en el pie de página).</li>
    </ul>
    <p>
      Todas las solicitudes son atendidas gratuitamente en
      <strong>contacto@lacasadezolve.com</strong> dentro de los plazos establecidos por la ley
      chilena.
    </p>

    <h2>IX. Cookies y Tecnologías Similares</h2>
    <p>
      Para conocer en detalle cómo funcionan las cookies esenciales, analíticas (GA4) y de campañas
      en redes sociales, y cómo activarlas o desactivarlas desde nuestro submenú de configuración,
      consulte nuestra
      <router-link :to="{ name: 'cookies-policy' }">Política de Cookies</router-link>.
    </p>

    <div class="back-link">
      <router-link :to="{ name: 'home' }">Volver al Inicio</router-link>
    </div>
  </div>
</template>

<style scoped>
.legal-page-container {
  max-width: 800px;
  margin: 40px auto;
  padding: 25px 35px;
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  min-height: 60vh;
  font-family: var(--font-family-base);
  color: var(--color-text);
}
.legal-page-container h1 {
  text-align: center;
  margin-bottom: 10px;
  color: var(--color-heading);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 15px;
  font-size: 1.8rem;
}
.last-updated {
  text-align: center;
  font-size: 0.85em;
  color: #666;
  margin-bottom: 30px;
}
.legal-page-container h2 {
  margin-top: 2em;
  margin-bottom: 1em;
  font-size: 1.4rem;
  color: var(--color-heading);
  border-bottom: 1px solid #eee;
  padding-bottom: 0.3em;
  font-weight: var(--font-weight-bold);
}

.legal-page-container p,
.legal-page-container li {
  text-align: justify;
  line-height: 1.8;
  margin-bottom: 1em;
}
.legal-page-container ol,
.legal-page-container ul {
  margin-left: 25px;
  margin-bottom: 1em;
  padding-left: 15px;
}
.legal-page-container ol {
  list-style-type: decimal;
}
.legal-page-container ul {
  list-style-type: disc;
}
.legal-page-container strong {
  font-weight: var(--font-weight-bold);
}

.back-link {
  text-align: center;
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border);
}
.back-link a {
  color: var(--color-link);
  text-decoration: none;
  font-weight: var(--font-weight-medium);
}
.back-link a:hover {
  color: var(--color-link-hover);
  text-decoration: underline;
}

@media (max-width: 820px) {
  .legal-page-container {
    padding: 20px 25px;
  }
}

@media (max-width: 600px) {
  .legal-page-container {
    width: 95%;
    margin: 20px auto;
    padding: 20px 15px;
    min-height: unset;
    border: none;
    background-color: var(--color-background);
  }

  .legal-page-container h1 {
    font-size: 1.5rem;
    margin-bottom: 10px;
    padding-bottom: 10px;
  }

  .legal-page-container h2 {
    font-size: 1.2rem;
    margin-top: 1.5em;
    margin-bottom: 0.8em;
  }

  .legal-page-container p,
  .legal-page-container li {
    font-size: 0.95rem;
    line-height: 1.7;
    text-align: left;
  }

  .legal-page-container ol,
  .legal-page-container ul {
    margin-left: 20px;
    padding-left: 10px;
  }
  .last-updated {
    font-size: 0.8rem;
    margin-bottom: 20px;
  }
  .back-link {
    margin-top: 30px;
    padding-top: 15px;
  }
}
</style>

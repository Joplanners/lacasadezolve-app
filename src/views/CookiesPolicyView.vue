<script setup>
import { RouterLink } from 'vue-router'
import { useSeoMeta } from '@/composables/useSeoMeta'
import { openCookiePreferences } from '@/ga4'

useSeoMeta({
  title: 'Política de Cookies',
  description:
    'Información sobre las cookies que utiliza La Casa de Zolve, incluyendo Google Analytics 4 (GA4), sus fines y cómo puedes gestionarlas.',
  url: '/politica-de-cookies',
})
</script>

<template>
  <div class="legal-page-container">
    <h1>Política de Cookies</h1>
    <p class="last-updated">Última actualización: 11 de noviembre de 2026</p>
    <h2>¿Qué es esta política?</h2>
    <p>
      Esta Política de Cookies explica cómo <strong>La Casa de Zolve SpA</strong> ("nosotros", "nos"
      o "nuestro") utiliza cookies y tecnologías similares para reconocerte cuando visitas nuestro
      sitio web en www.lacasadezolve.com ("Sitio Web"). Explica qué son estas tecnologías y por qué
      las utilizamos, así como tus derechos para controlar el uso que hacemos de ellas.
    </p>
    <p>
      En algunos casos, podemos utilizar cookies que recopilen información que podría considerarse
      personal si se combina con otra información. Para más detalles sobre cómo tratamos tu
      información personal, por favor consulta nuestra
      <router-link :to="{ name: 'privacy-policy' }">Política de Privacidad</router-link>.
    </p>

    <h2>¿Qué son las cookies?</h2>
    <p>
      Las cookies son pequeños archivos de datos que se colocan en tu ordenador o dispositivo móvil
      cuando visitas un sitio web. Los propietarios de sitios web utilizan ampliamente las cookies
      para que sus sitios web funcionen, o para que lo hagan de forma más eficiente, así como para
      proporcionar información de informes.
    </p>
    <p>
      Las cookies establecidas por nosotros (<strong>La Casa de Zolve SpA</strong>) se denominan
      "cookies de origen". Las cookies establecidas por partes distintas a nosotros se denominan
      "cookies de terceros". Las cookies de terceros permiten ofrecer características o
      funcionalidades de terceros en o a través del sitio web (por ejemplo, análisis o funciones de
      proveedores de servicios). Las partes que establecen estas cookies de terceros pueden
      reconocer tu dispositivo cuando visita nuestro Sitio Web y también cuando visita otros sitios
      web que utilizan sus servicios.
    </p>

    <h2>¿Por qué utilizamos cookies?</h2>
    <p>
      Utilizamos cookies de origen y podríamos interactuar con cookies de terceros por varias
      razones:
    </p>
    <ul>
      <li>
        <strong>Cookies Esenciales (Siempre activas):</strong> Algunas cookies y tecnologías de
        almacenamiento local son técnicamente necesarias para que nuestro Sitio Web funcione
        correctamente, para mantener la seguridad y para permitirte iniciar sesión, gestionar tu
        carrito de compras, acceder a tu perfil y recordar tus preferencias de privacidad. Nos
        referimos a ellas como cookies "esenciales" o "estrictamente necesarias". Principalmente,
        nuestro proveedor de autenticación <strong>Supabase</strong> utiliza almacenamiento local
        (<code>localStorage</code>) para gestionar tu sesión de forma segura.
      </li>
      <li>
        <strong>Cookies de Rendimiento e Infraestructura (Limitadas):</strong> Nuestros proveedores
        de infraestructura tecnológica (como <strong>Netlify</strong> y <strong>Cloudflare</strong>)
        pueden emplear cookies técnicas de seguridad y balanceo para proteger el Sitio Web contra
        accesos automatizados maliciosos y garantizar la entrega rápida de archivos e imágenes.
      </li>
      <li>
        <strong>Cookies Analíticas y de Estadística (Google Analytics 4 y Search Console):</strong>
        Utilizamos <strong>Google Analytics 4 (GA4)</strong> y métricas de
        <strong>Google Search Console</strong>, provistos por Google LLC, para comprender de forma
        estadística y agregada cómo los visitantes encuentran e interactúan con nuestro Sitio Web
        (por ejemplo, búsquedas en Google, páginas más visitadas, tiempo de permanencia, país o
        ciudad aproximada de origen y confirmación de compras reales pagadas). GA4 utiliza cookies
        de origen como <code>_ga</code> y <code>_ga_*</code> (con una duración estándar de hasta 2
        años) y opera con anonimización de direcciones IP. Estas cookies analíticas
        <strong
          >solo se activan si otorgas tu consentimiento explícito en nuestro banner de
          cookies</strong
        >
        (parámetro <code>analytics_storage</code> de <em>Google Consent Mode v2</em>). Si
        seleccionas "Solo esenciales" o desactivas esta categoría en el panel "Configurar", las
        cookies de GA4 permanecen desactivadas.
      </li>
      <li>
        <strong
          >Cookies de Campañas y Redes Sociales (Meta / Instagram / Facebook / Ads):</strong
        >
        Realizamos campañas de difusión y publicidad en plataformas como
        <strong>Instagram y Facebook (Meta Platforms, Inc.)</strong> y buscadores. Cuando visitas
        nuestro Sitio Web desde un anuncio o enlace en redes sociales, estas tecnologías o
        parámetros de atribución (controlados mediante <code>ad_storage</code>,
        <code>ad_user_data</code> y <code>ad_personalization</code> en
        <em>Google Consent Mode v2</em>, o píxeles de conversión si se implementan) nos permiten
        medir la efectividad de nuestras campañas publicitarias y saber qué publicaciones generan
        interés real.
        <strong
          >Estas cookies están desactivadas por defecto y solo se activan si las autorizas
          explícitamente</strong
        >
        al hacer clic en "Aceptar todas" o al habilitar el interruptor "Cookies de Campañas y Redes
        Sociales" en el submenú <strong>"⚙️ Configurar"</strong> de nuestro banner de cookies.
      </li>
    </ul>

    <h2>¿Cómo puedo controlar las cookies?</h2>
    <p>Tienes derecho a decidir si aceptas o rechazas las cookies no esenciales.</p>
    <ul>
      <li>
        <strong>Controles del Navegador:</strong> La mayoría de los navegadores web te permiten
        controlar las cookies a través de la configuración. Puedes configurar tu navegador para que
        acepte, rechace o te notifique cuando se instala una cookie. Los medios para hacerlo varían
        de un navegador a otro, por lo que debes visitar el menú de ayuda de tu navegador para
        obtener más información. A continuación, se ofrecen enlaces sobre cómo gestionar las cookies
        en los navegadores más populares:
        <ul>
          <li>
            <a
              href="https://support.google.com/chrome/answer/95647"
              target="_blank"
              rel="noopener noreferrer"
              >Chrome</a
            >
          </li>
          <li>
            <a
              href="https://support.microsoft.com/es-es/windows/eliminar-y-administrar-cookies-168dab11-0753-043d-7c16-ede5947fc64d"
              target="_blank"
              rel="noopener noreferrer"
              >Internet Explorer / Edge</a
            >
          </li>
          <li>
            <a
              href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias"
              target="_blank"
              rel="noopener noreferrer"
              >Firefox</a
            >
          </li>
          <li>
            <a
              href="https://support.apple.com/es-es/guide/safari/sfri11471/mac"
              target="_blank"
              rel="noopener noreferrer"
              >Safari</a
            >
          </li>
          <li>
            <a
              href="https://help.opera.com/en/latest/web-preferences/#cookies"
              target="_blank"
              rel="noopener noreferrer"
              >Opera</a
            >
          </li>
        </ul>
      </li>
      <li>
        <strong>Banner de Consentimiento Granular y Gestión de Preferencias:</strong> En
        cumplimiento con la normativa chilena sobre Protección de Datos Personales (Ley N° 19.628 y
        su reforma mediante la Ley N° 21.719), nuestro Sitio Web cuenta con un banner de
        consentimiento con un submenú desplegable (<strong>"⚙️ Configurar"</strong>) que te permite
        elegir de forma granular e independiente si deseas activar las
        <em>Cookies Analíticas y de Estadística</em> y/o las
        <em>Cookies de Campañas y Redes Sociales</em>, aceptar todas o mantener únicamente las
        esenciales. Además, puedes modificar o revocar tu consentimiento en cualquier momento
        haciendo clic en el enlace "Preferencias de Cookies" del pie de página o directamente aquí:
        <div style="margin-top: 10px">
          <button type="button" class="btn-reopen-cookies" @click="openCookiePreferences">
            ⚙️ Configurar mis preferencias de cookies
          </button>
        </div>
      </li>
    </ul>
    <p>
      Bloquear o eliminar cookies opcionales no afectará tu capacidad de navegar o comprar en
      nuestro Sitio Web. Sin embargo, bloquear las cookies esenciales del navegador puede impedir el
      funcionamiento del inicio de sesión y del carrito de compras.
    </p>

    <h2>¿Qué ocurre con otras tecnologías de rastreo, como el almacenamiento local?</h2>
    <p>
      Las cookies no son la única forma de reconocer o recordar preferencias de navegación. Nuestro
      proveedor de autenticación, <strong>Supabase</strong>, utiliza el
      <strong>Almacenamiento Local (<code>localStorage</code>)</strong> del navegador para gestionar
      de forma segura tu sesión de usuario, y nuestro Sitio Web también utiliza
      <code>localStorage</code> para recordar el estado de tu carrito de compras, tus preferencias
      de cookies (<code>zolve_cookie_consent_v1</code>) y evitar duplicar el conteo estadístico de
      un mismo pedido pagado. El tratamiento de esta información se rige por nuestra
      <router-link :to="{ name: 'privacy-policy' }">Política de Privacidad</router-link>.
    </p>

    <h2>¿Qué ocurre con la medición de campañas publicitarias y redes sociales?</h2>
    <p>
      <strong>La Casa de Zolve SpA</strong> nunca vende, arrienda ni comercializa tus datos
      personales a terceros, ni muestra anuncios de terceros dentro de este Sitio Web. No obstante,
      cuando realizamos campañas propias de difusión en plataformas como
      <strong>Instagram o Facebook (Meta)</strong>, la categoría opcional de
      <em>Cookies de Campañas y Redes Sociales</em> nos ayuda a medir de forma estadística cuántas
      visitas o compras provienen de dichas publicaciones. Estas funciones permanecen bloqueadas por
      defecto a menos que otorgues tu consentimiento expreso en el banner de cookies. Asimismo, los
      enlaces externos hacia nuestras redes sociales o hacia la pasarela de pago
      <strong>Transbank Webpay Plus</strong> se rigen por las políticas de privacidad y cookies de
      sus respectivas plataformas.
    </p>

    <h2>¿Con qué frecuencia actualizarán esta Política de Cookies?</h2>
    <p>
      Es posible que actualicemos esta Política de Cookies de vez en cuando para reflejar, por
      ejemplo, cambios en las cookies que utilizamos o por otras razones operativas, legales o
      reglamentarias. Por lo tanto, te rogamos que visites periódicamente esta página para
      mantenerte informado sobre el uso que hacemos de las cookies y tecnologías relacionadas. La
      fecha en la parte superior indica cuándo se actualizó por última vez.
    </p>

    <h2>¿Dónde puedo obtener más información?</h2>
    <p>
      Si tienes alguna pregunta sobre nuestro uso de cookies u otras tecnologías, envíanos un correo
      electrónico a contacto@lacasadezolve.com.
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
.legal-page-container ul {
  list-style-type: disc;
  margin-left: 25px;
  margin-bottom: 1em;
  padding-left: 15px;
}
.legal-page-container ul ul {
  list-style-type: circle;
  margin-top: 0.5em;
} /* Para listas anidadas */
.legal-page-container ol {
  list-style-type: decimal;
  margin-left: 25px;
  margin-bottom: 1em;
  padding-left: 15px;
}
.legal-page-container strong {
  font-weight: var(--font-weight-bold);
}
.legal-page-container a {
  color: var(--color-link);
  text-decoration: none;
}
.legal-page-container a:hover {
  color: var(--color-link-hover);
  text-decoration: underline;
}
.back-link {
  text-align: center;
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border);
}
.back-link a {
  font-weight: var(--font-weight-medium);
}

.btn-reopen-cookies {
  background-color: var(--brand-pink, #f06292);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.btn-reopen-cookies:hover {
  opacity: 0.9;
}

/* === AÑADE ESTO AL FINAL DEL <style scoped> DE CADA VISTA LEGAL === */

@media (max-width: 820px) {
  /* Ligeramente antes de que 800px sea el 100% */
  .legal-page-container {
    /* width: 90%; */ /* Si quieres que ocupe más de la pantalla en tablets */
    padding: 20px 25px;
  }
}

@media (max-width: 600px) {
  .legal-page-container {
    width: 95%;
    margin: 20px auto;
    padding: 20px 15px; /* Menos padding lateral en móviles */
    min-height: unset; /* Quitar min-height si no es necesario */
    border: none; /* Opcional: quitar borde en móvil */
    background-color: var(--color-background); /* Opcional: quitar el fondo suave */
  }

  .legal-page-container h1 {
    font-size: 1.5rem; /* Reducir tamaño de H1 */
    margin-bottom: 20px;
    padding-bottom: 10px;
  }

  .legal-page-container h2 {
    font-size: 1.2rem; /* Reducir tamaño de H2 */
    margin-top: 1.5em;
    margin-bottom: 0.8em;
  }

  .legal-page-container h3 {
    font-size: 1.1rem;
    margin-top: 1.2em;
    margin-bottom: 0.6em;
  }
  .legal-page-container h4 {
    font-size: 1rem;
    margin-top: 1em;
    margin-bottom: 0.5em;
  }

  .legal-page-container p,
  .legal-page-container li {
    font-size: 0.95rem; /* Ligeramente más pequeño si es necesario */
    line-height: 1.7;
    text-align: left; /* Alinear a la izquierda en móvil suele ser más legible que justificado */
  }

  .legal-page-container ol,
  .legal-page-container ul {
    margin-left: 20px; /* Menos indentación */
    padding-left: 10px; /* Ajustar padding si es necesario */
  }
  .last-updated {
    /* Para CookiesPolicyView si lo tienes */
    font-size: 0.8rem;
    margin-bottom: 20px;
  }
  .back-link {
    /* Para el enlace de volver */
    margin-top: 30px;
    padding-top: 15px;
  }
}
</style>

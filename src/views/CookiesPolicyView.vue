<script setup>
import { RouterLink } from 'vue-router'
</script>
<template>
  <div class="legal-page-container">
    <h1>Política de Cookies</h1>
    <p class="last-updated">Última actualización: 08 de Mayo de 2025</p>
    <h2>¿Qué es esta política?</h2>
    <p>
      Esta Política de Cookies explica cómo La Casa de Zolve ("nosotros", "nos" o "nuestro") utiliza
      cookies y tecnologías similares para reconocerte cuando visitas nuestro sitio web en
      www.lacasadezolve.com ("Sitio Web"). Explica qué son estas tecnologías y por qué las
      utilizamos, así como tus derechos para controlar el uso que hacemos de ellas.
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
      Las cookies establecidas por nosotros (La Casa de Zolve) se denominan "cookies de origen". Las
      cookies establecidas por partes distintas a nosotros se denominan "cookies de terceros". Las
      cookies de terceros permiten ofrecer características o funcionalidades de terceros en o a
      través del sitio web (por ejemplo, análisis o funciones de proveedores de servicios). Las
      partes que establecen estas cookies de terceros pueden reconocer tu dispositivo cuando visita
      nuestro Sitio Web y también cuando visita otros sitios web que utilizan sus servicios.
    </p>

    <h2>¿Por qué utilizamos cookies?</h2>
    <p>
      Utilizamos cookies de origen y podríamos interactuar con cookies de terceros por varias
      razones:
    </p>
    <ul>
      <li>
        <strong>Cookies Esenciales:</strong> Algunas cookies son técnicamente necesarias para que
        nuestro Sitio Web funcione correctamente, para mantener la seguridad y para permitirte
        iniciar sesión y utilizar las funciones básicas (como el acceso a tu perfil y a las
        experiencias de Realidad Aumentada). Nos referimos a ellas como cookies "esenciales" o
        "estrictamente necesarias". Principalmente, nuestro proveedor de autenticación Supabase
        utiliza almacenamiento local, que funciona de manera similar a las cookies, para gestionar
        tu sesión de forma segura.
      </li>
      <li>
        <strong>Cookies de Rendimiento y Funcionalidad (Limitadas):</strong> Podríamos utilizar
        cookies (o tecnologías similares empleadas por nuestros proveedores de infraestructura como
        Netlify o Cloudflare) para mejorar el rendimiento y la funcionalidad básica de nuestro Sitio
        Web, pero actualmente no son esenciales para su uso principal.
      </li>
      <li>
        <strong>Cookies Analíticas (Limitadas/Futuras):</strong> Actualmente, solo utilizamos datos
        agregados y anónimos proporcionados por nuestros servicios de hosting (Netlify/Cloudflare)
        para entender de forma general cómo se usa nuestro sitio. No utilizamos herramientas de
        terceros como Google Analytics que instalen cookies de seguimiento detallado en este
        momento. Si decidiéramos implementarlas en el futuro, solicitaremos tu consentimiento
        explícito previo a través de nuestro banner de cookies.
      </li>
      <li>
        <strong>Otras Cookies (Publicidad, Redes Sociales, etc.):</strong> No utilizamos
        directamente cookies con fines publicitarios dirigidos en nuestro Sitio Web. Tampoco
        incrustamos widgets de redes sociales que instalen cookies de seguimiento directamente. Los
        enlaces a nuestras redes sociales te llevan a sus plataformas, las cuales tienen sus propias
        políticas de cookies.
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
        <strong>Banner de Consentimiento (Próximamente):</strong> Implementaremos un banner de
        consentimiento de cookies en nuestro Sitio Web. Este banner te permitirá aceptar o rechazar
        categorías específicas de cookies no esenciales antes de que se activen. Las cookies
        esenciales no se pueden rechazar, ya que son necesarias para proporcionar los servicios que
        solicitas (como mantener tu sesión iniciada).
      </li>
    </ul>
    <p>
      Bloquear o eliminar cookies puede tener un impacto negativo en la usabilidad de nuestro Sitio
      Web, y algunas funciones podrían no estar disponibles si rechazas ciertas cookies
      (especialmente las esenciales relacionadas con el inicio de sesión).
    </p>

    <h2>¿Qué ocurre con otras tecnologías de rastreo, como el almacenamiento local?</h2>
    <p>
      Las cookies no son la única forma de reconocer o rastrear a los visitantes. Nuestro proveedor
      de autenticación, Supabase, utiliza el
      <strong>Almacenamiento Local (localStorage)</strong> del navegador para gestionar de forma
      segura tu sesión de inicio de sesión. Esta tecnología es esencial para que puedas permanecer
      conectado mientras navegas por las áreas protegidas del sitio. El tratamiento de esta
      información se rige por nuestra Política de Privacidad. No utilizamos otras tecnologías como
      balizas web o Flash Cookies actualmente.
    </p>

    <h2>¿Sirven publicidad dirigida?</h2>
    <p>
      No. Terceros no sirven cookies a través de nuestro Sitio Web con el propósito de mostrarte
      publicidad dirigida aquí. Como mencionamos, los enlaces a sitios de terceros (redes sociales,
      SumUp) se rigen por sus propias políticas.
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

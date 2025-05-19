<script setup>
import { RouterLink } from 'vue-router' // Importar si necesitas enlaces internos
</script>

<template>
  <div class="legal-page-container">
    <h1>Política de Privacidad</h1>
    <h2>A. Introducción</h2>
    <p>
      La privacidad de los visitantes y usuarios de nuestro sitio web www.lacasadezolve.com es muy
      importante para nosotros y estamos comprometidos a protegerla. Esta política explica cómo
      tratamos su información personal.
    </p>
    <p>
      Al aceptar nuestra política de cookies (cuando corresponda) y utilizar nuestro sitio web,
      usted consiente el uso de cookies de conformidad con los términos de esta política y nuestra
      Política de Cookies separada.
    </p>

    <h2>B. Recopilación de Información Personal</h2>
    <p>
      Los siguientes tipos de información personal pueden ser recopilados, almacenados y usados:
    </p>
    <ol>
      <li>
        Información sobre su dispositivo y navegación, como su dirección IP (anonimizada cuando sea
        posible), ubicación geográfica general, tipo y versión de navegador, sistema operativo,
        fuente de referencia, duración de la visita, páginas visitadas y rutas de navegación dentro
        del sitio web (recopilada a través de herramientas de analítica básicas de nuestro proveedor
        de hosting Netlify y/o Cloudflare, si está activo).
      </li>
      <li>
        Información que usted introduce al crear una cuenta en nuestro sitio web para acceder a la
        funcionalidad de Realidad Aumentada (WebAR), como su dirección de correo electrónico y la
        contraseña que elija (la cual es almacenada de forma segura y encriptada por nuestro
        proveedor de autenticación, Supabase).
      </li>
      <li>
        Información que usted introduce voluntariamente al completar o editar su perfil de usuario
        en nuestro sitio web, como su nombre, apellido, ciudad, número de teléfono, fecha de
        nacimiento y género.
      </li>
      <li>
        Información que nos proporciona al solicitar un servicio de personalización, incluyendo las
        imágenes y/o videos que nos envía para incorporar a la experiencia de Realidad Aumentada
        (WebAR).
      </li>
      <li>
        Información relacionada con los pagos por servicios personalizados que realice (actualmente
        vía transferencia bancaria o a través de links de pago de SumUp). Tenga en cuenta que los
        datos completos de su tarjeta de crédito/débito son procesados directamente por SumUp y La
        Casa de Zolve no los almacena.
      </li>
      <li>
        Información contenida en las comunicaciones que nos envía a través del formulario de
        contacto de nuestro sitio web o directamente a nuestro correo electrónico
        (contacto@lacasadezolve.com), incluyendo su nombre, correo electrónico, el contenido de la
        comunicación y metadatos asociados.
      </li>
      <li>Cualquier otra información personal que usted decida enviarnos voluntariamente.</li>
    </ol>

    <h3>B.1. Tratamiento de Datos en Funciones de Realidad Aumentada (AR) de La Casa de Zolve</h3>
    <p>
      Cuando utilizas las funciones de Realidad Aumentada (AR) de La Casa de Zolve, la cámara de tu
      dispositivo se activa para permitir la visualización de contenido digital superpuesto en el
      mundo real. Queremos ser completamente transparentes sobre cómo manejamos los datos durante
      este proceso:
    </p>
    <div style="padding-left: 20px">
      <p style="margin-bottom: 10px">
        <strong>B.1.1. No Capturamos ni Almacenamos tu Entorno Físico:</strong> Es fundamental para
        nosotros que comprendas que La Casa de Zolve
        <strong
          >no captura, graba, ni almacena imágenes o secuencias de video de tu entorno físico, ni de
          las superficies que tu cámara visualiza</strong
        >
        mientras utilizas nuestros servicios de AR. La interacción con la cámara se limita
        estrictamente a la detección y el seguimiento en tiempo real necesarios para la correcta
        superposición del contenido aumentado, sin retener datos visuales de tu entorno.
      </p>
      <p style="margin-bottom: 10px">
        <strong>B.1.2. Contenido AR Proporcionado por el Usuario:</strong> Los únicos archivos
        multimedia que La Casa de Zolve gestiona y almacena en relación con la funcionalidad AR son
        aquellos que tú, como usuario, nos proporcionas explícitamente. Este tipo de información se
        detalla en el
        <strong
          >cuarto punto (ítem 4) de la lista principal dentro de la sección "B. Recopilación de
          Información Personal"</strong
        >
        de esta política, específicamente: "<em
          >Información que nos proporciona al solicitar un servicio de personalización, incluyendo
          las imágenes y/o videos que nos envía para incorporar a la experiencia de Realidad
          Aumentada (WebAR)</em
        >". Estos archivos son la base que utilizamos para generar y mostrar el contenido aumentado
        que has personalizado.
      </p>
      <p style="margin-bottom: 10px">
        <strong>B.1.3. Almacenamiento Seguro de tu Contenido AR:</strong> Los archivos que nos
        confías para crear tus experiencias AR se almacenan de manera segura. Para este fin,
        utilizamos servicios de almacenamiento en la nube robustos y diseñados para la protección de
        datos (como la infraestructura de almacenamiento de Cloudflare R2). Implementamos medidas de
        seguridad para proteger estos archivos contra accesos no autorizados y asegurar su
        integridad y confidencialidad.
      </p>
      <p style="margin-bottom: 10px">
        <strong>B.1.4. Protección Adicional Mediante Ofuscación de Código:</strong> Como una capa
        adicional de seguridad, ciertas partes de nuestro código de aplicación son sometidas a
        procesos de ofuscación. Esta técnica tiene como objetivo dificultar el análisis no
        autorizado de nuestra lógica de aplicación y, por ende, proteger el acceso a los sistemas
        que manejan tu contenido AR.
      </p>
    </div>
    <p>
      La privacidad de los contenidos que creas y compartes a través de La Casa de Zolve es de suma
      importancia para nosotros. Estamos comprometidos con la protección de tu información y la
      transparencia en cómo la tratamos, asegurando que puedas disfrutar de nuestras experiencias AR
      con total confianza.
    </p>

    <p>
      Antes de divulgarnos la información personal de otra persona, primero debe obtener el
      consentimiento de esa persona, tanto para la divulgación como para el procesamiento de esa
      información personal de acuerdo con esta política.
    </p>

    <h2>C. Uso de su Información Personal</h2>
    <p>
      La información personal que nos envíe a través de nuestro sitio web o por otros medios de
      contacto será usada con los fines especificados en esta política o en las páginas relevantes
      del sitio web. Podemos usar su información personal para los siguientes fines:
    </p>
    <ol>
      <li>Administrar nuestro sitio web y negocio.</li>
      <li>
        Permitirle usar los servicios disponibles en nuestro sitio web, como la creación de cuenta y
        el acceso a las experiencias de Realidad Aumentada (WebAR) asociadas a sus marcadores.
      </li>
      <li>
        Procesar y gestionar sus solicitudes de servicios de personalización, incluyendo la creación
        de productos y la integración del contenido AR que nos proporcione.
      </li>
      <li>
        Gestionar el pago de los servicios solicitados (confirmación de transferencias, generación
        de links de pago SumUp).
      </li>
      <li>
        Coordinar la entrega de los productos adquiridos (entregas presenciales o envíos por
        correo).
      </li>
      <li>
        Enviarle comunicaciones directamente relacionadas con su cuenta o servicios solicitados (ej.
        confirmaciones, notificaciones importantes, respuestas a sus consultas).
      </li>
      <li>
        Responder a las preguntas y consultas que nos envíe a través de nuestros canales de
        contacto.
      </li>
      <li>Mantener protegido el sitio web y nuestra plataforma, y prevenir el fraude.</li>
      <li>
        Verificar el cumplimiento de los Términos y Condiciones que rigen el uso de nuestro sitio
        web.
      </li>
      <li>
        Analizar datos de uso agregados y anónimos para mejorar nuestro sitio web y servicios (sin
        identificar usuarios individuales).
      </li>
    </ol>
    <p>
      No utilizaremos su información personal para fines distintos a los aquí descritos sin su
      consentimiento previo. Las imágenes y videos que nos proporcione para las personalizaciones AR
      se usarán exclusivamente para crear su experiencia AR solicitada y no serán publicados ni
      compartidos con terceros sin su permiso explícito.
    </p>
    <p>
      Sin su consentimiento explícito, no proporcionaremos su información personal a ningún tercero
      para su marketing directo o el de otros terceros.
    </p>

    <h2>D. Divulgación de Información Personal</h2>
    <p>
      Podremos divulgar su información personal a nuestros proveedores de servicios tecnológicos
      estrictamente necesarios para operar nuestro sitio y ofrecer nuestros servicios, como sea
      razonablemente necesario para los fines descritos en esta política. Estos proveedores
      incluyen:
    </p>
    <ul>
      <li>Supabase (Autenticación y base de datos).</li>
      <li>Netlify (o tu proveedor de hosting).</li>
      <li>Cloudflare (si aplica).</li>
      <li>Nominalia (o tu proveedor de correo).</li>
      <li>Resend (Envío de correos transaccionales y de contacto).</li>
      <li>SumUp (Procesamiento de pagos con tarjeta).</li>
      <li>Empresas de Correo/Mensajería (Envíos físicos).</li>
    </ul>
    <p>
      Solo compartiremos la información mínima necesaria para que estos proveedores puedan cumplir
      su función y exigimos que mantengan la confidencialidad y seguridad de sus datos.
    </p>
    <p>Además, podemos divulgar su información personal:</p>
    <ol>
      <li>En la medida en que sea requerido por la ley chilena.</li>
      <li>En relación con cualquier procedimiento legal actual o prospectivo.</li>
      <li>Para establecer, ejercer o defender nuestros derechos legales.</li>
      <li>
        A cualquier comprador (o comprador prospectivo) si vendiéramos nuestro negocio o activos.
      </li>
    </ol>
    <p>
      Con excepción de lo establecido en esta política o requerido por ley, no proporcionaremos su
      información personal a otros terceros sin su consentimiento.
    </p>

    <h2>E. Transferencias Internacionales de Datos</h2>
    <p>
      La información que recopilamos puede ser almacenada y procesada en servidores ubicados fuera
      de Chile, específicamente en los países donde operan nuestros proveedores de servicios
      tecnológicos como Supabase, Netlify, Cloudflare, Resend, Google (si usa Google Login) y SumUp
      (principalmente Estados Unidos y Europa). Estos proveedores están comprometidos con altos
      estándares de seguridad y protección de datos.
    </p>
    <p>
      Al usar nuestros servicios, usted acepta explícitamente estas transferencias internacionales
      de información personal necesarias para la operación del servicio, entendiendo que tomamos
      medidas razonables para asegurar que sus datos sean tratados de forma segura y de acuerdo con
      esta Política de Privacidad.
    </p>

    <h2>F. Conservación de Información Personal</h2>
    <p>
      Esta sección especifica nuestras políticas y procedimientos de conservación de información
      personal, diseñadas para ayudar a garantizar que cumplimos con nuestras obligaciones legales.
    </p>
    <p>
      La información personal que procesamos para cualquier fin no debe ser almacenada más tiempo de
      lo necesario para ese fin o fines.
    </p>
    <p>
      Generalmente, conservaremos los datos de su cuenta y perfil mientras mantenga su cuenta activa
      con nosotros. Los datos relacionados con pedidos específicos (como las imágenes o videos para
      AR) se conservarán durante el tiempo necesario para producir y entregar el producto, y
      posiblemente por un período adicional razonable para atender posibles reclamos de garantía o
      consultas posteriores, tras lo cual serán eliminados de forma segura. Los mensajes de contacto
      se conservarán el tiempo necesario para darles respuesta y seguimiento.
    </p>
    <p>
      Sin perjuicio de lo anterior, conservaremos documentos (incluidos electrónicos) que contengan
      datos personales:
    </p>
    <ol>
      <li>
        En la medida en que sea requerido por la ley chilena (ej. para fines tributarios o
        contables).
      </li>
      <li>
        Si creemos que los documentos pueden ser relevantes para cualquier procedimiento legal
        actual o prospectivo.
      </li>
      <li>Para establecer, ejercer o defender nuestros derechos legales.</li>
    </ol>

    <h2>G. Seguridad de su Información Personal</h2>
    <p>
      Tomaremos precauciones técnicas y organizacionales razonables para evitar la pérdida, mal uso
      o alteración de su información personal.
    </p>
    <p>
      Almacenaremos la información personal que nos proporcione en bases de datos seguras
      gestionadas por Supabase, que implementa medidas de seguridad robustas (encriptación,
      cortafuegos).
    </p>
    <p>
      Las transacciones de pago con tarjeta son gestionadas directamente por SumUp a través de sus
      plataformas seguras y cifradas.
    </p>
    <p>
      Usted acepta que la transmisión de información en Internet nunca es completamente segura y,
      aunque nos esforzamos por proteger sus datos, no podemos garantizar la seguridad absoluta de
      los datos enviados a través de nuestro sitio web.
    </p>
    <p>
      Usted es responsable de mantener de forma confidencial la contraseña que use para acceder a
      nuestro sitio web. Nosotros nunca le pediremos su contraseña (excepto cuando usted mismo
      inicie sesión en el sitio).
    </p>

    <h2>H. Modificaciones a esta Política</h2>
    <p>
      Es posible que actualicemos esta política de vez en cuando publicando una nueva versión en
      nuestro sitio web. Usted debe comprobar ocasionalmente esta página para asegurarse de que
      entiende cualquier cambio a esta política. Podríamos notificarle de cambios significativos a
      esta política a través de correo electrónico si tenemos su dirección registrada.
    </p>

    <h2>I. Sus Derechos</h2>
    <p>
      Usted tiene derecho a ejercer sus derechos de Acceso, Rectificación, Cancelación y Oposición
      (ARCO) respecto a su información personal que poseemos, de acuerdo con la Ley 19.628.
    </p>
    <p>
      Puede solicitarnos que le proporcionemos la información personal que tenemos sobre usted, que
      corrijamos datos inexactos, que eliminemos sus datos (sujeto a nuestras obligaciones legales
      de conservación) o que nos opongamos a ciertos usos.
    </p>
    <p>
      Para ejercer estos derechos, por favor contáctenos a través de nuestro correo electrónico:
      contacto@lacasadezolve.com, presentando evidencia apropiada sobre su identidad para proteger
      su privacidad. Responderemos a su solicitud en los plazos legales correspondientes.
    </p>
    <p>
      Podemos retener información personal que usted nos solicite en la medida de lo permitido por
      la ley.
    </p>

    <h2>J. Sitios Web de Terceros</h2>
    <p>
      Nuestro sitio web puede incluir hiperenlaces a sitios web de terceros (como Instagram,
      Facebook, YouTube, SumUp). No tenemos control ni somos responsables por las políticas de
      privacidad y prácticas de estos terceros. Le recomendamos leer sus políticas de privacidad.
    </p>

    <h2>K. Actualización de su Información</h2>
    <p>
      Por favor, mantenga actualizada la información de su perfil. Si necesita corregir algún dato
      que no pueda modificar directamente, contáctenos a contacto@lacasadezolve.com.
    </p>

    <h2>L. Cookies</h2>
    <p>
      Nuestro sitio web usa cookies y tecnologías similares para su funcionamiento y para mejorar su
      experiencia. Para obtener información detallada sobre las cookies que utilizamos, sus fines y
      cómo puede gestionarlas, por favor consulte nuestra
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
  margin-bottom: 30px;
  color: var(--color-heading);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 15px;
  font-size: 1.8rem;
}
.legal-page-container h2 {
  margin-top: 2em;
  margin-bottom: 1em;
  font-size: 1.4rem;
  color: var(--color-heading);
  border-bottom: 1px solid #eee;
  padding-bottom: 0.3em;
  font-weight: var(--font-weight-bold); /* Hacer H2 más fuerte */
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
  padding-left: 15px; /* Añadir padding para listas */
}
.legal-page-container ol {
  list-style-type: decimal; /* Asegurar numeración */
}
.legal-page-container ul {
  list-style-type: disc; /* Asegurar viñetas */
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

<template>
  <div class="how-to-container">
    <div class="ar-page-header">
      <h1>✨ ¡Descubre la Magia de la Realidad Aumentada! ✨</h1>
      <p class="ar-page-subtitle">
        Transforma tus productos de "La Casa de Zolve" en experiencias interactivas.
      </p>
    </div>

    <div class="ar-content-section">
      <h2>¿Qué es la Experiencia AR de Zolve?</h2>
      <p>
        Nuestra Realidad Aumentada (AR) te permite añadir una capa digital sorprendente a tus
        productos físicos. Imagina que la portada de tu cuaderno o una entrada conmemorativa ¡cobra
        vida en la pantalla de tu dispositivo mostrando un video especial o un mensaje oculto!
      </p>
      <div class="image-placeholder-wrapper">
        <div class="image-placeholder">[Futura Imagen: Concepto General AR]</div>
      </div>
    </div>

    <div class="ar-content-section">
      <h2>¿Qué Necesitas para Empezar?</h2>
      <ul>
        <li>
          <strong>Un Producto Adquirido:</strong> De "La Casa de Zolve" o la entrada específica de
          Stray Kids.
        </li>
        <li>
          <strong>Una Cuenta en Nuestro Sitio:</strong> Debes estar registrado e haber iniciado
          sesión en lacasadezolve.com. (Puedes hacerlo usando las opciones en la barra de
          navegación.)
        </li>
        <li>
          <strong>Un Dispositivo Compatible:</strong> Smartphone o tablet con cámara y navegador
          web.
        </li>
      </ul>
    </div>

    <div class="ar-content-section">
      <h2>Pasos para Disfrutar tu Experiencia AR</h2>
      <ol class="ar-steps-list">
        <li>
          <strong>Define tu Contenido AR:</strong> Al comprar, indícanos qué imagen de tu producto
          será el "marcador" y qué contenido mostrar.
          <div class="image-placeholder-wrapper inline-placeholder">
            <div class="image-placeholder small">[Img: Selección Marcador]</div>
          </div>
        </li>
        <li>
          <strong>Accede a tu Perfil:</strong> Una vez configurada la AR, estará disponible a través
          de tu perfil en lacasadezolve.com.
        </li>
        <li>
          <strong>Ve a la Sección AR:</strong> Busca la opción "Iniciar Experiencia AR" o similar
          (podría estar en tu perfil o en una página dedicada).
          <div class="image-placeholder-wrapper inline-placeholder">
            <div class="image-placeholder small">[Img: Botón Iniciar AR]</div>
          </div>
        </li>
        <li>
          <strong>Permite Acceso a la Cámara:</strong> Tu navegador lo solicitará al iniciar la
          experiencia AR.
        </li>
        <li>
          <strong>Apunta y Descubre:</strong> Enfoca la cámara a la imagen "marcador" de tu producto
          físico en un lugar bien iluminado.
          <div class="image-placeholder-wrapper inline-placeholder">
            <div class="image-placeholder small">[Img: Apuntando con Teléfono]</div>
          </div>
        </li>
        <li><strong>¡Disfruta la Sorpresa!</strong> Mira cómo aparece el contenido digital.</li>
      </ol>
    </div>

    <div class="ar-content-section">
      <h2>Contenido AR Ya Integrado (Ejemplo Gratuito)</h2>
      <div class="ar-example-card">
        <div class="image-placeholder-wrapper card-image">
          <div class="image-placeholder medium">[Futura Imagen: Entrada Stray Kids]</div>
        </div>
        <div class="card-text">
          <h3>Entrada Conmemorativa Stray Kids</h3>
          <p>
            Si tienes nuestra entrada especial de Stray Kids (modelo gráfico), ¡ya tienes una
            experiencia AR exclusiva! Sigue los pasos para verla una vez iniciada tu sesión.
          </p>
        </div>
      </div>
    </div>

    <!--
    <div class="ar-content-section">
      <h2>Costos del Servicio AR Personalizado</h2>
      <div class="ar-pricing-highlight">
        <strong>🎉 ¡Oferta de Lanzamiento! 🎉 $2.000</strong> (1 imagen marcadora + 1 video 30s).
      </div>
      <p>Precios Regulares:</p>
      <ul>
        <li>Cada imagen (marcador o contenido): <strong>$1.500</strong></li>
        <li>Cada video (hasta 30s): <strong>$2.000</strong></li>
      </ul>
      <p class="ar-note">Videos más largos costo proporcional. ¡Consúltanos al hacer tu pedido!</p>
    </div>
    -->

    <router-link :to="{ name: 'home' }" class="ar-back-link-text">Volver al Inicio</router-link>
  </div>
</template>

<script setup></script>

<style scoped>
.how-to-container {
  max-width: 750px;
  margin: 30px auto;
  padding: 25px;
  font-family: var(--font-family-base);
  color: var(--color-text);
}

.ar-page-header {
  text-align: center;
  margin-bottom: 35px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--color-border);
}
.ar-page-header h1 {
  color: var(--brand-pink);
  font-size: 2.3rem;
  margin-bottom: 8px;
}
.ar-page-subtitle {
  font-size: 1.1rem;
  color: var(--vt-c-text-light-2);
}

.ar-content-section {
  margin-bottom: 35px;
  padding: 20px;
  background-color: var(--color-background-soft);
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}
.ar-content-section h2 {
  color: var(--brand-turquoise);
  margin-top: 0;
  margin-bottom: 18px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--color-border-hover);
}
.ar-content-section p,
.ar-content-section li {
  line-height: 1.7;
  margin-bottom: 12px;
}
.ar-content-section ul,
.ar-content-section ol {
  padding-left: 25px;
}
.ar-content-section strong {
  color: var(--vt-c-indigo);
  font-weight: var(--font-weight-medium);
}

.image-placeholder-wrapper {
  margin: 15px 0;
  text-align: center;
}
.image-placeholder {
  background-color: var(--vt-c-white-mute);
  border: 2px dashed var(--color-border);
  border-radius: 6px;
  padding: 20px;
  display: inline-block;
  color: var(--vt-c-text-light-2);
  font-style: italic;
  font-size: 0.9em;
  min-height: 100px;
  box-sizing: border-box;
}
.image-placeholder.small {
  max-width: 220px;
  padding: 15px;
  min-height: 80px;
}
.image-placeholder.medium {
  max-width: 300px;
  min-height: 150px;
}
.inline-placeholder {
  text-align: left;
  margin-top: 8px;
}

.ar-steps-list {
  list-style-type: none;
  padding-left: 0;
  counter-reset: step-counter;
}
.ar-steps-list li {
  position: relative;
  padding-left: 50px;
  margin-bottom: 20px;
  min-height: 35px;
  display: flex;
  align-items: center;
}
.ar-steps-list li::before {
  counter-increment: step-counter;
  content: counter(step-counter);
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  background-color: var(--brand-turquoise);
  color: var(--vt-c-white);
  font-weight: var(--font-weight-bold);
  width: 35px;
  height: 35px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.ar-example-card {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 15px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  margin-top: 15px;
  background-color: var(--vt-c-white);
}
.ar-example-card h3 {
  color: var(--brand-pink);
  margin-top: 0;
  margin-bottom: 8px;
  font-size: 1.25rem;
}
.card-image {
  text-align: center;
  margin-bottom: 0;
}

@media (min-width: 600px) {
  .ar-example-card {
    flex-direction: row;
    align-items: flex-start;
  }
  .card-image {
    flex-basis: 250px;
    flex-shrink: 0;
    margin-right: 20px;
  }
  .card-text {
    flex-grow: 1;
  }
}

.ar-pricing-highlight {
  background-color: var(--vt-c-white-soft);
  border-left: 5px solid var(--brand-pink);
  padding: 15px 20px;
  margin: 20px 0;
  border-radius: 0 6px 6px 0;
  font-size: 1.05em;
}
.ar-pricing-highlight strong {
  color: var(--brand-pink);
  font-size: 1.1em;
}
.ar-content-section ul li strong {
  color: var(--vt-c-indigo);
}
.ar-note {
  font-size: 0.9em;
  color: var(--vt-c-text-light-2);
  text-align: center;
  margin-top: 15px;
}

.ar-back-link-text {
  display: block;
  text-align: center;
  margin-top: 40px;
  margin-bottom: 20px;
  color: var(--color-link); /* Color de enlace turquesa por defecto */
  text-decoration: underline;
  font-weight: var(--font-weight-medium);
  transition: color 0.2s ease;
}
.ar-back-link-text:hover {
  color: var(--brand-pink); /* Cambia a rosa en hover */
}
</style>

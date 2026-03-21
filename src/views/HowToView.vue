<script setup>
import { RouterLink } from 'vue-router'
import { useSeoMeta } from '@/composables/useSeoMeta'

useSeoMeta({
  title: 'Cómo Usar la Realidad Aumentada',
  description:
    'Aprende a usar la Realidad Aumentada de La Casa de Zolve. Dale vida a tus productos con experiencias AR interactivas desde tu dispositivo.',
  url: '/como-usar-ar',
})
</script>

<template>
  <div class="how-to-container">
    <div class="ar-page-header">
      <h1>✨ ¡Descubre la Magia de la Realidad Aumentada! ✨</h1>
      <p class="ar-page-subtitle">
        Transforma tus productos de "La Casa de Zolve" en experiencias interactivas.
      </p>
    </div>

    <div class="ar-content-block">
      <div class="ar-image-wrapper">
        <img src="/mockup.webp" alt="Concepto de Realidad Aumentada con Zolve" class="ar-image" />
      </div>
      <div class="ar-text-wrapper">
        <h2>¿Qué es la Experiencia AR de Zolve?</h2>
        <p>
          Nuestra Realidad Aumentada (webAR) te permite añadir una capa digital sorprendente a tus
          productos físicos. Imagina que la portada de tu cuaderno o una entrada conmemorativa
          ¡cobra vida en la pantalla de tu dispositivo mostrando un video especial o un mensaje
          oculto!
        </p>
      </div>
    </div>

    <div class="ar-content-block ar-content-block-alt">
      <div class="ar-image-wrapper">
        <!-- Idealmente aquí iría una imagen sobre los requisitos o un producto -->
        <img src="/zolve-chat-icon.webp" alt="Productos de La Casa de Zolve" class="ar-image" />
      </div>
      <div class="ar-text-wrapper">
        <h2>¿Qué Necesitas para Empezar?</h2>
        <ul>
          <li>
            <strong>Un Producto Adquirido:</strong> De "La Casa de Zolve" o la entrada específica de
            Stray Kids.
          </li>
          <li>
            <strong>Una Cuenta en Nuestro Sitio:</strong> Debes estar registrado e haber iniciado
            sesión en lacasadezolve.com.
          </li>
          <li>
            <strong>Un Dispositivo Compatible:</strong> Computador, tablet o smartphone con cámara y
            navegador web y por supuesto ¡Internet!.
          </li>
        </ul>
      </div>
    </div>

    <div class="ar-steps-section">
      <h2>Pasos para Disfrutar tu Experiencia AR</h2>
      <ol class="ar-steps-list">
        <li>
          <div class="step-content">
            <div class="step-image-wrapper">
              <img
                src="/zolve-chat-icon.webp"
                alt="Ejemplo de selección de imagen marcadora"
                class="ar-step-image"
              />
            </div>
            <div class="step-text">
              <strong>Define tu Contenido AR:</strong> Al comprar, indícanos qué imagen de tu
              producto será el "marcador" y qué contenido mostrar.
            </div>
          </div>
        </li>
        <li>
          <div class="step-content step-content-alt">
            <div class="step-image-wrapper">
              <img
                src="/miperfil.webp"
                alt="Botón para iniciar la experiencia AR"
                class="ar-step-image"
              />
            </div>
            <div class="step-text">
              <strong>Accede a tu Perfil y Sección AR:</strong> Una vez configurada la AR, estará
              disponible a través de tu perfil. Busca la opción "Iniciar AR".
            </div>
          </div>
        </li>
        <li>
          <div class="step-content">
            <div class="step-image-wrapper">
              <!-- Aquí podrías poner una imagen genérica de "permitir cámara" o un ícono -->
              <img
                src="/mockup.webp"
                alt="Teléfono apuntando a un producto para AR"
                class="ar-step-image"
              />
            </div>
            <div class="step-text">
              <strong>Permite Acceso y Apunta:</strong> Tu navegador solicitará acceso a la cámara.
              Luego, enfoca la cámara a la imagen "marcador" de tu producto.
            </div>
          </div>
        </li>
        <li><strong>¡Disfruta la Sorpresa!</strong> Mira cómo aparece el contenido digital.</li>
      </ol>
    </div>

    <div class="ar-content-block ar-content-block-alt">
      <div class="ar-image-wrapper">
        <img src="/entradas.webp" alt="Entrada Conmemorativa Stray Kids con AR" class="ar-image" />
      </div>
      <div class="ar-text-wrapper">
        <h2>Contenido AR Ya Integrado (Ejemplo Gratuito)</h2>
        <h3>Entrada Conmemorativa Stray Kids</h3>
        <p>
          Si tienes nuestra entrada especial de Stray Kids (modelo gráfico), ¡ya tienes una
          experiencia AR exclusiva! Sigue los pasos para verla una vez iniciada tu sesión.
        </p>
      </div>
    </div>

    <router-link :to="{ name: 'home' }" class="ar-back-link-text">Volver al Inicio</router-link>
  </div>
</template>

<style scoped>
.how-to-container {
  max-width: 900px;
  margin: 30px auto;
  padding: 20px;
  font-family: var(--font-family-base);
  color: var(--color-text);
}
.ar-page-header {
  text-align: center;
  margin-bottom: 50px;
}
.ar-page-header h1 {
  font-size: 2.3em;
  color: var(--brand-pink);
  margin-bottom: 10px;
  line-height: 1.3;
}
.ar-page-subtitle {
  font-size: 1.15em;
  color: var(--color-text-soft);
  max-width: 650px;
  margin: 0 auto;
}

.ar-content-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 25px;
  margin-bottom: 50px;
  padding-bottom: 30px;
  border-bottom: 1px solid var(--color-border-hover, #f0f0f0);
}
.ar-content-block:last-of-type {
  border-bottom: none;
} /* El último bloque principal no necesita borde inferior si es el último antes del link de volver */

.ar-content-block .ar-image-wrapper {
  flex: 1 1 40%;
  text-align: center;
  max-width: 400px;
  width: 100%;
}
.ar-content-block .ar-image {
  width: 100%;
  max-width: 350px;
  height: auto;
  border-radius: 12px;
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.15);
  object-fit: cover;
  aspect-ratio: 1/1;
} /* Mantiene la imagen cuadrada */
.ar-content-block .ar-text-wrapper {
  flex: 1 1 55%;
  text-align: left;
}
.ar-content-block .ar-text-wrapper h2 {
  font-size: 1.8em;
  color: var(--color-heading);
  margin-top: 0;
  margin-bottom: 15px;
  border-left: 4px solid var(--brand-turquoise);
  padding-left: 12px;
}
.ar-content-block .ar-text-wrapper h3 {
  font-size: 1.3em;
  color: var(--brand-pink);
  margin-top: 0;
  margin-bottom: 10px;
}
.ar-content-block .ar-text-wrapper p,
.ar-content-block .ar-text-wrapper ul {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--color-text-soft);
  margin-bottom: 0;
}
.ar-content-block .ar-text-wrapper ul {
  padding-left: 20px;
  list-style-position: outside;
}
.ar-content-block .ar-text-wrapper ul li {
  margin-bottom: 8px;
}

.ar-steps-section {
  margin-bottom: 50px;
  padding-bottom: 30px;
  border-bottom: 1px solid var(--color-border-hover, #f0f0f0);
}
.ar-steps-section h2 {
  font-size: 1.8em;
  color: var(--color-heading);
  margin-bottom: 25px;
  text-align: center;
  border-bottom: 2px solid var(--brand-turquoise);
  padding-bottom: 10px;
  display: inline-block;
  position: relative;
  left: 50%;
  transform: translateX(-50%);
}
.ar-steps-list {
  list-style: none;
  padding-left: 0;
  counter-reset: steps-counter;
}
.ar-steps-list li {
  margin-bottom: 30px;
  position: relative;
  padding-left: 45px;
}
.ar-steps-list li::before {
  counter-increment: steps-counter;
  content: counter(steps-counter);
  position: absolute;
  left: 0;
  top: 0;
  width: 30px;
  height: 30px;
  background-color: var(--brand-pink);
  color: white;
  border-radius: 50%;
  text-align: center;
  line-height: 30px;
  font-weight: var(--font-weight-bold);
}
.step-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}
.step-image-wrapper {
  text-align: center;
  margin-top: 10px;
  width: 100%;
}
.ar-step-image {
  max-width: 200px;
  width: 100%;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 3px 7px rgba(0, 0, 0, 0.1);
  object-fit: contain;
  aspect-ratio: 16/9;
} /* Ajusta aspect-ratio según tus imágenes */
.step-text {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--color-text-soft);
}
.step-text strong {
  color: var(--color-heading);
}

.ar-back-link-text {
  display: block;
  text-align: center;
  margin-top: 40px;
  padding: 10px;
  color: var(--brand-turquoise);
  text-decoration: none;
  font-weight: var(--font-weight-medium);
  font-size: 1.1em;
  border: 1px solid var(--brand-turquoise);
  border-radius: 5px;
  transition: all 0.2s ease;
}
.ar-back-link-text:hover {
  background-color: var(--brand-turquoise);
  color: white;
  text-decoration: none;
}

@media (min-width: 768px) {
  .ar-content-block {
    flex-direction: row;
    align-items: flex-start;
    text-align: left;
  }
  .ar-content-block.ar-content-block-alt {
    flex-direction: row-reverse;
  }
  .ar-content-block .ar-image-wrapper {
    text-align: inherit;
    max-width: 380px;
  } /* Un poco más grande en desktop */
  .ar-content-block .ar-image {
    max-width: 100%;
  } /* La imagen ocupa el wrapper */
  .ar-content-block .ar-text-wrapper {
    text-align: left;
  }
  .ar-steps-list li {
    padding-left: 50px;
  }
  .step-content {
    flex-direction: row;
    align-items: center;
    gap: 20px;
  }
  .step-content.step-content-alt {
    flex-direction: row-reverse;
  }
  .step-image-wrapper {
    text-align: inherit;
    margin-top: 0;
    width: auto;
    flex-shrink: 0;
  }
  .ar-step-image {
    max-width: 180px;
  }
}
@media (max-width: 599px) {
  .ar-page-header h1 {
    font-size: 1.9em;
  }
  .ar-page-subtitle {
    font-size: 1em;
  }
  .ar-content-block .ar-text-wrapper h2,
  .ar-steps-section h2 {
    font-size: 1.5em;
  }
  .ar-content-block .ar-text-wrapper h3 {
    font-size: 1.2em;
  }
  .ar-content-block .ar-text-wrapper p,
  .ar-content-block .ar-text-wrapper ul,
  .step-text {
    font-size: 0.95rem;
  }
  .ar-image {
    max-width: 90% !important;
    aspect-ratio: auto !important; /* Permitir que la altura se ajuste en móvil */
  }
  .ar-step-image {
    max-width: 150px;
    aspect-ratio: auto !important;
  }
  .ar-steps-list li {
    padding-left: 40px;
  }
  .ar-steps-list li::before {
    width: 25px;
    height: 25px;
    line-height: 25px;
    font-size: 0.9em;
  }
  .step-content {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .step-content.step-content-alt {
    flex-direction: column;
  }
  .step-image-wrapper {
    margin-bottom: 10px;
  }
  .step-text {
    text-align: center;
  }
}
</style>

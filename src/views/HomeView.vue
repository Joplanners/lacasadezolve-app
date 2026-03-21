<script setup>
import { reactive, ref } from 'vue' // <-- CAMBIO: Añadimos 'ref'
import { RouterLink } from 'vue-router'
import { useToast } from 'vue-toastification'
import WeatherZolve from '@/components/WeatherZolve.vue'
import BannerCarousel from '@/components/BannerCarousel.vue'
import SectionFeaturedProducts from '@/components/SectionFeaturedProducts.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome' // <-- CAMBIO: Importamos el componente de íconos
import { faVolumeUp, faVolumeMute } from '@fortawesome/free-solid-svg-icons' // <-- CAMBIO: Importamos los íconos de volumen
import { useSeoMeta } from '@/composables/useSeoMeta'

useSeoMeta({
  title: 'Inicio — Papelería, K-Pop y Realidad Aumentada',
  description:
    'Tu espacio de personalización y K-Pop en Chile. Papelería, regalos con Realidad Aumentada, merchandising y comunidad. ¡Descubre La Casa de Zolve!',
  url: '/',
})

const toast = useToast()

const contactForm = reactive({
  name: '',
  email: '',
  message: '',
  submitting: false,
})

// --- CAMBIO: Lógica para controlar el sonido del video ---
const videoRef = ref(null) // Referencia para acceder al elemento <video>
const isVideoMuted = ref(true) // El video empieza silenciado

function toggleVideoSound() {
  if (videoRef.value) {
    isVideoMuted.value = !isVideoMuted.value
    videoRef.value.muted = isVideoMuted.value
  }
}
// --- FIN DEL CAMBIO ---

async function handleContactSubmit() {
  if (!contactForm.name || !contactForm.email || !contactForm.message) {
    toast.error('Por favor, completa todos los campos del formulario.')
    return
  }
  contactForm.submitting = true
  try {
    const response = await fetch('/.netlify/functions/send-contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contactForm),
    })
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'No se pudo enviar el mensaje.')
    }
    toast.success('¡Gracias por tu mensaje! Te contactaremos pronto.')
    contactForm.name = ''
    contactForm.email = ''
    contactForm.message = ''
  } catch (error) {
    toast.error(error.message || 'Hubo un error al enviar tu mensaje.')
  } finally {
    contactForm.submitting = false
  }
}
</script>

<template>
  <div class="home-view-wrapper">
    <WeatherZolve />
    <BannerCarousel />
    <div class="home-container">
      <section class="info-section hero-section">
        <div class="logo-container-home">
          <img src="/Zolve_Logo.png" alt="Logo Zolve" class="logo-home-styled" />
        </div>
        <h1>Bienvenida a La Casa de Zolve</h1>
        <p class="subtitle">
          Tu espacio de personalización y K-Pop en Chile: productos de papelería, experiencias AR y
          comunidad en un solo lugar.
        </p>
        <div class="features-icons">
          <div class="feature-item">🛍️<span>E-commerce</span></div>
          <div class="feature-item">✨<span>Realidad Aumentada</span></div>
          <div class="feature-item">👥<span>Comunidad</span></div>
        </div>
      </section>

      <section class="info-section zolve-news-section">
        <h2>Noticias de Zolve</h2>
        <div class="news-columns-container">
          <div class="news-column">
            <h3>¿Tus productos tienen AR?</h3>
            <div class="video-container">
              <video
                ref="videoRef"
                autoplay
                loop
                muted
                playsinline
                preload="metadata"
                class="news-video"
              >
                <source src="/videos/FelixAR.webm" type="video/webm" />
                <source src="/videos/FelixAR_optimized.mp4" type="video/mp4" />
                Tu navegador no soporta la etiqueta de video.
              </video>
              <button
                @click="toggleVideoSound"
                class="sound-toggle-btn"
                title="Activar/Desactivar sonido"
              >
                <font-awesome-icon v-if="isVideoMuted" :icon="faVolumeMute" />
                <font-awesome-icon v-else :icon="faVolumeUp" />
              </button>
            </div>
            <p>
              ¡Sí! Dale vida a tus regalos y merchandising de una forma innovadora y sorprendente.
            </p>
            <router-link :to="{ name: 'how-to' }" class="btn btn-primary">
              ¡Descúbrelo ahora!
            </router-link>
          </div>

          <div class="news-column">
            <h3>¡Inauguramos nuestro E-commerce!</h3>
            <div class="gif-container">
              <video autoplay loop muted playsinline class="news-gif">
                <source src="/videos/SoExcited.mp4" type="video/mp4" />
                Tu navegador no soporta video.
              </video>
            </div>
            <p>
              Después de mucho trabajo, tenemos un e-commerce 🥳 registrate y obtendrás un 10% de
              descuento en tu primera compra.
            </p>
            <router-link :to="{ name: 'login' }" class="btn btn-secondary">
              ¡Quiero mi descuento!
            </router-link>
          </div>
        </div>
      </section>

      <SectionFeaturedProducts />

      <section class="info-section contact">
        <h2>¿Tienes una idea o alguna pregunta?</h2>
        <p class="contact-subtitle">¡Nos encantaría escucharte!</p>
        <form @submit.prevent="handleContactSubmit" class="contact-form">
          <div class="form-group-contact">
            <label for="contactName">Nombre:</label>
            <input
              type="text"
              id="contactName"
              v-model="contactForm.name"
              required
              :disabled="contactForm.submitting"
            />
          </div>
          <div class="form-group-contact">
            <label for="contactEmail">Correo Electrónico:</label>
            <input
              type="email"
              id="contactEmail"
              v-model="contactForm.email"
              required
              :disabled="contactForm.submitting"
            />
          </div>
          <div class="form-group-contact">
            <label for="contactMessage">Mensaje:</label>
            <textarea
              id="contactMessage"
              v-model="contactForm.message"
              rows="5"
              required
              :disabled="contactForm.submitting"
            ></textarea>
          </div>
          <button type="submit" class="btn btn-contact-submit" :disabled="contactForm.submitting">
            {{ contactForm.submitting ? 'Enviando...' : 'Enviar Mensaje' }}
          </button>
        </form>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* Estilos generales para HomeView (sin cambios) */
.home-view-wrapper {
  min-height: 100vh;
}
.home-container {
  max-width: 900px;
  margin: 0 auto 40px auto;
  padding: 20px;
  text-align: center;
  font-family: var(--font-family-base);
}
h1 {
  font-size: 2.5rem;
  color: var(--color-heading);
  margin-bottom: 10px;
}
.subtitle {
  font-size: 1.2rem;
  color: var(--color-text);
  margin-bottom: 30px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}
.info-section {
  margin-top: 60px;
  padding-top: 40px;
  border-top: 1px solid var(--color-border);
}
.hero-section {
  margin-top: 30px;
  padding-top: 0;
  border-top: none;
}
.logo-container-home {
  margin-bottom: 20px;
}
.logo-home-styled {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  border: 4px solid var(--brand-pink);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}
.features-icons {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 30px;
  flex-wrap: wrap;
}
.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-size: 2rem;
}
.feature-item span {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text);
}

/* --- INICIO DE LA CORRECCIÓN DE ESTILOS DE NOTICIAS --- */
.zolve-news-section {
  background-color: var(--color-background-soft);
  padding: 40px 20px;
  border-radius: 12px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
}
.zolve-news-section h2 {
  font-size: 2rem;
  color: var(--brand-orange);
  margin-bottom: 30px;
}
.news-columns-container {
  display: flex;
  gap: 30px;
  justify-content: center;
  align-items: stretch;
  flex-wrap: wrap;
}
.news-column {
  flex: 1;
  min-width: 280px;
  max-width: 350px;
  padding: 25px;
  background-color: var(--color-background);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
}
.news-column h3 {
  font-size: 1.5rem;
  color: var(--brand-pink);
  margin-top: 0;
  margin-bottom: 15px;
  min-height: 2.6em;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}
.news-column p {
  font-size: 1rem;
  flex-grow: 1;
  margin-bottom: 20px;
}
.news-column .btn {
  margin-top: auto;
}

/* Contenedores de Video y GIF */
.video-container,
.gif-container {
  width: 100%;
  aspect-ratio: 9 / 16; /* ¡LA CLAVE! Forzamos la proporción vertical */
  margin-bottom: 20px;
  border-radius: 8px;
  overflow: hidden;
  background-color: #000;
  position: relative; /* Necesario para posicionar el botón de sonido */
}

.news-video,
.news-gif {
  width: 100%;
  height: 100%;
  object-fit: cover; /* Rellena el contenedor sin deformarse */
}

/* Botón de Sonido */
.sound-toggle-btn {
  position: absolute;
  bottom: 10px;
  right: 10px;
  z-index: 10;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  border-radius: 50%;
  width: 35px;
  height: 35px;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: background-color 0.2s ease;
}
.sound-toggle-btn:hover {
  background-color: rgba(0, 0, 0, 0.8);
}
/* --- FIN DE LA CORRECCIÓN --- */

/* Botones y Contacto (sin cambios) */
.btn {
  padding: 12px 25px;
  border-radius: 5px;
  text-decoration: none;
  margin: 5px;
  display: inline-block;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  color: var(--vt-c-white);
}
.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  opacity: 0.9;
}
.btn-primary {
  background-color: var(--brand-pink);
}
.btn-secondary {
  background-color: var(--brand-turquoise);
}
.btn-contact-submit {
  background-color: var(--brand-orange);
}
.contact {
  background-color: var(--color-background-soft);
  padding: 30px;
  border-radius: 8px;
}
.contact-form {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}
.form-group-contact {
  text-align: left;
}
.form-group-contact label {
  display: block;
  margin-bottom: 6px;
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
}
.form-group-contact input,
.form-group-contact textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  box-sizing: border-box;
  font-family: var(--font-family-base);
  font-size: 1rem;
}

/* Media Queries (sin cambios) */
@media (max-width: 600px) {
  h1 {
    font-size: 2rem;
  }
  .subtitle {
    font-size: 1.1rem;
  }
  .info-section {
    margin-top: 40px;
    padding-top: 30px;
  }
  .news-columns-container {
    flex-direction: column;
    align-items: center;
  }
}
</style>

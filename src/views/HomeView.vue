<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import { useToast } from 'vue-toastification'
import { useSeoMeta } from '@/composables/useSeoMeta'
import { useScrollStacking } from '@/composables/useScrollStacking'
import BannerCarousel from '@/components/BannerCarousel.vue'
import SectionFeaturedProducts from '@/components/SectionFeaturedProducts.vue'

// SEO
useSeoMeta({
  title: 'Inicio — Papelería, K-Pop y Realidad Aumentada',
  description:
    'Tu espacio de personalización y K-Pop en Chile. Papelería, regalos con Realidad Aumentada, merchandising y comunidad. ¡Descubre La Casa de Zolve!',
  url: '/',
})

// Contacto (idéntico al original)
const toast = useToast()
const contactForm = reactive({
  name: '',
  email: '',
  message: '',
  submitting: false,
})

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

// GSAP — SOLO para la animación del Hero (logo bounce + typewriter)
// NO usamos stacking porque las secciones tienen contenido variable
const { initHeroAnimation, destroyStacking } = useScrollStacking()
const heroRef = ref(null)

onMounted(async () => {
  if (typeof window === 'undefined') return
  await nextTick()
  initHeroAnimation(heroRef.value)
})

onUnmounted(() => {
  destroyStacking()
})
</script>

<template>
  <div class="home-page">

    <!-- ===== SECCIÓN 1: HERO ===== -->
    <section ref="heroRef" class="hero-section">
      <div class="hero-bg"></div>
      <div class="hero-content">
        <div class="hero-top">
          <div class="hero-logo">
            <img src="/Zolve_Logo.webp" alt="La Casa de Zolve" class="hero-logo-img" />
          </div>
          <div class="hero-text-block">
            <h2 class="hero-title" data-typewriter>Bienvenidos a La Casa de Zolve</h2>
            <h1 class="hero-text">
              <span class="hero-line hero-line--glow" data-typewriter>Si tienes una idea... en La Casa de Zolve</span>
              <span class="hero-line hero-line--cta hero-shimmer" data-typewriter>¡la creas!</span>
            </h1>
            <p class="hero-tagline hero-line" data-typewriter>¡Personalización, Papelería, Fanmade y Comunidad en un solo lugar!</p>
          </div>
        </div>
        <div class="hero-scroll-hint">
          <span>↓</span>
        </div>
      </div>
    </section>

    <!-- ===== SECCIÓN 2: BANNER CAROUSEL ===== -->
    <section class="banner-section">
      <BannerCarousel />
    </section>

    <!-- ===== SECCIÓN 3: PRODUCTOS DESTACADOS ===== -->
    <section class="content-section">
      <SectionFeaturedProducts />
    </section>

    <!-- ===== SECCIÓN 4: NOVEDADES Y SERVICIOS ===== -->
    <section class="content-section bg-soft">
      <div class="content-inner">
        <h2 class="section-title">Novedades y Servicios</h2>

        <div class="cards-grid-3">
          <!-- Card 1: BTS Evento -->
          <div class="news-card">
            <div class="card-inner-flex">
              <RouterLink to="/bts-chile">
                <img src="/images/bts/ZolveBTS.webp" alt="Zolve BTS Logo" class="clickable-logo" loading="lazy" />
              </RouterLink>
              <h3>¡Visita nuestra página de Evento!</h3>
              <p>Nuestra colección exclusiva de BTS TOUR 2026</p>
              <RouterLink to="/bts-chile" class="btn btn-primary mt-auto">Ir al evento</RouterLink>
            </div>
          </div>

          <!-- Card 2: Instagram Jingle -->
          <div class="news-card">
            <div class="card-inner-flex">
              <h3>¡Mira nuestro Jingle!</h3>
              <div class="ig-embed-container">
                <iframe
                  src="https://www.instagram.com/p/DWPSTG6CQFy/embed"
                  width="100%"
                  height="320"
                  frameborder="0"
                  scrolling="no"
                  allowtransparency="true"
                  loading="lazy"
                ></iframe>
              </div>
            </div>
          </div>

          <!-- Card 3: Servicio Impresiones -->
          <div class="news-card">
            <div class="card-inner-flex">
              <img src="/ZolveImpresión.webp" alt="Zolve Impresión" class="clickable-logo" loading="lazy" />
              <h3>Servicio de Impresiones</h3>
              <p>¿Tienes textos de estudio y/o necesitas imprimir? Tenemos lo que necesitas al mejor precio y llega directo a tu casa. ¡Cotiza con nosotros!.</p>
              <a href="https://wa.me/56936649482" target="_blank" rel="noopener noreferrer" class="btn btn-secondary mt-auto">
                Cotizar al WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== SECCIÓN 5: CONTACTO ===== -->
    <section class="content-section bg-mute">
      <div class="content-inner contact-center">
        <div class="contact-box">
          <h2>¿Tienes una idea o alguna pregunta?</h2>
          <p class="contact-subtitle">¡Nos encantaría escucharte!</p>
          <form @submit.prevent="handleContactSubmit" class="contact-form">
            <div class="form-group-contact">
              <label for="contactName">Nombre:</label>
              <input type="text" id="contactName" v-model="contactForm.name" required :disabled="contactForm.submitting" />
            </div>
            <div class="form-group-contact">
              <label for="contactEmail">Correo Electrónico:</label>
              <input type="email" id="contactEmail" v-model="contactForm.email" required :disabled="contactForm.submitting" />
            </div>
            <div class="form-group-contact">
              <label for="contactMessage">Mensaje:</label>
              <textarea id="contactMessage" v-model="contactForm.message" rows="5" required :disabled="contactForm.submitting"></textarea>
            </div>
            <button type="submit" class="btn btn-contact-submit" :disabled="contactForm.submitting">
              {{ contactForm.submitting ? 'Enviando...' : 'Enviar Mensaje' }}
            </button>
          </form>
        </div>
      </div>
    </section>

  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');

/* =========================================
   PAGE BASE
   Mismo breakout que bts-page para salir
   del max-width de .main-content
========================================= */
.home-page {
  width: 100vw;
  margin-left: calc(-50vw + 50%);
  overflow-x: hidden;
}

/* =========================================
   SECCIÓN 1: HERO
========================================= */
.hero-section {
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #1a0a2e 0%, #4a1a54 40%, #7b2d8e 70%, #c8a2d4 100%);
  background-image: url('/images/bts/product-bg.webp');
  background-size: cover;
  background-position: center;
  z-index: 0;
}
.hero-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(26, 10, 46, 0.55);
}

.hero-content {
  position: relative;
  z-index: 1;
  padding: 0 40px;
  max-width: 1100px;
  width: 100%;
}

.hero-top {
  display: flex;
  align-items: center;
  gap: 3rem;
}

.hero-logo {
  flex-shrink: 0;
  /* La misma estrella pero como "borde" rosa */
  background-color: var(--brand-pink);
  padding: 5px;
  clip-path: polygon(
    50% 0%, 61% 11%, 75% 3%, 74% 19%, 90% 19%,
    83% 33%, 97% 41%, 85% 50%, 97% 59%, 83% 67%,
    90% 81%, 74% 81%, 75% 97%, 61% 89%, 50% 100%,
    39% 89%, 25% 97%, 26% 81%, 10% 81%, 17% 67%,
    3% 59%, 15% 50%, 3% 41%, 17% 33%, 10% 19%,
    26% 19%, 25% 3%, 39% 11%
  );
  filter: drop-shadow(0 0 20px rgba(236, 72, 153, 0.7)) drop-shadow(0 0 40px rgba(123, 45, 142, 0.5));
}

.hero-logo-img {
  width: 220px;
  height: auto;
  display: block;
  clip-path: polygon(
    50% 0%, 61% 11%, 75% 3%, 74% 19%, 90% 19%,
    83% 33%, 97% 41%, 85% 50%, 97% 59%, 83% 67%,
    90% 81%, 74% 81%, 75% 97%, 61% 89%, 50% 100%,
    39% 89%, 25% 97%, 26% 81%, 10% 81%, 17% 67%,
    3% 59%, 15% 50%, 3% 41%, 17% 33%, 10% 19%,
    26% 19%, 25% 3%, 39% 11%
  );
  transform: scale(0);
  opacity: 0;
}

.hero-text-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.4rem;
}

/* "Bienvenidos a La Casa de Zolve" — Bebas Neue, color NARANJO */
.hero-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 3rem;
  letter-spacing: 0.12em;
  color: var(--brand-orange);
  text-shadow: 0 0 20px rgba(249, 115, 22, 0.6);
  opacity: 0;
  transform: translateY(20px);
  margin: 0;
  line-height: 1.1;
}

/* "Si tienes una idea... en La Casa de Zolve" — Bebas Neue */
.hero-text {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-family: 'Bebas Neue', sans-serif;
  font-size: 2rem;
  font-weight: 400;
  line-height: 1.3;
  text-align: center;
  margin: 0;
  letter-spacing: 0.06em;
}

.hero-line {
  display: block;
  opacity: 0;
}

.hero-line--glow {
  color: #ffffff;
  text-shadow:
    0 2px 4px rgba(0, 0, 0, 0.6),
    0 0 20px rgba(200, 162, 212, 0.5),
    0 0 40px rgba(123, 45, 142, 0.3);
}

/* "¡la creas!" — centrado dentro del text-block */
.hero-line--cta {
  font-size: 3.5rem;
  letter-spacing: 0.08em;
  text-align: center;
  margin-top: 0.2rem;
}

/* Tagline */
.hero-tagline {
  font-family: var(--font-family-base);
  font-size: 1.1rem;
  font-weight: 500;
  color: #e0e0e0;
  margin: 0.5rem 0 0 0;
  text-align: center;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
}

/* Typewriter cursor (mismo que BTS) */
.hero-line .typewriter-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: #c8a2d4;
  margin-left: 2px;
  animation: blink 0.7s infinite;
  vertical-align: text-bottom;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* Shimmer (mismo que BTS) */
.hero-shimmer {
  background: linear-gradient(90deg, #f0f0f0 0%, #f0f0f0 40%, #c8a2d4 50%, #f0f0f0 60%, #f0f0f0 100%);
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-position: 0% center;
}

.hero-scroll-hint {
  margin-top: 3rem;
  text-align: center;
  animation: float 2s ease-in-out infinite;
  font-size: 1.5rem;
  opacity: 0.6;
  color: white;
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(10px); }
}

/* =========================================
   SECCIÓN 2: BANNER
   BannerCarousel ya tiene su propio CSS
   de full-width, no tocamos nada
========================================= */
.banner-section {
  width: 100%;
}

/* =========================================
   SECCIONES DE CONTENIDO (flujo normal)
   Sin stacking, sin pin, sin min-height forzado
   Cada sección mide lo que su contenido necesita
========================================= */
.content-section {
  width: 100%;
  padding: 60px 24px;
}

.content-inner {
  max-width: 1000px;
  margin: 0 auto;
}

/* Fondos */
.bg-soft { background-color: var(--color-background-soft); }
.bg-mute { background-color: var(--color-background-mute); }

.section-title {
  font-size: 2.2rem;
  text-align: center;
  margin-bottom: 40px;
  color: var(--brand-orange);
}

/* =========================================
   3 CARDS (Novedades)
========================================= */
.cards-grid-3 {
  display: flex;
  gap: 25px;
  justify-content: center;
  align-items: stretch;
  flex-wrap: wrap;
}

.news-card {
  flex: 1;
  min-width: 280px;
  max-width: 330px;
  background: var(--color-background);
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  border: 2px solid var(--brand-turquoise);
  transition: transform 0.3s, border-color 0.3s;
}
.news-card:hover {
  transform: translateY(-5px);
  border-color: var(--brand-pink);
}

.card-inner-flex {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  height: 100%;
  gap: 15px;
}

.news-card h3 { font-size: 1.4rem; color: var(--brand-pink); margin: 0; line-height: 1.3; }
.news-card p { color: var(--color-text); font-size: 1rem; }
.mt-auto { margin-top: auto; }

.clickable-logo {
  width: 150px;
  height: auto;
  transition: transform 0.2s;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.2));
}
.clickable-logo:hover { transform: scale(1.05); }

.ig-embed-container {
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  background: var(--color-background-mute);
}



/* =========================================
   CONTACTO
========================================= */
.contact-center {
  display: flex;
  justify-content: center;
}

.contact-box {
  background-color: var(--color-background);
  padding: 40px;
  border-radius: 12px;
  width: 100%;
  max-width: 600px;
  box-shadow: 0 5px 25px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--color-border);
  text-align: center;
}
.contact-box h2 { font-size: 2rem; color: var(--color-heading); }
.contact-subtitle { font-size: 1.1rem; color: var(--color-text-mute); margin-bottom: 25px; }
.contact-form { display: flex; flex-direction: column; gap: 20px; text-align: left; }
.form-group-contact label { display: block; margin-bottom: 6px; font-weight: var(--font-weight-medium); color: var(--color-text); }
.form-group-contact input,
.form-group-contact textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  box-sizing: border-box;
  font-family: var(--font-family-base);
  font-size: 1rem;
  background: var(--color-background-soft);
  color: var(--color-text);
}

/* ===== BOTONES ===== */
.btn {
  padding: 12px 25px;
  border-radius: 5px;
  text-decoration: none;
  display: inline-block;
  border: none;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s ease;
  color: white;
  text-align: center;
}
.btn:hover:not(:disabled) { transform: translateY(-2px); opacity: 0.9; }
.btn-primary { background-color: var(--brand-pink); }
.btn-secondary { background-color: var(--brand-turquoise); }
.btn-contact-submit { background-color: var(--brand-orange); }

/* =========================================
   RESPONSIVE
========================================= */
@media (max-width: 767px) {
  .hero-top {
    flex-direction: column;
    text-align: center;
  }
  .hero-title { font-size: 1.8rem; text-align: center; }
  .hero-text { font-size: 1.4rem; text-align: center; }
  .hero-line--cta { font-size: 2.2rem; }
  .hero-logo-img { width: 150px; }
  .hero-tagline { text-align: center; }

  .content-section { padding: 40px 15px; }

  .cards-grid-3 { flex-direction: column; align-items: center; }
  .news-card { width: 100%; max-width: 400px; }

  .contact-box { padding: 30px 20px; }
}
</style>

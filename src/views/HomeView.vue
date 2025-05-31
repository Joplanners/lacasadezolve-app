<script setup>
import { RouterLink } from 'vue-router'
import { reactive } from 'vue'
import { useToast } from 'vue-toastification'
import WeatherZolve from '@/components/WeatherZolve.vue'

const toast = useToast()
const contactForm = reactive({ name: '', email: '', message: '', submitting: false })

async function handleContactSubmit() {
  if (!contactForm.name || !contactForm.email || !contactForm.message) {
    toast.error('Por favor, completa todos los campos del formulario.')
    return
  }
  contactForm.submitting = true
  try {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    const mockSuccess = Math.random() > 0.2
    if (mockSuccess) {
      toast.success('¡Gracias por tu mensaje! Te contactaremos pronto.')
      contactForm.name = ''
      contactForm.email = ''
      contactForm.message = ''
    } else {
      throw new Error('No se pudo enviar el mensaje en este momento.')
    }
  } catch (error) {
    console.error('Error al enviar formulario de contacto:', error)
    toast.error(
      error.message ||
        'Hubo un error al enviar tu mensaje. Por favor, inténtalo de nuevo más tarde.',
    )
  } finally {
    contactForm.submitting = false
  }
}
</script>

<template>
  <div class="home-view-wrapper">
    <WeatherZolve />
    <div class="home-container">
      <h1>Bienvenidos a La Casa de Zolve</h1>
      <p>¡Explora experiencias únicas de Realidad Aumentada!</p>
      <br />
      <div class="logo-container-home">
        <img src="/Zolve_Logo.png" alt="Logo Zolve" class="logo-home-styled" />
      </div>

      <!-- 1. SECCIÓN: ¿QUÉ ES ESTO? -->
      <section class="info-section what-is-this-section">
        <h2>¿Qué es esto?</h2>
        <p>
          Es la evolución de los regalos y los recuerdos compartidos. Con Zolve, te permitimos
          infundir tus momentos más preciados con la magia de la Realidad Aumentada. Un simple
          objeto se convierte en una llave a un universo de emociones: un video de cumpleaños que
          salta de la tarjeta, un mensaje de aniversario escondido en una foto, o una dedicatoria
          que se despliega al enfocar un regalo. Es personalizar tus detalles a un nivel que toca el
          corazón y crea lazos inolvidables.
        </p>
      </section>

      <!-- 2. BOTONES CTA PRINCIPALES -->
      <div class="cta-buttons">
        <router-link :to="{ name: 'login' }" class="btn btn-primary"
          >Iniciar Sesión / Registrarse</router-link
        >
        <router-link :to="{ name: 'how-to' }" class="btn btn-secondary">Cómo Usar AR</router-link>
      </div>

      <!-- 3. SECCIÓN DE NOTICIAS -->
      <section class="info-section zolve-news-section">
        <h2>Noticias de Zolve</h2>
        <div class="news-image-container">
          <img src="/ZolveNoticias.webp" alt="Novedades Zolve" class="news-image" />
        </div>
        <div class="news-columns-container">
          <div class="news-column">
            <h3>¡AR para tus Productos!</h3>
            <p>
              Tenemos habilitado nuestro sistema de Realidad Aumentada para tus productos. ¡Dale
              vida a tus regalos y merchandising de una forma innovadora y sorprendente!
              <br />
              ¡Descubrelo ahora! Revisa nuestra sección de cómo usarlo.
            </p>
          </div>
          <div class="news-column">
            <h3>¡Fotos Mágicas!</h3>
            <p>
              Hemos agregado la sección "Fotos Mágicas", una nueva funcionalidad para que te saques
              una foto divertida con tu SKZOO favorita. Podrás usarla como sticker y darle el tamaño
              que quieras. ¡Pruébalo!
            </p>
          </div>
        </div>
      </section>
      <!-- FIN SECCIÓN DE NOTICIAS -->

      <!-- 4. SECCIÓN: PRÓXIMAMENTE -->
      <section class="info-section">
        <h2>Próximamente</h2>
        <p>Visita nuestra tienda para productos exclusivos y más experiencias AR.</p>
        <router-link :to="{ name: 'store' }" class="btn btn-store">Ir a la Tienda</router-link>
      </section>

      <!-- 5. SECCIÓN: CONTACTO -->
      <section class="info-section contact">
        <h2>¿Tienes una idea o alguna pregunta?</h2>
        <p class="contact-subtitle">¡Nos encantaría escucharte!</p>
        <form @submit.prevent="handleContactSubmit" class="contact-form">
          <div class="form-group-contact">
            <label for="contactName">Nombre:</label
            ><input
              type="text"
              id="contactName"
              v-model="contactForm.name"
              required
              :disabled="contactForm.submitting"
            />
          </div>
          <div class="form-group-contact">
            <label for="contactEmail">Correo Electrónico:</label
            ><input
              type="email"
              id="contactEmail"
              v-model="contactForm.email"
              required
              :disabled="contactForm.submitting"
            />
          </div>
          <div class="form-group-contact">
            <label for="contactMessage">Mensaje:</label
            ><textarea
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
.home-view-wrapper {
  /* Si WeatherZolve está siempre arriba, podrías querer que este wrapper maneje el scroll general */
}

.home-container {
  max-width: 800px;
  margin: 0 auto 40px auto;
  padding: 20px;
  text-align: center;
  font-family: var(--font-family-base);
}
.home-container h1 {
  margin-bottom: 15px;
  font-size: 2.5rem;
  color: var(--color-heading);
}
.home-container h2 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1.8rem;
  color: var(--color-heading);
}
.home-container p {
  margin-bottom: 20px;
  font-size: 1.1rem;
  color: var(--color-text);
  line-height: 1.7;
}
.logo-container-home {
  display: flex;
  justify-content: center;
  margin-top: 10px;
  margin-bottom: 30px;
}
.logo-home-styled {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid var(--brand-pink);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
}

.what-is-this-section {
  border-top: none !important;
  padding-top: 0 !important;
  margin-top: 30px;
}

.cta-buttons {
  margin: 40px 0;
  display: flex;
  justify-content: center;
  gap: 15px;
  flex-wrap: wrap;
}
.info-section {
  margin-top: 50px;
  padding-top: 30px;
  border-top: 1px solid var(--color-border);
}
.info-section p {
  /* Párrafos generales de info-section */
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.zolve-news-section {
  background-color: var(--color-background-soft);
  padding: 40px 20px;
  border-radius: 12px;
  margin-top: 40px;
  margin-bottom: 50px;
  border-top: 1px solid var(--color-border);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
}

.zolve-news-section h2 {
  font-size: 2.2rem;
  color: var(--brand-orange);
  margin-bottom: 30px;
}

.news-image-container {
  margin-bottom: 35px;
  text-align: center;
}

.news-image {
  max-width: 180px;
  height: auto;
  border-radius: 8px;
}

.news-columns-container {
  display: flex;
  flex-direction: row;
  gap: 30px;
  justify-content: center;
  align-items: flex-start;
  flex-wrap: wrap;
}

.news-column {
  flex: 1;
  min-width: 280px;
  max-width: 350px;
  padding: 25px;
  background-color: var(--color-background);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  text-align: left;
  display: flex;
  flex-direction: column;
}

.news-column h3 {
  font-size: 1.5rem;
  color: var(--brand-pink);
  margin-top: 0;
  margin-bottom: 12px;
}

.news-column p {
  font-size: 1rem;
  line-height: 1.65;
  margin-bottom: 0;
  color: var(--color-text-soft, var(--color-text));
}

.contact {
  background-color: var(--color-background-soft);
  padding: 30px;
  border-radius: 8px;
  margin-top: 50px;
}
.contact-subtitle {
  font-size: 1rem;
  color: var(--color-text);
  margin-bottom: 25px;
}
.btn {
  padding: 12px 25px;
  border-radius: 5px;
  text-decoration: none;
  margin: 5px;
  display: inline-block;
  border: none;
  cursor: pointer;
  font-family: var(--font-family-base);
  font-weight: var(--font-weight-medium);
  transition:
    background-color 0.2s ease,
    transform 0.1s ease;
  color: var(--vt-c-white);
}
.btn:hover:not(:disabled) {
  transform: translateY(-2px);
}
.btn-primary {
  background-color: var(--brand-pink);
}
.btn-primary:hover {
  background-color: #e65c7a;
}
.btn-secondary {
  background-color: var(--brand-turquoise);
}
.btn-secondary:hover {
  color: var(--vt-c-white);
  background-color: var(--color-link-hover);
}
.btn-store {
  background-color: var(--vt-c-indigo);
}
.btn-store:hover {
  background-color: var(--vt-c-black-soft);
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
.form-group-contact input[type='text'],
.form-group-contact input[type='email'],
.form-group-contact textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  box-sizing: border-box;
  font-family: var(--font-family-base);
  font-size: 1rem;
}
.form-group-contact textarea {
  resize: vertical;
  min-height: 100px;
}
.form-group-contact input[type='text']:focus,
.form-group-contact input[type='email']:focus,
.form-group-contact textarea:focus {
  outline: 0;
  border-color: var(--brand-pink);
  box-shadow: 0 0 0 2px rgba(255, 107, 135, 0.25);
}
.btn-contact-submit {
  margin-top: 10px;
  background-color: var(--brand-orange);
}
.btn-contact-submit:hover:not(:disabled) {
  background-color: #d04315;
}
.btn-contact-submit:disabled {
  background-color: #ccc;
}

/* --- Media Queries para Responsividad --- */

@media (max-width: 767px) {
  .news-columns-container {
    flex-direction: column;
    gap: 25px;
  }
  .news-column {
    max-width: 100%;
    padding: 20px;
    text-align: center; /* Centrar todo el contenido de la columna de noticias */
  }
  .news-column h3 {
    /* Ya se centra por herencia de .home-container h2 o .news-column si se añade text-align:center arriba */
    font-size: 1.3rem;
  }
  .news-column p {
    /* Ya se centra por herencia de .news-column si se añade text-align:center arriba */
    font-size: 0.9rem;
  }
}

@media (max-width: 820px) {
  .home-container {
    padding: 30px 15px;
  }
}
@media (max-width: 600px) {
  .home-container {
    width: 95%;
    margin: 20px auto 20px auto;
    padding: 20px 10px;
    /* text-align: left; No es necesario si queremos centrado por defecto */
  }
  .home-container h1 {
    font-size: 2rem;
    text-align: center;
  }
  .home-container h2 {
    font-size: 1.6rem;
    text-align: center;
  }
  .zolve-news-section h2 {
    font-size: 1.8rem;
    text-align: center; /* Asegurar centrado también para el título de noticias */
  }
  /* Centrar párrafos en móvil */
  .home-container > p, /* Párrafo de bienvenida */
  .info-section p, 
  .news-column p,
  .contact-subtitle {
    /* También el subtitulo de contacto */
    text-align: center;
  }
  .news-column h3 {
    /* Centrar también los h3 de las noticias en móvil */
    text-align: center;
  }
  .home-container p {
    /* Reset para el tamaño de fuente general de párrafos en home-container */
    font-size: 1rem;
  }
  .news-column p {
    /* Tamaño específico para párrafos de noticias en móvil */
    font-size: 0.95rem; /* Un poco más grande que el anterior 0.9rem */
  }

  .logo-container-home {
    margin-bottom: 25px;
  }
  .logo-home-styled {
    width: 120px;
    height: 120px;
  }
  .cta-buttons {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    margin: 30px 0;
  }
  .cta-buttons .btn {
    width: 100%;
    padding: 14px 20px;
    font-size: 1.1rem;
    text-align: center;
  }
  .info-section {
    margin-top: 30px;
    padding-top: 20px;
  }
  .what-is-this-section {
    margin-top: 20px;
    padding-top: 0;
  }
  .contact {
    padding: 20px;
    margin-top: 30px;
  }
  /* .contact-subtitle ya está cubierto arriba para centrarse */
  .contact-form {
    gap: 15px;
  }
  .form-group-contact label {
    /* Mantener labels a la izquierda para formularios */
    font-size: 0.95rem;
    text-align: left;
  }
  .form-group-contact input[type='text'],
  .form-group-contact input[type='email'],
  .form-group-contact textarea {
    font-size: 0.95rem;
    padding: 12px;
  }
  .btn-contact-submit {
    font-size: 1.1rem;
    padding: 14px;
    text-align: center;
  }
}
@media (max-width: 400px) {
  .home-container h1 {
    font-size: 1.7rem;
  }
  .home-container h2 {
    font-size: 1.4rem;
  }
  .zolve-news-section h2 {
    font-size: 1.6rem;
  }
  /* Párrafos ya centrados por la regla de 600px si la cascada lo permite */
  /* Si necesitas ser más específico: */
  /* .home-container > p, .info-section p, .news-column p { font-size: 0.9rem; text-align: center; } */
  .home-container p {
    font-size: 0.9rem;
  } /* Ajuste general si es necesario */
  .news-column p {
    font-size: 0.85rem;
  } /* Aún más específico para noticias si es necesario */

  .logo-home-styled {
    width: 100px;
    height: 100px;
  }
}
</style>
